CREATE OR REPLACE FUNCTION public.kayad_transition_escrow_atomic(p_escrow_id uuid, p_next_status text, p_actor_id uuid, p_role text, p_idempotency_key text DEFAULT NULL::text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_escrow public.escrows%ROWTYPE; v_payment public.payments%ROWTYPE; v_commission NUMERIC:=0; v_seller_amount NUMERIC:=0; v_now TIMESTAMPTZ:=now(); v_rate NUMERIC:=0.05;
BEGIN
  SELECT * INTO v_escrow FROM public.escrows WHERE id=p_escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF p_idempotency_key IS NOT NULL AND v_escrow."lastActionKey"=p_idempotency_key THEN RETURN jsonb_build_object('id',v_escrow.id,'status',v_escrow.status,'idempotent',true); END IF;
  IF v_escrow.status IN ('refunded','closed') THEN RAISE EXCEPTION 'Escrow is in terminal state %',v_escrow.status; END IF;
  IF NOT ((v_escrow.status='pending' AND p_next_status IN ('funded','disputed')) OR (v_escrow.status='funded' AND p_next_status IN ('vehicle_confirmed','disputed','released')) OR (v_escrow.status='vehicle_confirmed' AND p_next_status IN ('delivered','disputed','released')) OR (v_escrow.status='delivered' AND p_next_status IN ('released','disputed')) OR (v_escrow.status='disputed' AND p_next_status IN ('refunded','released')) OR (v_escrow.status='released' AND p_next_status IN ('closed','disputed'))) THEN RAISE EXCEPTION 'Transition from % to % is not allowed',v_escrow.status,p_next_status; END IF;
  IF NOT ((v_escrow.status='pending' AND p_next_status='funded' AND p_role='system') OR (v_escrow.status='pending' AND p_next_status='disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR (v_escrow.status='funded' AND p_next_status='vehicle_confirmed' AND p_role IN ('buyer','admin','superadmin')) OR (v_escrow.status='funded' AND p_next_status='disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR (v_escrow.status='funded' AND p_next_status='released' AND p_role='system') OR (v_escrow.status='vehicle_confirmed' AND p_next_status='delivered' AND p_role IN ('seller','admin','superadmin')) OR (v_escrow.status='vehicle_confirmed' AND p_next_status='disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR (v_escrow.status='vehicle_confirmed' AND p_next_status='released' AND p_role='system') OR (v_escrow.status='delivered' AND p_next_status='released' AND p_role IN ('admin','superadmin','system')) OR (v_escrow.status='delivered' AND p_next_status='disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR (v_escrow.status='disputed' AND p_next_status='refunded' AND p_role IN ('admin','superadmin')) OR (v_escrow.status='disputed' AND p_next_status='released' AND p_role IN ('admin','superadmin')) OR (v_escrow.status='released' AND p_next_status='closed' AND p_role IN ('admin','superadmin','system')) OR (v_escrow.status='released' AND p_next_status='disputed' AND p_role IN ('admin','superadmin'))) THEN RAISE EXCEPTION 'Role % is not authorized for transition % -> %',p_role,v_escrow.status,p_next_status; END IF;
  IF p_role='buyer' AND p_actor_id IS NOT NULL AND v_escrow.buyer<>p_actor_id THEN RAISE EXCEPTION 'Only the escrow buyer can perform this action'; END IF;
  IF p_role='seller' AND p_actor_id IS NOT NULL AND v_escrow.seller<>p_actor_id THEN RAISE EXCEPTION 'Only the escrow seller can perform this action'; END IF;
  IF p_next_status='released' AND v_escrow.status IN ('funded','vehicle_confirmed') AND (v_escrow."autoReleaseEligibleAt" IS NULL OR v_escrow."autoReleaseEligibleAt">v_now) THEN RAISE EXCEPTION 'Auto-release window has not yet opened'; END IF;
  IF p_next_status='released' THEN
    SELECT COALESCE(dealer_commission,5)/100.0 INTO v_rate FROM public.platform_config LIMIT 1;
    v_commission:=ROUND(v_escrow.amount*v_rate,2); v_seller_amount:=ROUND(v_escrow.amount-v_commission,2);
    IF v_seller_amount<0 OR v_commission<0 OR ROUND(v_seller_amount+v_commission,2)<>ROUND(v_escrow.amount,2) THEN RAISE EXCEPTION 'Escrow settlement amounts do not balance'; END IF;
    IF v_seller_amount>0 THEN PERFORM public.kayad_post_ledger_entry_atomic('escrow-release:'||v_escrow.id::TEXT,v_escrow.seller,v_seller_amount,'KES','escrow_release','seller','Escrow seller settlement',jsonb_build_object('escrow_id',v_escrow.id,'event','escrow_release'),'2000','5000'); END IF;
    IF v_commission>0 THEN PERFORM public.kayad_post_ledger_entry_atomic('escrow-commission:'||v_escrow.id::TEXT,v_escrow.seller,v_commission,'KES','commission','platform','Escrow platform commission',jsonb_build_object('escrow_id',v_escrow.id,'event','commission'),'2000','4000'); END IF;
  ELSIF p_next_status='refunded' THEN
    SELECT * INTO v_payment FROM public.payments WHERE id=v_escrow.payment FOR UPDATE;
    IF v_escrow.payment IS NOT NULL AND NOT FOUND THEN RAISE EXCEPTION 'Escrow payment not found'; END IF;
    IF v_escrow.payment IS NOT NULL AND ROUND(v_payment.amount,2)<>ROUND(v_escrow.amount,2) THEN RAISE EXCEPTION 'Refund/payment amount mismatch'; END IF;
    IF v_escrow.payment IS NOT NULL AND EXISTS (SELECT 1 FROM public.refunds WHERE payment_id=v_payment.id AND status='completed') THEN RAISE EXCEPTION 'A completed refund already exists'; END IF;
    PERFORM public.kayad_post_ledger_entry_atomic('escrow-refund:'||v_escrow.id::TEXT,v_escrow.buyer,v_escrow.amount,'KES','refund','buyer','Escrow refund reclassified to buyer payable',jsonb_build_object('escrow_id',v_escrow.id,'event','escrow_refund'),'2000','2100');
    IF v_escrow.payment IS NOT NULL THEN
      UPDATE public.payments SET status='refunded',updated_at=v_now WHERE id=v_escrow.payment;
      INSERT INTO public.refunds(payment_id,escrow_id,amount,reason,status,initiated_by,created_at,updated_at) SELECT v_escrow.payment,v_escrow.id,v_escrow.amount,p_reason,'pending',p_actor_id,v_now,v_now WHERE NOT EXISTS (SELECT 1 FROM public.refunds WHERE payment_id=v_escrow.payment AND status IN ('pending','processing'));
    END IF;
  END IF;
  UPDATE public.escrows SET status=p_next_status,"lastActionKey"=COALESCE(p_idempotency_key,"lastActionKey"),"updatedAt"=v_now,"fundedAt"=CASE WHEN p_next_status='funded' THEN v_now ELSE "fundedAt" END,"vehicleConfirmedAt"=CASE WHEN p_next_status='vehicle_confirmed' THEN v_now ELSE "vehicleConfirmedAt" END,"deliveredAt"=CASE WHEN p_next_status='delivered' THEN v_now ELSE "deliveredAt" END,"releasedAt"=CASE WHEN p_next_status='released' THEN v_now ELSE "releasedAt" END,"releasedBy"=CASE WHEN p_next_status='released' THEN p_actor_id ELSE "releasedBy" END,"refundedAt"=CASE WHEN p_next_status='refunded' THEN v_now ELSE "refundedAt" END,"refundedBy"=CASE WHEN p_next_status='refunded' THEN p_actor_id ELSE "refundedBy" END,"disputedAt"=CASE WHEN p_next_status='disputed' THEN v_now ELSE "disputedAt" END,"disputedBy"=CASE WHEN p_next_status='disputed' THEN p_actor_id ELSE "disputedBy" END,"disputeReason"=CASE WHEN p_next_status IN ('disputed','refunded') THEN p_reason ELSE "disputeReason" END,commission=CASE WHEN p_next_status='released' THEN v_commission ELSE commission END,"sellerAmount"=CASE WHEN p_next_status='released' THEN v_seller_amount ELSE "sellerAmount" END,history=COALESCE(history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('action',concat('Escrow transitioned to ',p_next_status),'by',p_actor_id,'at',v_now,'reason',p_reason)) WHERE id=v_escrow.id;
  IF p_next_status='released' AND v_escrow.car IS NOT NULL THEN UPDATE public.cars SET sold=true,status='sold',"isPaid"=true,updated_at=v_now WHERE id=v_escrow.car; END IF;
  IF p_next_status='released' AND v_escrow.payment IS NOT NULL THEN UPDATE public.payments SET status='released',platform_fee=v_commission,dealer_amount=v_seller_amount,updated_at=v_now WHERE id=v_escrow.payment; END IF;
  IF p_next_status='refunded' AND v_escrow.car IS NOT NULL THEN UPDATE public.cars SET sold=false,"isPaid"=false,updated_at=v_now WHERE id=v_escrow.car; END IF;
  RETURN jsonb_build_object('id',v_escrow.id,'status',p_next_status,'commission',v_commission,'sellerAmount',v_seller_amount,'refundStatus',CASE WHEN p_next_status='refunded' THEN 'pending' ELSE NULL END,'idempotent',false);
END;
$function$

