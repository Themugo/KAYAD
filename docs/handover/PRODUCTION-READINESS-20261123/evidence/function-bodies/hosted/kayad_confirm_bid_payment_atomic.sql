CREATE OR REPLACE FUNCTION public.kayad_confirm_bid_payment_atomic(p_checkout_request_id text, p_receipt text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

