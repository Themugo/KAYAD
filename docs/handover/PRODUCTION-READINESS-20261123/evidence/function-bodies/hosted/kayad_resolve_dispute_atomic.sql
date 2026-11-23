CREATE OR REPLACE FUNCTION public.kayad_resolve_dispute_atomic(p_escrow_id uuid, p_actor_id uuid, p_decision text, p_amount numeric DEFAULT NULL::numeric, p_seller_amount numeric DEFAULT NULL::numeric, p_buyer_amount numeric DEFAULT NULL::numeric, p_reason text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_escrow public.escrows%ROWTYPE; v_actor_role text; v_commission numeric:=0; v_refund numeric:=0; v_seller numeric:=0; v_buyer numeric:=0; v_status text; v_event jsonb; v_refund_id uuid; v_existing_refund numeric:=0;
BEGIN
SELECT * INTO v_escrow FROM public.escrows WHERE id=p_escrow_id FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
IF p_idempotency_key IS NOT NULL AND v_escrow."disputeLastActionKey"=p_idempotency_key AND v_escrow."disputeResolution" IS NOT NULL THEN
 RETURN jsonb_build_object('id',v_escrow.id,'status',v_escrow.status,'resolution',v_escrow."disputeResolution",'idempotent',true);
END IF;
IF v_escrow.status<>'disputed' THEN RAISE EXCEPTION 'Escrow is not in disputed state'; END IF;
SELECT role INTO v_actor_role FROM public.users WHERE id=p_actor_id;
IF v_actor_role NOT IN ('admin','superadmin','escrow_officer') THEN RAISE EXCEPTION 'Only an authorized dispute officer can resolve an escrow dispute'; END IF;
IF p_decision NOT IN ('full_refund','partial_refund','release_funds','split_settlement','dismissed') THEN RAISE EXCEPTION 'Unsupported dispute decision: %',p_decision; END IF;
CASE p_decision
WHEN 'full_refund' THEN v_refund:=v_escrow.amount; v_buyer:=v_refund; v_status:='refunded';
WHEN 'partial_refund' THEN v_refund:=COALESCE(p_amount,-1); IF v_refund<=0 OR v_refund>=v_escrow.amount THEN RAISE EXCEPTION 'Invalid partial refund'; END IF; v_buyer:=v_refund; v_seller:=v_escrow.amount-v_refund; v_status:='released';
WHEN 'release_funds','dismissed' THEN v_commission:=ROUND(COALESCE(v_escrow.commission,0),2); v_seller:=ROUND(v_escrow.amount-v_commission,2); v_status:='released';
WHEN 'split_settlement' THEN v_seller:=COALESCE(p_seller_amount,-1); v_buyer:=COALESCE(p_buyer_amount,-1); v_commission:=ROUND(v_escrow.amount-v_seller-v_buyer,2); IF v_seller<0 OR v_buyer<0 OR v_commission<0 OR ROUND(v_seller+v_buyer+v_commission,2)<>ROUND(v_escrow.amount,2) THEN RAISE EXCEPTION 'Invalid split settlement'; END IF; v_status:='released';
END CASE;
IF v_status='refunded' THEN
 IF v_escrow.payment IS NULL THEN RAISE EXCEPTION 'Full refund requires a payment-linked escrow'; END IF;
 SELECT COALESCE(SUM(amount),0) INTO v_existing_refund FROM public.refunds WHERE payment_id=v_escrow.payment AND status IN ('pending','processing','completed');
 IF v_existing_refund+v_buyer>v_escrow.amount THEN RAISE EXCEPTION 'Dispute refund exceeds remaining refundable balance'; END IF;
 INSERT INTO public.refunds(payment_id,escrow_id,amount,reason,status,initiated_by,provider_reference,created_at,updated_at) VALUES(v_escrow.payment,v_escrow.id,v_buyer,COALESCE(p_reason,'Dispute full refund'),'pending',p_actor_id,'DISPUTE-'||v_escrow.id::text,now(),now()) RETURNING id INTO v_refund_id;
 PERFORM public.kayad_post_ledger_entry_atomic('dispute-refund:'||v_escrow.id::text,p_actor_id,v_buyer,'KES','dispute_refund','customer','Dispute full refund',jsonb_build_object('escrow_id',v_escrow.id,'refund_id',v_refund_id,'decision',p_decision),'5000','1000');
ELSE
 IF v_seller>0 THEN PERFORM public.kayad_post_ledger_entry_atomic('dispute-release-seller:'||v_escrow.id::text,p_actor_id,v_seller,'KES','dispute_release','seller','Dispute seller settlement',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision),'5000','1000'); END IF;
 IF v_buyer>0 THEN PERFORM public.kayad_post_ledger_entry_atomic('dispute-release-buyer:'||v_escrow.id::text,p_actor_id,v_buyer,'KES','dispute_refund','customer','Dispute buyer settlement',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision),'5000','1000'); END IF;
 IF v_commission>0 THEN PERFORM public.kayad_post_ledger_entry_atomic('dispute-commission:'||v_escrow.id::text,p_actor_id,v_commission,'KES','dispute_commission','platform','Dispute platform commission',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision),'1000','4000'); END IF;
END IF;
UPDATE public.escrows SET status=v_status,commission=v_commission,"sellerAmount"=v_seller,"disputeLastActionKey"=COALESCE(p_idempotency_key,"disputeLastActionKey"),"disputeWorkflowStatus"='resolved',"disputeResolution"=jsonb_build_object('decision',p_decision,'amount',CASE WHEN p_decision IN ('partial_refund','full_refund') THEN v_buyer ELSE v_escrow.amount END,'sellerAmount',v_seller,'buyerAmount',v_buyer,'platformFee',v_commission,'reason',COALESCE(p_reason,''),'decidedBy',p_actor_id,'decidedAt',now(),'implemented',true,'refundId',v_refund_id),"updatedAt"=now(),"releasedAt"=CASE WHEN v_status='released' THEN now() ELSE "releasedAt" END,"releasedBy"=CASE WHEN v_status='released' THEN p_actor_id ELSE "releasedBy" END,"refundedAt"=CASE WHEN v_status='refunded' THEN now() ELSE "refundedAt" END,"refundedBy"=CASE WHEN v_status='refunded' THEN p_actor_id ELSE "refundedBy" END WHERE id=v_escrow.id;
IF v_escrow.payment IS NOT NULL THEN UPDATE public.payments SET status=CASE WHEN v_status='refunded' THEN 'refunded' ELSE 'released' END,platform_fee=v_commission,dealer_amount=v_seller,updated_at=now() WHERE id=v_escrow.payment; END IF;
v_event:=public.kayad_record_financial_workflow_event_atomic('dispute',v_escrow.id,'dispute-resolution:'||v_escrow.id::text,'financial_consequence',v_escrow.amount,'KES',NULL,jsonb_build_object('decision',p_decision,'buyerAmount',v_buyer,'sellerAmount',v_seller,'platformFee',v_commission,'refundId',v_refund_id));
RETURN jsonb_build_object('id',v_escrow.id,'status',v_status,'buyerAmount',v_buyer,'sellerAmount',v_seller,'platformFee',v_commission,'refundId',v_refund_id,'event',v_event,'idempotent',false);
END;$function$

