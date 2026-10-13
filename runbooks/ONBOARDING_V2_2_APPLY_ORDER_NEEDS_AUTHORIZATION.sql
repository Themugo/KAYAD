-- ############################################################################################
-- NOT EXECUTED — REQUIRES EXPLICIT AUTHORIZATION.  Do NOT run against production.
-- Run on STAGING first, with PITR/backup confirmed and ONBOARDING_V2_1 preflight reviewed.
-- ############################################################################################
-- ONBOARDING SCHEMA CHAIN v2 — STEP 2: ORDERED APPLY (psql). Each file is applied as its own unit, in this order.
-- Why this order (verified on a throwaway PostgreSQL 16, scripts/rehearse-onboarding-migrations-local.sh):
--   111500 adds idempotency_key  -> 113000 adds dead_letter CHECK -> 112000 unique(lower(btrim(email)))
--   -> 090000 registration RPC + dealers columns/trigger + inspector_applications (+ dealers backfill)
--   -> 220000 grants/re-statement (ERRORS if the RPC from 090000 is absent) -> 110000 refresh-token hardening (DESTRUCTIVE: drops plaintext token)
--   -> 20261011090000 users security columns -> 20261011121000 profiles role sync repair.
-- Deploy ordering: apply the migrations FIRST, then deploy backend commit with matching code; the current deployed backend
-- already requires these objects, so registration/sign-in stay broken until this chain is applied.
-- NOT included (separate decisions): R12 20261012140000, R14 20261012140100, 20260928123600 (label drift only), financial/auction chain.
\set ON_ERROR_STOP on
set lock_timeout = '5s';
set statement_timeout = '60s';

\i supabase/migrations/20260930111500_advanced_communication_idempotency.sql
\i supabase/migrations/20260930113000_communication_state_machine_hardening.sql
\i supabase/migrations/20260930112000_identity_email_normalization.sql
\i supabase/migrations/20261001090000_registration_onboarding_integrity.sql
\i supabase/migrations/20261001220000_database_contract_alignment.sql
-- >>> POINT OF NO RETURN for refresh_tokens.token: confirm P4 shows 0 live sessions (or accept forced re-login) before the next line.
\i supabase/migrations/20260930110000_advanced_identity_session_hardening.sql
\i supabase/migrations/20261011090000_users_security_state_columns.sql
\i supabase/migrations/20261011121000_profiles_role_sync_repair.sql
-- Record history only if applying outside the Supabase migration runner (otherwise the runner records it):
-- insert into supabase_migrations.schema_migrations(version,name) values (...);  -- NOT EXECUTED
