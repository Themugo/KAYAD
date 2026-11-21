-- KAYAD registration + onboarding integrity
-- Establishes the database records required by every public onboarding path.
-- This migration is additive and does not rewrite migration history.

-- ─────────────────────────────────────────────────────────────
-- DEALER PROFILE LIFECYCLE
-- A dealer account is not complete at users/user_auth alone: the existing
-- dealer verification and dealer-platform domains require dealers(user).
-- Create that row atomically with dealer user creation and keep onboarding
-- state on the dealer domain rather than inventing a second user-auth model.
-- ─────────────────────────────────────────────────────────────
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

-- Repair any historical dealer accounts that were created before the trigger.
INSERT INTO public.dealers ("user", business_name, location, approved, is_suspended)
SELECT u.id, u.business_name, u.location, false, false
FROM public.users u
WHERE u.role = 'dealer'
ON CONFLICT ("user") DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- INSPECTOR APPLICATION DOMAIN
-- The frontend and controller already use InspectorApplication, but the
-- migration chain had no canonical inspector_applications table. That made
-- the public inspector onboarding path fail at its first database write.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inspector_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_number TEXT NOT NULL,
  location TEXT NOT NULL,
  years_of_experience NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (years_of_experience >= 0 AND years_of_experience <= 80),
  specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
  certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  tools_available TEXT,
  preferred_regions JSONB NOT NULL DEFAULT '[]'::jsonb,
  cv_url TEXT,
  certification_docs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  assigned_specialty TEXT,
  assigned_region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspector_applications_status_created
  ON public.inspector_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspector_applications_email
  ON public.inspector_applications(lower(btrim(email)));
CREATE INDEX IF NOT EXISTS idx_inspector_applications_user
  ON public.inspector_applications(user_id);

ALTER TABLE public.inspector_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inspector_applications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspector_applications TO service_role;

DROP TRIGGER IF EXISTS trg_inspector_applications_updated_at ON public.inspector_applications;
CREATE TRIGGER trg_inspector_applications_updated_at
  BEFORE UPDATE ON public.inspector_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_snake();

-- ─────────────────────────────────────────────────────────────
-- ATOMIC IDENTITY CREATION
-- users + profiles trigger + dealer trigger + user_auth are one database
-- transaction. The service-role RPC is the only registration write path.
-- ─────────────────────────────────────────────────────────────
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
