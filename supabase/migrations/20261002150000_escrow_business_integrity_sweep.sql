-- KAYAD Escrow Business Integrity Sweep
-- Canonical escrow financial/custody corrections. This migration extends the
-- existing escrow/payment/ledger/payout architecture; it does not introduce a
-- second escrow implementation.

-- ---------------------------------------------------------------------------
-- Ledger chart of accounts used by the canonical escrow lifecycle.
-- ---------------------------------------------------------------------------
INSERT INTO public.ledger_accounts(code,name,type,category,description)
VALUES
 ('1000','Cash - M-Pesa','asset','cash','M-Pesa payment collections and B2C disbursements'),
 ('1100','Escrow Holdings','asset','escrow','Funds held in escrow custody'),
 ('1200','Bank Account','asset','cash','KAYAD custody bank account'),
 ('2000','Escrow Payable','liability','escrow','Funds owed to transaction beneficiaries'),
 ('2100','Refund Payable','liability','refund','Funds owed back to buyers'),
 ('2200','Commission Payable','liability','commission','Unpaid commissions'),
 ('3000','Retained Earnings','equity','reserve','Platform retained earnings'),
 ('4000','Commission Revenue','revenue','commission','Platform commission revenue'),
 ('4100','Subscription Revenue','revenue','subscription','Dealer subscription revenue'),
 ('4200','Inspection Fees','revenue','inspection','Inspection fee revenue'),
 ('4300','Listing Fees','revenue','fees','Listing and promotion fee revenue'),
 ('5000','B2C Disbursement Payable','liability','payable','Seller funds released but not yet disbursed')
ON CONFLICT (code) DO NOTHING;

-- A bank reference must identify one custody event only.
CREATE UNIQUE INDEX IF NOT EXISTS uq_escrows_funding_reference
  ON public.escrows(funding_reference)
  WHERE funding_reference IS NOT NULL AND btrim(funding_reference) <> '';

-- ---------------------------------------------------------------------------
-- Canonical escrow transition: financial consequence and state mutation share
-- one database transaction. Release/refund therefore cannot commit state while
-- silently failing to create its ledger consequence.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_transition_escrow_atomic(
  p_escrow_id UUID,
  p_next_status TEXT,
  p_actor_id UUID,
  p_role TEXT,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_escrow public.escrows%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_commission NUMERIC := 0;
  v_seller_amount NUMERIC := 0;
  v_now TIMESTAMPTZ := now();
  v_rate NUMERIC := 0.05;
BEGIN
  SELECT * INTO v_escrow FROM public.escrows WHERE id=p_escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;

  IF p_idempotency_key IS NOT NULL AND v_escrow."lastActionKey"=p_idempotency_key THEN
    RETURN jsonb_build_object('id',v_escrow.id,'status',v_escrow.status,'idempotent',true);
  END IF;

  IF v_escrow.status IN ('refunded','closed') THEN
    RAISE EXCEPTION 'Escrow is in terminal state %',v_escrow.status;
  END IF;

  IF NOT (
    (v_escrow.status='pending' AND p_next_status IN ('funded','disputed')) OR
    (v_escrow.status='funded' AND p_next_status IN ('vehicle_confirmed','disputed','released')) OR
    (v_escrow.status='vehicle_confirmed' AND p_next_status IN ('delivered','disputed','released')) OR
    (v_escrow.status='delivered' AND p_next_status IN ('released','disputed')) OR
    (v_escrow.status='disputed' AND p_next_status IN ('refunded','released')) OR
    (v_escrow.status='released' AND p_next_status IN ('closed','disputed'))
  ) THEN
    RAISE EXCEPTION 'Transition from % to % is not allowed',v_escrow.status,p_next_status;
  END IF;

  IF NOT (
    (v_escrow.status='pending' AND p_next_status='funded' AND p_role='system') OR
    (v_escrow.status='pending' AND p_next_status='disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR
    (v_escrow.status='funded' AND p_next_status='vehicle_confirmed' AND p_role IN ('buyer','admin','superadmin')) OR
    (v_escrow.status='funded' AND p_next_status='disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR
    (v_escrow.status='funded' AND p_next_status='released' AND p_role='system') OR
    (v_escrow.status='vehicle_confirmed' AND p_next_status='delivered' AND p_role IN ('seller','admin','superadmin')) OR
    (v_escrow.status='vehicle_confirmed' AND p_next_status='disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR
    (v_escrow.status='vehicle_confirmed' AND p_next_status='released' AND p_role='system') OR
    (v_escrow.status='delivered' AND p_next_status='released' AND p_role IN ('admin','superadmin','system')) OR
    (v_escrow.status='delivered' AND p_next_status='disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR
    (v_escrow.status='disputed' AND p_next_status='refunded' AND p_role IN ('admin','superadmin')) OR
    (v_escrow.status='disputed' AND p_next_status='released' AND p_role IN ('admin','superadmin')) OR
    (v_escrow.status='released' AND p_next_status='closed' AND p_role IN ('admin','superadmin','system')) OR
    (v_escrow.status='released' AND p_next_status='disputed' AND p_role IN ('admin','superadmin'))
  ) THEN
    RAISE EXCEPTION 'Role % is not authorized for transition % -> %',p_role,v_escrow.status,p_next_status;
  END IF;

  IF p_role='buyer' AND p_actor_id IS NOT NULL AND v_escrow.buyer<>p_actor_id THEN
    RAISE EXCEPTION 'Only the escrow buyer can perform this action';
  END IF;
  IF p_role='seller' AND p_actor_id IS NOT NULL AND v_escrow.seller<>p_actor_id THEN
    RAISE EXCEPTION 'Only the escrow seller can perform this action';
  END IF;

  IF p_next_status='released'
     AND v_escrow.status IN ('funded','vehicle_confirmed')
     AND (v_escrow."autoReleaseEligibleAt" IS NULL OR v_escrow."autoReleaseEligibleAt">v_now) THEN
    RAISE EXCEPTION 'Auto-release window has not yet opened';
  END IF;

  IF p_next_status='released' THEN
    SELECT COALESCE(dealer_commission,5)/100.0 INTO v_rate
      FROM public.platform_config LIMIT 1;
    v_commission:=ROUND(v_escrow.amount*v_rate,2);
    v_seller_amount:=ROUND(v_escrow.amount-v_commission,2);
    IF v_seller_amount<0 OR v_commission<0 OR ROUND(v_seller_amount+v_commission,2)<>ROUND(v_escrow.amount,2) THEN
      RAISE EXCEPTION 'Escrow settlement amounts do not balance';
    END IF;

    -- Release consumes the escrow payable created by the funding event.
    -- It never debits the cash account directly.
    IF v_seller_amount>0 THEN
      PERFORM public.kayad_post_ledger_entry_atomic(
        'escrow-release:'||v_escrow.id::TEXT,
        v_escrow.seller,
        v_seller_amount,'KES','escrow_release','seller',
        'Escrow seller settlement',
        jsonb_build_object('escrow_id',v_escrow.id,'event','escrow_release'),
        '2000','5000');
    END IF;
    IF v_commission>0 THEN
      PERFORM public.kayad_post_ledger_entry_atomic(
        'escrow-commission:'||v_escrow.id::TEXT,
        v_escrow.seller,
        v_commission,'KES','commission','platform',
        'Escrow platform commission',
        jsonb_build_object('escrow_id',v_escrow.id,'event','commission'),
        '2000','4000');
    END IF;
  ELSIF p_next_status='refunded' THEN
    IF v_escrow.payment IS NOT NULL THEN
      SELECT * INTO v_payment FROM public.payments WHERE id=v_escrow.payment FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Escrow payment not found'; END IF;
      IF ROUND(v_payment.amount,2)<>ROUND(v_escrow.amount,2) THEN
        RAISE EXCEPTION 'Refund/payment amount mismatch: escrow %, payment %',v_escrow.amount,v_payment.amount;
      END IF;
      IF EXISTS (SELECT 1 FROM public.refunds WHERE payment_id=v_payment.id AND status='completed') THEN
        RAISE EXCEPTION 'A completed refund already exists for payment %',v_payment.id;
      END IF;
      -- Refund consumes the escrow payable and returns the custody asset.
      PERFORM public.kayad_post_ledger_entry_atomic(
        'escrow-refund:'||v_escrow.id::TEXT,
        v_escrow.buyer,
        v_escrow.amount,'KES','refund','buyer',
        'Escrow refund reclassified to buyer payable',
        jsonb_build_object('escrow_id',v_escrow.id,'event','escrow_refund'),
        '2000','2100');
      UPDATE public.payments SET status='refunded',updated_at=v_now WHERE id=v_escrow.payment;
      INSERT INTO public.refunds(payment_id,escrow_id,amount,reason,status,initiated_by,created_at,updated_at)
      SELECT v_escrow.payment,v_escrow.id,v_escrow.amount,p_reason,'pending',p_actor_id,v_now,v_now
      WHERE NOT EXISTS (
        SELECT 1 FROM public.refunds
        WHERE payment_id=v_escrow.payment AND status IN ('pending','processing')
      );
    ELSE
      -- Legacy escrow without a payment reference still requires an explicit
      -- financial event; no silent status-only refund is permitted.
      PERFORM public.kayad_post_ledger_entry_atomic(
        'escrow-refund:'||v_escrow.id::TEXT,
        v_escrow.buyer,
        v_escrow.amount,'KES','refund','buyer',
        'Escrow refund reclassified to buyer payable',
        jsonb_build_object('escrow_id',v_escrow.id,'event','escrow_refund','legacy_paymentless',true),
        '2000','1100');
    END IF;
  END IF;

  UPDATE public.escrows SET
    status=p_next_status,
    "lastActionKey"=COALESCE(p_idempotency_key,"lastActionKey"),
    "updatedAt"=v_now,
    "fundedAt"=CASE WHEN p_next_status='funded' THEN v_now ELSE "fundedAt" END,
    "vehicleConfirmedAt"=CASE WHEN p_next_status='vehicle_confirmed' THEN v_now ELSE "vehicleConfirmedAt" END,
    "deliveredAt"=CASE WHEN p_next_status='delivered' THEN v_now ELSE "deliveredAt" END,
    "releasedAt"=CASE WHEN p_next_status='released' THEN v_now ELSE "releasedAt" END,
    "releasedBy"=CASE WHEN p_next_status='released' THEN p_actor_id ELSE "releasedBy" END,
    "refundedAt"=CASE WHEN p_next_status='refunded' THEN v_now ELSE "refundedAt" END,
    "refundedBy"=CASE WHEN p_next_status='refunded' THEN p_actor_id ELSE "refundedBy" END,
    "disputedAt"=CASE WHEN p_next_status='disputed' THEN v_now ELSE "disputedAt" END,
    "disputedBy"=CASE WHEN p_next_status='disputed' THEN p_actor_id ELSE "disputedBy" END,
    "disputeReason"=CASE WHEN p_next_status IN ('disputed','refunded') THEN p_reason ELSE "disputeReason" END,
    commission=CASE WHEN p_next_status='released' THEN v_commission ELSE commission END,
    "sellerAmount"=CASE WHEN p_next_status='released' THEN v_seller_amount ELSE "sellerAmount" END,
    timeline=COALESCE(timeline,'{}'::jsonb)||jsonb_build_object(
      CASE p_next_status WHEN 'funded' THEN 'depositReceived' WHEN 'vehicle_confirmed' THEN 'inspectionCompleted' WHEN 'delivered' THEN 'deliveryConfirmed' WHEN 'released' THEN 'fundsReleased' ELSE 'stateChanged' END,true),
    history=COALESCE(history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('action',concat('Escrow transitioned to ',p_next_status),'by',p_actor_id,'at',v_now,'reason',p_reason))
  WHERE id=v_escrow.id;

  IF p_next_status='released' THEN
    IF v_escrow.car IS NOT NULL THEN
      UPDATE public.cars SET sold=true,status='sold',"isPaid"=true,updated_at=v_now WHERE id=v_escrow.car;
    END IF;
    IF v_escrow.payment IS NOT NULL THEN
      UPDATE public.payments SET status='released',platform_fee=v_commission,dealer_amount=v_seller_amount,updated_at=v_now WHERE id=v_escrow.payment;
    END IF;
  ELSIF p_next_status='refunded' AND v_escrow.car IS NOT NULL THEN
    UPDATE public.cars SET sold=false,"isPaid"=false,updated_at=v_now WHERE id=v_escrow.car;
  END IF;

  RETURN jsonb_build_object('id',v_escrow.id,'status',p_next_status,'commission',v_commission,'sellerAmount',v_seller_amount,'refundStatus',CASE WHEN p_next_status='refunded' THEN 'pending' ELSE NULL END,'idempotent',false);
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_transition_escrow_atomic(UUID,TEXT,UUID,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_transition_escrow_atomic(UUID,TEXT,UUID,TEXT,TEXT,TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Bank-transfer custody verification now records the funding event in the
-- same transaction as the escrow state change.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_verify_escrow_funding_atomic(
  p_escrow_id UUID,p_actor_id UUID,p_reference TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_escrow public.escrows%ROWTYPE; v_account public.escrow_accounts%ROWTYPE; v_rules JSONB; v_days INTEGER:=3; v_ref TEXT; v_payment public.payments%ROWTYPE; v_now TIMESTAMPTZ:=now();
BEGIN
  SELECT * INTO v_escrow FROM public.escrows WHERE id=p_escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.status<>'pending' THEN RAISE EXCEPTION 'Only pending escrows can be funded'; END IF;
  IF v_escrow.amount<=0 THEN RAISE EXCEPTION 'Escrow amount must be greater than zero'; END IF;
  IF v_escrow.custodian_account IS NULL THEN RAISE EXCEPTION 'Escrow has no configured custodian account'; END IF;
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

  UPDATE public.escrows SET status='funded',"fundedAt"=v_now,
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
$$;
REVOKE ALL ON FUNCTION public.kayad_verify_escrow_funding_atomic(UUID,UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_verify_escrow_funding_atomic(UUID,UUID,TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Payout state machine. A paid payout is terminal; only failed/cancelled
-- payouts may be retried by returning to processing through the canonical
-- provider call.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_mark_dealer_payout_atomic(
  p_payout UUID,p_status TEXT,p_conversation_id TEXT DEFAULT NULL,
  p_transaction_id TEXT DEFAULT NULL,p_failure_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v public.dealer_payouts%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.dealer_payouts WHERE id=p_payout FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout not found'; END IF;
  IF p_status NOT IN ('processing','paid','failed','cancelled') THEN RAISE EXCEPTION 'Invalid payout status'; END IF;
  IF v.status='paid' AND p_status<>'paid' THEN RAISE EXCEPTION 'Paid payout is terminal'; END IF;
  IF v.status='processing' AND p_status='processing' THEN
    RETURN to_jsonb(v)||jsonb_build_object('idempotent',true);
  END IF;
  IF v.status='pending' AND p_status NOT IN ('processing','cancelled','failed') THEN RAISE EXCEPTION 'Invalid pending payout transition'; END IF;
  IF v.status IN ('failed','cancelled') AND p_status NOT IN ('processing','failed','cancelled') THEN RAISE EXCEPTION 'Invalid payout retry transition'; END IF;
  IF v.status='processing' AND p_status NOT IN ('paid','failed','cancelled') THEN RAISE EXCEPTION 'Invalid processing payout transition'; END IF;

  UPDATE public.dealer_payouts SET
    status=p_status,
    conversation_id=COALESCE(p_conversation_id,conversation_id),
    transaction_id=COALESCE(p_transaction_id,transaction_id),
    failure_reason=CASE WHEN p_failure_reason IS NOT NULL THEN p_failure_reason ELSE failure_reason END,
    initiated_at=CASE WHEN p_status='processing' THEN COALESCE(initiated_at,now()) ELSE initiated_at END,
    completed_at=CASE WHEN p_status IN ('paid','failed','cancelled') THEN COALESCE(completed_at,now()) ELSE completed_at END,
    updated_at=now()
  WHERE id=p_payout RETURNING * INTO v;
  RETURN to_jsonb(v)||jsonb_build_object('idempotent',false);
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_mark_dealer_payout_atomic(UUID,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_mark_dealer_payout_atomic(UUID,TEXT,TEXT,TEXT,TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Correct dispute financial consequences: all settlements consume the escrow
-- payable (2000). 2100 is reserved for a refund payable already separated from
-- escrow custody, not for the original escrow release/refund event.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_resolve_dispute_atomic(
  p_escrow_id UUID,p_actor_id UUID,p_decision TEXT,p_amount NUMERIC DEFAULT NULL,
  p_seller_amount NUMERIC DEFAULT NULL,p_buyer_amount NUMERIC DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_escrow public.escrows%ROWTYPE; v_commission NUMERIC:=0; v_refund NUMERIC:=0; v_seller NUMERIC:=0; v_buyer NUMERIC:=0; v_status TEXT; v_event JSONB;
BEGIN
  SELECT * INTO v_escrow FROM public.escrows WHERE id=p_escrow_id FOR UPDATE;
  IF NOT FOUND OR v_escrow.status<>'disputed' THEN RAISE EXCEPTION 'Escrow is not in disputed state'; END IF;
  IF p_idempotency_key IS NOT NULL AND v_escrow."disputeLastActionKey"=p_idempotency_key AND v_escrow."disputeResolution" IS NOT NULL THEN
    RETURN jsonb_build_object('id',v_escrow.id,'status',v_escrow.status,'resolution',v_escrow."disputeResolution",'idempotent',true);
  END IF;
  IF p_decision NOT IN ('full_refund','partial_refund','release_funds','split_settlement','dismissed') THEN RAISE EXCEPTION 'Unsupported dispute decision: %',p_decision; END IF;

  CASE p_decision
    WHEN 'full_refund' THEN v_refund=v_escrow.amount; v_buyer=v_refund; v_status='refunded';
    WHEN 'partial_refund' THEN
      v_refund=COALESCE(p_amount,-1); IF v_refund<=0 OR v_refund>=v_escrow.amount THEN RAISE EXCEPTION 'Invalid partial refund'; END IF;
      v_buyer=v_refund; v_seller=v_escrow.amount-v_refund; v_status='released';
      v_commission=0;
    WHEN 'release_funds','dismissed' THEN
      v_commission=ROUND(COALESCE(v_escrow.commission,0),2); v_seller=ROUND(v_escrow.amount-v_commission,2); v_status='released';
    WHEN 'split_settlement' THEN
      v_seller=COALESCE(p_seller_amount,-1); v_buyer=COALESCE(p_buyer_amount,-1); v_commission=ROUND(v_escrow.amount-v_seller-v_buyer,2);
      IF v_seller<0 OR v_buyer<0 OR v_commission<0 OR ROUND(v_seller+v_buyer+v_commission,2)<>ROUND(v_escrow.amount,2) THEN RAISE EXCEPTION 'Invalid split settlement'; END IF;
      v_status='released';
  END CASE;

  IF v_status='refunded' THEN
    PERFORM public.kayad_post_ledger_entry_atomic('dispute-refund:'||v_escrow.id::TEXT,v_escrow.buyer,v_buyer,'KES','dispute_refund','customer','Dispute buyer refund payable',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision),'2000','2100');
  ELSE
    IF v_seller>0 THEN PERFORM public.kayad_post_ledger_entry_atomic('dispute-release-seller:'||v_escrow.id::TEXT,v_escrow.seller,v_seller,'KES','dispute_release','seller','Dispute seller settlement',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision),'2000','5000'); END IF;
    IF v_buyer>0 THEN PERFORM public.kayad_post_ledger_entry_atomic('dispute-release-buyer:'||v_escrow.id::TEXT,v_escrow.buyer,v_buyer,'KES','dispute_refund','customer','Dispute buyer settlement',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision),'2000','2100'); END IF;
    IF v_commission>0 THEN PERFORM public.kayad_post_ledger_entry_atomic('dispute-commission:'||v_escrow.id::TEXT,v_escrow.seller,v_commission,'KES','dispute_commission','platform','Dispute platform commission',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision),'2000','4000'); END IF;
  END IF;

  UPDATE public.escrows SET status=v_status,commission=v_commission,"sellerAmount"=v_seller,
    "disputeLastActionKey"=COALESCE(p_idempotency_key,"disputeLastActionKey"),"disputeWorkflowStatus"='resolved',
    "disputeResolution"=jsonb_build_object('decision',p_decision,'amount',CASE WHEN p_decision IN ('partial_refund','full_refund') THEN v_buyer ELSE v_escrow.amount END,'sellerAmount',v_seller,'buyerAmount',v_buyer,'platformFee',v_commission,'reason',COALESCE(p_reason,''),'decidedBy',p_actor_id,'decidedAt',now(),'implemented',true),
    "updatedAt"=now(),"releasedAt"=CASE WHEN v_status='released' THEN now() ELSE "releasedAt" END,"releasedBy"=CASE WHEN v_status='released' THEN p_actor_id ELSE "releasedBy" END,
    "refundedAt"=CASE WHEN v_status='refunded' THEN now() ELSE "refundedAt" END,"refundedBy"=CASE WHEN v_status='refunded' THEN p_actor_id ELSE "refundedBy" END
  WHERE id=v_escrow.id;

  IF v_escrow.payment IS NOT NULL THEN
    UPDATE public.payments SET status=CASE WHEN v_status='refunded' THEN 'refunded' ELSE 'released' END,platform_fee=v_commission,dealer_amount=v_seller,updated_at=now() WHERE id=v_escrow.payment;
  END IF;
  IF v_escrow.car IS NOT NULL THEN
    UPDATE public.cars SET sold=(v_status='released'),"isPaid"=(v_status='released'),updated_at=now() WHERE id=v_escrow.car;
  END IF;
  v_event:=public.kayad_record_financial_workflow_event_atomic('dispute',v_escrow.id,'dispute-resolution:'||v_escrow.id::TEXT,'financial_consequence',v_escrow.amount,'KES',NULL,jsonb_build_object('decision',p_decision,'buyerAmount',v_buyer,'sellerAmount',v_seller,'platformFee',v_commission));
  RETURN jsonb_build_object('id',v_escrow.id,'status',v_status,'buyerAmount',v_buyer,'sellerAmount',v_seller,'platformFee',v_commission,'event',v_event,'idempotent',false);
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_resolve_dispute_atomic(UUID,UUID,TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_resolve_dispute_atomic(UUID,UUID,TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT,TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Refund completion: approval creates Refund Payable; this operation records
-- the actual external settlement and clears that payable. The external rail
-- may be M-Pesa (1000) or custody bank (1200), selected explicitly by staff.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_provider_reference
  ON public.refunds(provider_reference)
  WHERE provider_reference IS NOT NULL AND btrim(provider_reference) <> '';

CREATE OR REPLACE FUNCTION public.kayad_complete_escrow_refund_atomic(
  p_refund_id UUID,p_actor_id UUID,p_provider_reference TEXT,p_cash_account_code TEXT DEFAULT '1000'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_refund public.refunds%ROWTYPE; v_escrow public.escrows%ROWTYPE; v_ref TEXT;
BEGIN
  SELECT * INTO v_refund FROM public.refunds WHERE id=p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund not found'; END IF;
  IF v_refund.status='completed' THEN
    RETURN jsonb_build_object('id',v_refund.id,'status','completed','idempotent',true);
  END IF;
  IF v_refund.status NOT IN ('pending','processing') THEN RAISE EXCEPTION 'Refund cannot be completed from status %',v_refund.status; END IF;
  SELECT * INTO v_escrow FROM public.escrows WHERE id=v_refund.escrow_id FOR UPDATE;
  IF NOT FOUND OR v_escrow.status<>'refunded' THEN RAISE EXCEPTION 'Refund escrow is not in refunded state'; END IF;
  v_ref=NULLIF(btrim(p_provider_reference),'');
  IF v_ref IS NULL THEN RAISE EXCEPTION 'External refund reference is required'; END IF;
  IF p_cash_account_code NOT IN ('1000','1200') THEN RAISE EXCEPTION 'Unsupported refund cash account'; END IF;
  IF EXISTS (SELECT 1 FROM public.refunds WHERE provider_reference=v_ref AND id<>v_refund.id) THEN RAISE EXCEPTION 'Refund provider reference has already been used'; END IF;

  PERFORM public.kayad_post_ledger_entry_atomic(
    'refund-settlement:'||v_refund.id::TEXT,
    v_refund.initiated_by,
    v_refund.amount,'KES','refund_settlement','buyer',
    'Escrow refund externally settled',
    jsonb_build_object('refund_id',v_refund.id,'escrow_id',v_refund.escrow_id,'provider_reference',v_ref,'cash_account',p_cash_account_code,'event','refund_settlement'),
    '2100',p_cash_account_code);

  UPDATE public.refunds SET status='completed',provider_reference=v_ref,updated_at=now() WHERE id=v_refund.id RETURNING * INTO v_refund;
  RETURN jsonb_build_object('id',v_refund.id,'status',v_refund.status,'providerReference',v_ref,'amount',v_refund.amount,'idempotent',false);
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_complete_escrow_refund_atomic(UUID,UUID,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_complete_escrow_refund_atomic(UUID,UUID,TEXT,TEXT) TO service_role;
