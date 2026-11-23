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
$function$

