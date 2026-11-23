CREATE OR REPLACE FUNCTION public.kayad_mark_dealer_payout_atomic(p_payout uuid, p_status text, p_conversation_id text DEFAULT NULL::text, p_transaction_id text DEFAULT NULL::text, p_failure_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$

