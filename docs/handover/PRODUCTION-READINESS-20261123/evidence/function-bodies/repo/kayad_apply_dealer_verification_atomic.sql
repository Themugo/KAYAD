CREATE OR REPLACE FUNCTION public.kayad_apply_dealer_verification_atomic(p_user uuid, p_action text, p_admin uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_dealer uuid; v_status text;
BEGIN
 IF p_action NOT IN ('approve','reject','suspend') THEN RAISE EXCEPTION 'Invalid verification action'; END IF;
 IF NOT EXISTS (SELECT 1 FROM users WHERE id=p_admin AND role IN ('admin','superadmin')) THEN RAISE EXCEPTION 'Admin authorization required'; END IF;
 SELECT id INTO v_dealer FROM dealers WHERE "user"=p_user LIMIT 1;
 v_status:=CASE WHEN p_action='approve' THEN 'approved' WHEN p_action='reject' THEN 'rejected' ELSE 'pending' END;
 IF p_action='approve' THEN
   UPDATE users SET role='dealer', updated_at=now() WHERE id=p_user;
 ELSE
   UPDATE users SET updated_at=now() WHERE id=p_user;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
 IF v_dealer IS NOT NULL THEN UPDATE dealers SET approved=(p_action='approve'), is_suspended=(p_action='suspend'), suspension_reason=CASE WHEN p_action='suspend' THEN p_reason ELSE suspension_reason END, verified_at=CASE WHEN p_action='approve' THEN now() ELSE verified_at END, updated_at=now() WHERE id=v_dealer; END IF;
 UPDATE dealer_verifications SET verification_status=v_status, reviewed_at=now(), reviewed_by=p_admin, rejection_reason=CASE WHEN p_action='reject' THEN p_reason ELSE rejection_reason END, suspension_reason=CASE WHEN p_action='suspend' THEN p_reason ELSE suspension_reason END, updated_at=now() WHERE "user"=p_user;
 RETURN jsonb_build_object('userId',p_user,'dealerId',v_dealer,'action',p_action,'status',v_status);
END; $function$

