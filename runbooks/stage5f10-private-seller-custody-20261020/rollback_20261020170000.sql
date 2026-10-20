-- ROLLBACK for 20261020170000_private_seller_auction_gate_enforcement.sql (Stage 5F.10). LOCAL / DISPOSABLE USE ONLY unless the owner
-- authorises otherwise. NON-DESTRUCTIVE: all rows in private_seller_auction_proposals, private_seller_auction_evidence_events,
-- vehicle_custody_capabilities and vehicle_custody_capability_events are preserved. Only the enforcement is removed: the five RPC bodies
-- are restored verbatim from the migrations that last defined them, then the backstop triggers and gate functions are dropped.
-- WARNING: after rollback, private-seller auctions are NOT gated at the database level (application-level checks from Stage 5F.9 remain).
BEGIN;
DROP TRIGGER IF EXISTS trg_cars_private_seller_backstop ON cars;
DROP TRIGGER IF EXISTS trg_auction_setups_private_seller_backstop ON auction_setups;
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
  v_setup JSONB := '{}'::jsonb;
  v_current NUMERIC;
  v_increment NUMERIC;
  v_snipe_window_seconds INTEGER := 120;
  v_snipe_extension_seconds INTEGER := 120;
  v_max_extensions INTEGER := 3;
  v_bid_id UUID;
  v_bids_count INTEGER;
  v_previous UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid bid amount';
  END IF;

  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;

  SELECT COALESCE(config, '{}'::jsonb)
    INTO v_setup
  FROM auction_setups
  WHERE car_id = p_car_id
    AND publication_status = 'published'
  LIMIT 1;

  IF v_car.dealer_id = p_user_id THEN RAISE EXCEPTION 'You cannot bid on your own car'; END IF;
  IF v_car.auction_status <> 'live' THEN RAISE EXCEPTION 'Auction not live'; END IF;
  IF v_car.auction_end IS NOT NULL AND v_car.auction_end <= now() THEN RAISE EXCEPTION 'Auction has ended'; END IF;
  IF v_car.highest_bidder_id = p_user_id THEN RAISE EXCEPTION 'You are already the highest bidder'; END IF;

  v_current := GREATEST(
    COALESCE((SELECT MAX(amount) FROM bids WHERE car_id = p_car_id AND status = 'paid'), 0),
    COALESCE(v_car.current_bid, 0),
    COALESCE(v_car.price, 0)
  );

  v_increment := CASE
    WHEN (v_setup->>'bidIncrement') ~ '^[0-9]+([.][0-9]+)?$' AND (v_setup->>'bidIncrement')::numeric > 0
      THEN (v_setup->>'bidIncrement')::numeric
    WHEN v_current < 100000 THEN 1000
    WHEN v_current < 500000 THEN 5000
    WHEN v_current < 2000000 THEN 10000
    ELSE 25000
  END;

  IF p_amount < v_current + v_increment THEN
    RAISE EXCEPTION 'Minimum bid increment is KES %', (v_current + v_increment)::NUMERIC;
  END IF;

  IF COALESCE((v_setup->>'antiSnipe')::boolean, true) THEN
    v_snipe_window_seconds := GREATEST(10, LEAST(3600, COALESCE(NULLIF(v_setup->>'antiSnipeWindowSeconds','')::integer, 120)));
    v_snipe_extension_seconds := GREATEST(10, LEAST(3600, COALESCE(NULLIF(v_setup->>'antiSnipeExtensionSeconds','')::integer, 120)));
    v_max_extensions := GREATEST(0, LEAST(10, COALESCE(NULLIF(v_setup->>'maxExtensions','')::integer, 3)));
  END IF;

  v_previous := v_car.highest_bidder_id;

  INSERT INTO bids (car_id, user_id, amount, max_bid, is_auto, bidder_tag, phone, status, checkout_request_id)
  VALUES (p_car_id, p_user_id, p_amount, p_max_bid, false, p_bidder_tag, p_phone, p_status, p_checkout_request_id)
  RETURNING id INTO v_bid_id;

  v_bids_count := COALESCE(v_car.bids_count, 0) + CASE WHEN p_status = 'paid' THEN 1 ELSE 0 END;

  IF p_status = 'paid' THEN
    UPDATE cars
       SET current_bid = p_amount,
           highest_bidder_id = p_user_id,
           bids_count = v_bids_count,
           extension_count = CASE
             WHEN COALESCE((v_setup->>'antiSnipe')::boolean, true)
              AND auction_end IS NOT NULL
              AND auction_end > now()
              AND auction_end - now() < make_interval(secs => v_snipe_window_seconds)
              AND extension_count < v_max_extensions
             THEN extension_count + 1 ELSE extension_count END,
           auction_end = CASE
             WHEN COALESCE((v_setup->>'antiSnipe')::boolean, true)
              AND auction_end IS NOT NULL
              AND auction_end > now()
              AND auction_end - now() < make_interval(secs => v_snipe_window_seconds)
              AND extension_count < v_max_extensions
             THEN auction_end + make_interval(secs => v_snipe_extension_seconds)
             ELSE auction_end END,
           updated_at = now()
     WHERE id = p_car_id;
  END IF;

  RETURN jsonb_build_object(
    'bid_id', v_bid_id,
    'previous_highest_bidder', v_previous,
    'current_bid', CASE WHEN p_status = 'paid' THEN p_amount ELSE v_car.current_bid END,
    'auction_end', (SELECT auction_end FROM cars WHERE id = p_car_id),
    'bids_count', v_bids_count,
    'status', p_status,
    'bid_increment', v_increment
  );
END;
$$;

CREATE OR REPLACE FUNCTION kayad_auto_bid_atomic(p_car_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car cars%ROWTYPE;
  v_setup JSONB := '{}'::jsonb;
  v_top_user UUID;
  v_top_max NUMERIC;
  v_second_max NUMERIC;
  v_phone TEXT;
  v_amount NUMERIC;
  v_increment NUMERIC;
  v_snipe_window_seconds INTEGER := 120;
  v_snipe_extension_seconds INTEGER := 120;
  v_max_extensions INTEGER := 3;
  v_bid_id UUID;
BEGIN
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;
  IF v_car.auction_status <> 'live' OR (v_car.auction_end IS NOT NULL AND v_car.auction_end <= now()) THEN RETURN jsonb_build_object('created', false, 'reason', 'auction_not_live'); END IF;

  SELECT COALESCE(config, '{}'::jsonb) INTO v_setup FROM auction_setups WHERE car_id = p_car_id AND publication_status = 'published' LIMIT 1;
  IF COALESCE((v_setup->>'antiSnipe')::boolean, true) THEN
    v_snipe_window_seconds := GREATEST(10, LEAST(3600, COALESCE(NULLIF(v_setup->>'antiSnipeWindowSeconds','')::integer, 120)));
    v_snipe_extension_seconds := GREATEST(10, LEAST(3600, COALESCE(NULLIF(v_setup->>'antiSnipeExtensionSeconds','')::integer, 120)));
    v_max_extensions := GREATEST(0, LEAST(10, COALESCE(NULLIF(v_setup->>'maxExtensions','')::integer, 3)));
  END IF;

  SELECT user_id, max_bid, phone INTO v_top_user, v_top_max, v_phone
  FROM (SELECT user_id, MAX(max_bid) AS max_bid, MAX(phone) AS phone FROM bids WHERE car_id = p_car_id AND status = 'paid' AND max_bid IS NOT NULL AND max_bid > 0 AND user_id IS NOT NULL GROUP BY user_id ORDER BY MAX(max_bid) DESC LIMIT 2) ranked
  ORDER BY max_bid DESC LIMIT 1;

  SELECT max_bid INTO v_second_max
  FROM (SELECT user_id, MAX(max_bid) AS max_bid FROM bids WHERE car_id = p_car_id AND status = 'paid' AND max_bid IS NOT NULL AND max_bid > 0 AND user_id IS NOT NULL GROUP BY user_id ORDER BY MAX(max_bid) DESC OFFSET 1 LIMIT 1) second_rank;

  IF v_top_user IS NULL OR v_second_max IS NULL THEN RETURN jsonb_build_object('created', false, 'reason', 'insufficient_auto_bidders'); END IF;
  IF v_car.highest_bidder_id = v_top_user THEN RETURN jsonb_build_object('created', false, 'reason', 'already_highest'); END IF;

  v_increment := CASE
    WHEN (v_setup->>'bidIncrement') ~ '^[0-9]+([.][0-9]+)?$' AND (v_setup->>'bidIncrement')::numeric > 0 THEN (v_setup->>'bidIncrement')::numeric
    WHEN GREATEST(COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0)) < 100000 THEN 1000
    WHEN GREATEST(COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0)) < 500000 THEN 5000
    WHEN GREATEST(COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0)) < 2000000 THEN 10000
    ELSE 25000 END;
  v_amount := LEAST(v_top_max, v_second_max + v_increment);
  IF v_amount <= GREATEST(COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0)) OR v_amount <= v_second_max THEN RETURN jsonb_build_object('created', false, 'reason', 'max_bid_exhausted'); END IF;
  IF EXISTS (SELECT 1 FROM bids WHERE car_id = p_car_id AND user_id = v_top_user AND amount = v_amount AND is_auto = true) THEN RETURN jsonb_build_object('created', false, 'reason', 'duplicate_auto_bid'); END IF;

  INSERT INTO bids (car_id, user_id, amount, max_bid, is_auto, bidder_tag, phone, status) VALUES (p_car_id, v_top_user, v_amount, v_top_max, true, 'Bidder', v_phone, 'paid') RETURNING id INTO v_bid_id;

  UPDATE cars
     SET current_bid = v_amount,
         highest_bidder_id = v_top_user,
         bids_count = COALESCE(bids_count, 0) + 1,
         extension_count = CASE
           WHEN COALESCE((v_setup->>'antiSnipe')::boolean, true)
            AND auction_end IS NOT NULL AND auction_end > now()
            AND auction_end - now() < make_interval(secs => v_snipe_window_seconds)
            AND extension_count < v_max_extensions
           THEN extension_count + 1 ELSE extension_count END,
         auction_end = CASE
           WHEN COALESCE((v_setup->>'antiSnipe')::boolean, true)
            AND auction_end IS NOT NULL AND auction_end > now()
            AND auction_end - now() < make_interval(secs => v_snipe_window_seconds)
            AND extension_count < v_max_extensions
           THEN auction_end + make_interval(secs => v_snipe_extension_seconds)
           ELSE auction_end END,
         updated_at = now()
   WHERE id = p_car_id;

  RETURN jsonb_build_object('created', true, 'bid_id', v_bid_id, 'user_id', v_top_user, 'amount', v_amount, 'max_bid', v_top_max, 'current_bid', v_amount, 'auction_end', (SELECT auction_end FROM cars WHERE id = p_car_id));
END;
$$;

CREATE OR REPLACE FUNCTION kayad_start_auction_atomic(
  p_car_id UUID,
  p_duration_ms BIGINT,
  p_starting_bid NUMERIC,
  p_reserve_price NUMERIC DEFAULT NULL,
  p_reserve_mode TEXT DEFAULT 'none'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car cars%ROWTYPE;
  v_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;

  IF v_car.auction_status = 'live' THEN RAISE EXCEPTION 'Auction already live'; END IF;
  IF v_car.auction_status = 'ended' THEN RAISE EXCEPTION 'Ended auctions cannot be restarted'; END IF;
  IF p_duration_ms IS NULL OR p_duration_ms < 86400000 THEN
    RAISE EXCEPTION 'Minimum auction duration is 24 hours';
  END IF;
  IF p_starting_bid IS NULL OR p_starting_bid < 1000 THEN
    RAISE EXCEPTION 'Starting bid must be at least KES 1,000';
  END IF;
  IF p_reserve_price IS NOT NULL AND p_reserve_price < p_starting_bid THEN
    RAISE EXCEPTION 'Reserve price must be >= starting bid';
  END IF;
  IF p_reserve_mode NOT IN ('none','soft','hard') THEN
    RAISE EXCEPTION 'Invalid reserve mode';
  END IF;

  v_end := now() + (p_duration_ms::double precision * interval '1 millisecond');

  UPDATE cars
     SET auction_status = 'live',
         allow_bid = true,
         starting_bid = p_starting_bid,
         current_bid = p_starting_bid,
         highest_bidder_id = NULL,
         auction_start_time = now(),
         auction_end = v_end,
         reserve_price = p_reserve_price,
         reserve_mode = p_reserve_mode,
         extension_count = 0,
         winner = NULL,
         sold = false,
         updated_at = now()
   WHERE id = p_car_id;

  RETURN jsonb_build_object(
    'car_id', p_car_id,
    'starting_bid', p_starting_bid,
    'reserve_price', p_reserve_price,
    'reserve_mode', p_reserve_mode,
    'auction_start_time', (SELECT auction_start_time FROM cars WHERE id = p_car_id),
    'auction_end', v_end,
    'extension_count', 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION kayad_start_scheduled_auction_atomic(
  p_car_id UUID,
  p_scheduled_end_at TIMESTAMPTZ,
  p_starting_bid NUMERIC,
  p_reserve_price NUMERIC DEFAULT NULL,
  p_reserve_mode TEXT DEFAULT 'none'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car cars%ROWTYPE;
BEGIN
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;
  IF v_car.auction_status = 'live' THEN RAISE EXCEPTION 'Auction already live'; END IF;
  IF v_car.auction_status = 'ended' THEN RAISE EXCEPTION 'Ended auctions cannot be restarted'; END IF;
  IF p_scheduled_end_at IS NULL OR p_scheduled_end_at <= now() THEN RAISE EXCEPTION 'Published auction schedule has expired'; END IF;
  IF p_starting_bid IS NULL OR p_starting_bid < 1000 THEN RAISE EXCEPTION 'Starting bid must be at least KES 1,000'; END IF;
  IF p_reserve_price IS NOT NULL AND p_reserve_price < p_starting_bid THEN RAISE EXCEPTION 'Reserve price must be >= starting bid'; END IF;
  IF p_reserve_mode NOT IN ('none','soft','hard') THEN RAISE EXCEPTION 'Invalid reserve mode'; END IF;

  UPDATE cars
     SET auction_status = 'live',
         allow_bid = true,
         starting_bid = p_starting_bid,
         current_bid = p_starting_bid,
         highest_bidder_id = NULL,
         auction_start_time = now(),
         auction_end = p_scheduled_end_at,
         reserve_price = p_reserve_price,
         reserve_mode = p_reserve_mode,
         extension_count = 0,
         winner = NULL,
         sold = false,
         updated_at = now()
   WHERE id = p_car_id;

  RETURN jsonb_build_object(
    'car_id', p_car_id,
    'starting_bid', p_starting_bid,
    'reserve_price', p_reserve_price,
    'reserve_mode', p_reserve_mode,
    'auction_start_time', (SELECT auction_start_time FROM cars WHERE id = p_car_id),
    'auction_end', p_scheduled_end_at,
    'extension_count', 0,
    'scheduled_start', true
  );
END;
$$;

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

REVOKE ALL ON FUNCTION kayad_place_bid_atomic(UUID,UUID,NUMERIC,TEXT,TEXT,NUMERIC,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_place_bid_atomic(UUID,UUID,NUMERIC,TEXT,TEXT,NUMERIC,TEXT,TEXT) TO service_role;
REVOKE ALL ON FUNCTION kayad_auto_bid_atomic(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_auto_bid_atomic(UUID) TO service_role;
REVOKE ALL ON FUNCTION kayad_start_auction_atomic(UUID,BIGINT,NUMERIC,NUMERIC,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_start_auction_atomic(UUID,BIGINT,NUMERIC,NUMERIC,TEXT) TO service_role;
REVOKE ALL ON FUNCTION kayad_start_scheduled_auction_atomic(UUID,TIMESTAMPTZ,NUMERIC,NUMERIC,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_start_scheduled_auction_atomic(UUID,TIMESTAMPTZ,NUMERIC,NUMERIC,TEXT) TO service_role;
REVOKE ALL ON FUNCTION kayad_settle_bid_payment_atomic(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_settle_bid_payment_atomic(UUID, TEXT) TO service_role;
DROP FUNCTION IF EXISTS kayad_private_seller_gate_batch(uuid[]);
DROP FUNCTION IF EXISTS kayad_private_seller_assert_eligible(uuid);
DROP FUNCTION IF EXISTS kayad_cars_private_seller_backstop();
DROP FUNCTION IF EXISTS kayad_auction_setups_private_seller_backstop();
-- the gate function itself is kept until nothing references it; transition functions are kept so history stays writable by the owner only.
DROP FUNCTION IF EXISTS kayad_private_seller_gate(uuid, boolean);
COMMIT;
