CREATE OR REPLACE FUNCTION public.kayad_place_bid_atomic(p_car_id uuid, p_user_id uuid, p_amount numeric, p_bidder_tag text, p_phone text, p_max_bid numeric, p_status text, p_checkout_request_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid bid amount'; END IF;

  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;

  -- Stage 5F.10: private-seller verification + custody gate, inside this transaction, after the car lock.
  PERFORM kayad_private_seller_assert_eligible(p_car_id);

  SELECT COALESCE(config, '{}'::jsonb) INTO v_setup FROM auction_setups WHERE car_id = p_car_id AND publication_status = 'published' LIMIT 1;

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
    WHEN (v_setup->>'bidIncrement') ~ '^[0-9]+([.][0-9]+)?$' AND (v_setup->>'bidIncrement')::numeric > 0 THEN (v_setup->>'bidIncrement')::numeric
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
             WHEN COALESCE((v_setup->>'antiSnipe')::boolean, true) AND auction_end IS NOT NULL AND auction_end > now()
              AND auction_end - now() < make_interval(secs => v_snipe_window_seconds) AND extension_count < v_max_extensions
             THEN extension_count + 1 ELSE extension_count END,
           auction_end = CASE
             WHEN COALESCE((v_setup->>'antiSnipe')::boolean, true) AND auction_end IS NOT NULL AND auction_end > now()
              AND auction_end - now() < make_interval(secs => v_snipe_window_seconds) AND extension_count < v_max_extensions
             THEN auction_end + make_interval(secs => v_snipe_extension_seconds) ELSE auction_end END,
           updated_at = now()
     WHERE id = p_car_id;
  END IF;

  RETURN jsonb_build_object(
    'bid_id', v_bid_id, 'previous_highest_bidder', v_previous,
    'current_bid', CASE WHEN p_status = 'paid' THEN p_amount ELSE v_car.current_bid END,
    'auction_end', (SELECT auction_end FROM cars WHERE id = p_car_id),
    'bids_count', v_bids_count, 'status', p_status, 'bid_increment', v_increment
  );
END;
$function$

