-- KAYAD Phase 10: operational data-contract and financial-ledger hardening.
-- Adds the backing tables/columns used by active analytics/reminder services,
-- and corrects ledger balance semantics for double-entry accounting.

-- Auction reminder state must be persisted on the authoritative cars row.
ALTER TABLE cars ADD COLUMN IF NOT EXISTS reminder_sent_5min BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS reminder_sent_15min BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS reminder_sent_30min BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS reminder_sent_60min BOOLEAN NOT NULL DEFAULT false;

-- User activity events used by recommendations.
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  target_id UUID,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_user_created ON events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_target ON events(event_type, target_id);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Search analytics backing store used by searchInsightsService.
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_term TEXT,
  normalized_term TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  result_count INTEGER NOT NULL DEFAULT 0,
  has_results BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  search_count INTEGER NOT NULL DEFAULT 1,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_search_analytics_last ON search_analytics(last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_normalized ON search_analytics(normalized_term);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id);
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Periodic vehicle-market analytics backing store.
CREATE TABLE IF NOT EXISTS vehicle_market_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  average_selling_price NUMERIC NOT NULL DEFAULT 0,
  average_listing_price NUMERIC NOT NULL DEFAULT 0,
  price_range JSONB NOT NULL DEFAULT '{}',
  average_days_on_market NUMERIC NOT NULL DEFAULT 0,
  median_days_on_market NUMERIC NOT NULL DEFAULT 0,
  fastest_sale_days NUMERIC NOT NULL DEFAULT 0,
  total_listings INTEGER NOT NULL DEFAULT 0,
  total_sales INTEGER NOT NULL DEFAULT 0,
  total_auctions INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC NOT NULL DEFAULT 0,
  most_viewed JSONB NOT NULL DEFAULT '[]',
  fastest_selling JSONB NOT NULL DEFAULT '[]',
  top_searches JSONB NOT NULL DEFAULT '[]',
  county_trends JSONB NOT NULL DEFAULT '[]',
  brand_trends JSONB NOT NULL DEFAULT '[]',
  model_trends JSONB NOT NULL DEFAULT '[]',
  fuel_type_trends JSONB NOT NULL DEFAULT '[]',
  transmission_trends JSONB NOT NULL DEFAULT '[]',
  body_type_trends JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period, start_date, end_date)
);
CREATE INDEX IF NOT EXISTS idx_vehicle_market_analytics_period ON vehicle_market_analytics(period, start_date DESC);
ALTER TABLE vehicle_market_analytics ENABLE ROW LEVEL SECURITY;

-- One payment can fund only one canonical escrow.
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrows_payment_unique
  ON escrows(payment)
  WHERE payment IS NOT NULL;

-- Correct double-entry account balance semantics.
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
  v_debit_delta NUMERIC;
  v_credit_delta NUMERIC;
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
  ) RETURNING * INTO v_entry;

  -- Assets/expenses increase on debit; liabilities/equity/revenue increase on credit.
  v_debit_delta := CASE WHEN v_debit.type IN ('asset','expense') THEN v_amount ELSE -v_amount END;
  v_credit_delta := CASE WHEN v_credit.type IN ('asset','expense') THEN -v_amount ELSE v_amount END;

  UPDATE ledger_accounts SET balance = balance + v_debit_delta, updated_at = now() WHERE id = v_debit.id;
  UPDATE ledger_accounts SET balance = balance + v_credit_delta, updated_at = now() WHERE id = v_credit.id;

  RETURN to_jsonb(v_entry) || jsonb_build_object('idempotent', false);
END;
$$;

CREATE OR REPLACE FUNCTION kayad_rebuild_ledger_balances()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ledger_accounts SET balance = 0, updated_at = now();
  UPDATE ledger_accounts a
     SET balance = x.balance,
         updated_at = now()
    FROM (
      SELECT la.id,
             COALESCE(SUM(
               CASE
                 WHEN la.type IN ('asset','expense')
                   THEN COALESCE((line->>'debit')::NUMERIC,0) - COALESCE((line->>'credit')::NUMERIC,0)
                 ELSE COALESCE((line->>'credit')::NUMERIC,0) - COALESCE((line->>'debit')::NUMERIC,0)
               END
             ),0) AS balance
        FROM ledger_accounts la
        LEFT JOIN ledger_entries le ON true
        LEFT JOIN LATERAL jsonb_array_elements(le.entries) line ON (line->>'account')::UUID = la.id
       GROUP BY la.id
    ) x
   WHERE a.id = x.id;
END;
$$;

REVOKE ALL ON FUNCTION kayad_post_ledger_entry_atomic(TEXT, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_post_ledger_entry_atomic(TEXT, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION kayad_rebuild_ledger_balances() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_rebuild_ledger_balances() TO service_role;

SELECT kayad_rebuild_ledger_balances();

-- Atomic payment settlement: payment + bid + car market state.
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
  v_applied BOOLEAN := false;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.type <> 'bid' THEN RAISE EXCEPTION 'Payment is not a bid payment'; END IF;

  SELECT * INTO v_bid
    FROM bids
   WHERE checkout_request_id = v_payment.checkout_request_id
   ORDER BY created_at DESC
   LIMIT 1
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bid not found for payment'; END IF;

  SELECT * INTO v_car FROM cars WHERE id = v_bid.car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found for bid'; END IF;

  UPDATE payments
     SET status = 'success', mpesa_receipt = p_receipt, paid_at = now(), processed = true, updated_at = now()
   WHERE id = v_payment.id;

  IF v_bid.status <> 'paid' THEN
    UPDATE bids
       SET status = 'paid'
     WHERE id = v_bid.id;
  END IF;

  IF v_car.auction_status = 'live'
     AND (v_car.auction_end IS NULL OR v_car.auction_end > now())
     AND v_bid.amount > COALESCE(v_car.current_bid, 0) THEN
    UPDATE cars
       SET current_bid = v_bid.amount,
           highest_bidder_id = v_bid.user_id,
           bids_count = COALESCE(v_car.bids_count, 0) + CASE WHEN v_bid.status = 'paid' THEN 0 ELSE 1 END,
           updated_at = now()
     WHERE id = v_car.id;
    v_applied := true;
  END IF;

  RETURN jsonb_build_object('payment_id', v_payment.id, 'bid_id', v_bid.id, 'car_id', v_car.id,
                            'user_id', v_bid.user_id, 'amount', v_bid.amount,
                            'applied_to_market', v_applied);
END;
$$;

-- Atomic payment + escrow funding. If the seller is not verified, the payment
-- remains a recorded success and a single pending refund instruction is created;
-- it is never falsely labelled as already refunded.
CREATE OR REPLACE FUNCTION kayad_settle_purchase_payment_atomic(
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
  v_car cars%ROWTYPE;
  v_escrow escrows%ROWTYPE;
  v_seller UUID;
  v_commission NUMERIC;
  v_seller_amount NUMERIC;
  v_rate NUMERIC := 0.05;
  v_verified BOOLEAN := true;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.type <> 'purchase' THEN RAISE EXCEPTION 'Payment is not a purchase payment'; END IF;

  SELECT * INTO v_car FROM cars WHERE id = v_payment.car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle not found for purchase payment'; END IF;
  v_seller := v_car.dealer_id;
  IF v_seller IS NULL THEN v_seller := v_payment.user_id; END IF;

  IF EXISTS (SELECT 1 FROM dealers d WHERE d."user" = v_seller) THEN
    SELECT (d.approved AND NOT COALESCE(d.is_suspended, false)) INTO v_verified
      FROM dealers d WHERE d."user" = v_seller;
    IF NOT v_verified AND EXISTS (
      SELECT 1 FROM dealer_verifications dv
       WHERE dv."user" = v_seller AND dv.verification_status = 'approved'
    ) THEN
      v_verified := true;
    END IF;
  END IF;

  UPDATE payments
     SET status = 'success', mpesa_receipt = p_receipt, paid_at = now(), processed = true, updated_at = now()
   WHERE id = v_payment.id;

  IF NOT v_verified THEN
    INSERT INTO refunds (payment_id, amount, reason, status, initiated_by)
    SELECT v_payment.id, v_payment.amount, 'Seller verification required after payment', 'pending', v_payment.user_id
     WHERE NOT EXISTS (SELECT 1 FROM refunds r WHERE r.payment_id = v_payment.id AND r.status IN ('pending','processing','completed'));
    RETURN jsonb_build_object('payment_id', v_payment.id, 'refund_required', true, 'seller_id', v_seller);
  END IF;

  SELECT * INTO v_escrow FROM escrows WHERE payment = v_payment.id FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object('payment_id', v_payment.id, 'escrow_id', v_escrow.id, 'funded', true, 'idempotent', true);
  END IF;

  BEGIN
    SELECT COALESCE(dealer_commission, 5) / 100.0 INTO v_rate FROM platform_config LIMIT 1;
  EXCEPTION WHEN undefined_column THEN
    v_rate := 0.05;
  END;
  v_commission := ROUND(v_payment.amount * v_rate);
  v_seller_amount := v_payment.amount - v_commission;

  INSERT INTO escrows (
    car, buyer, seller, payment, amount, commission, "sellerAmount", status,
    "fundedAt", "autoReleaseEligibleAt", timeline, history
  ) VALUES (
    v_payment.car_id, v_payment.user_id, v_seller, v_payment.id, v_payment.amount,
    v_commission, v_seller_amount, 'funded', now(), now() + interval '3 days',
    jsonb_build_object('depositReceived', true, 'depositReceivedAt', now()),
    jsonb_build_array(jsonb_build_object('action', 'Escrow created and funded', 'at', now()))
  ) RETURNING * INTO v_escrow;

  RETURN jsonb_build_object('payment_id', v_payment.id, 'escrow_id', v_escrow.id,
                            'funded', true, 'commission', v_commission,
                            'seller_amount', v_seller_amount, 'idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION kayad_settle_bid_payment_atomic(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION kayad_settle_purchase_payment_atomic(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_settle_bid_payment_atomic(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION kayad_settle_purchase_payment_atomic(UUID, TEXT) TO service_role;
