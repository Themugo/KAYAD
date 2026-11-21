-- KAYAD Escrow Live Operations Hardening
-- Extends the canonical escrow/dispute/payout architecture.
-- No second workflow is introduced.

-- ---------------------------------------------------------------------------
-- Provider replay identity for seller payouts.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_dealer_payouts_conversation_id
  ON public.dealer_payouts(conversation_id)
  WHERE conversation_id IS NOT NULL AND btrim(conversation_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_dealer_payouts_transaction_id
  ON public.dealer_payouts(transaction_id)
  WHERE transaction_id IS NOT NULL AND btrim(transaction_id) <> '';

-- ---------------------------------------------------------------------------
-- Database-backed append-only escrow audit boundary.
-- The application already writes escrow_audits through the canonical service;
-- this migration makes the storage contract enforce immutability as well.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escrow_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow uuid NOT NULL REFERENCES public.escrows(id) ON DELETE RESTRICT,
  action text NOT NULL,
  performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  performed_by_role text,
  performed_by_name text,
  performed_by_email text,
  ip_address inet,
  user_agent text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  state_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'api',
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escrow_audits_escrow_time
  ON public.escrow_audits(escrow, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_escrow_audits_actor_time
  ON public.escrow_audits(performed_by, timestamp DESC);

ALTER TABLE public.escrow_audits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.escrow_audits FROM anon, authenticated;
DROP POLICY IF EXISTS escrow_audits_service_only ON public.escrow_audits;
CREATE POLICY escrow_audits_service_only ON public.escrow_audits
  FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.kayad_escrow_audit_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Escrow audit records are immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_escrow_audit_immutable ON public.escrow_audits;
CREATE TRIGGER trg_escrow_audit_immutable
  BEFORE UPDATE OR DELETE ON public.escrow_audits
  FOR EACH ROW EXECUTE FUNCTION public.kayad_escrow_audit_immutable();

-- ---------------------------------------------------------------------------
-- Dispute resolution must produce the same canonical financial consequences
-- as ordinary escrow release/refund. Resolution is one DB transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_resolve_dispute_atomic(
  p_escrow_id UUID,p_actor_id UUID,p_decision TEXT,p_amount NUMERIC DEFAULT NULL,
  p_seller_amount NUMERIC DEFAULT NULL,p_buyer_amount NUMERIC DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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
$$;
REVOKE ALL ON FUNCTION public.kayad_resolve_dispute_atomic(UUID,UUID,TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_resolve_dispute_atomic(UUID,UUID,TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT,TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Legacy payment-less refund path must never consume the cash account directly.
-- It creates Refund Payable first, then the explicit completion operation clears
-- that payable against the real cash account.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_transition_escrow_atomic(
  p_escrow_id UUID,p_next_status TEXT,p_actor_id UUID,p_role TEXT,
  p_idempotency_key TEXT DEFAULT NULL,p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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
$$;
REVOKE ALL ON FUNCTION public.kayad_transition_escrow_atomic(UUID,TEXT,UUID,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_transition_escrow_atomic(UUID,TEXT,UUID,TEXT,TEXT,TEXT) TO service_role;
