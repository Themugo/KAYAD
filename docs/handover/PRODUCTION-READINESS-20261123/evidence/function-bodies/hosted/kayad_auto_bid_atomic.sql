CREATE OR REPLACE FUNCTION public.kayad_auto_bid_atomic(p_car_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_car cars%ROWTYPE;
  v_top_user UUID;
  v_top_max NUMERIC;
  v_second_max NUMERIC;
  v_phone TEXT;
  v_amount NUMERIC;
  v_increment NUMERIC;
  v_bid_id UUID;
BEGIN
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;

  IF v_car.auction_status <> 'live' OR (v_car.auction_end IS NOT NULL AND v_car.auction_end <= now()) THEN
    RETURN jsonb_build_object('created', false, 'reason', 'auction_not_live');
  END IF;

  SELECT user_id, max_bid, phone
    INTO v_top_user, v_top_max, v_phone
  FROM (
    SELECT user_id, MAX(max_bid) AS max_bid, MAX(phone) AS phone
      FROM bids
     WHERE car_id = p_car_id
       AND status = 'paid'
       AND max_bid IS NOT NULL
       AND max_bid > 0
       AND user_id IS NOT NULL
     GROUP BY user_id
     ORDER BY MAX(max_bid) DESC
     LIMIT 2
  ) ranked
  ORDER BY max_bid DESC
  LIMIT 1;

  SELECT max_bid INTO v_second_max
  FROM (
    SELECT user_id, MAX(max_bid) AS max_bid
      FROM bids
     WHERE car_id = p_car_id
       AND status = 'paid'
       AND max_bid IS NOT NULL
       AND max_bid > 0
       AND user_id IS NOT NULL
     GROUP BY user_id
     ORDER BY MAX(max_bid) DESC
     OFFSET 1 LIMIT 1
  ) second_rank;

  IF v_top_user IS NULL OR v_second_max IS NULL THEN
    RETURN jsonb_build_object('created', false, 'reason', 'insufficient_auto_bidders');
  END IF;

  IF v_car.highest_bidder_id = v_top_user THEN
    RETURN jsonb_build_object('created', false, 'reason', 'already_highest');
  END IF;

  v_increment := CASE
    WHEN GREATEST(COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0)) < 100000 THEN 1000
    WHEN GREATEST(COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0)) < 500000 THEN 5000
    WHEN GREATEST(COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0)) < 2000000 THEN 10000
    ELSE 25000
  END;
  v_amount := LEAST(v_top_max, v_second_max + v_increment);

  IF v_amount <= GREATEST(COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0)) OR v_amount <= v_second_max THEN
    RETURN jsonb_build_object('created', false, 'reason', 'max_bid_exhausted');
  END IF;

  IF EXISTS (SELECT 1 FROM bids WHERE car_id = p_car_id AND user_id = v_top_user AND amount = v_amount AND is_auto = true) THEN
    RETURN jsonb_build_object('created', false, 'reason', 'duplicate_auto_bid');
  END IF;

  INSERT INTO bids (car_id, user_id, amount, max_bid, is_auto, bidder_tag, phone, status)
  VALUES (p_car_id, v_top_user, v_amount, v_top_max, true, 'Bidder', v_phone, 'paid')
  RETURNING id INTO v_bid_id;

  UPDATE cars
     SET current_bid = v_amount,
         highest_bidder_id = v_top_user,
         bids_count = COALESCE(bids_count, 0) + 1,
         extension_count = CASE
           WHEN auction_end IS NOT NULL
            AND auction_end > now()
            AND auction_end - now() < interval '120 seconds'
            AND extension_count < 5
           THEN extension_count + 1 ELSE extension_count END,
         auction_end = CASE
           WHEN auction_end IS NOT NULL
            AND auction_end > now()
            AND auction_end - now() < interval '120 seconds'
            AND extension_count < 5
           THEN auction_end + interval '120 seconds' ELSE auction_end END,
         updated_at = now()
   WHERE id = p_car_id;

  RETURN jsonb_build_object(
    'created', true, 'bid_id', v_bid_id, 'user_id', v_top_user,
    'amount', v_amount, 'max_bid', v_top_max,
    'current_bid', v_amount, 'auction_end', (SELECT auction_end FROM cars WHERE id = p_car_id)
  );
END;
$function$

