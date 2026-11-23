CREATE OR REPLACE FUNCTION public.kayad_place_bid_atomic(p_car_id uuid, p_user_id uuid, p_amount numeric, p_bidder_tag text, p_phone text, p_max_bid numeric, p_status text, p_checkout_request_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  IF p_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'New bids must start in pending status';
  END IF;

  IF p_checkout_request_id IS NULL OR length(trim(p_checkout_request_id)) = 0 THEN
    RAISE EXCEPTION 'Checkout request ID is required for a new bid';
  END IF;

  IF p_max_bid IS NOT NULL AND p_max_bid < p_amount THEN
    RAISE EXCEPTION 'Maximum bid cannot be below the submitted bid';
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

  IF EXISTS (
    SELECT 1 FROM bids
     WHERE checkout_request_id = trim(p_checkout_request_id)
  ) THEN
    RAISE EXCEPTION 'Checkout request ID has already been used';
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
    'pending', trim(p_checkout_request_id)
  )
  RETURNING id INTO v_bid_id;

  v_bids_count := COALESCE(v_car.bids_count, 0);

  RETURN jsonb_build_object(
    'bid_id', v_bid_id,
    'previous_highest_bidder', v_previous,
    'current_bid', v_car.current_bid,
    'auction_end', v_car.auction_end,
    'bids_count', v_bids_count,
    'status', 'pending'
  );
END;
$function$

