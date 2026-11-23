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
  v_seller UUID;
  v_commission NUMERIC;
  v_seller_amount NUMERIC;
  v_rate NUMERIC := 0.05;
  v_verified BOOLEAN := true;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.type <> 'purchase' THEN RAISE EXCEPTION 'Payment is not a purchase payment'; END IF;

  SELECT * INTO v_car FROM cars WHERE id = v_payment.car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle not found for purchase payment'; END IF;
  v_seller := v_car.dealer_id;
  IF v_seller IS NULL THEN v_seller := v_payment.user_id; END IF;

  IF EXISTS (SELECT 1 FROM dealers d WHERE d."user" = v_seller) THEN
    SELECT (d.approved AND NOT COALESCE(d.is_suspended, false)) INTO v_verified
      FROM dealers d WHERE d."user" = v_seller;
    IF NOT v_verified AND EXISTS (
      SELECT 1 FROM dealer_verifications dv
       WHERE dv."user" = v_seller AND dv.verification_status = 'approved'
    ) THEN
      v_verified := true;
    END IF;
  END IF;

  UPDATE payments
     SET status = 'success', mpesa_receipt = p_receipt, paid_at = now(), processed = true, updated_at = now()
   WHERE id = v_payment.id;

  IF NOT v_verified THEN
    INSERT INTO refunds (payment_id, amount, reason, status, initiated_by)
    SELECT v_payment.id, v_payment.amount, 'Seller verification required after payment', 'pending', v_payment.user_id
     WHERE NOT EXISTS (SELECT 1 FROM refunds r WHERE r.payment_id = v_payment.id AND r.status IN ('pending','processing','completed'));
    RETURN jsonb_build_object('payment_id', v_payment.id, 'refund_required', true, 'seller_id', v_seller);
  END IF;

  SELECT * INTO v_escrow FROM escrows WHERE payment = v_payment.id FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object('payment_id', v_payment.id, 'escrow_id', v_escrow.id, 'funded', true, 'idempotent', true);
  END IF;

  BEGIN
    SELECT COALESCE(dealer_commission, 5) / 100.0 INTO v_rate FROM platform_config LIMIT 1;
  EXCEPTION WHEN undefined_column THEN
    v_rate := 0.05;
  END;
  v_commission := ROUND(v_payment.amount * v_rate);
  v_seller_amount := v_payment.amount - v_commission;

  INSERT INTO escrows (
    car, buyer, seller, payment, amount, commission, "sellerAmount", status,
    "fundedAt", "autoReleaseEligibleAt", timeline, history
  ) VALUES (
    v_payment.car_id, v_payment.user_id, v_seller, v_payment.id, v_payment.amount,
    v_commission, v_seller_amount, 'funded', now(), now() + interval '3 days',
    jsonb_build_object('depositReceived', true, 'depositReceivedAt', now()),
    jsonb_build_array(jsonb_build_object('action', 'Escrow created and funded', 'at', now()))
  ) RETURNING * INTO v_escrow;

  RETURN jsonb_build_object('payment_id', v_payment.id, 'escrow_id', v_escrow.id,
                            'funded', true, 'commission', v_commission,
                            'seller_amount', v_seller_amount, 'idempotent', false);
END;
$function$

