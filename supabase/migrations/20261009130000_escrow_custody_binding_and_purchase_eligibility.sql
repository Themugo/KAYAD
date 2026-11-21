-- Escrow custody binding and purchase-time eligibility.
--
-- 1. kayad_verify_escrow_funding_atomic refused every escrow because nothing
--    ever set escrows.custodian_account. It now binds the active primary
--    custody account when none is bound (application code also binds at
--    creation) and records funding_method.
-- 2. kayad_settle_purchase_payment_atomic chose escrow vs direct from the raw
--    cars.escrow_enabled column. It now honours the decision frozen at payment
--    initiation (payments.metadata.escrowEligible), falling back to the old
--    column only for payments that predate it.
--
-- Additive CREATE OR REPLACE of existing functions; no data is rewritten.

CREATE OR REPLACE FUNCTION public.kayad_verify_escrow_funding_atomic(p_escrow_id uuid, p_actor_id uuid, p_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_escrow public.escrows%ROWTYPE; v_account public.escrow_accounts%ROWTYPE; v_rules JSONB; v_days INTEGER:=3; v_ref TEXT; v_payment public.payments%ROWTYPE; v_now TIMESTAMPTZ:=now(); v_bound UUID;
BEGIN
  SELECT * INTO v_escrow FROM public.escrows WHERE id=p_escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.status<>'pending' THEN RAISE EXCEPTION 'Only pending escrows can be funded'; END IF;
  IF v_escrow.amount<=0 THEN RAISE EXCEPTION 'Escrow amount must be greater than zero'; END IF;
  IF v_escrow.custodian_account IS NULL THEN
    -- Escrows created before custody binding existed (and any other unbound
    -- escrow) are bound to the administrator's current primary active account.
    SELECT id INTO v_bound FROM public.escrow_accounts WHERE is_active=true ORDER BY is_primary DESC, created_at ASC LIMIT 1;
    IF v_bound IS NULL THEN RAISE EXCEPTION 'Escrow has no configured custodian account'; END IF;
    UPDATE public.escrows SET custodian_account=v_bound, funding_method=COALESCE(funding_method,'bank_transfer') WHERE id=v_escrow.id;
    v_escrow.custodian_account:=v_bound;
  END IF;
  SELECT * INTO v_account FROM public.escrow_accounts WHERE id=v_escrow.custodian_account AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Configured escrow account is inactive or missing'; END IF;
  v_ref=NULLIF(btrim(p_reference),'');
  IF v_ref IS NULL THEN RAISE EXCEPTION 'Funding reference is required'; END IF;
  IF EXISTS (SELECT 1 FROM public.escrows WHERE funding_reference=v_ref AND id<>v_escrow.id) THEN
    RAISE EXCEPTION 'Funding reference has already been used';
  END IF;
  IF v_escrow.payment IS NOT NULL THEN
    SELECT * INTO v_payment FROM public.payments WHERE id=v_escrow.payment FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Escrow payment not found'; END IF;
    IF ROUND(v_payment.amount,2)<>ROUND(v_escrow.amount,2) THEN RAISE EXCEPTION 'Funding/payment amount mismatch'; END IF;
  END IF;

  SELECT escrow_rules INTO v_rules FROM public.platform_config LIMIT 1;
  v_days:=GREATEST(0,COALESCE((v_rules->>'releaseDays')::INTEGER,3));

  PERFORM public.kayad_post_ledger_entry_atomic(
    'escrow-funding:'||v_escrow.id::TEXT,
    v_escrow.buyer,
    v_escrow.amount,'KES','escrow_deposit','escrow',
    'Bank-transfer escrow funding verified',
    jsonb_build_object('escrow_id',v_escrow.id,'funding_reference',v_ref,'event','escrow_funding'),
    '1200','2000');

  UPDATE public.escrows SET status='funded',funding_method=COALESCE(funding_method,'bank_transfer'),"fundedAt"=v_now,
    funded_by=p_actor_id,funding_reference=v_ref,funding_verified_at=v_now,
    "autoReleaseEligibleAt"=v_now+make_interval(days=>v_days),
    timeline=COALESCE(timeline,'{}'::jsonb)||jsonb_build_object('depositReceived',true,'depositReceivedAt',v_now),
    history=COALESCE(history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('action','Bank funding verified — funds held in admin escrow account','by',p_actor_id,'at',v_now,'reference',v_ref)),
    "updatedAt"=v_now
  WHERE id=v_escrow.id;

  IF v_escrow.payment IS NOT NULL THEN
    UPDATE public.payments SET status='success',processed=true,paid_at=v_now,updated_at=v_now WHERE id=v_escrow.payment;
  END IF;
  RETURN jsonb_build_object('id',v_escrow.id,'status','funded','fundingReference',v_ref,'idempotent',false);
END;
$function$;

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

  -- The escrow decision is frozen when the payment is initiated (paymentService
  -- stores payments.metadata.escrowEligible from computeEffectiveEscrowEnabled:
  -- platform switch AND seller capability AND vehicle flag), so the badge the
  -- buyer saw and the settlement can never disagree. Payments initiated before
  -- this migration carry no such key and keep the legacy per-vehicle flag.
  v_mode := CASE
    WHEN v_payment.metadata IS NOT NULL AND jsonb_typeof(v_payment.metadata)='object' AND (v_payment.metadata -> 'escrowEligible') IS NOT NULL
      THEN CASE WHEN (v_payment.metadata ->> 'escrowEligible')::boolean THEN 'escrow' ELSE 'direct' END
    WHEN COALESCE(v_car.escrow_enabled,false) THEN 'escrow'
    ELSE 'direct'
  END;

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
$function$;
