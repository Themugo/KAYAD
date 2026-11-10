-- KAYAD private-seller launch policy: free self-service, no seller approval.
-- Forward-only correction. Keep dealer verification, listing moderation, email verification,
-- auction eligibility and explicit seller suspension/revocation controls independent.
-- Apply only after the original registration and private-seller capability migrations have
-- been reconciled and replayed in the target environment.

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'Preflight failed: public.users is missing';
  END IF;
  IF to_regclass('public.private_seller_capabilities') IS NULL THEN
    RAISE EXCEPTION 'Preflight failed: apply/reconcile 20261025100000_private_seller_capability.sql before this migration';
  END IF;
  IF to_regclass('public.system_settings') IS NULL THEN
    RAISE EXCEPTION 'Preflight failed: public.system_settings is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'kayad_register_identity_atomic'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_name text, p_email text, p_role text, p_phone text, p_business_name text, p_location text, p_referred_by uuid, p_password_hash text, p_email_verify_token text, p_email_verify_expire timestamp with time zone'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: expected kayad_register_identity_atomic signature is missing';
  END IF;
END;
$preflight$;

-- Existing pending individual_seller accounts were held by the old seller-approval
-- workflow. The new launch policy treats them as active personal accounts. Do not
-- touch suspended, banned, deactivated, dealer or staff identities.
UPDATE public.users
   SET status = 'approved'
 WHERE role = 'individual_seller'
   AND status = 'pending';

-- New capability rows default to approved in the free launch mode. The backend still
-- requires an explicit pending row when an administrator later enables approval.
ALTER TABLE public.private_seller_capabilities
  ALTER COLUMN status SET DEFAULT 'approved';

-- New individual_seller registrations are active personal accounts. Dealers remain
-- pending until the separate dealer verification workflow approves them.
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

  -- Persist the seller review state for future policy changes. In today's free mode
  -- the row is approved; if the administrator later enables review, new seller
  -- registrations enter the pending queue. Ordinary role=user accounts remain eligible
  -- for free selling without an application row.
  IF p_role = 'individual_seller' THEN
    INSERT INTO public.private_seller_capabilities (user_id, status, source)
    VALUES (
      v_user.id,
      CASE WHEN v_seller_approval_required THEN 'pending' ELSE 'approved' END,
      'application'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN to_jsonb(v_user);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ)
  TO service_role;

COMMENT ON TABLE public.private_seller_capabilities IS
  'Private-seller controls. Default policy is free and approval-free; explicit suspended/revoked states remain enforceable.';

COMMIT;
