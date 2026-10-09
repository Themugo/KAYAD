CREATE OR REPLACE FUNCTION public.kayad_settle_purchase_payment_atomic(p_payment_id uuid, p_receipt text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment payments%ROWTYPE;
  v_car cars%ROWTYPE;
  v_escrow escrows%ROWTYPE;
  v_outcome purchase_outcomes%ROWTYPE;
  v_seller UUID;
  v_commission NUMERIC;
  v_seller_amount NUMERIC;
  v_rate NUMERIC := 0.05;
  v_verified BOOLEAN := true;
  v_mode TEXT;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.type <> 'purchase' THEN RAISE EXCEPTION 'Payment is not a purchase payment'; END IF;

  SELECT * INTO v_car FROM cars WHERE id = v_payment.car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle not found for purchase payment'; END IF;
  v_seller := v_car.dealer_id;
  IF v_seller IS NULL THEN v_seller := v_payment.user_id; END IF;

  v_mode := CASE WHEN COALESCE(v_car.escrow_enabled,false) THEN 'escrow' ELSE 'direct' END;

  IF EXISTS (SELECT 1 FROM dealers d WHERE d."user" = v_seller) THEN
    SELECT (d.approved AND NOT COALESCE(d.is_suspended, false)) INTO v_verified
      FROM dealers d WHERE d."user" = v_seller;
    IF NOT v_verified AND EXISTS (
      SELECT 1 FROM dealer_verifications dv
       WHERE dv."user" = v_seller AND dv.verification_status = 'approved'
    ) THEN v_verified := true; END IF;
  END IF;

  IF COALESCE(v_car.status,'') <> 'available' OR COALESCE(v_car.auction_status,'') IN ('active','live','closing') THEN
    INSERT INTO refunds (payment_id, amount, reason, status, initiated_by)
    SELECT v_payment.id, v_payment.amount, 'Vehicle became unavailable before purchase settlement', 'pending', v_payment.user_id
    WHERE NOT EXISTS (SELECT 1 FROM refunds r WHERE r.payment_id=v_payment.id AND r.status IN ('pending','processing','completed'));
    UPDATE payments SET status='success', mpesa_receipt=p_receipt, paid_at=now(), processed=true, updated_at=now() WHERE id=v_payment.id;
    INSERT INTO purchase_outcomes (car_id,buyer_user_id,seller_user_id,payment_id,settlement_mode,status,amount,payment_receipt,collection_status,transfer_status,failure_reason)
    VALUES (v_payment.car_id,v_payment.user_id,v_seller,v_payment.id,v_mode,'refund_pending',v_payment.amount,p_receipt,'blocked','blocked','Vehicle became unavailable before purchase settlement')
    ON CONFLICT (payment_id) DO UPDATE SET status='refund_pending', settlement_mode=EXCLUDED.settlement_mode, failure_reason=EXCLUDED.failure_reason, updated_at=now();
    RETURN jsonb_build_object('payment_id',v_payment.id,'refund_required',true,'unavailable',true,'settlement_mode',v_mode);
  END IF;

  UPDATE payments
     SET status='success', mpesa_receipt=p_receipt, paid_at=now(), processed=true, updated_at=now()
   WHERE id=v_payment.id;

  IF NOT v_verified THEN
    INSERT INTO refunds (payment_id, amount, reason, status, initiated_by)
    SELECT v_payment.id, v_payment.amount, 'Seller verification required after payment', 'pending', v_payment.user_id
    WHERE NOT EXISTS (SELECT 1 FROM refunds r WHERE r.payment_id=v_payment.id AND r.status IN ('pending','processing','completed'));
    INSERT INTO purchase_outcomes (car_id,buyer_user_id,seller_user_id,payment_id,settlement_mode,status,amount,payment_receipt,collection_status,transfer_status,failure_reason)
    VALUES (v_payment.car_id,v_payment.user_id,v_seller,v_payment.id,v_mode,'refund_pending',v_payment.amount,p_receipt,'blocked','blocked','Seller verification required after payment')
    ON CONFLICT (payment_id) DO UPDATE SET status='refund_pending', settlement_mode=EXCLUDED.settlement_mode, failure_reason=EXCLUDED.failure_reason, payment_receipt=COALESCE(purchase_outcomes.payment_receipt,EXCLUDED.payment_receipt), updated_at=now();
    RETURN jsonb_build_object('payment_id',v_payment.id,'refund_required',true,'seller_id',v_seller,'settlement_mode',v_mode);
  END IF;

  SELECT * INTO v_outcome FROM purchase_outcomes WHERE payment_id=v_payment.id FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object('payment_id',v_payment.id,'escrow_id',v_outcome.escrow_id,'funded',v_outcome.settlement_mode='escrow','settlement_mode',v_outcome.settlement_mode,'outcome_id',v_outcome.id,'idempotent',true);
  END IF;

  IF v_mode='direct' THEN
    UPDATE cars SET sold=true,status='sold',"isPaid"=true,payment_status='paid',updated_at=now() WHERE id=v_car.id;
    INSERT INTO purchase_outcomes (car_id,buyer_user_id,seller_user_id,payment_id,settlement_mode,status,amount,payment_receipt,collection_status,transfer_status)
    VALUES (v_car.id,v_payment.user_id,v_seller,v_payment.id,'direct','payment_received',v_payment.amount,p_receipt,'ready','pending')
    RETURNING * INTO v_outcome;
    RETURN jsonb_build_object('payment_id',v_payment.id,'outcome_id',v_outcome.id,'settlement_mode','direct','funded',false,'idempotent',false);
  END IF;

  BEGIN
    SELECT COALESCE(dealer_commission,5)/100.0 INTO v_rate FROM platform_config LIMIT 1;
  EXCEPTION WHEN undefined_column THEN v_rate:=0.05;
  END;
  v_commission:=ROUND(v_payment.amount*v_rate);
  v_seller_amount:=v_payment.amount-v_commission;

  SELECT * INTO v_escrow FROM escrows WHERE payment=v_payment.id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO escrows (car,buyer,seller,payment,amount,commission,"sellerAmount",status,"fundedAt","autoReleaseEligibleAt",timeline,history)
    VALUES (v_car.id,v_payment.user_id,v_seller,v_payment.id,v_payment.amount,v_commission,v_seller_amount,'funded',now(),now()+interval '3 days',
      jsonb_build_object('depositReceived',true,'depositReceivedAt',now()),
      jsonb_build_array(jsonb_build_object('action','Escrow created and funded','at',now())))
    RETURNING * INTO v_escrow;
  END IF;

  INSERT INTO purchase_outcomes (car_id,buyer_user_id,seller_user_id,payment_id,escrow_id,settlement_mode,status,amount,payment_receipt,collection_status,transfer_status)
  VALUES (v_car.id,v_payment.user_id,v_seller,v_payment.id,v_escrow.id,'escrow','payment_received',v_payment.amount,p_receipt,'ready','pending')
  RETURNING * INTO v_outcome;

  RETURN jsonb_build_object('payment_id',v_payment.id,'escrow_id',v_escrow.id,'outcome_id',v_outcome.id,'funded',true,'settlement_mode','escrow','commission',v_commission,'seller_amount',v_seller_amount,'idempotent',false);
END;
$function$

