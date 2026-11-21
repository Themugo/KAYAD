-- KAYAD Phase 16B - CANDIDATE (NOT APPLIED ANYWHERE). Hosted reconciliation of the two Phase 16A blockers:
--   (1) public sign-up: public.kayad_register_identity_atomic is absent on hosted;
--   (2) dealer onboarding: public.dealers lacks bio/payment_details/onboarding_complete/onboarding_completed_at and the
--       dealer_verifications.verification_status CHECK lacks 'suspended'.
-- Definitions are copied from the repository migrations (20261001090000, 20261001220000, 20261012140000, 20261012140100) so the
-- hosted contract equals the one the application and the 188-migration replay already use, with ONE hardening:
-- the SECURITY DEFINER function pins `search_path = public, pg_temp` (pg_temp last) instead of `public` alone.
-- Purely additive: no row is read, written or deleted; no existing column or index is altered. Idempotent. One transaction.
-- NOT included on purpose: sync_dealer_profile_from_user trigger (the API creates the dealers row lazily at
-- GET/PUT /api/dealer/onboarding), uq_users_email_normalized (own decision: it fails if normalised duplicates exist),
-- any owner/MFA object, any role/profile update.
BEGIN;

-- Preflight: fail closed, with a readable message, before changing anything.
DO $$
DECLARE missing text[] := ARRAY[]::text[]; r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('users','name'),('users','email'),('users','role'),('users','phone'),('users','status'),('users','email_verified'),
    ('users','business_name'),('users','location'),('users','referred_by'),
    ('user_auth','user_id'),('user_auth','password'),('user_auth','token_version'),('user_auth','email_verify_token'),('user_auth','email_verify_expire'),
    ('dealers','user'),('dealer_verifications','verification_status')
  ) AS t(tbl, col) LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=r.tbl AND column_name=r.col) THEN
      missing := missing || (r.tbl || '.' || r.col);
    END IF;
  END LOOP;
  IF array_length(missing,1) IS NOT NULL THEN
    RAISE EXCEPTION 'PHASE16B PREFLIGHT FAILED: missing prerequisite columns: %', array_to_string(missing, ', ');
  END IF;
END $$;

-- (2a) dealer onboarding columns (same definition as 20261001090000)
ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS payment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- (2b) verification status set: widen only (every existing value remains valid). Same set as the application constant.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.dealer_verifications'::regclass AND conname = 'dealer_verifications_verification_status_check'
      AND pg_get_constraintdef(oid) LIKE '%suspended%'
  ) THEN
    ALTER TABLE public.dealer_verifications DROP CONSTRAINT IF EXISTS dealer_verifications_verification_status_check;
    ALTER TABLE public.dealer_verifications
      ADD CONSTRAINT dealer_verifications_verification_status_check
      CHECK (verification_status IN ('pending','approved','rejected','suspended'));
  END IF;
END $$;

-- (1) atomic identity creation. Service-role only. Self-registration can only ever create user / individual_seller / dealer.
CREATE OR REPLACE FUNCTION public.kayad_register_identity_atomic(
  p_name TEXT, p_email TEXT, p_role TEXT, p_phone TEXT, p_business_name TEXT, p_location TEXT,
  p_referred_by UUID, p_password_hash TEXT, p_email_verify_token TEXT, p_email_verify_expire TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user public.users%ROWTYPE;
BEGIN
  IF p_role NOT IN ('user','individual_seller','dealer') THEN
    RAISE EXCEPTION 'Invalid self-registration role' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.users (name, email, role, phone, status, email_verified, business_name, location, referred_by)
  VALUES (
    p_name, lower(btrim(p_email)), p_role, NULLIF(btrim(COALESCE(p_phone, '')), ''),
    CASE WHEN p_role = 'user' THEN 'approved' ELSE 'pending' END,
    false,
    CASE WHEN p_role IN ('dealer','individual_seller') THEN NULLIF(btrim(COALESCE(p_business_name, '')), '') ELSE NULL END,
    CASE WHEN p_role IN ('dealer','individual_seller') THEN NULLIF(btrim(COALESCE(p_location, '')), '') ELSE NULL END,
    p_referred_by
  )
  RETURNING * INTO v_user;

  INSERT INTO public.user_auth (user_id, password, token_version, email_verify_token, email_verify_expire)
  VALUES (v_user.id, p_password_hash, 0, p_email_verify_token, p_email_verify_expire);

  RETURN to_jsonb(v_user);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ) TO service_role;

COMMIT;
