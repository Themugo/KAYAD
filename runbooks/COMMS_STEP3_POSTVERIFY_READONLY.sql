-- STEP 3 — POST-MIGRATION VERIFICATION (READ-ONLY; inserts nothing). Every row must read PASS.
select check_name, expected, actual, case when actual = expected then 'PASS' else 'FAIL' end as result from (
  select 1 ord, 'idempotency_key column type' check_name, 'text|YES|none' expected,
    coalesce((select data_type||'|'||is_nullable||'|'||coalesce(column_default,'none') from information_schema.columns where table_schema='public' and table_name='communication_deliveries' and column_name='idempotency_key'),'ABSENT') actual
  union all select 2, 'idx idempotency (unique partial)',
    'CREATE UNIQUE INDEX uq_communication_delivery_idempotency ON public.communication_deliveries USING btree (provider, channel, idempotency_key) WHERE (idempotency_key IS NOT NULL)',
    coalesce((select indexdef from pg_indexes where schemaname='public' and tablename='communication_deliveries' and indexname='uq_communication_delivery_idempotency'),'ABSENT')
  union all select 3, 'idx provider_event (unique partial)',
    'CREATE UNIQUE INDEX uq_communication_delivery_provider_event ON public.communication_deliveries USING btree (provider, provider_event_id) WHERE (provider_event_id IS NOT NULL)',
    coalesce((select indexdef from pg_indexes where schemaname='public' and tablename='communication_deliveries' and indexname='uq_communication_delivery_provider_event'),'ABSENT')
  union all select 4, 'idx source_event (partial)',
    'CREATE INDEX idx_communication_delivery_source_event ON public.communication_deliveries USING btree (source_event_id) WHERE (source_event_id IS NOT NULL)',
    coalesce((select indexdef from pg_indexes where schemaname='public' and tablename='communication_deliveries' and indexname='idx_communication_delivery_source_event'),'ABSENT')
  union all select 5, 'status check allows exactly 8 states',
    'CHECK ((status = ANY (ARRAY[''queued''::text, ''sending''::text, ''sent''::text, ''delivered''::text, ''failed''::text, ''bounced''::text, ''read''::text, ''dead_letter''::text])))',
    coalesce((select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.communication_deliveries'::regclass and conname='communication_deliveries_status_check'),'ABSENT')
  union all select 6, 'status check is validated', 'true',
    coalesce((select convalidated::text from pg_constraint where conrelid='public.communication_deliveries'::regclass and conname='communication_deliveries_status_check'),'ABSENT')
  union all select 7, 'channel check untouched', 'CHECK ((channel = ANY (ARRAY[''in_app''::text, ''email''::text, ''sms''::text, ''whatsapp''::text])))',
    coalesce((select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.communication_deliveries'::regclass and conname='communication_deliveries_channel_check'),'ABSENT')
  union all select 8, 'no invalid indexes on table', '0',
    (select count(*)::text from pg_index i where i.indrelid='public.communication_deliveries'::regclass and not i.indisvalid)
  union all select 9, 'RLS still enabled', 'true', (select relrowsecurity::text from pg_class where oid='public.communication_deliveries'::regclass)
  union all select 10, 'service_role still has INSERT', 'true', (exists (select 1 from information_schema.role_table_grants where table_schema='public' and table_name='communication_deliveries' and grantee='service_role' and privilege_type='INSERT'))::text
  union all select 11, 'anon/authenticated have no write grants', '0', (select count(*)::text from information_schema.role_table_grants where table_schema='public' and table_name='communication_deliveries' and grantee in ('anon','authenticated') and privilege_type in ('INSERT','UPDATE','DELETE'))
  union all select 12, 'owner-read policy unchanged', 'communication_deliveries_owner_read', coalesce((select string_agg(policyname, ',') from pg_policies where schemaname='public' and tablename='communication_deliveries'),'ABSENT')
  union all select 13, 'column count (24 pre-fix + idempotency_key)', '25', (select count(*)::text from information_schema.columns where table_schema='public' and table_name='communication_deliveries')
) c order by ord;
