-- STAGE 5B — READ-ONLY preflight for migration 20261019120000_stage5b_owner_governance.
-- Run in the Supabase SQL editor (or psql) BEFORE approving D1. Every statement is a SELECT; nothing is changed.
-- 1. The candidate must not already exist (expect 0 rows)
select table_name from information_schema.tables where table_schema='public' and table_name in ('owner_memberships','owner_invitations','owner_membership_events','owner_bootstrap_state');
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'kayad_owner_%';
-- 2. Prerequisites: users / user_auth / communication_event_controls / refresh_tokens exist (expect 4 rows)
select table_name from information_schema.tables where table_schema='public' and table_name in ('users','user_auth','communication_event_controls','refresh_tokens');
-- 3. Stage 5A migrations needed by the application are present (compare with the 5A Gate C list; expect no missing rows)
--    (hosted Supabase has supabase_migrations.schema_migrations; a bare local disposable PG does not — an error here is expected there)
select count(*) as applied_migrations from supabase_migrations.schema_migrations;
-- 4. State of the designated identities (masked). Each designated identity should be an existing, mailbox-verified, non-suspended account
--    BEFORE `owner:bootstrap --apply`; otherwise bootstrap will (correctly) refuse and say why.
select left(email,2)||'***'||substring(email from '@.*$') as who, email_verified, is_banned, deactivated_at is not null as deactivated, status, role
from public.users where lower(email) in ('kayadautomotives@gmail.com','jimmythemugo@gmail.com');
-- 5. Any pre-existing rows that already carry an owner-like role label (informational: after the migration a role label confers nothing)
select role, count(*) from public.users where role in ('superadmin','webhoist') group by role;
-- 6. Communication event controls must be writable by the migration (expect the table to have rows)
select count(*) from public.communication_event_controls;

-- 7. COLUMN PREREQUISITES (closure). The candidate FAILS to apply if any of these is missing. Expect 0 rows from this query.
with need(tbl,col) as (values
 ('users','id'),('users','email'),('users','email_verified'),('users','is_banned'),('users','status'),('users','role'),('users','deactivated_at'),
 ('users','granted_permissions'),('users','revoked_permissions'),('users','last_active'),
 ('user_auth','user_id'),('user_auth','password'),('user_auth','token_version'),
 ('refresh_tokens','"user"'),('refresh_tokens','session_id'),('refresh_tokens','family_id'),('refresh_tokens','is_revoked'),('refresh_tokens','revoked_at'),('refresh_tokens','revoke_reason'),
 ('communication_event_controls','event_type'))
select n.tbl, n.col as missing_column from need n
where not exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=n.tbl and c.column_name=trim(both '"' from n.col));
-- 8. HOSTED SCHEMA GAPS reported at Stage 5A Gate C (expect every row = true). Each false row names the migration that resolves it.
select 'registration RPC kayad_register_identity_atomic' as item, exists(select 1 from pg_proc where proname='kayad_register_identity_atomic') as present, '20261001090000_registration_onboarding_integrity.sql (+20261001220000_database_contract_alignment.sql)' as resolved_by
union all select 'refresh_tokens.session_id / family_id', (select count(*)=2 from information_schema.columns where table_schema='public' and table_name='refresh_tokens' and column_name in ('session_id','family_id')), '20260930110000_advanced_identity_session_hardening.sql'
union all select 'users security columns (deactivated_at, granted/revoked_permissions, last_active)', (select count(*)=4 from information_schema.columns where table_schema='public' and table_name='users' and column_name in ('deactivated_at','granted_permissions','revoked_permissions','last_active')), '20261011090000_users_security_state_columns.sql'
union all select 'case-insensitive unique e-mail index on users', exists(select 1 from pg_indexes where schemaname='public' and tablename='users' and indexdef ilike '%lower(%email%' and indexdef ilike '%unique%'), '20260930112000_identity_email_normalization.sql';
