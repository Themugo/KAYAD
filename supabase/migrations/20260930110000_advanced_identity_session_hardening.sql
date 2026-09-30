-- Advanced identity/session hardening: hashed refresh tokens, session families and atomic rotation.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.refresh_tokens ADD COLUMN IF NOT EXISTS token_hash text;
ALTER TABLE public.refresh_tokens ADD COLUMN IF NOT EXISTS family_id uuid;
ALTER TABLE public.refresh_tokens ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE public.refresh_tokens ADD COLUMN IF NOT EXISTS replaced_by uuid;
ALTER TABLE public.refresh_tokens ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
ALTER TABLE public.refresh_tokens ADD COLUMN IF NOT EXISTS revoke_reason text;
ALTER TABLE public.refresh_tokens ADD COLUMN IF NOT EXISTS reuse_detected_at timestamptz;

UPDATE public.refresh_tokens
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

UPDATE public.refresh_tokens SET family_id = gen_random_uuid() WHERE family_id IS NULL;
UPDATE public.refresh_tokens SET session_id = gen_random_uuid() WHERE session_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_tokens_token_hash ON public.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON public.refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session ON public.refresh_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active ON public.refresh_tokens("user", is_revoked, expires_at);

ALTER TABLE public.refresh_tokens ALTER COLUMN token_hash SET NOT NULL;

-- Never keep the bearer credential itself in the database.
ALTER TABLE public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_token_key;
DROP INDEX IF EXISTS public.idx_refresh_tokens_token;
ALTER TABLE public.refresh_tokens DROP COLUMN IF EXISTS token;

CREATE OR REPLACE FUNCTION public.kayad_rotate_refresh_token(
  p_old_token_hash text,
  p_new_token_hash text,
  p_user_id uuid,
  p_token_version integer,
  p_family_id uuid,
  p_device_id text,
  p_user_agent text,
  p_ip_address text,
  p_expires_at timestamptz,
  p_new_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row public.refresh_tokens%ROWTYPE;
  new_id uuid;
  family uuid;
BEGIN
  SELECT * INTO old_row
  FROM public.refresh_tokens
  WHERE token_hash = p_old_token_hash
  FOR UPDATE;

  IF old_row.id IS NULL THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  IF old_row.is_revoked OR old_row.expires_at <= now() OR old_row.token_version <> p_token_version OR old_row."user" <> p_user_id THEN
    UPDATE public.refresh_tokens
    SET is_revoked = true, revoked_at = COALESCE(revoked_at, now()), revoke_reason = 'refresh_reuse', reuse_detected_at = COALESCE(reuse_detected_at, now())
    WHERE family_id = old_row.family_id AND is_revoked = false;
    RETURN jsonb_build_object('status','reuse_detected','family_id',old_row.family_id,'user_id',old_row."user");
  END IF;

  family := old_row.family_id;
  INSERT INTO public.refresh_tokens ("user", token_hash, token_version, family_id, session_id, device_id, user_agent, ip_address, expires_at)
  VALUES (p_user_id, p_new_token_hash, p_token_version, family, old_row.session_id, p_device_id, p_user_agent, p_ip_address, p_expires_at)
  RETURNING id INTO new_id;

  UPDATE public.refresh_tokens
  SET is_revoked = true, revoked_at = now(), revoke_reason = 'rotated', replaced_by = new_id, last_used_at = now()
  WHERE id = old_row.id;

  RETURN jsonb_build_object('status','rotated','session_id',old_row.session_id,'family_id',family,'user_id',p_user_id,'new_id',new_id);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid) TO service_role;

ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.refresh_tokens FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refresh_tokens TO service_role;
