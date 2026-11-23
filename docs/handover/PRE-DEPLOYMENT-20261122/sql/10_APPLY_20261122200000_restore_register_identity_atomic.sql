-- Restore public.kayad_register_identity_atomic (registration RPC).
--
-- WHY: read-only inspection of the hosted project (2026-11-22) found this function replaced by a placeholder body
-- ("Other function logic" / "Remaining registration logic"): it validates the role and then reaches END without
-- inserting a user or returning a value. PostgreSQL raises 2F005 ("control reached end of function without RETURN"),
-- PostgREST answers 400, and EVERY registration fails. The hosted migration history also stops at 20260922, so the
-- October/November registration migrations are not recorded there.
--
-- WHAT: forward-only, idempotent re-definition with the SAME signature and return contract as
-- 20261001090000 / 20261110140000, with one deliberate difference: the legacy `individual_seller` capability row is
-- written only when public.private_seller_capabilities exists (it is absent on the hosted project), so this migration
-- does not require the private-seller capability migration to be replayed first. The backend never sends
-- `individual_seller` (it maps to a personal `user` account), so ordinary registration is unaffected either way.
--
-- NOT APPLIED to any hosted database by the author. Apply only with the owner's separate approval, then run the
-- verification block at the bottom of this file (read-only).

BEGIN;

DO $preflight$
DECLARE
  missing text;
BEGIN
  IF to_regclass('public.users') IS NULL OR to_regclass('public.user_auth') IS NULL OR to_regclass('public.system_settings') IS NULL THEN
    RAISE EXCEPTION 'Preflight failed: users, user_auth and system_settings must exist';
  END IF;
  SELECT string_agg(t || '.' || c, ', ') INTO missing
    FROM (VALUES
      ('users','name'),('users','email'),('users','role'),('users','phone'),('users','status'),('users','email_verified'),
      ('users','business_name'),('users','location'),('users','referred_by'),
      ('user_auth','user_id'),('user_auth','password'),('user_auth','token_version'),
      ('user_auth','email_verify_token'),('user_auth','email_verify_expire')
    ) AS need(t, c)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = need.t AND column_name = need.c);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight failed: missing columns: %', missing;
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.kayad_register_identity_atomic(
  p_name TEXT,
  p_email TEXT,
  p_role TEXT,
  p_phone TEXT,
  p_business_name TEXT,
  p_location TEXT,
  p_referred_by UUID,
  p_password_hash TEXT,
  p_email_verify_token TEXT,
  p_email_verify_expire TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_seller_approval_required boolean := false;
BEGIN
  SELECT COALESCE((value->>'privateSellerApprovalMode') = 'required', false)
    INTO v_seller_approval_required
    FROM public.system_settings
   WHERE key = 'onboarding_policy';

  IF p_role NOT IN ('user','individual_seller','dealer') THEN
    RAISE EXCEPTION 'Invalid self-registration role' USING ERRCODE = '22023';
  END IF;

  -- users + the automatic profile/dealer triggers + user_auth commit or roll back together.
  INSERT INTO public.users (
    name, email, role, phone, status, email_verified,
    business_name, location, referred_by
  )
  VALUES (
    p_name, lower(btrim(p_email)), p_role, NULLIF(btrim(COALESCE(p_phone, '')), ''),
    CASE
      WHEN p_role = 'dealer' THEN 'pending'
      WHEN p_role = 'individual_seller' AND v_seller_approval_required THEN 'pending'
      ELSE 'approved'
    END,
    false,
    CASE WHEN p_role IN ('dealer','individual_seller') THEN NULLIF(btrim(COALESCE(p_business_name, '')), '') ELSE NULL END,
    CASE WHEN p_role IN ('dealer','individual_seller') THEN NULLIF(btrim(COALESCE(p_location, '')), '') ELSE NULL END,
    p_referred_by
  )
  RETURNING * INTO v_user;

  INSERT INTO public.user_auth (
    user_id, password, token_version, email_verify_token, email_verify_expire
  )
  VALUES (
    v_user.id, p_password_hash, 0, p_email_verify_token, p_email_verify_expire
  );

  -- Legacy compatibility only: the capability table is optional (absent on the hosted project).
  IF p_role = 'individual_seller' AND to_regclass('public.private_seller_capabilities') IS NOT NULL THEN
    EXECUTE
      'INSERT INTO public.private_seller_capabilities (user_id, status, source) VALUES ($1, $2, ''application'') ON CONFLICT (user_id) DO NOTHING'
      USING v_user.id, CASE WHEN v_seller_approval_required THEN 'pending' ELSE 'approved' END;
  END IF;

  RETURN to_jsonb(v_user);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ)
  TO service_role;

-- Refuse to commit if the definition that ended up in the catalogue is not the real one.
DO $postcheck$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'kayad_register_identity_atomic';
  IF def IS NULL OR def NOT ILIKE '%INSERT INTO public.users%' OR def NOT ILIKE '%INSERT INTO public.user_auth%' OR def NOT ILIKE '%RETURN to_jsonb(v_user)%' THEN
    RAISE EXCEPTION 'Postcheck failed: kayad_register_identity_atomic is not the full registration function';
  END IF;
END;
$postcheck$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Read-only verification after applying (run as a separate statement; writes nothing):
--   select p.prosecdef, length(pg_get_functiondef(p.oid)) > 1500 as full_body,
--          has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_call,
--          not has_function_privilege('anon', p.oid, 'EXECUTE') as anon_blocked
--     from pg_proc p where p.proname = 'kayad_register_identity_atomic';
