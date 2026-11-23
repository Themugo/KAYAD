CREATE OR REPLACE FUNCTION public.kayad_start_auction_atomic(p_car_id uuid, p_duration_ms bigint, p_starting_bid numeric, p_reserve_price numeric DEFAULT NULL::numeric, p_reserve_mode text DEFAULT 'none'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

