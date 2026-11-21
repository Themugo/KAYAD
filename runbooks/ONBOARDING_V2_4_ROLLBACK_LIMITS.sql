-- ############################################################################################
-- NOT EXECUTED — REQUIRES EXPLICIT AUTHORIZATION.  Rollback is PARTIAL by design; read the limits first.
-- ############################################################################################
-- LIMITS (do not skip):
--  * 20260930110000 DROPS refresh_tokens.token. Plaintext tokens CANNOT be recreated from hashes. Rolling back restores the SHAPE only
--    (a nullable `token` column); every existing session must re-authenticate. The only true undo is a backup/PITR restore.
--  * Rolling back the registration RPC / grants re-breaks registration on the currently deployed backend (it requires them).
--  * Dropping uq_users_email_normalized re-opens case/whitespace duplicate emails (users_email_key still blocks exact duplicates).
--  * Dealer rows backfilled by 20261001090000 and any users/user_auth rows created after apply are NOT removed here (data is kept).
--  * Re-applying the status CHECK without dead_letter FAILS if any dead_letter rows exist.
-- Prefer restore-from-backup over this script. Everything below is commented out on purpose.
/*
begin;
  -- identity/session (shape only)
  alter table public.refresh_tokens add column if not exists token text;
  -- drop function if exists public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid);
  -- registration
  -- drop function if exists public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz);
  -- drop trigger if exists trg_sync_dealer_profile_from_user on public.users;
  -- email normalization
  -- drop index if exists public.uq_users_email_normalized;
  -- communications (only if no dead_letter rows):
  -- alter table public.communication_deliveries drop constraint communication_deliveries_status_check;
  -- alter table public.communication_deliveries add constraint communication_deliveries_status_check check (status in ('queued','sending','sent','delivered','failed','bounced','read'));
  -- drop index if exists public.uq_communication_delivery_idempotency, public.uq_communication_delivery_provider_event;
commit;
*/
