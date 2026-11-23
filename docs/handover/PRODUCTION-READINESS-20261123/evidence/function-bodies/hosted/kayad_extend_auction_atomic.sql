CREATE OR REPLACE FUNCTION public.kayad_extend_auction_atomic(p_car_id uuid, p_extra_ms bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_car cars%ROWTYPE;
  v_new_end TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;
  IF v_car.auction_status <> 'live' THEN RAISE EXCEPTION 'Auction is not live'; END IF;
  IF p_extra_ms IS NULL OR p_extra_ms < 3600000 OR p_extra_ms > 259200000 THEN
    RAISE EXCEPTION 'Extension must be between 1 and 72 hours';
  END IF;

  v_count := COALESCE(v_car.extension_count, 0);
  IF v_count >= 3 THEN RAISE EXCEPTION 'Maximum 3 extensions per auction reached'; END IF;

  v_new_end := GREATEST(COALESCE(v_car.auction_end, now()), now())
    + (p_extra_ms::double precision * interval '1 millisecond');

  UPDATE cars
     SET auction_end = v_new_end,
         extension_count = v_count + 1,
         updated_at = now()
   WHERE id = p_car_id;

  RETURN jsonb_build_object(
    'car_id', p_car_id,
    'auction_end', v_new_end,
    'extension_count', v_count + 1
  );
END;
$function$

