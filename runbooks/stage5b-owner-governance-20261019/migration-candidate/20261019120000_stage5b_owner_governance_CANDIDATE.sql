-- KAYAD Stage 5B — database-backed multi-owner governance.
-- *** MIGRATION CANDIDATE — NOT APPLIED to any shared environment. Needs explicit owner authorization (see ../OWNER_DECISION_REGISTER_STAGE5B.md D1). ***
-- Deliberately NOT placed in supabase/migrations/ so no pipeline can pick it up by accident. Copy it there only after approval + branch rehearsal.
--
-- Design: one new trust table (owner_memberships) keyed by users.id, an invitation ledger, an append-only event ledger, a one-row
-- bootstrap switch, and SECURITY DEFINER functions as the ONLY write path. Writes are serialised with one advisory lock so the
-- "last usable owner" rule cannot be raced. service_role has SELECT only on the tables; anon/authenticated have nothing.
-- Rollback: ../GATE_ROLLBACK_AND_RECOVERY_PLAN_5B.md (export owner_membership_events first — dropping the tables destroys audit history).

CREATE TABLE IF NOT EXISTS public.owner_memberships (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  email               text NOT NULL CHECK (email = lower(btrim(email)) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status              text NOT NULL CHECK (status IN ('active','revoked')),
  added_via           text NOT NULL CHECK (added_via IN ('bootstrap','invitation','recovery')),
  invitation_id       uuid,
  added_by_user_id    uuid,
  added_by_label      text,
  activated_at        timestamptz NOT NULL DEFAULT now(),
  revoked_at          timestamptz,
  revoked_by_user_id  uuid,
  revoked_by_label    text,
  revoke_reason       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owner_memberships_revoked_shape CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_owner_memberships_active_user  ON public.owner_memberships(user_id) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS uq_owner_memberships_active_email ON public.owner_memberships(email)   WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.owner_invitations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL CHECK (email = lower(btrim(email)) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  kind              text NOT NULL CHECK (kind IN ('bootstrap','invitation','recovery')),
  token_hash        text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  invited_by        uuid,
  invited_by_label  text NOT NULL,
  note              text,
  expires_at        timestamptz NOT NULL,
  resend_count      integer NOT NULL DEFAULT 0,
  last_sent_at      timestamptz NOT NULL DEFAULT now(),
  accepted_at       timestamptz,
  accepted_user_id  uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
-- one live invitation per address: duplicate invitations are impossible, resend rotates the token in place
CREATE UNIQUE INDEX IF NOT EXISTS uq_owner_invitations_pending_email ON public.owner_invitations(email) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.owner_membership_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at              timestamptz NOT NULL DEFAULT now(),
  action          text NOT NULL,
  result          text NOT NULL CHECK (result IN ('success','denied','failed')),
  actor_user_id   uuid,
  actor_label     text NOT NULL,
  target_email    text,
  target_user_id  uuid,
  reason          text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT owner_events_metadata_small CHECK (pg_column_size(metadata) < 4096),
  -- defence in depth: a secret-looking KEY can never be stored (tokens/passwords/hashes are never written by the application either)
  CONSTRAINT owner_events_no_secret_keys CHECK (metadata::text !~* '"[a-z_]*(token|password|secret|hash|cookie)[a-z_]*"\s*:')
);
CREATE INDEX IF NOT EXISTS idx_owner_events_at ON public.owner_membership_events(at DESC);

CREATE OR REPLACE FUNCTION public.kayad_owner_events_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'owner_membership_events is append-only' USING ERRCODE = '42501'; END $$;
DROP TRIGGER IF EXISTS trg_owner_events_no_update ON public.owner_membership_events;
CREATE TRIGGER trg_owner_events_no_update BEFORE UPDATE OR DELETE ON public.owner_membership_events FOR EACH ROW EXECUTE FUNCTION public.kayad_owner_events_immutable();
DROP TRIGGER IF EXISTS trg_owner_events_no_truncate ON public.owner_membership_events;
CREATE TRIGGER trg_owner_events_no_truncate BEFORE TRUNCATE ON public.owner_membership_events FOR EACH STATEMENT EXECUTE FUNCTION public.kayad_owner_events_immutable();

CREATE TABLE IF NOT EXISTS public.owner_bootstrap_state (
  id           integer PRIMARY KEY CHECK (id = 1),
  status       text NOT NULL CHECK (status IN ('open','closed')),
  closed_at    timestamptz,
  closed_by    text,
  closed_reason text
);
INSERT INTO public.owner_bootstrap_state(id, status) VALUES (1, 'open') ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.owner_memberships       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_invitations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_membership_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_bootstrap_state   ENABLE ROW LEVEL SECURITY;
-- service_role may hold ALL on new public tables through default privileges set by earlier migrations: strip it, then grant READ only.
REVOKE ALL ON public.owner_memberships, public.owner_invitations, public.owner_membership_events, public.owner_bootstrap_state FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.owner_memberships, public.owner_invitations, public.owner_membership_events, public.owner_bootstrap_state TO service_role;

-- ───────────── internal helpers (not granted to anyone) ─────────────
CREATE OR REPLACE FUNCTION public.kayad_owner_usable(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.owner_memberships m JOIN public.users u ON u.id = m.user_id
    WHERE m.user_id = p_user AND m.status = 'active' AND lower(btrim(u.email)) = m.email
      AND u.email_verified IS TRUE AND COALESCE(u.is_banned, false) = false AND u.deactivated_at IS NULL
      AND COALESCE(u.status, 'approved') NOT IN ('suspended','banned','deactivated','rejected'));
$$;
CREATE OR REPLACE FUNCTION public.kayad_owner_usable_count() RETURNS integer LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT count(*)::int FROM public.owner_memberships m WHERE m.status = 'active' AND public.kayad_owner_usable(m.user_id);
$$;
CREATE OR REPLACE FUNCTION public.kayad_owner_event(p_action text, p_result text, p_actor uuid, p_actor_label text, p_email text, p_target uuid, p_reason text, p_meta jsonb)
RETURNS void LANGUAGE sql SET search_path = public AS $$
  INSERT INTO public.owner_membership_events(action, result, actor_user_id, actor_label, target_email, target_user_id, reason, metadata)
  VALUES (p_action, p_result, p_actor, COALESCE(NULLIF(btrim(p_actor_label), ''), 'unknown'), p_email, p_target, left(p_reason, 500), COALESCE(p_meta, '{}'::jsonb));
$$;

-- ───────────── read model for the application (single consistent read) ─────────────
CREATE OR REPLACE FUNCTION public.kayad_owner_snapshot() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'installed', true,
    'bootstrap', (SELECT status FROM public.owner_bootstrap_state WHERE id = 1),
    'owners', COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', m.email, 'usable', public.kayad_owner_usable(m.user_id)) ORDER BY m.activated_at)
                        FROM public.owner_memberships m WHERE m.status = 'active'), '[]'::jsonb),
    'pending_emails', COALESCE((SELECT jsonb_agg(i.email) FROM public.owner_invitations i WHERE i.status = 'pending' AND i.expires_at > now()), '[]'::jsonb));
$$;

-- ───────────── write path ─────────────
-- Every function: takes the single advisory lock, returns {ok:true,...} or {ok:false,code:...} (denials are LOGGED and COMMITTED, never raised).
CREATE OR REPLACE FUNCTION public.kayad_owner_issue_invitation(p_email text, p_kind text, p_token_hash text, p_expires timestamptz, p_actor uuid, p_actor_label text, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text := lower(btrim(p_email)); v_id uuid; v_state text; v_member uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(727001);
  IF p_kind NOT IN ('bootstrap','invitation','recovery') OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_INVALID_REQUEST'); END IF;
  IF p_expires <= now() + interval '1 minute' OR p_expires > now() + interval '7 days' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_INVALID_EXPIRY'); END IF;
  IF p_actor IS NULL THEN
    IF p_kind = 'invitation' THEN
      PERFORM public.kayad_owner_event('invitation_issue', 'denied', NULL, p_actor_label, v_email, NULL, 'unattended invitation not allowed', '{}');
      RETURN jsonb_build_object('ok', false, 'code', 'OWNER_ACTOR_REQUIRED'); END IF;
    IF p_kind = 'bootstrap' THEN
      SELECT status INTO v_state FROM public.owner_bootstrap_state WHERE id = 1;
      IF v_state IS DISTINCT FROM 'open' THEN
        PERFORM public.kayad_owner_event('invitation_issue', 'denied', NULL, p_actor_label, v_email, NULL, 'bootstrap closed', '{}');
        RETURN jsonb_build_object('ok', false, 'code', 'OWNER_BOOTSTRAP_CLOSED'); END IF;
    ELSE -- recovery without an acting owner is the emergency path: only when nobody can act
      IF public.kayad_owner_usable_count() > 0 THEN
        PERFORM public.kayad_owner_event('invitation_issue', 'denied', NULL, p_actor_label, v_email, NULL, 'emergency recovery refused: a usable owner exists', '{}');
        RETURN jsonb_build_object('ok', false, 'code', 'OWNER_RECOVERY_NOT_NEEDED'); END IF;
    END IF;
  ELSE
    IF p_kind = 'bootstrap' OR NOT public.kayad_owner_usable(p_actor) THEN
      PERFORM public.kayad_owner_event('invitation_issue', 'denied', p_actor, p_actor_label, v_email, NULL, 'actor not a usable owner', '{}');
      RETURN jsonb_build_object('ok', false, 'code', 'OWNER_ACTOR_NOT_OWNER'); END IF;
  END IF;
  SELECT m.user_id INTO v_member FROM public.owner_memberships m WHERE m.email = v_email AND m.status = 'active';
  IF FOUND THEN
    -- a usable owner is simply already an owner; an active-but-unusable membership (unverified, suspended, e-mail changed) can only be repaired by RECOVERY
    IF public.kayad_owner_usable(v_member) OR p_kind <> 'recovery' THEN
      PERFORM public.kayad_owner_event('invitation_issue', 'denied', p_actor, p_actor_label, v_email, v_member,
        CASE WHEN public.kayad_owner_usable(v_member) THEN 'already an active owner' ELSE 'membership exists but is not usable: use recovery' END, '{}');
      RETURN jsonb_build_object('ok', false, 'code', CASE WHEN public.kayad_owner_usable(v_member) THEN 'OWNER_ALREADY_ACTIVE' ELSE 'OWNER_NEEDS_RECOVERY' END);
    END IF;
  END IF;
  UPDATE public.owner_invitations SET status = 'expired', updated_at = now() WHERE email = v_email AND status = 'pending' AND expires_at <= now();
  IF EXISTS (SELECT 1 FROM public.owner_invitations WHERE email = v_email AND status = 'pending') THEN
    PERFORM public.kayad_owner_event('invitation_issue', 'denied', p_actor, p_actor_label, v_email, NULL, 'duplicate pending invitation', '{}');
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_INVITATION_PENDING'); END IF;
  INSERT INTO public.owner_invitations(email, kind, token_hash, invited_by, invited_by_label, note, expires_at)
  VALUES (v_email, p_kind, p_token_hash, p_actor, COALESCE(NULLIF(btrim(p_actor_label), ''), 'unknown'), left(p_note, 500), p_expires) RETURNING id INTO v_id;
  PERFORM public.kayad_owner_event('invitation_issue', 'success', p_actor, p_actor_label, v_email, NULL, p_note, jsonb_build_object('kind', p_kind, 'invitation_id', v_id, 'expires_at', p_expires));
  RETURN jsonb_build_object('ok', true, 'id', v_id, 'email', v_email, 'kind', p_kind, 'expires_at', p_expires);
END $$;

CREATE OR REPLACE FUNCTION public.kayad_owner_resend_invitation(p_invitation_id uuid, p_token_hash text, p_expires timestamptz, p_actor uuid, p_actor_label text, p_cooldown_seconds integer DEFAULT 60)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.owner_invitations%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(727001);
  SELECT * INTO v FROM public.owner_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'OWNER_INVITATION_NOT_FOUND'); END IF;
  IF p_expires <= now() + interval '1 minute' OR p_expires > now() + interval '7 days' THEN RETURN jsonb_build_object('ok', false, 'code', 'OWNER_INVALID_EXPIRY'); END IF;
  IF p_actor IS NULL THEN
    IF v.kind = 'bootstrap' AND (SELECT status FROM public.owner_bootstrap_state WHERE id = 1) IS DISTINCT FROM 'open' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'OWNER_BOOTSTRAP_CLOSED'); END IF;
    IF v.kind = 'recovery' AND public.kayad_owner_usable_count() > 0 THEN RETURN jsonb_build_object('ok', false, 'code', 'OWNER_RECOVERY_NOT_NEEDED'); END IF;
    IF v.kind = 'invitation' THEN RETURN jsonb_build_object('ok', false, 'code', 'OWNER_ACTOR_REQUIRED'); END IF;
  ELSIF NOT public.kayad_owner_usable(p_actor) THEN
    PERFORM public.kayad_owner_event('invitation_resend', 'denied', p_actor, p_actor_label, v.email, NULL, 'actor not a usable owner', '{}');
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_ACTOR_NOT_OWNER');
  END IF;
  IF v.status IN ('accepted','revoked') THEN
    PERFORM public.kayad_owner_event('invitation_resend', 'denied', p_actor, p_actor_label, v.email, NULL, 'invitation is ' || v.status, '{}');
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_INVITATION_CLOSED'); END IF;
  IF v.status = 'pending' AND v.last_sent_at > now() - make_interval(secs => GREATEST(p_cooldown_seconds, 0)) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_INVITATION_COOLDOWN'); END IF;
  UPDATE public.owner_invitations SET token_hash = p_token_hash, expires_at = p_expires, status = 'pending', resend_count = resend_count + 1, last_sent_at = now(), updated_at = now() WHERE id = v.id;
  PERFORM public.kayad_owner_event('invitation_resend', 'success', p_actor, p_actor_label, v.email, NULL, NULL, jsonb_build_object('invitation_id', v.id, 'resend_count', v.resend_count + 1, 'expires_at', p_expires));
  RETURN jsonb_build_object('ok', true, 'id', v.id, 'email', v.email, 'kind', v.kind, 'expires_at', p_expires);
END $$;

CREATE OR REPLACE FUNCTION public.kayad_owner_revoke_invitation(p_invitation_id uuid, p_actor uuid, p_actor_label text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.owner_invitations%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(727001);
  IF p_actor IS NULL OR NOT public.kayad_owner_usable(p_actor) THEN
    PERFORM public.kayad_owner_event('invitation_revoke', 'denied', p_actor, p_actor_label, NULL, NULL, 'actor not a usable owner', '{}');
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_ACTOR_NOT_OWNER'); END IF;
  SELECT * INTO v FROM public.owner_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND OR v.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'code', 'OWNER_INVITATION_NOT_FOUND'); END IF;
  UPDATE public.owner_invitations SET status = 'revoked', updated_at = now() WHERE id = v.id;
  PERFORM public.kayad_owner_event('invitation_revoke', 'success', p_actor, p_actor_label, v.email, NULL, p_reason, jsonb_build_object('invitation_id', v.id));
  RETURN jsonb_build_object('ok', true, 'id', v.id);
END $$;

CREATE OR REPLACE FUNCTION public.kayad_owner_accept_invitation_atomic(p_token_hash text, p_name text, p_password_hash text, p_authenticated_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.owner_invitations%ROWTYPE; u public.users%ROWTYPE; v_uid uuid; v_created boolean := false; v_reset boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(727001);
  SELECT * INTO v FROM public.owner_invitations WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND OR v.status IN ('accepted','revoked') THEN
    PERFORM public.kayad_owner_event('invitation_accept', 'denied', NULL, 'invitee', NULL, NULL, 'unknown, used or revoked token', '{}');
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_INVITATION_INVALID'); END IF;
  IF v.status = 'expired' OR v.expires_at <= now() THEN
    UPDATE public.owner_invitations SET status = 'expired', updated_at = now() WHERE id = v.id AND status = 'pending';
    PERFORM public.kayad_owner_event('invitation_accept', 'denied', NULL, 'invitee', v.email, NULL, 'expired', jsonb_build_object('invitation_id', v.id));
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_INVITATION_EXPIRED'); END IF;
  IF v.kind = 'bootstrap' AND (SELECT status FROM public.owner_bootstrap_state WHERE id = 1) IS DISTINCT FROM 'open' THEN
    PERFORM public.kayad_owner_event('invitation_accept', 'denied', NULL, 'invitee', v.email, NULL, 'bootstrap closed', jsonb_build_object('invitation_id', v.id));
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_BOOTSTRAP_CLOSED'); END IF;

  SELECT * INTO u FROM public.users WHERE lower(btrim(email)) = v.email FOR UPDATE;
  IF FOUND THEN
    IF COALESCE(u.is_banned, false) OR u.deactivated_at IS NOT NULL OR COALESCE(u.status, 'approved') IN ('suspended','banned','deactivated','rejected') THEN
      PERFORM public.kayad_owner_event('invitation_accept', 'denied', u.id, 'invitee', v.email, u.id, 'account suspended/ambiguous', jsonb_build_object('invitation_id', v.id));
      RETURN jsonb_build_object('ok', false, 'code', 'OWNER_ACCOUNT_BLOCKED'); END IF;
    v_uid := u.id;
    IF u.email_verified IS TRUE AND v.kind <> 'recovery' THEN
      -- an existing verified account must prove it is the one signed in; the invitation token alone never replaces its credentials
      -- (a RECOVERY invitation is the exception: it is only ever issued by an owner after out-of-band identity verification, or by the emergency procedure)
      IF p_authenticated_user IS DISTINCT FROM u.id THEN
        PERFORM public.kayad_owner_event('invitation_accept', 'denied', NULL, 'invitee', v.email, u.id, 'sign-in required', jsonb_build_object('invitation_id', v.id));
        RETURN jsonb_build_object('ok', false, 'code', 'OWNER_LOGIN_REQUIRED'); END IF;
    ELSE
      -- unverified row (possibly a squatter registered before the owner address was reserved): the mailbox holder takes it over.
      -- Credentials are REPLACED and every existing session/refresh token dies.
      IF p_password_hash IS NULL OR length(p_password_hash) < 20 THEN RETURN jsonb_build_object('ok', false, 'code', 'OWNER_PASSWORD_REQUIRED'); END IF;
      INSERT INTO public.user_auth(user_id, password, token_version) VALUES (u.id, p_password_hash, 1)
      ON CONFLICT (user_id) DO UPDATE SET password = EXCLUDED.password, token_version = COALESCE(public.user_auth.token_version, 0) + 1,
        email_verify_token = NULL, email_verify_expire = NULL, reset_token = NULL, reset_token_expire = NULL, login_attempts = 0, lock_until = NULL, must_change_password = false, updated_at = now();
      UPDATE public.users SET email_verified = true WHERE id = u.id;
      UPDATE public.refresh_tokens SET is_revoked = true, revoked_at = now(), revoke_reason = 'owner_invitation_credential_reset' WHERE "user" = u.id AND is_revoked = false;
      v_reset := true;
    END IF;
  ELSE
    IF p_password_hash IS NULL OR length(p_password_hash) < 20 OR COALESCE(btrim(p_name), '') = '' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'OWNER_PASSWORD_REQUIRED'); END IF;
    INSERT INTO public.users(name, email, role, status, email_verified) VALUES (left(btrim(p_name), 120), v.email, 'user', 'approved', true) RETURNING id INTO v_uid;
    INSERT INTO public.user_auth(user_id, password, token_version) VALUES (v_uid, p_password_hash, 0);
    v_created := true;
  END IF;

  IF v.kind = 'recovery' THEN -- re-establish this identity afresh: supersede its previous membership row (the audit trail keeps both rows)
    UPDATE public.owner_memberships SET status = 'revoked', revoked_at = now(), revoked_by_label = 'recovery-superseded', revoke_reason = 'superseded by recovery invitation', updated_at = now()
      WHERE (user_id = v_uid OR email = v.email) AND status = 'active';
  END IF;
  IF EXISTS (SELECT 1 FROM public.owner_memberships WHERE (user_id = v_uid OR email = v.email) AND status = 'active') THEN
    PERFORM public.kayad_owner_event('invitation_accept', 'denied', v_uid, 'invitee', v.email, v_uid, 'already an active owner', jsonb_build_object('invitation_id', v.id));
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_ALREADY_ACTIVE'); END IF;
  INSERT INTO public.owner_memberships(user_id, email, status, added_via, invitation_id, added_by_user_id, added_by_label)
  VALUES (v_uid, v.email, 'active', v.kind, v.id, v.invited_by, v.invited_by_label);
  UPDATE public.owner_invitations SET status = 'accepted', accepted_at = now(), accepted_user_id = v_uid, updated_at = now() WHERE id = v.id;
  PERFORM public.kayad_owner_event('membership_activate', 'success', v_uid, 'invitee', v.email, v_uid, NULL,
    jsonb_build_object('invitation_id', v.id, 'kind', v.kind, 'account_created', v_created, 'credentials_reset', v_reset));
  RETURN jsonb_build_object('ok', true, 'user_id', v_uid, 'email', v.email, 'kind', v.kind, 'account_created', v_created, 'credentials_reset', v_reset);
END $$;

CREATE OR REPLACE FUNCTION public.kayad_owner_revoke_membership_atomic(p_target_user uuid, p_actor uuid, p_actor_label text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.owner_memberships%ROWTYPE; v_after integer;
BEGIN
  PERFORM pg_advisory_xact_lock(727001);
  IF p_actor IS NULL OR NOT public.kayad_owner_usable(p_actor) THEN
    PERFORM public.kayad_owner_event('membership_revoke', 'denied', p_actor, p_actor_label, NULL, p_target_user, 'actor not a usable owner', '{}');
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_ACTOR_NOT_OWNER'); END IF;
  SELECT * INTO m FROM public.owner_memberships WHERE user_id = p_target_user AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'OWNER_NOT_MEMBER'); END IF;
  v_after := public.kayad_owner_usable_count() - CASE WHEN public.kayad_owner_usable(m.user_id) THEN 1 ELSE 0 END;
  IF v_after < 1 THEN
    PERFORM public.kayad_owner_event('membership_revoke', 'denied', p_actor, p_actor_label, m.email, m.user_id, 'would remove the last usable owner', jsonb_build_object('self', p_actor = m.user_id));
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_LAST_USABLE'); END IF;
  UPDATE public.owner_memberships SET status = 'revoked', revoked_at = now(), revoked_by_user_id = p_actor, revoked_by_label = COALESCE(NULLIF(btrim(p_actor_label), ''), 'unknown'),
    revoke_reason = left(p_reason, 500), updated_at = now() WHERE id = m.id;
  -- privileges and sessions die in the SAME transaction
  UPDATE public.user_auth SET token_version = COALESCE(token_version, 0) + 1, updated_at = now() WHERE user_id = m.user_id;
  UPDATE public.refresh_tokens SET is_revoked = true, revoked_at = now(), revoke_reason = 'owner_membership_revoked' WHERE "user" = m.user_id AND is_revoked = false;
  UPDATE public.owner_invitations SET status = 'revoked', updated_at = now() WHERE email = m.email AND status = 'pending';
  PERFORM public.kayad_owner_event('membership_revoke', 'success', p_actor, p_actor_label, m.email, m.user_id, p_reason, jsonb_build_object('self', p_actor = m.user_id, 'usable_after', v_after));
  RETURN jsonb_build_object('ok', true, 'user_id', m.user_id, 'email', m.email, 'usable_after', v_after);
END $$;

CREATE OR REPLACE FUNCTION public.kayad_owner_bootstrap_close(p_actor_label text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(727001);
  IF public.kayad_owner_usable_count() < 1 THEN RETURN jsonb_build_object('ok', false, 'code', 'OWNER_NONE_ESTABLISHED'); END IF;
  UPDATE public.owner_bootstrap_state SET status = 'closed', closed_at = COALESCE(closed_at, now()), closed_by = COALESCE(closed_by, p_actor_label), closed_reason = COALESCE(closed_reason, left(p_reason, 200)) WHERE id = 1 AND status = 'open';
  UPDATE public.owner_invitations SET status = 'revoked', updated_at = now() WHERE kind = 'bootstrap' AND status = 'pending';
  PERFORM public.kayad_owner_event('bootstrap_close', 'success', NULL, p_actor_label, NULL, NULL, p_reason, '{}');
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.kayad_owner_log_event(p_action text, p_result text, p_actor uuid, p_actor_label text, p_email text, p_target uuid, p_reason text, p_meta jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.kayad_owner_event(left(p_action, 60), CASE WHEN p_result IN ('success','denied','failed') THEN p_result ELSE 'failed' END, p_actor, p_actor_label, lower(btrim(p_email)), p_target, p_reason, p_meta);
$$;

-- ───────────── privileges: service_role only ─────────────
REVOKE ALL ON FUNCTION public.kayad_owner_usable(uuid), public.kayad_owner_usable_count(), public.kayad_owner_event(text,text,uuid,text,text,uuid,text,jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.kayad_owner_snapshot(), public.kayad_owner_issue_invitation(text,text,text,timestamptz,uuid,text,text),
  public.kayad_owner_resend_invitation(uuid,text,timestamptz,uuid,text,integer), public.kayad_owner_revoke_invitation(uuid,uuid,text,text),
  public.kayad_owner_accept_invitation_atomic(text,text,text,uuid), public.kayad_owner_revoke_membership_atomic(uuid,uuid,text,text),
  public.kayad_owner_bootstrap_close(text,text), public.kayad_owner_log_event(text,text,uuid,text,text,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_owner_snapshot(), public.kayad_owner_issue_invitation(text,text,text,timestamptz,uuid,text,text),
  public.kayad_owner_resend_invitation(uuid,text,timestamptz,uuid,text,integer), public.kayad_owner_revoke_invitation(uuid,uuid,text,text),
  public.kayad_owner_accept_invitation_atomic(text,text,text,uuid), public.kayad_owner_revoke_membership_atomic(uuid,uuid,text,text),
  public.kayad_owner_bootstrap_close(text,text), public.kayad_owner_log_event(text,text,uuid,text,text,uuid,text,jsonb) TO service_role;

-- ───────────── e-mail rollout controls ─────────────
-- Communication events fail CLOSED until an admin enables them (communicationRollout.service.js). Without these rows the owner
-- invitation and the owner security notice would be silently suppressed. E-mail only; SMS/WhatsApp stay off.
INSERT INTO public.communication_event_controls(event_type, channel, enabled) VALUES
  ('owner.invitation', 'email', true), ('owner.invitation', 'sms', false), ('owner.invitation', 'whatsapp', false),
  ('owner.security_notice', 'email', true), ('owner.security_notice', 'sms', false), ('owner.security_notice', 'whatsapp', false)
ON CONFLICT (event_type, channel) DO NOTHING;

-- Make PostgREST pick up the new functions immediately (a schema-cache gap would otherwise surface as 'function not found').
NOTIFY pgrst, 'reload schema';
