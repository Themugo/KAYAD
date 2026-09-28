-- KAYAD Phase 3 — read-only RLS inventory.
-- Run against the target Supabase database with a privileged SQL session.
-- This does not mutate schema or data.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  coalesce(p.policy_count, 0) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join (
  select schemaname, tablename, count(*)::int as policy_count
  from pg_policies
  where schemaname = 'public'
  group by schemaname, tablename
) p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
