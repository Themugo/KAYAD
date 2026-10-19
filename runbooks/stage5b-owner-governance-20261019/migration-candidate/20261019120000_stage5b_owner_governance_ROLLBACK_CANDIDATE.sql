-- KAYAD Stage 5B — ROLLBACK CANDIDATE for 20261019120000_stage5b_owner_governance. NOT APPLIED anywhere shared.
-- Destroys owner membership AND the owner audit ledger. It refuses to run unless you state that the ledger was exported:
--   \copy (select * from public.owner_membership_events order by id) to 'owner_membership_events.csv' csv header
--   psql -v confirm_events_exported=yes -1 -f <this file>
-- AFTER running it: the application must be restarted (or OWNER_STORE_MODE=legacy set). A RUNNING instance that had already seen the
-- store fails CLOSED (no owner privilege, 503 OWNER_STORE_UNAVAILABLE) — it will NOT silently fall back to the env owner list.
\if :{?confirm_events_exported}
\else
  \echo 'REFUSING: export owner_membership_events first, then re-run with -v confirm_events_exported=yes'
  \quit
\endif
DROP FUNCTION IF EXISTS public.kayad_owner_snapshot();
DROP FUNCTION IF EXISTS public.kayad_owner_issue_invitation(text,text,text,timestamptz,uuid,text,text);
DROP FUNCTION IF EXISTS public.kayad_owner_resend_invitation(uuid,text,timestamptz,uuid,text,integer);
DROP FUNCTION IF EXISTS public.kayad_owner_revoke_invitation(uuid,uuid,text,text);
DROP FUNCTION IF EXISTS public.kayad_owner_accept_invitation_atomic(text,text,text,uuid);
DROP FUNCTION IF EXISTS public.kayad_owner_revoke_membership_atomic(uuid,uuid,text,text);
DROP FUNCTION IF EXISTS public.kayad_owner_bootstrap_close(text,text);
DROP FUNCTION IF EXISTS public.kayad_owner_log_event(text,text,uuid,text,text,uuid,text,jsonb);
DROP FUNCTION IF EXISTS public.kayad_owner_usable_count();
DROP FUNCTION IF EXISTS public.kayad_owner_usable(uuid);
DROP FUNCTION IF EXISTS public.kayad_owner_event(text,text,uuid,text,text,uuid,text,jsonb);
DROP TABLE IF EXISTS public.owner_invitations;
DROP TABLE IF EXISTS public.owner_memberships;
DROP TABLE IF EXISTS public.owner_bootstrap_state;
DROP TABLE IF EXISTS public.owner_membership_events;
DROP FUNCTION IF EXISTS public.kayad_owner_events_immutable();
DELETE FROM public.communication_event_controls WHERE event_type IN ('owner.invitation','owner.security_notice');
NOTIFY pgrst, 'reload schema';
