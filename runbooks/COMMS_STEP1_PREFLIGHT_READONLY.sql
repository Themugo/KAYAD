-- STEP 1 — PREFLIGHT (READ-ONLY). Safe to run in the Supabase SQL editor; contains SELECTs only.
-- Output: one row per check. "BLOCKER" rows must be resolved before STEP 2. "INFO" rows are context.
with t as (select to_regclass('public.communication_deliveries') as oid)
select 1 ord, 'table exists' as check_name, case when (select oid from t) is not null then 'OK' else 'BLOCKER' end as result, coalesce((select oid::text from t),'missing') as detail
union all
select 2, 'idempotency_key column',
  case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='communication_deliveries' and column_name='idempotency_key') then 'INFO: already present' else 'INFO: absent (expected pre-fix)' end,
  coalesce((select data_type||' nullable='||is_nullable||' default='||coalesce(column_default,'none') from information_schema.columns where table_schema='public' and table_name='communication_deliveries' and column_name='idempotency_key'),'-')
union all
select 3, 'status CHECK constraint', 'INFO',
  coalesce((select conname||' :: '||pg_get_constraintdef(oid) from pg_constraint where conrelid='public.communication_deliveries'::regclass and contype='c' and conname='communication_deliveries_status_check'),'NOT FOUND (ADD will create it)')
union all
select 4, 'other CHECK constraints on status (unexpected names)', case when exists (select 1 from pg_constraint where conrelid='public.communication_deliveries'::regclass and contype='c' and conname<>'communication_deliveries_status_check' and conname<>'communication_deliveries_channel_check' and pg_get_constraintdef(oid) ilike '%status%') then 'BLOCKER' else 'OK' end, 'a differently named status check would remain and still reject dead_letter'
union all
select 5, 'rows total', 'INFO', (select count(*)::text from public.communication_deliveries)
union all
select 6, 'rows with status outside the NEW allowed set (would block ADD CONSTRAINT)',
  case when exists (select 1 from public.communication_deliveries where status not in ('queued','sending','sent','delivered','failed','bounced','read','dead_letter')) then 'BLOCKER' else 'OK' end,
  (select count(*)::text from public.communication_deliveries where status not in ('queued','sending','sent','delivered','failed','bounced','read','dead_letter'))
union all
select 7, 'duplicate (provider, provider_event_id) among non-null (would block unique index)',
  case when exists (select 1 from public.communication_deliveries where provider_event_id is not null group by provider, provider_event_id having count(*)>1) then 'BLOCKER' else 'OK' end,
  (select count(*)::text from (select 1 from public.communication_deliveries where provider_event_id is not null group by provider, provider_event_id having count(*)>1) d)
union all
select 8, 'same-named indexes already present with a DIFFERENT definition (IF NOT EXISTS would silently keep the wrong one)',
  case when exists (select 1 from pg_indexes where schemaname='public' and tablename='communication_deliveries' and indexname in ('uq_communication_delivery_idempotency','uq_communication_delivery_provider_event','idx_communication_delivery_source_event')) then 'REVIEW' else 'OK' end,
  coalesce((select string_agg(indexname||' :: '||indexdef, ' | ') from pg_indexes where schemaname='public' and tablename='communication_deliveries' and indexname in ('uq_communication_delivery_idempotency','uq_communication_delivery_provider_event','idx_communication_delivery_source_event')),'none present')
union all
select 9, 'existing indexes', 'INFO', (select string_agg(indexname, ', ' order by indexname) from pg_indexes where schemaname='public' and tablename='communication_deliveries')
union all
select 10, 'RLS enabled / forced', 'INFO', (select relrowsecurity::text||' / '||relforcerowsecurity::text from pg_class where oid='public.communication_deliveries'::regclass)
union all
select 11, 'service_role privileges', case when exists (select 1 from information_schema.role_table_grants where table_schema='public' and table_name='communication_deliveries' and grantee='service_role' and privilege_type='INSERT') then 'OK' else 'BLOCKER' end, 'backend writes via service role'
union all
select 12, 'triggers on table', 'INFO', coalesce((select string_agg(tgname, ', ') from pg_trigger where tgrelid='public.communication_deliveries'::regclass and not tgisinternal),'none')
union all
select 13, 'views depending on table', 'INFO', coalesce((select string_agg(distinct v.relname, ', ') from pg_depend d join pg_rewrite r on r.oid=d.objid join pg_class v on v.oid=r.ev_class where d.refobjid='public.communication_deliveries'::regclass and v.oid<>d.refobjid),'none')
union all
select 14, 'other sessions touching the table right now', case when (select count(*) from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and state<>'idle' and query ilike '%communication_deliveries%')>0 then 'REVIEW' else 'OK' end, (select count(*)::text from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and state<>'idle' and query ilike '%communication_deliveries%')
union all
select 15, 'table size', 'INFO', pg_size_pretty(pg_total_relation_size('public.communication_deliveries'))
union all
select 16, 'newest applied migration (history)', 'INFO', (select version||' '||name from supabase_migrations.schema_migrations order by version desc limit 1)
union all
select 17, 'server_version / lock_timeout / statement_timeout', 'INFO', (select string_agg(name||'='||setting, '; ') from pg_settings where name in ('server_version','lock_timeout','statement_timeout'))
union all
-- App-compatibility dependencies OUTSIDE this fix (see runbook). These do not block STEP 2 but decide which backend build may run.
select 20, 'APP DEPENDENCY: function kayad_register_identity_atomic (current registration code calls it)', case when exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='kayad_register_identity_atomic') then 'OK' else 'MISSING' end, 'migration 20261001090000'
union all
select 21, 'APP DEPENDENCY: refresh_tokens.token_hash (current session code)', case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='refresh_tokens' and column_name='token_hash') then 'OK' else 'MISSING' end, 'migration 20260930110000 (destructive: drops plaintext token column)'
union all
select 22, 'APP DEPENDENCY: function kayad_rotate_refresh_token', case when exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='kayad_rotate_refresh_token') then 'OK' else 'MISSING' end, 'migration 20260930110000'
union all
select 23, 'APP DEPENDENCY: users.deactivated_at / granted_permissions / revoked_permissions / last_active (auth middleware reads them on every request)',
  case when (select count(*) from information_schema.columns where table_schema='public' and table_name='users' and column_name in ('deactivated_at','granted_permissions','revoked_permissions','last_active'))=4 then 'OK' else 'MISSING' end, 'migration 20261011090000'
union all
select 24, 'APP DEPENDENCY: unique index on lower(btrim(users.email))', case when exists (select 1 from pg_indexes where schemaname='public' and tablename='users' and indexname='uq_users_email_normalized') then 'OK' else 'MISSING' end, 'migration 20260930112000'
order by ord;
