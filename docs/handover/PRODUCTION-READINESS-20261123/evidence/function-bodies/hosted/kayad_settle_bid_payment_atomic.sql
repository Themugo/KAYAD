CREATE OR REPLACE FUNCTION public.kayad_settle_bid_payment_atomic(p_payment_id uuid, p_receipt text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_payment public.payments%ROWTYPE; v_bid public.bids%ROWTYPE; v_car public.cars%ROWTYPE; v_event JSONB;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id=p_payment_id FOR UPDATE;
  IF NOT FOUND OR v_payment.type <> 'bid' THEN RAISE EXCEPTION 'Bid payment not found'; END IF;
  SELECT * INTO v_bid FROM public.bids WHERE checkout_request_id=v_payment.checkout_request_id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bid not found for payment'; END IF;
  SELECT * INTO v_car FROM public.cars WHERE id=v_bid.car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found for bid'; END IF;

  UPDATE public.payments SET status='success', mpesa_receipt=p_receipt, paid_at=now(), processed=true, updated_at=now() WHERE id=v_payment.id;
  IF v_bid.status <> 'paid' THEN UPDATE public.bids SET status='paid' WHERE id=v_bid.id; END IF;

  PERFORM public.kayad_post_ledger_entry_atomic(
    'auction-payment:'||v_payment.id::TEXT, v_payment.user_id, v_payment.amount, 'KES',
    'auction_payment', 'escrow', 'Auction bid payment received',
    jsonb_build_object('payment_id',v_payment.id,'bid_id',v_bid.id,'car_id',v_car.id), '1000', '1100'
  );
  v_event := public.kayad_record_financial_workflow_event_atomic(
    'auction', v_car.id, 'auction-payment:'||v_payment.id::TEXT, 'payment_confirmed', v_payment.amount, 'KES',
    'auction-payment:'||v_payment.id::TEXT, jsonb_build_object('payment_id',v_payment.id,'bid_id',v_bid.id)
  );

  IF v_car.auction_status='live' AND (v_car.auction_end IS NULL OR v_car.auction_end > now()) AND v_bid.amount > COALESCE(v_car.current_bid,0) THEN
    UPDATE public.cars SET current_bid=v_bid.amount, highest_bidder_id=v_bid.user_id, bids_count=COALESCE(v_car.bids_count,0)+1, updated_at=now() WHERE id=v_car.id;
  END IF;

  RETURN jsonb_build_object('payment_id',v_payment.id,'bid_id',v_bid.id,'car_id',v_car.id,'amount',v_bid.amount,'ledger_recorded',true,'event',v_event);
END;
$function$

