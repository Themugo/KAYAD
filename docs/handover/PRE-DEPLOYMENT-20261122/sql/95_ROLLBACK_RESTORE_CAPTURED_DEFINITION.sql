-- ROLLBACK (needs approval). Restores the exact definition captured from hosted on 2026-11-22 (md5 f414d98a357862f9270796a4965d6900).
-- WARNING: that definition is the PLACEHOLDER; restoring it RE-CREATES the registration outage. Use it only to return to a byte-exact
-- pre-change state for forensics. If the restored function misbehaves, the correct recovery is a FORWARD FIX (see the plan, section 7).
-- Data created by successful registrations is not touched by a rollback.
-- The text below is the function body as read from pg_get_functiondef (the original contains CRLF line endings; they do not matter functionally).
BEGIN;
CREATE OR REPLACE FUNCTION public.kayad_register_identity_atomic(p_name text, p_email text, p_role text, p_phone text, p_business_name text, p_location text, p_referred_by uuid, p_password_hash text, p_email_verify_token text, p_email_verify_expire timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user public.users%ROWTYPE;
  v_seller_approval_required boolean := false;
BEGIN
  -- Other function logic

  IF p_role NOT IN ('user','individual_seller','dealer') THEN
    RAISE EXCEPTION 'Invalid self-registration role'
      USING ERRCODE = '22023';
  END IF;

  -- Remaining registration logic
END;
$function$;
REVOKE ALL ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ) TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
