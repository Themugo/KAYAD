-- ONBOARDING SCHEMA CHAIN v2 — STEP 1: PREFLIGHT (READ-ONLY). Candidate 2026-10-13; supersedes nothing (COMMS_STEP1-4 are kept as-is).
-- Run in the Supabase SQL editor against the TARGET (staging first). Contains SELECTs only. Review each result before any apply.
-- Expected on the 2026-10-13 production baseline is noted per check; anything different means STOP and re-audit.

-- P1 migration history: newest applied version (baseline: 20260922060457)
select max(version) as newest_applied, count(*) as applied_count from supabase_migrations.schema_migrations;

-- P2 none of the chain is applied yet (baseline: 0 rows)
select version, name from supabase_migrations.schema_migrations
where version in ('20260930111500','20260930113000','20260930112000','20261001090000','20261001220000','20260930110000','20261011090000','20261011121000');

-- P3 normalized-email collisions BLOCK unique index 20260930112000 (baseline: 0)
select lower(btrim(email)) as email_norm, count(*) from public.users group by 1 having count(*) > 1;
select count(*) as non_normalized_emails from public.users where email <> lower(btrim(email)); -- baseline 0

-- P4 refresh_tokens volume: 20260930110000 DROPS the plaintext token column (baseline: 0 rows -> no live sessions lost)
select count(*) as refresh_token_rows, count(*) filter (where not is_revoked and expires_at > now()) as live_sessions from public.refresh_tokens;
select column_name from information_schema.columns where table_schema='public' and table_name='refresh_tokens' order by ordinal_position;

-- P5 dealer backfill impact of 20261001090000 (inserts a dealers row per dealer user lacking one). Baseline: 2 dealer users, 0 dealers rows.
select (select count(*) from public.users where role='dealer') as dealer_users,
       (select count(*) from public.dealers) as dealers_rows,
       (select count(*) from public.users u where u.role='dealer' and not exists (select 1 from public.dealers d where d."user"=u.id)) as will_be_backfilled;
-- dealers must have no NOT NULL column without default other than id/"user" (baseline: true)
select column_name from information_schema.columns where table_schema='public' and table_name='dealers' and is_nullable='NO' and column_default is null;

-- P6 communication_deliveries must be empty or compatible with the new status CHECK (dead_letter added) and new unique indexes (baseline: 0 rows)
select count(*) as delivery_rows, count(*) filter (where status not in ('queued','sending','sent','delivered','failed','bounced','read','dead_letter')) as bad_status from public.communication_deliveries;
select column_name from information_schema.columns where table_schema='public' and table_name='communication_deliveries' and column_name='idempotency_key'; -- baseline: no row

-- P7 prerequisites exist
select to_regclass('public.profiles') as profiles, to_regclass('public.inspector_applications') as inspector_applications,
       exists(select 1 from pg_proc where proname='update_updated_at_snake') as updated_at_fn,
       exists(select 1 from pg_extension where extname='pgcrypto') as pgcrypto_installed,
       exists(select 1 from pg_available_extensions where name='pgcrypto') as pgcrypto_available;

-- P8 objects the chain creates must not already exist in a conflicting form
select proname, pg_get_function_identity_arguments(oid) from pg_proc where pronamespace='public'::regnamespace
 and proname in ('kayad_register_identity_atomic','kayad_rotate_refresh_token','sync_dealer_profile_from_user','sync_profile_role_from_user'); -- baseline: 0 rows

-- P9 blocking activity (do not apply while long transactions hold locks on users / refresh_tokens / communication_deliveries)
select pid, state, now()-xact_start as xact_age, left(query,80) as q from pg_stat_activity where datname=current_database() and xact_start is not null and now()-xact_start > interval '30 seconds';

-- P10 rollback safety net: confirm a restorable backup / PITR point exists BEFORE apply (manual check in Supabase dashboard — cannot be verified from SQL).
