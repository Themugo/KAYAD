CREATE OR REPLACE FUNCTION public.kayad_settle_bid_payment_atomic(p_payment_id uuid, p_receipt text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment payments%ROWTYPE;
  v_bid bids%ROWTYPE;
  v_car cars%ROWTYPE;
  v_setup JSONB := '{}'::jsonb;
  v_fee NUMERIC := 1;
  v_applied BOOLEAN := false;
  v_ledger JSONB;
  v_gate JSONB;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.type <> 'bid' THEN RAISE EXCEPTION 'Payment is not a bid payment'; END IF;

  SELECT COALESCE(config, '{}'::jsonb) INTO v_setup FROM auction_setups WHERE car_id = v_payment.car_id AND publication_status = 'published' LIMIT 1;
  SELECT COALESCE((SELECT config->>'bidConfirmationFeeKes' FROM auction_platform_policies WHERE id = 1)::numeric, 1) INTO v_fee;
  IF v_fee <= 0 THEN v_fee := 1; END IF;
  IF ROUND(v_payment.amount, 2) <> ROUND(v_fee, 2) THEN
    RAISE EXCEPTION 'Invalid auction bid confirmation fee: expected %, received %', v_fee, v_payment.amount;
  END IF;

  SELECT * INTO v_bid FROM bids
   WHERE checkout_request_id = v_payment.checkout_request_id AND car_id = v_payment.car_id AND user_id = v_payment.user_id
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bid not found for payment'; END IF;

  SELECT * INTO v_car FROM cars WHERE id = v_bid.car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found for bid'; END IF;

  UPDATE payments SET status = 'success', mpesa_receipt = p_receipt, paid_at = COALESCE(paid_at, now()), processed = true, updated_at = now() WHERE id = v_payment.id;

  IF v_bid.status <> 'paid' THEN UPDATE bids SET status = 'paid' WHERE id = v_bid.id; END IF;

  v_gate := kayad_private_seller_gate(v_car.id, true);

  IF v_car.auction_status = 'live'
     AND (v_car.auction_end IS NULL OR v_car.auction_end > now())
     AND v_bid.amount > COALESCE(v_car.current_bid, 0)
     AND (v_gate->>'eligible')::boolean THEN
    UPDATE cars SET current_bid = v_bid.amount, highest_bidder_id = v_bid.user_id, bids_count = COALESCE(v_car.bids_count, 0) + 1, updated_at = now() WHERE id = v_car.id;
    v_applied := true;
  END IF;

  SELECT kayad_post_ledger_entry_atomic(
    'auction-bid-confirmation:' || v_payment.id::text, v_payment.user_id, v_payment.amount, 'KES', 'auction_bid_confirmation', 'platform',
    'Nominal KES auction bid-confirmation charge',
    jsonb_build_object('payment_id', v_payment.id, 'bid_id', v_bid.id, 'auction_id', v_bid.car_id, 'receipt', p_receipt),
    '1000', '4400'
  ) INTO v_ledger;

  RETURN jsonb_build_object('payment_id', v_payment.id, 'bid_id', v_bid.id, 'car_id', v_bid.car_id, 'user_id', v_bid.user_id, 'amount', v_bid.amount,
    'confirmation_fee', v_payment.amount, 'applied_to_market', v_applied, 'ledger', v_ledger,
    'not_applied_reason', CASE WHEN v_applied THEN NULL WHEN NOT (v_gate->>'eligible')::boolean THEN 'private_seller_not_eligible' ELSE 'not_live_or_not_highest' END);
END;
$function$

