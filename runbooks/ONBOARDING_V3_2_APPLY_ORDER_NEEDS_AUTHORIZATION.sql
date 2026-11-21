-- ############################################################################################
-- CANDIDATE — NOT EXECUTED — REQUIRES EXPLICIT AUTHORIZATION.  Do NOT run against production.
-- Supersedes nothing: ONBOARDING_V2_2 is kept unchanged. Run on APPROVED STAGING first, with backup/PITR confirmed.
-- Differences from V2: (1) the whole chain is ONE transaction, so a failure in any step leaves the database exactly as it was
-- (verified on PostgreSQL 17.6: scenario S2b); (2) step 9 adds explicit anon/authenticated revokes (see the candidate file);
-- (3) the destructive 20260930110000 step is unchanged — confirm 0 live sessions / accept forced re-login first.
-- Usage (from the repo root):  psql "$STAGING_URL" -v ON_ERROR_STOP=1 -f runbooks/ONBOARDING_V3_2_APPLY_ORDER_NEEDS_AUTHORIZATION.sql
-- ############################################################################################
\set ON_ERROR_STOP on
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
\i supabase/migrations/20260930111500_advanced_communication_idempotency.sql
\i supabase/migrations/20260930113000_communication_state_machine_hardening.sql
\i supabase/migrations/20260930112000_identity_email_normalization.sql
\i supabase/migrations/20261001090000_registration_onboarding_integrity.sql
\i supabase/migrations/20261001220000_database_contract_alignment.sql
\i supabase/migrations/20260930110000_advanced_identity_session_hardening.sql
\i supabase/migrations/20261011090000_users_security_state_columns.sql
\i supabase/migrations/20261011121000_profiles_role_sync_repair.sql
\i runbooks/ONBOARDING_V3_CANDIDATE_9_explicit_client_revokes.sql
commit;
