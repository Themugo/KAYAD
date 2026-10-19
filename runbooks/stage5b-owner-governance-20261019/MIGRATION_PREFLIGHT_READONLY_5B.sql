-- STAGE 5B — READ-ONLY preflight for migration 20261019120000_stage5b_owner_governance.
-- Run in the Supabase SQL editor (or psql) BEFORE approving D1. Every statement is a SELECT; nothing is changed.
-- 1. The candidate must not already exist (expect 0 rows)
select table_name from information_schema.tables where table_schema='public' and table_name in ('owner_memberships','owner_invitations','owner_membership_events','owner_bootstrap_state');
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'kayad_owner_%';
-- 2. Prerequisites: users / user_auth / communication_event_controls / refresh_tokens exist (expect 4 rows)
select table_name from information_schema.tables where table_schema='public' and table_name in ('users','user_auth','communication_event_controls','refresh_tokens');
-- 3. Stage 5A migrations needed by the application are present (compare with the 5A Gate C list; expect no missing rows)
select count(*) as applied_migrations from supabase_migrations.schema_migrations;
-- 4. State of the designated identities (masked). Each designated identity should be an existing, mailbox-verified, non-suspended account
--    BEFORE `owner:bootstrap --apply`; otherwise bootstrap will (correctly) refuse and say why.
select left(email,2)||'***'||substring(email from '@.*$') as who, email_verified, is_banned, deactivated_at is not null as deactivated, status, role
from public.users where lower(email) in ('kayadautomotives@gmail.com','jimmythemugo@gmail.com');
-- 5. Any pre-existing rows that already carry an owner-like role label (informational: after the migration a role label confers nothing)
select role, count(*) from public.users where role in ('superadmin','webhoist') group by role;
-- 6. Communication event controls must be writable by the migration (expect the table to have rows)
select count(*) from public.communication_event_controls;
