-- STAGE 5C — READ-ONLY preflight. Every statement is a SELECT. Run in the Supabase SQL editor. Do NOT paste results containing secrets back anywhere.
-- §1 registration RPC
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('kayad_register_identity_atomic','kayad_activate_dealer_subscription_atomic');
-- §2 users / user_auth security columns (expect every listed column)
select table_name, column_name from information_schema.columns where table_schema='public' and ((table_name='users' and column_name in ('deactivated_at','granted_permissions','revoked_permissions','last_active','is_banned','email_verified','status'))
 or (table_name='user_auth' and column_name in ('login_attempts','lock_until','token_version','email_verify_token','email_verify_expire','reset_token','reset_token_expire')));
-- §3 case-insensitive unique email index
select indexname, indexdef from pg_indexes where schemaname='public' and tablename='users' and indexdef ilike '%lower%email%';
-- §4 dealer onboarding
select column_name from information_schema.columns where table_schema='public' and table_name='dealers' and column_name in ('bio','payment_details','onboarding_complete','onboarding_completed_at','business_name');
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.dealer_verifications'::regclass and contype='c';
-- §5 inspector tables
select table_name from information_schema.tables where table_schema='public' and table_name in ('inspector_applications','vehicle_inspections','inspection_providers','inspection_staff');
-- §6 OTP
select table_name from information_schema.tables where table_schema='public' and table_name='otp_challenges';
select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.otp_challenges'::regclass and contype='c'; -- status check must list delivery_failed
-- §7 security_logs
select table_name from information_schema.tables where table_schema='public' and table_name in ('security_logs','audit_logs');
-- §8 communication controls (event names + enabled flag only; no secrets)
select event_type, channel, enabled from public.communication_event_controls order by 1,2;
-- §9 owner governance objects
select table_name from information_schema.tables where table_schema='public' and table_name like 'owner\_%';
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'kayad_owner_%';
-- §10 applied migrations
select count(*) from supabase_migrations.schema_migrations;
-- §11 designated identities (masked): found? mailbox verified? banned/deactivated?
select left(email,3)||'***'||right(email,10) as masked, email_verified, role, status, is_banned, deactivated_at is not null as deactivated
 from public.users where lower(email) in ('kayadautomotives@gmail.com','jimmythemugo@gmail.com');
