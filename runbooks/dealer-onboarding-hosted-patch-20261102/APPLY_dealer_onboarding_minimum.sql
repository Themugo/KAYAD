-- RUNBOOK PATCH, not part of the migration chain (a second definition of kayad_register_identity_atomic in supabase/migrations is
-- forbidden by tests/regression/stage4IdentityLifecycle). Run once in the hosted SQL editor; safe to repeat; safe before or after the chain.
-- KAYAD: minimum database objects required to onboard a dealer end to end.
--
-- WHY: the hosted database stops at migration 20260922. Without these objects:
--   * POST /api/auth/register (role=dealer) fails: kayad_register_identity_atomic does not exist;
--   * a dealer registered earlier has no `dealers` row, so User Management correctly refuses to approve them;
--   * PUT /api/dealer/onboarding fails: dealers.bio / payment_details / onboarding_complete / onboarding_completed_at do not exist.
--
-- SAFE TO RUN MORE THAN ONCE and safe to run before or after the full migration chain: every statement is idempotent
-- (IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT DO NOTHING) and it only restates definitions that
-- 20261001090000, 20261012140000 and 20261012140100 already contain. No existing row is changed or deleted; the only data
-- written is a missing `dealers` row for each existing dealer user.
BEGIN;

ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS payment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.sync_dealer_profile_from_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'dealer' THEN
    INSERT INTO public.dealers ("user", business_name, location, approved, is_suspended)
    VALUES (NEW.id, NEW.business_name, NEW.location, false, false)
    ON CONFLICT ("user") DO UPDATE
      SET business_name = COALESCE(EXCLUDED.business_name, public.dealers.business_name),
          location = COALESCE(EXCLUDED.location, public.dealers.location),
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_dealer_profile_from_user ON public.users;
CREATE TRIGGER trg_sync_dealer_profile_from_user
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_dealer_profile_from_user();

-- Existing dealer accounts that registered before the trigger existed get their (unapproved) dealer profile.
INSERT INTO public.dealers ("user", business_name, location, approved, is_suspended)
SELECT u.id, u.business_name, u.location, false, false
FROM public.users u
WHERE u.role = 'dealer'
ON CONFLICT ("user") DO NOTHING;

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
BEGIN
  IF p_role NOT IN ('user','individual_seller','dealer') THEN
    RAISE EXCEPTION 'Invalid self-registration role' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.users (
    name, email, role, phone, status, email_verified,
    business_name, location, referred_by
  )
  VALUES (
    p_name, lower(btrim(p_email)), p_role, NULLIF(btrim(COALESCE(p_phone, '')), ''),
    CASE WHEN p_role = 'user' THEN 'approved' ELSE 'pending' END,
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

  RETURN to_jsonb(v_user);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ) TO service_role;

-- Suspending a dealer writes 'suspended'; the live CHECK only allows pending/approved/rejected.
ALTER TABLE public.dealer_verifications DROP CONSTRAINT IF EXISTS dealer_verifications_verification_status_check;
ALTER TABLE public.dealer_verifications
  ADD CONSTRAINT dealer_verifications_verification_status_check
  CHECK (verification_status IN ('pending','approved','rejected','suspended'));

COMMIT;
