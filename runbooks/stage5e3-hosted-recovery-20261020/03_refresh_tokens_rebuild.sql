-- APPLIED 2026-10-20 by the owner as separate runs: (1) the DO block, (2) the function, (3) the grants. Tested first on a local Postgres 16 copy.
-- The DO block aborts with no change if refresh_tokens has any rows (it drops the legacy plaintext token column).
do $mig$
begin
  if (select count(*) from public.refresh_tokens) > 0 then
    raise exception 'refresh_tokens is not empty - stopping, nothing changed';
  end if;
  alter table public.refresh_tokens
    add column if not exists token_hash text,
    add column if not exists family_id uuid,
    add column if not exists session_id uuid,
    add column if not exists replaced_by uuid,
    add column if not exists revoked_at timestamptz,
    add column if not exists revoke_reason text,
    add column if not exists reuse_detected_at timestamptz;
  alter table public.refresh_tokens alter column token_hash set not null;
  alter table public.refresh_tokens drop constraint if exists refresh_tokens_token_key;
  drop index if exists public.idx_refresh_tokens_token;
  alter table public.refresh_tokens drop column if exists token;
  create unique index if not exists uq_refresh_tokens_token_hash on public.refresh_tokens(token_hash);
  create index if not exists idx_refresh_tokens_family on public.refresh_tokens(family_id);
  create index if not exists idx_refresh_tokens_session on public.refresh_tokens(session_id);
  create index if not exists idx_refresh_tokens_user_active on public.refresh_tokens("user", is_revoked, expires_at);
end
$mig$;

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

revoke all on function public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid) from public;
grant execute on function public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid) to service_role;
alter table public.refresh_tokens enable row level security;
revoke all on public.refresh_tokens from anon, authenticated;
grant select, insert, update, delete on public.refresh_tokens to service_role;
