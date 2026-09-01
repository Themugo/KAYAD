-- KAYAD Phase 8: database-level transaction and concurrency hardening.
--
-- The application uses Supabase/PostgREST rather than a long-lived
-- PostgreSQL client. The old startSession() compatibility object did not
-- create a real database transaction, so read/validate/write sequences could
-- still race even though controllers called startTransaction().
--
-- Critical financial/auction operations are therefore moved behind explicit
-- PostgreSQL functions. Each function locks the authoritative row with
-- SELECT ... FOR UPDATE and performs its dependent writes in one database
-- transaction. The functions are called through Supabase RPC using the
-- backend service-role client.

-- -------------------------------------------------------------------------
-- Distributed locks: atomic acquisition replaces check-then-upsert races.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS distributed_locks (
  resource_id TEXT PRIMARY KEY,
  holder TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_distributed_locks_expires_at
  ON distributed_locks(expires_at);

CREATE OR REPLACE FUNCTION kayad_try_acquire_lock(
  p_resource_id TEXT,
  p_holder TEXT,
  p_ttl_seconds INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_holder TEXT;
BEGIN
  INSERT INTO distributed_locks(resource_id, holder, acquired_at, expires_at)
  VALUES (p_resource_id, p_holder, now(), now() + make_interval(secs => GREATEST(p_ttl_seconds, 1)))
  ON CONFLICT (resource_id) DO UPDATE
    SET holder = EXCLUDED.holder,
        acquired_at = EXCLUDED.acquired_at,
        expires_at = EXCLUDED.expires_at
    WHERE distributed_locks.expires_at <= now()
       OR distributed_locks.holder = EXCLUDED.holder
  RETURNING holder INTO v_holder;

  RETURN v_holder = p_holder;
END;
$$;

CREATE OR REPLACE FUNCTION kayad_release_lock(
  p_resource_id TEXT,
  p_holder TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM distributed_locks
   WHERE resource_id = p_resource_id
     AND holder = p_holder;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION kayad_try_acquire_lock(TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION kayad_release_lock(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_try_acquire_lock(TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION kayad_release_lock(TEXT, TEXT) TO service_role;

-- -------------------------------------------------------------------------
-- Payment columns required by the existing release/reconciliation path.
-- -------------------------------------------------------------------------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee NUMERIC;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS dealer_amount NUMERIC;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS extension_count INTEGER NOT NULL DEFAULT 0;

-- -------------------------------------------------------------------------
-- Canonical append-only ledger tables used by ledgerService.js.
-- One financial event/source can only be posted once for a given external
-- reference. Reversals use a distinct source and remain auditable.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense')),
  category TEXT,
  description TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL UNIQUE,
  external_reference TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  source TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  description TEXT,
  entries JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_entries_external_source
  ON ledger_entries(external_reference, source);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_external_reference
  ON ledger_entries(external_reference);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at
  ON ledger_entries(created_at);

ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- Atomic bid placement.
-- The caller has already obtained the external payment/checkout reference;
-- this function atomically records the bid and, for immediately paid bids,
-- advances the auction aggregate. Pending M-Pesa bids are not allowed to
-- move the market until the provider callback confirms payment.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_place_bid_atomic(
  p_car_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_bidder_tag TEXT,
  p_phone TEXT,
  p_max_bid NUMERIC,
  p_status TEXT,
  p_checkout_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car cars%ROWTYPE;
  v_current NUMERIC;
  v_increment NUMERIC;
  v_bid_id UUID;
  v_bids_count INTEGER;
  v_previous UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid bid amount';
  END IF;

  SELECT * INTO v_car
    FROM cars
   WHERE id = p_car_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car not found';
  END IF;

  IF v_car.dealer_id = p_user_id THEN
    RAISE EXCEPTION 'You cannot bid on your own car';
  END IF;

  IF v_car.auction_status <> 'live' THEN
    RAISE EXCEPTION 'Auction not live';
  END IF;

  IF v_car.auction_end IS NOT NULL AND v_car.auction_end <= now() THEN
    RAISE EXCEPTION 'Auction has ended';
  END IF;

  IF v_car.highest_bidder_id = p_user_id THEN
    RAISE EXCEPTION 'You are already the highest bidder';
  END IF;

  SELECT COALESCE(MAX(amount), 0) INTO v_current
    FROM bids
   WHERE car_id = p_car_id
     AND status = 'paid';

  v_current := GREATEST(v_current, COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0));
  v_increment := CASE
    WHEN v_current < 100000 THEN 1000
    WHEN v_current < 500000 THEN 5000
    WHEN v_current < 2000000 THEN 10000
    ELSE 25000
  END;

  IF p_amount < v_current + v_increment THEN
    RAISE EXCEPTION 'Minimum bid increment is KES %', (v_current + v_increment)::NUMERIC;
  END IF;

  v_previous := v_car.highest_bidder_id;

  INSERT INTO bids (
    car_id, user_id, amount, max_bid, is_auto, bidder_tag, phone,
    status, checkout_request_id
  ) VALUES (
    p_car_id, p_user_id, p_amount, p_max_bid, false, p_bidder_tag, p_phone,
    p_status, p_checkout_request_id
  )
  RETURNING id INTO v_bid_id;

  v_bids_count := COALESCE(v_car.bids_count, 0) + CASE WHEN p_status = 'paid' THEN 1 ELSE 0 END;

  IF p_status = 'paid' THEN
    UPDATE cars
       SET current_bid = p_amount,
           highest_bidder_id = p_user_id,
           bids_count = v_bids_count,
           extension_count = CASE
             WHEN auction_end IS NOT NULL
              AND auction_end > now()
              AND auction_end - now() < interval '120 seconds'
              AND extension_count < 5
              AND (extension_count + 1) * interval '120 seconds' <= interval '600 seconds'
             THEN extension_count + 1
             ELSE extension_count
           END,
           auction_end = CASE
             WHEN auction_end IS NOT NULL
              AND auction_end > now()
              AND auction_end - now() < interval '120 seconds'
              AND extension_count < 5
              AND (extension_count + 1) * interval '120 seconds' <= interval '600 seconds'
             THEN auction_end + interval '120 seconds'
             ELSE auction_end
           END,
           updated_at = now()
     WHERE id = p_car_id;
  END IF;

  RETURN jsonb_build_object(
    'bid_id', v_bid_id,
    'previous_highest_bidder', v_previous,
    'current_bid', CASE WHEN p_status = 'paid' THEN p_amount ELSE v_car.current_bid END,
    'auction_end', (SELECT auction_end FROM cars WHERE id = p_car_id),
    'bids_count', v_bids_count,
    'status', p_status
  );
END;
$$;

-- -------------------------------------------------------------------------
-- Atomic M-Pesa bid confirmation.
-- Locks both bid and car, makes confirmation idempotent, and only advances
-- market state when the confirmed bid is higher than the current market.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_confirm_bid_payment_atomic(
  p_checkout_request_id TEXT,
  p_receipt TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid bids%ROWTYPE;
  v_car cars%ROWTYPE;
  v_applied BOOLEAN := false;
  v_previous UUID;
BEGIN
  SELECT * INTO v_bid
    FROM bids
   WHERE checkout_request_id = p_checkout_request_id
   ORDER BY created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bid not found';
  END IF;

  SELECT * INTO v_car FROM cars WHERE id = v_bid.car_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car not found';
  END IF;

  IF v_bid.status = 'paid' THEN
    RETURN jsonb_build_object(
      'bid_id', v_bid.id,
      'car_id', v_bid.car_id,
      'user_id', v_bid.user_id,
      'amount', v_bid.amount,
      'receipt', p_receipt,
      'already_paid', true,
      'applied_to_market', false,
      'current_bid', v_car.current_bid,
      'previous_highest_bidder', v_car.highest_bidder_id
    );
  END IF;

  IF v_bid.status = 'failed' OR v_bid.status = 'cancelled' THEN
    RAISE EXCEPTION 'Bid is not payable in status %', v_bid.status;
  END IF;

  v_previous := v_car.highest_bidder_id;

  UPDATE bids
     SET status = 'paid',
         bidder_tag = COALESCE(bidder_tag, 'Bidder')
   WHERE id = v_bid.id;

  IF v_car.auction_status = 'live'
     AND (v_car.auction_end IS NULL OR v_car.auction_end > now())
     AND v_bid.amount > COALESCE(v_car.current_bid, 0) THEN
    UPDATE cars
       SET current_bid = v_bid.amount,
           highest_bidder_id = v_bid.user_id,
           bids_count = COALESCE(v_car.bids_count, 0) + 1,
           updated_at = now()
     WHERE id = v_car.id;
    v_applied := true;
  END IF;

  RETURN jsonb_build_object(
    'bid_id', v_bid.id,
    'car_id', v_bid.car_id,
    'user_id', v_bid.user_id,
    'amount', v_bid.amount,
    'receipt', p_receipt,
    'already_paid', false,
    'applied_to_market', v_applied,
    'current_bid', CASE WHEN v_applied THEN v_bid.amount ELSE v_car.current_bid END,
    'auction_end', (SELECT auction_end FROM cars WHERE id = v_car.id),
    'previous_highest_bidder', v_previous
  );
END;
$$;

-- -------------------------------------------------------------------------
-- Atomic escrow state transition.
-- This preserves the application's canonical state-machine vocabulary while
-- making the check + write + related payment/car updates one DB transaction.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_transition_escrow_atomic(
  p_escrow_id UUID,
  p_next_status TEXT,
  p_actor_id UUID,
  p_role TEXT,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow escrows%ROWTYPE;
  v_payment payments%ROWTYPE;
  v_commission NUMERIC;
  v_seller_amount NUMERIC;
  v_now TIMESTAMPTZ := now();
  v_rate NUMERIC := 0.05;
BEGIN
  SELECT * INTO v_escrow FROM escrows WHERE id = p_escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;

  -- A repeated idempotency key is a successful no-op. This check occurs
  -- while holding the row lock, so two identical requests cannot both win.
  IF p_idempotency_key IS NOT NULL AND v_escrow.lastActionKey = p_idempotency_key THEN
    RETURN jsonb_build_object('id', v_escrow.id, 'status', v_escrow.status, 'idempotent', true);
  END IF;

  IF v_escrow.status IN ('refunded', 'closed') THEN
    RAISE EXCEPTION 'Escrow is in terminal state %', v_escrow.status;
  END IF;

  IF NOT (
    (v_escrow.status = 'pending' AND p_next_status IN ('funded','disputed')) OR
    (v_escrow.status = 'funded' AND p_next_status IN ('vehicle_confirmed','disputed','released')) OR
    (v_escrow.status = 'vehicle_confirmed' AND p_next_status IN ('delivered','disputed','released')) OR
    (v_escrow.status = 'delivered' AND p_next_status IN ('released','disputed')) OR
    (v_escrow.status = 'disputed' AND p_next_status IN ('refunded','released')) OR
    (v_escrow.status = 'released' AND p_next_status IN ('closed','disputed'))
  ) THEN
    RAISE EXCEPTION 'Transition from % to % is not allowed', v_escrow.status, p_next_status;
  END IF;

  -- Match the canonical application state machine's role permissions.
  IF NOT (
    (v_escrow.status = 'pending' AND p_next_status = 'funded' AND p_role = 'system') OR
    (v_escrow.status = 'pending' AND p_next_status = 'disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR
    (v_escrow.status = 'funded' AND p_next_status = 'vehicle_confirmed' AND p_role IN ('buyer','admin','superadmin')) OR
    (v_escrow.status = 'funded' AND p_next_status = 'disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR
    (v_escrow.status = 'funded' AND p_next_status = 'released' AND p_role = 'system') OR
    (v_escrow.status = 'vehicle_confirmed' AND p_next_status = 'delivered' AND p_role IN ('seller','admin','superadmin')) OR
    (v_escrow.status = 'vehicle_confirmed' AND p_next_status = 'disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR
    (v_escrow.status = 'vehicle_confirmed' AND p_next_status = 'released' AND p_role = 'system') OR
    (v_escrow.status = 'delivered' AND p_next_status = 'released' AND p_role IN ('admin','superadmin','system')) OR
    (v_escrow.status = 'delivered' AND p_next_status = 'disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR
    (v_escrow.status = 'disputed' AND p_next_status = 'refunded' AND p_role IN ('admin','superadmin')) OR
    (v_escrow.status = 'disputed' AND p_next_status = 'released' AND p_role IN ('admin','superadmin')) OR
    (v_escrow.status = 'released' AND p_next_status = 'closed' AND p_role IN ('admin','superadmin','system')) OR
    (v_escrow.status = 'released' AND p_next_status = 'disputed' AND p_role IN ('admin','superadmin'))
  ) THEN
    RAISE EXCEPTION 'Role % is not authorized for transition % -> %', p_role, v_escrow.status, p_next_status;
  END IF;

  -- Actor ownership checks for buyer/seller transitions.
  IF p_role = 'buyer' AND p_actor_id IS NOT NULL AND v_escrow.buyer <> p_actor_id THEN
    RAISE EXCEPTION 'Only the escrow buyer can perform this action';
  END IF;
  IF p_role = 'seller' AND p_actor_id IS NOT NULL AND v_escrow.seller <> p_actor_id THEN
    RAISE EXCEPTION 'Only the escrow seller can perform this action';
  END IF;

  -- Auto-release guard: the window must have opened for system releases from
  -- funded/vehicle_confirmed states.
  IF p_next_status = 'released'
     AND v_escrow.status IN ('funded','vehicle_confirmed')
     AND (v_escrow.autoReleaseEligibleAt IS NULL OR v_escrow.autoReleaseEligibleAt > v_now) THEN
    RAISE EXCEPTION 'Auto-release window has not yet opened';
  END IF;

  IF p_next_status = 'released' THEN
    BEGIN
      SELECT COALESCE(dealer_commission, 5) / 100.0 INTO v_rate
        FROM platform_config
       LIMIT 1;
    EXCEPTION WHEN undefined_column THEN
      v_rate := 0.05;
    END;
    v_commission := ROUND(v_escrow.amount * v_rate);
    v_seller_amount := v_escrow.amount - v_commission;
  END IF;

  UPDATE escrows
     SET status = p_next_status,
         lastActionKey = COALESCE(p_idempotency_key, lastActionKey),
         "updatedAt" = v_now,
         "fundedAt" = CASE WHEN p_next_status = 'funded' THEN v_now ELSE "fundedAt" END,
         "vehicleConfirmedAt" = CASE WHEN p_next_status = 'vehicle_confirmed' THEN v_now ELSE "vehicleConfirmedAt" END,
         "deliveredAt" = CASE WHEN p_next_status = 'delivered' THEN v_now ELSE "deliveredAt" END,
         "releasedAt" = CASE WHEN p_next_status = 'released' THEN v_now ELSE "releasedAt" END,
         "releasedBy" = CASE WHEN p_next_status = 'released' THEN p_actor_id ELSE "releasedBy" END,
         "refundedAt" = CASE WHEN p_next_status = 'refunded' THEN v_now ELSE "refundedAt" END,
         "refundedBy" = CASE WHEN p_next_status = 'refunded' THEN p_actor_id ELSE "refundedBy" END,
         "disputedAt" = CASE WHEN p_next_status = 'disputed' THEN v_now ELSE "disputedAt" END,
         "disputedBy" = CASE WHEN p_next_status = 'disputed' THEN p_actor_id ELSE "disputedBy" END,
         "disputeReason" = CASE WHEN p_next_status IN ('disputed','refunded') THEN p_reason ELSE "disputeReason" END,
         commission = CASE WHEN p_next_status = 'released' THEN v_commission ELSE commission END,
         "sellerAmount" = CASE WHEN p_next_status = 'released' THEN v_seller_amount ELSE "sellerAmount" END,
         timeline = COALESCE(timeline, '{}'::jsonb) || jsonb_build_object(
           CASE p_next_status
             WHEN 'funded' THEN 'depositReceived'
             WHEN 'vehicle_confirmed' THEN 'inspectionCompleted'
             WHEN 'delivered' THEN 'deliveryConfirmed'
             WHEN 'released' THEN 'fundsReleased'
             ELSE 'stateChanged'
           END, true
         ),
         history = COALESCE(history, '[]'::jsonb) || jsonb_build_array(
           jsonb_build_object('action', concat('Escrow transitioned to ', p_next_status), 'by', p_actor_id, 'at', v_now, 'reason', p_reason)
         )
   WHERE id = v_escrow.id;

  IF p_next_status = 'released' THEN
    IF v_escrow.car IS NOT NULL THEN
      UPDATE cars
         SET sold = true,
             status = 'sold',
             "isPaid" = true,
             updated_at = v_now
       WHERE id = v_escrow.car;
    END IF;

    IF v_escrow.payment IS NOT NULL THEN
      UPDATE payments
         SET status = 'released',
             platform_fee = v_commission,
             dealer_amount = v_seller_amount,
             updated_at = v_now
       WHERE id = v_escrow.payment;
    END IF;
  ELSIF p_next_status = 'refunded' THEN
    IF v_escrow.payment IS NOT NULL THEN
      UPDATE payments SET status = 'refunded', updated_at = v_now WHERE id = v_escrow.payment;
    END IF;
    IF v_escrow.car IS NOT NULL THEN
      UPDATE cars SET sold = false, "isPaid" = false, updated_at = v_now WHERE id = v_escrow.car;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_escrow.id,
    'status', p_next_status,
    'commission', v_commission,
    'sellerAmount', v_seller_amount,
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION kayad_place_bid_atomic(UUID, UUID, NUMERIC, TEXT, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION kayad_confirm_bid_payment_atomic(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION kayad_transition_escrow_atomic(UUID, TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_place_bid_atomic(UUID, UUID, NUMERIC, TEXT, TEXT, NUMERIC, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION kayad_confirm_bid_payment_atomic(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION kayad_transition_escrow_atomic(UUID, TEXT, UUID, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION kayad_place_bid_atomic IS 'KAYAD Phase 8: serializes and atomically records an auction bid.';
COMMENT ON FUNCTION kayad_confirm_bid_payment_atomic IS 'KAYAD Phase 8: idempotently confirms a paid bid and atomically advances market state.';
COMMENT ON FUNCTION kayad_transition_escrow_atomic IS 'KAYAD Phase 8: atomically validates and executes an escrow state transition.';

-- -------------------------------------------------------------------------
-- Atomic ledger posting. Account rows are locked before balances are changed;
-- duplicate financial events are idempotent on (external_reference, source).
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_post_ledger_entry_atomic(
  p_external_reference TEXT,
  p_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_source TEXT,
  p_destination TEXT,
  p_description TEXT,
  p_metadata JSONB,
  p_debit_account_code TEXT,
  p_credit_account_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing ledger_entries%ROWTYPE;
  v_debit ledger_accounts%ROWTYPE;
  v_credit ledger_accounts%ROWTYPE;
  v_entry ledger_entries%ROWTYPE;
  v_amount NUMERIC := ROUND(p_amount, 2);
BEGIN
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Ledger amount must be greater than zero';
  END IF;

  SELECT * INTO v_existing
    FROM ledger_entries
   WHERE external_reference = p_external_reference
     AND source = p_source
   LIMIT 1
   FOR UPDATE;

  IF FOUND THEN
    RETURN to_jsonb(v_existing) || jsonb_build_object('idempotent', true);
  END IF;

  SELECT * INTO v_debit FROM ledger_accounts WHERE code = p_debit_account_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Debit ledger account not found: %', p_debit_account_code; END IF;

  SELECT * INTO v_credit FROM ledger_accounts WHERE code = p_credit_account_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit ledger account not found: %', p_credit_account_code; END IF;

  INSERT INTO ledger_entries (
    transaction_id, external_reference, user_id, amount, currency,
    source, destination, status, description, entries, metadata
  ) VALUES (
    concat('LGR-', extract(epoch from clock_timestamp())::BIGINT, '-', substr(gen_random_uuid()::TEXT, 1, 8)),
    p_external_reference, p_user_id, v_amount, COALESCE(p_currency, 'KES'),
    p_source, p_destination, 'completed', p_description,
    jsonb_build_array(
      jsonb_build_object('account', v_debit.id, 'debit', v_amount, 'credit', 0),
      jsonb_build_object('account', v_credit.id, 'debit', 0, 'credit', v_amount)
    ),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_entry;

  UPDATE ledger_accounts
     SET balance = balance + v_amount, updated_at = now()
   WHERE id = v_debit.id;

  UPDATE ledger_accounts
     SET balance = balance - v_amount, updated_at = now()
   WHERE id = v_credit.id;

  RETURN to_jsonb(v_entry) || jsonb_build_object('idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION kayad_post_ledger_entry_atomic(TEXT, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_post_ledger_entry_atomic(TEXT, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;

-- -------------------------------------------------------------------------
-- Ledger immutability: corrections are represented by compensating entries,
-- never by editing or deleting the original financial event.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_reverse_ledger_entry_atomic(
  p_entry_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original ledger_entries%ROWTYPE;
  v_existing ledger_entries%ROWTYPE;
  v_line JSONB;
  v_account ledger_accounts%ROWTYPE;
  v_reversal ledger_entries%ROWTYPE;
BEGIN
  SELECT * INTO v_original FROM ledger_entries WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entry not found'; END IF;

  SELECT * INTO v_existing
    FROM ledger_entries
   WHERE external_reference = v_original.transaction_id
     AND source = 'reversal'
   LIMIT 1
   FOR UPDATE;
  IF FOUND THEN
    RETURN to_jsonb(v_existing) || jsonb_build_object('idempotent', true);
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(v_original.entries) LOOP
    SELECT * INTO v_account
      FROM ledger_accounts
     WHERE id = (v_line->>'account')::UUID
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ledger account not found: %', v_line->>'account'; END IF;

    UPDATE ledger_accounts
       SET balance = balance - COALESCE((v_line->>'debit')::NUMERIC, 0)
                          + COALESCE((v_line->>'credit')::NUMERIC, 0),
           updated_at = now()
     WHERE id = v_account.id;
  END LOOP;

  INSERT INTO ledger_entries (
    transaction_id, external_reference, user_id, amount, currency,
    source, destination, status, description, entries, metadata
  ) VALUES (
    concat('LGR-', extract(epoch from clock_timestamp())::BIGINT, '-', substr(gen_random_uuid()::TEXT, 1, 8)),
    v_original.transaction_id, p_user_id, v_original.amount, v_original.currency,
    'reversal', v_original.source, 'completed',
    concat('Reversal: ', COALESCE(p_reason, 'No reason'), ' — ref ', v_original.transaction_id),
    (SELECT jsonb_agg(jsonb_build_object(
      'account', x->>'account',
      'debit', COALESCE((x->>'credit')::NUMERIC, 0),
      'credit', COALESCE((x->>'debit')::NUMERIC, 0)
    )) FROM jsonb_array_elements(v_original.entries) x),
    jsonb_build_object('reversed_entry_id', p_entry_id, 'reason', p_reason, 'event', 'reversal')
  )
  RETURNING * INTO v_reversal;

  RETURN to_jsonb(v_reversal) || jsonb_build_object('idempotent', false);
END;
$$;

CREATE OR REPLACE FUNCTION kayad_ledger_entries_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries are append-only; use a compensating reversal entry';
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_entries_immutable ON ledger_entries;
CREATE TRIGGER trg_ledger_entries_immutable
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION kayad_ledger_entries_immutable();

REVOKE ALL ON FUNCTION kayad_reverse_ledger_entry_atomic(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_reverse_ledger_entry_atomic(UUID, UUID, TEXT) TO service_role;
