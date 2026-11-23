CREATE OR REPLACE FUNCTION public.kayad_resolve_dispute_atomic(p_escrow_id uuid, p_actor_id uuid, p_decision text, p_amount numeric DEFAULT NULL::numeric, p_seller_amount numeric DEFAULT NULL::numeric, p_buyer_amount numeric DEFAULT NULL::numeric, p_reason text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_escrow public.escrows%ROWTYPE;
  v_commission NUMERIC:=0;
  v_refund NUMERIC:=0;
  v_seller NUMERIC:=0;
  v_buyer NUMERIC:=0;
  v_status TEXT;
  v_now TIMESTAMPTZ:=now();
BEGIN
  SELECT * INTO v_escrow FROM public.escrows WHERE id=p_escrow_id FOR UPDATE;
  IF NOT FOUND OR v_escrow.status<>'disputed' THEN RAISE EXCEPTION 'Escrow is not in disputed state'; END IF;
  IF p_actor_id IS NULL THEN RAISE EXCEPTION 'Decision actor required'; END IF;
  IF p_decision NOT IN ('full_refund','partial_refund','release_funds','split_settlement','dismissed') THEN
    RAISE EXCEPTION 'Unsupported dispute decision: %',p_decision;
  END IF;
  IF p_idempotency_key IS NOT NULL
     AND v_escrow."disputeLastActionKey"=p_idempotency_key
     AND v_escrow."disputeResolution" IS NOT NULL THEN
    RETURN jsonb_build_object('id',v_escrow.id,'status',v_escrow.status,'resolution',v_escrow."disputeResolution",'idempotent',true);
  END IF;

  v_commission:=ROUND(COALESCE(v_escrow.commission,0),2);
  CASE p_decision
    WHEN 'full_refund' THEN
      v_refund:=ROUND(v_escrow.amount,2); v_buyer:=v_refund; v_seller:=0; v_commission:=0; v_status:='refunded';
    WHEN 'partial_refund' THEN
      v_refund:=COALESCE(p_amount,-1);
      IF v_refund<=0 OR v_refund>=v_escrow.amount THEN RAISE EXCEPTION 'Invalid partial refund'; END IF;
      v_buyer:=v_refund; v_seller:=COALESCE(p_seller_amount,ROUND(v_escrow.amount-v_buyer,2));
      v_commission:=ROUND(v_escrow.amount-v_buyer-v_seller,2);
      IF v_commission<0 THEN RAISE EXCEPTION 'Settlement amounts exceed escrow'; END IF;
      v_status:='released';
    WHEN 'release_funds','dismissed' THEN
      v_seller:=ROUND(v_escrow.amount-v_commission,2); v_buyer:=0; v_status:='released';
    WHEN 'split_settlement' THEN
      v_seller:=COALESCE(p_seller_amount,-1); v_buyer:=COALESCE(p_buyer_amount,-1);
      v_commission:=ROUND(v_escrow.amount-v_seller-v_buyer,2);
      IF v_seller<0 OR v_buyer<0 OR v_commission<0 THEN RAISE EXCEPTION 'Invalid split settlement'; END IF;
      v_status:='released';
  END CASE;

  IF ROUND(v_seller+v_buyer+v_commission,2)<>ROUND(v_escrow.amount,2) THEN
    RAISE EXCEPTION 'Dispute settlement does not balance';
  END IF;

  IF v_buyer>0 THEN
    PERFORM public.kayad_post_ledger_entry_atomic(
      'dispute-refund:'||v_escrow.id::TEXT,v_escrow.buyer,v_buyer,'KES','dispute_refund','customer',
      'Dispute buyer refund payable',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision), '2000','2100');
    IF v_escrow.payment IS NOT NULL THEN
      INSERT INTO public.refunds(payment_id,escrow_id,amount,reason,status,initiated_by,created_at,updated_at)
      SELECT v_escrow.payment,v_escrow.id,v_buyer,COALESCE(p_reason,'Dispute resolution'),'pending',p_actor_id,v_now,v_now
      WHERE NOT EXISTS (
        SELECT 1 FROM public.refunds r
        WHERE r.payment_id=v_escrow.payment AND r.escrow_id=v_escrow.id AND r.status IN ('pending','processing','completed')
      );
    END IF;
  END IF;

  IF v_seller>0 THEN
    PERFORM public.kayad_post_ledger_entry_atomic(
      'dispute-release-seller:'||v_escrow.id::TEXT,v_escrow.seller,v_seller,'KES','dispute_release','seller',
      'Dispute seller settlement',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision), '2000','5000');
  END IF;

  IF v_commission>0 THEN
    PERFORM public.kayad_post_ledger_entry_atomic(
      'dispute-commission:'||v_escrow.id::TEXT,v_escrow.seller,v_commission,'KES','dispute_commission','platform',
      'Dispute platform commission',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision), '2000','4000');
  END IF;

  UPDATE public.escrows SET
    status=v_status,
    commission=v_commission,
    "sellerAmount"=v_seller,
    "disputeLastActionKey"=COALESCE(p_idempotency_key,"disputeLastActionKey"),
    "disputeWorkflowStatus"='resolved',
    "disputeResolution"=jsonb_build_object(
      'decision',p_decision,'amount',CASE WHEN p_decision IN ('partial_refund','full_refund') THEN v_buyer ELSE v_escrow.amount END,
      'sellerAmount',v_seller,'buyerAmount',v_buyer,'platformFee',v_commission,'reason',COALESCE(p_reason,''),
      'decidedBy',p_actor_id,'decidedAt',v_now,'implemented',true,'implementedAt',v_now),
    "updatedAt"=v_now,
    "releasedAt"=CASE WHEN v_status='released' THEN v_now ELSE "releasedAt" END,
    "releasedBy"=CASE WHEN v_status='released' THEN p_actor_id ELSE "releasedBy" END,
    "refundedAt"=CASE WHEN v_status='refunded' THEN v_now ELSE "refundedAt" END,
    "refundedBy"=CASE WHEN v_status='refunded' THEN p_actor_id ELSE "refundedBy" END,
    disputeTimeline=COALESCE(disputeTimeline,'[]'::jsonb)||jsonb_build_array(
      jsonb_build_object('action',format('Resolved — %s',p_decision),'actor',p_actor_id,'at',v_now,'note',COALESCE(p_reason,'')))
  WHERE id=v_escrow.id;

  IF v_escrow.payment IS NOT NULL THEN
    UPDATE public.payments SET
      status=CASE WHEN v_status='refunded' THEN 'refunded' ELSE 'released' END,
      platform_fee=v_commission,dealer_amount=v_seller,updated_at=v_now
    WHERE id=v_escrow.payment;
  END IF;

  IF v_escrow.car IS NOT NULL THEN
    UPDATE public.cars SET sold=(v_status='released'),"isPaid"=(v_status='released'),updated_at=v_now WHERE id=v_escrow.car;
  END IF;

  PERFORM public.kayad_record_financial_workflow_event_atomic(
    'dispute',v_escrow.id,'dispute-resolution:'||v_escrow.id::TEXT,'financial_consequence',
    v_escrow.amount,'KES',NULL,jsonb_build_object('decision',p_decision,'buyerAmount',v_buyer,'sellerAmount',v_seller,'platformFee',v_commission));

  RETURN jsonb_build_object('id',v_escrow.id,'status',v_status,'buyerAmount',v_buyer,'sellerAmount',v_seller,'platformFee',v_commission,'idempotent',false);
END;
$function$

