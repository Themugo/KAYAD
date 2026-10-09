CREATE OR REPLACE FUNCTION public.kayad_verify_escrow_funding_atomic(p_escrow_id uuid, p_actor_id uuid, p_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$

