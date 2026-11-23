CREATE OR REPLACE FUNCTION public.kayad_transition_dispute_atomic(p_escrow_id uuid, p_actor_id uuid, p_role text, p_next_status text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v escrows%ROWTYPE; v_current text; v_now timestamptz:=now();
BEGIN
 SELECT * INTO v FROM escrows WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR v.status<>'disputed' THEN RAISE EXCEPTION 'Dispute not found'; END IF;
 v_current:=coalesce(v."disputeWorkflowStatus",'open');
 IF p_role NOT IN ('admin','superadmin','escrow_officer')
    AND NOT (p_next_status='appealed' AND (v.buyer=p_actor_id OR v.seller=p_actor_id))
 THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_next_status='resolved' AND v."disputeResolution" IS NULL
 THEN RAISE EXCEPTION 'Financial dispute resolution must be implemented before status can become resolved'; END IF;
 IF p_next_status='closed' AND v_current NOT IN ('resolved','appealed')
 THEN RAISE EXCEPTION 'Dispute can only be closed after resolution or appeal'; END IF;
 IF NOT (
   (v_current='open' AND p_next_status IN ('under_review','mediation')) OR
   (v_current='under_review' AND p_next_status IN ('mediation','resolved')) OR
   (v_current='mediation' AND p_next_status IN ('resolved')) OR
   (v_current='resolved' AND p_next_status IN ('appealed','closed')) OR
   (v_current='appealed' AND p_next_status IN ('under_review','resolved','closed'))
 ) THEN RAISE EXCEPTION 'Transition % -> % is not allowed',v_current,p_next_status; END IF;
 UPDATE escrows SET "disputeWorkflowStatus"=p_next_status,
 "disputeTimeline"=coalesce("disputeTimeline",'[]'::jsonb)||jsonb_build_array(
 jsonb_build_object('action',format('Status: %s → %s',v_current,p_next_status),
 'actor',p_actor_id,'fromStatus',v_current,'toStatus',p_next_status,
 'note',coalesce(p_reason,''),'at',v_now)),"updatedAt"=v_now
 WHERE id=p_escrow_id;
 SELECT * INTO v FROM escrows WHERE id=p_escrow_id;
 RETURN to_jsonb(v);
END;
$function$

