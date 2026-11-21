-- KAYAD Auction Phase A — Financial Integrity
-- Canonical auction security holds, replay-safe provider settlement,
-- ledger idempotency and close-time reconciliation.

CREATE TABLE IF NOT EXISTS auction_security_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES auction_registrations(id) ON DELETE SET NULL,
  hold_type TEXT NOT NULL CHECK (hold_type IN ('commitment','high_value_deposit')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','held','applied','refund_pending','refunded','forfeited','failed','cancelled')),
  checkout_request_id TEXT,
  payment_transaction_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  mpesa_receipt TEXT,
  ledger_reference TEXT,
  applied_outcome_id UUID REFERENCES auction_outcomes(id) ON DELETE SET NULL,
  applied_amount NUMERIC CHECK (applied_amount IS NULL OR applied_amount >= 0),
  external_refund_reference TEXT,
  policy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(checkout_request_id),
  UNIQUE(ledger_reference)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auction_security_active_hold
  ON auction_security_holds(auction_id, bidder_id, hold_type)
  WHERE status IN ('pending','held','refund_pending','applied');

CREATE INDEX IF NOT EXISTS idx_auction_security_auction_status
  ON auction_security_holds(auction_id, status);
CREATE INDEX IF NOT EXISTS idx_auction_security_bidder
  ON auction_security_holds(bidder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_security_outcome
  ON auction_security_holds(applied_outcome_id);

ALTER TABLE auction_security_holds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auction_security_holds_bidder_select ON auction_security_holds;
CREATE POLICY auction_security_holds_bidder_select ON auction_security_holds
  FOR SELECT
  USING (
    bidder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super_admin','staff'))
  );
DROP POLICY IF EXISTS auction_security_holds_client_write ON auction_security_holds;
CREATE POLICY auction_security_holds_client_write ON auction_security_holds
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION update_auction_security_hold_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_auction_security_hold_updated_at ON auction_security_holds;
CREATE TRIGGER trg_auction_security_hold_updated_at
BEFORE UPDATE ON auction_security_holds
FOR EACH ROW EXECUTE FUNCTION update_auction_security_hold_updated_at();
REVOKE ALL ON FUNCTION update_auction_security_hold_updated_at() FROM PUBLIC;

-- Platform policy becomes the single source of truth for the auction security
-- thresholds. Existing policy rows are merged rather than replaced.
UPDATE auction_platform_policies
SET config = config || jsonb_build_object(
  'bidConfirmationFeeKes', COALESCE((config->>'bidConfirmationFeeKes')::numeric, 1),
  'highValueBidThresholdKes', COALESCE((config->>'highValueBidThresholdKes')::numeric, 5000000),
  'highValueDepositKes', COALESCE((config->>'highValueDepositKes')::numeric, 50000),
  'commitmentCreditTowardWinningPayment', COALESCE((config->>'commitmentCreditTowardWinningPayment')::boolean, true),
  'nonWinnerCommitmentRefundRequired', COALESCE((config->>'nonWinnerCommitmentRefundRequired')::boolean, true)
), updated_at = now()
WHERE id = 1;

INSERT INTO auction_platform_policies (id, config)
VALUES (1, '{"bidConfirmationFeeKes":1,"highValueBidThresholdKes":5000000,"highValueDepositKes":50000,"commitmentCreditTowardWinningPayment":true,"nonWinnerCommitmentRefundRequired":true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Provider callback settlement for auction commitment/high-value holds.
-- This is deliberately one transaction: provider confirmation, hold state,
-- registration activation and the corresponding liability ledger event cannot
-- partially commit.
CREATE OR REPLACE FUNCTION kayad_settle_auction_security_hold_atomic(
  p_checkout_request_id TEXT,
  p_success BOOLEAN,
  p_receipt TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold auction_security_holds%ROWTYPE;
  v_registration auction_registrations%ROWTYPE;
  v_ledger JSONB;
  v_policy JSONB := '{}'::jsonb;
  v_status TEXT;
BEGIN
  SELECT * INTO v_hold
  FROM auction_security_holds
  WHERE checkout_request_id = p_checkout_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction security hold not found';
  END IF;

  IF v_hold.status IN ('held','applied','refund_pending','refunded','forfeited') THEN
    RETURN jsonb_build_object(
      'hold_id', v_hold.id,
      'auction_id', v_hold.auction_id,
      'bidder_id', v_hold.bidder_id,
      'hold_type', v_hold.hold_type,
      'amount', v_hold.amount,
      'status', v_hold.status,
      'already_settled', true,
      'receipt', v_hold.mpesa_receipt
    );
  END IF;

  IF NOT p_success THEN
    UPDATE auction_security_holds
       SET status = 'failed',
           mpesa_receipt = NULL,
           updated_at = now()
     WHERE id = v_hold.id;

    IF v_hold.registration_id IS NOT NULL AND v_hold.hold_type = 'commitment' THEN
      UPDATE auction_registrations
         SET commitment_status = 'failed',
             status = 'pending_commitment',
             updated_at = now()
       WHERE id = v_hold.registration_id;
    END IF;

    RETURN jsonb_build_object('hold_id', v_hold.id, 'status', 'failed', 'already_settled', false);
  END IF;

  SELECT COALESCE(config, '{}'::jsonb) INTO v_policy
  FROM auction_platform_policies WHERE id = 1;

  v_status := 'held';
  UPDATE auction_security_holds
     SET status = v_status,
         mpesa_receipt = p_receipt,
         ledger_reference = COALESCE(ledger_reference, 'auction-security:' || id::text),
         policy_snapshot = v_policy,
         updated_at = now()
   WHERE id = v_hold.id;

  -- Refundable security is a buyer liability until it is either credited,
  -- refunded or forfeited. The ledger post is idempotent on hold identity.
  SELECT kayad_post_ledger_entry_atomic(
    'auction-security:' || v_hold.id::text,
    v_hold.bidder_id,
    v_hold.amount,
    'KES',
    CASE WHEN v_hold.hold_type = 'commitment' THEN 'auction_commitment' ELSE 'auction_high_value_deposit' END,
    'buyer_security',
    CASE WHEN v_hold.hold_type = 'commitment'
      THEN 'Auction bidder commitment received'
      ELSE 'Auction high-value security deposit received' END,
    jsonb_build_object('hold_id', v_hold.id, 'auction_id', v_hold.auction_id, 'hold_type', v_hold.hold_type, 'receipt', p_receipt),
    '1000',
    '2100'
  ) INTO v_ledger;

  IF v_hold.hold_type = 'commitment' AND v_hold.registration_id IS NOT NULL THEN
    UPDATE auction_registrations
       SET commitment_status = 'satisfied',
           commitment_receipt = p_receipt,
           status = 'active',
           eligibility_status = 'eligible',
           activated_at = COALESCE(activated_at, now()),
           updated_at = now()
     WHERE id = v_hold.registration_id;

    INSERT INTO auction_registration_events(registration_id, event_type, actor_id, metadata)
    VALUES(v_hold.registration_id, 'commitment_confirmed', v_hold.bidder_id,
      jsonb_build_object('holdId', v_hold.id, 'receipt', p_receipt, 'ledgerReference', 'auction-security:' || v_hold.id::text));
  END IF;

  RETURN jsonb_build_object(
    'hold_id', v_hold.id,
    'auction_id', v_hold.auction_id,
    'bidder_id', v_hold.bidder_id,
    'hold_type', v_hold.hold_type,
    'amount', v_hold.amount,
    'status', 'held',
    'already_settled', false,
    'ledger', v_ledger
  );
END;
$$;

REVOKE ALL ON FUNCTION kayad_settle_auction_security_hold_atomic(TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_settle_auction_security_hold_atomic(TEXT, BOOLEAN, TEXT) TO service_role;

-- Close-time reconciliation. No external money movement happens here; the
-- function establishes the authoritative next financial state. External
-- refund settlement must consume refund_pending records through the existing
-- governed payout/refund infrastructure.
CREATE OR REPLACE FUNCTION kayad_reconcile_auction_security_holds_atomic(
  p_auction_id UUID,
  p_outcome_id UUID,
  p_winner_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold auction_security_holds%ROWTYPE;
  v_outcome auction_outcomes%ROWTYPE;
  v_refund_count INTEGER := 0;
  v_applied_count INTEGER := 0;
BEGIN
  SELECT * INTO v_outcome FROM auction_outcomes WHERE id = p_outcome_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction outcome not found'; END IF;
  IF v_outcome.car_id <> p_auction_id THEN RAISE EXCEPTION 'Auction outcome does not belong to auction'; END IF;

  FOR v_hold IN
    SELECT * FROM auction_security_holds
    WHERE auction_id = p_auction_id AND status = 'held'
    FOR UPDATE
  LOOP
    IF p_winner_user_id IS NOT NULL AND v_hold.bidder_id = p_winner_user_id AND v_hold.hold_type = 'commitment' THEN
      UPDATE auction_security_holds
         SET status = 'applied',
             applied_outcome_id = p_outcome_id,
             applied_amount = v_hold.amount,
             updated_at = now()
       WHERE id = v_hold.id;

      -- Move the held commitment liability into the same seller/escrow
      -- payable that will receive the winner's remaining settlement.
      PERFORM kayad_post_ledger_entry_atomic(
        'auction-commitment-apply:' || v_hold.id::text,
        v_hold.bidder_id,
        v_hold.amount,
        'KES',
        'auction_commitment_applied',
        CASE WHEN v_outcome.settlement_mode = 'escrow' THEN 'escrow_payable' ELSE 'seller_payable' END,
        'Auction bidder commitment credited toward winning settlement',
        jsonb_build_object('hold_id', v_hold.id, 'outcome_id', p_outcome_id),
        '2100',
        CASE WHEN v_outcome.settlement_mode = 'escrow' THEN '2000' ELSE '5000' END
      );
      v_applied_count := v_applied_count + 1;
    ELSE
      UPDATE auction_security_holds
         SET status = 'refund_pending',
             applied_outcome_id = p_outcome_id,
             updated_at = now()
       WHERE id = v_hold.id;
      v_refund_count := v_refund_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'auction_id', p_auction_id,
    'outcome_id', p_outcome_id,
    'applied_count', v_applied_count,
    'refund_pending_count', v_refund_count
  );
END;
$$;

REVOKE ALL ON FUNCTION kayad_reconcile_auction_security_holds_atomic(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_reconcile_auction_security_holds_atomic(UUID, UUID, UUID) TO service_role;

-- Auction outcome records the amount already held as bidder commitment so the
-- winner-payment boundary never has to infer it from bid history.
ALTER TABLE auction_outcomes ADD COLUMN IF NOT EXISTS commitment_applied_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE auction_outcomes ADD COLUMN IF NOT EXISTS payment_due_amount NUMERIC;
ALTER TABLE auction_outcomes ADD COLUMN IF NOT EXISTS security_reconciliation_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (security_reconciliation_status IN ('pending','reconciled','needs_external_refund'));
ALTER TABLE auction_outcomes ADD COLUMN IF NOT EXISTS security_reconciled_at TIMESTAMPTZ;

-- Dedicated revenue account for the nominal KES 1 bid-confirmation charge.
INSERT INTO ledger_accounts (code, name, type, category, description)
VALUES ('4400', 'Auction Bid Confirmation Revenue', 'revenue', 'auction_fees', 'Nominal KES bid-confirmation charge')
ON CONFLICT (code) DO NOTHING;

-- Harden the KES 1 bid payment boundary. The provider payment must belong to
-- the same bidder/vehicle as the pending bid and must be exactly the published
-- platform confirmation fee. The financial event is posted once, atomically.
CREATE OR REPLACE FUNCTION kayad_settle_bid_payment_atomic(
  p_payment_id UUID,
  p_receipt TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_bid bids%ROWTYPE;
  v_car cars%ROWTYPE;
  v_setup JSONB := '{}'::jsonb;
  v_fee NUMERIC := 1;
  v_applied BOOLEAN := false;
  v_ledger JSONB;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.type <> 'bid' THEN RAISE EXCEPTION 'Payment is not a bid payment'; END IF;

  SELECT COALESCE(config, '{}'::jsonb) INTO v_setup
  FROM auction_setups WHERE car_id = v_payment.car_id AND publication_status = 'published' LIMIT 1;
  SELECT COALESCE((SELECT config->>'bidConfirmationFeeKes' FROM auction_platform_policies WHERE id = 1)::numeric, 1)
    INTO v_fee;
  IF v_fee <= 0 THEN v_fee := 1; END IF;
  IF ROUND(v_payment.amount, 2) <> ROUND(v_fee, 2) THEN
    RAISE EXCEPTION 'Invalid auction bid confirmation fee: expected %, received %', v_fee, v_payment.amount;
  END IF;

  SELECT * INTO v_bid
    FROM bids
   WHERE checkout_request_id = v_payment.checkout_request_id
     AND car_id = v_payment.car_id
     AND user_id = v_payment.user_id
   ORDER BY created_at DESC
   LIMIT 1
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bid not found for payment'; END IF;

  SELECT * INTO v_car FROM cars WHERE id = v_bid.car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found for bid'; END IF;

  UPDATE payments
     SET status = 'success', mpesa_receipt = p_receipt, paid_at = COALESCE(paid_at, now()), processed = true, updated_at = now()
   WHERE id = v_payment.id;

  IF v_bid.status <> 'paid' THEN
    UPDATE bids SET status = 'paid' WHERE id = v_bid.id;
  END IF;

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

  SELECT kayad_post_ledger_entry_atomic(
    'auction-bid-confirmation:' || v_payment.id::text,
    v_payment.user_id,
    v_payment.amount,
    'KES',
    'auction_bid_confirmation',
    'platform',
    'Nominal KES auction bid-confirmation charge',
    jsonb_build_object('payment_id', v_payment.id, 'bid_id', v_bid.id, 'auction_id', v_bid.car_id, 'receipt', p_receipt),
    '1000',
    '4400'
  ) INTO v_ledger;

  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'bid_id', v_bid.id,
    'car_id', v_bid.car_id,
    'user_id', v_bid.user_id,
    'amount', v_bid.amount,
    'confirmation_fee', v_payment.amount,
    'applied_to_market', v_applied,
    'ledger', v_ledger
  );
END;
$$;

REVOKE ALL ON FUNCTION kayad_settle_bid_payment_atomic(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_settle_bid_payment_atomic(UUID, TEXT) TO service_role;

-- The legacy bid callback uses the same authoritative confirmation function.
-- The generic /api/payments/callback path remains the preferred production rail.
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
  v_payment payments%ROWTYPE;
  v_result JSONB;
BEGIN
  SELECT * INTO v_payment
  FROM payments
  WHERE checkout_request_id = p_checkout_request_id AND type = 'bid'
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    SELECT kayad_settle_bid_payment_atomic(v_payment.id, p_receipt) INTO v_result;
    RETURN v_result || jsonb_build_object('already_paid', COALESCE((v_result->>'confirmation_fee') IS NOT NULL, false));
  END IF;

  -- Compatibility for legacy foundations that used the bids table directly.
  RETURN jsonb_build_object('bid_id', NULL, 'applied_to_market', false, 'legacy_payment_missing', true);
END;
$$;
REVOKE ALL ON FUNCTION kayad_confirm_bid_payment_atomic(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_confirm_bid_payment_atomic(TEXT, TEXT) TO service_role;

INSERT INTO ledger_accounts (code, name, type, category, description)
VALUES ('4410', 'Auction Security Forfeiture Revenue', 'revenue', 'auction_security', 'Auction security amounts forfeited under published default policy')
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION kayad_forfeit_auction_winner_security_holds_atomic(
  p_outcome_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outcome auction_outcomes%ROWTYPE;
  v_hold auction_security_holds%ROWTYPE;
  v_count INTEGER := 0;
  v_total NUMERIC := 0;
BEGIN
  SELECT * INTO v_outcome FROM auction_outcomes WHERE id = p_outcome_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction outcome not found'; END IF;
  IF v_outcome.status <> 'defaulted' THEN RAISE EXCEPTION 'Security forfeiture requires a defaulted auction outcome'; END IF;

  FOR v_hold IN
    SELECT * FROM auction_security_holds
    WHERE applied_outcome_id = p_outcome_id AND bidder_id = v_outcome.winner_user_id AND status IN ('held','applied')
    FOR UPDATE
  LOOP
    UPDATE auction_security_holds
       SET status = 'forfeited',
           applied_amount = COALESCE(applied_amount, amount),
           updated_at = now()
     WHERE id = v_hold.id;

    PERFORM kayad_post_ledger_entry_atomic(
      'auction-security-forfeit:' || v_hold.id::text,
      v_hold.bidder_id,
      v_hold.amount,
      'KES',
      'auction_security_forfeit',
      'platform',
      'Auction security forfeited after winner default',
      jsonb_build_object('hold_id', v_hold.id, 'outcome_id', p_outcome_id, 'actor_id', p_actor_id),
      '2100',
      '4410'
    );
    v_count := v_count + 1;
    v_total := v_total + v_hold.amount;
  END LOOP;

  RETURN jsonb_build_object('outcome_id', p_outcome_id, 'forfeited_count', v_count, 'forfeited_amount', v_total);
END;
$$;
REVOKE ALL ON FUNCTION kayad_forfeit_auction_winner_security_holds_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_forfeit_auction_winner_security_holds_atomic(UUID, UUID) TO service_role;
