-- SELECT-only. Run each on its own.
select column_name from information_schema.columns where table_schema='public' and table_name='communication_deliveries'
  and column_name in ('idempotency_key','retry_count','next_retry_at','provider_event_id','source_event_id') order by column_name;
select pg_get_constraintdef(oid) as status_rule from pg_constraint where conrelid='public.communication_deliveries'::regclass and conname='communication_deliveries_status_check';
select column_name from information_schema.columns where table_schema='public' and table_name='users' and column_name in ('deactivated_at','granted_permissions','revoked_permissions','last_active') order by column_name;
select column_name from information_schema.columns where table_schema='public' and table_name='refresh_tokens' order by ordinal_position;
select count(*) from pg_proc where proname='kayad_rotate_refresh_token';
select event_type, status, last_error, created_at from public.communication_deliveries order by created_at desc limit 5;
