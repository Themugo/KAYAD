-- KAYAD — READ-ONLY schema / security inventory (catalog metadata only).
--
-- * No DDL, no DML, no row data from application tables. It reads pg_catalog / information_schema and, if present,
--   the VERSION and NAME columns of supabase_migrations.schema_migrations (never the stored SQL statements).
-- * Output: ONE row, ONE column `inventory` (jsonb). Save it as JSON and compare with the repository baseline:
--     psql "$STAGING_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -f supabase/preflight/INVENTORY_SCHEMA_SECURITY.sql > hosted-inventory.json
--     node scripts/supabase-reconcile.mjs docs/audits/evidence/supabase-reconciliation-20261011/repo-inventory.json hosted-inventory.json
--   Run it with a read-only role where possible. It is safe to run in a transaction that is rolled back:
--     BEGIN READ ONLY; \i INVENTORY_SCHEMA_SECURITY.sql ; ROLLBACK;
-- * Never paste the connection string, password or keys into chats or tickets. The JSON contains no secrets.
WITH
tbl AS (
  SELECT c.oid, n.nspname AS schema, c.relname AS name, c.relkind,
         c.relrowsecurity AS rls, c.relforcerowsecurity AS rls_forced,
         pg_get_userbyid(c.relowner) AS owner
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
),
cols AS (
  SELECT a.attrelid AS oid,
         jsonb_agg(jsonb_build_object(
           'name', a.attname,
           'type', format_type(a.atttypid, a.atttypmod),
           'notnull', a.attnotnull,
           'default', pg_get_expr(d.adbin, d.adrelid)) ORDER BY a.attnum) AS columns
  FROM pg_attribute a
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attnum > 0 AND NOT a.attisdropped AND a.attrelid IN (SELECT oid FROM tbl)
  GROUP BY a.attrelid
),
cons AS (
  SELECT conrelid AS oid,
         jsonb_agg(jsonb_build_object('name', conname, 'type', contype, 'def', pg_get_constraintdef(oid)) ORDER BY conname) AS constraints
  FROM pg_constraint WHERE conrelid IN (SELECT oid FROM tbl) GROUP BY conrelid
),
idx AS (
  SELECT i.indrelid AS oid,
         jsonb_agg(jsonb_build_object('name', ic.relname, 'def', pg_get_indexdef(i.indexrelid)) ORDER BY ic.relname) AS indexes
  FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid
  WHERE i.indrelid IN (SELECT oid FROM tbl) GROUP BY i.indrelid
),
grants AS (
  SELECT t.oid,
         jsonb_object_agg(r.rolname, (
           SELECT jsonb_agg(p ORDER BY p) FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
           WHERE has_table_privilege(r.oid, t.oid, p))) AS grants
  FROM tbl t CROSS JOIN pg_roles r
  WHERE r.rolname IN ('anon','authenticated','service_role')
  GROUP BY t.oid
),
pol AS (
  SELECT pc.oid,
         jsonb_agg(jsonb_build_object(
           'name', p.polname,
           'cmd', CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
           'permissive', p.polpermissive,
           'roles', (SELECT jsonb_agg(CASE WHEN rid = 0 THEN 'public' ELSE pg_get_userbyid(rid) END) FROM unnest(p.polroles) rid),
           'using', pg_get_expr(p.polqual, p.polrelid),
           'check', pg_get_expr(p.polwithcheck, p.polrelid)) ORDER BY p.polname) AS policies
  FROM pg_policy p JOIN pg_class pc ON pc.oid = p.polrelid
  WHERE pc.oid IN (SELECT oid FROM tbl) GROUP BY pc.oid
),
trg AS (
  SELECT tg.tgrelid AS oid,
         jsonb_agg(jsonb_build_object('name', tg.tgname, 'function', tp.proname, 'enabled', tg.tgenabled) ORDER BY tg.tgname) AS triggers
  FROM pg_trigger tg JOIN pg_proc tp ON tp.oid = tg.tgfoid
  WHERE NOT tg.tgisinternal AND tg.tgrelid IN (SELECT oid FROM tbl) GROUP BY tg.tgrelid
),
tables_json AS (
  SELECT jsonb_object_agg(t.name, jsonb_build_object(
    'kind', t.relkind, 'rls', t.rls, 'rls_forced', t.rls_forced, 'owner', t.owner,
    'columns', COALESCE(c.columns, '[]'), 'constraints', COALESCE(k.constraints, '[]'),
    'indexes', COALESCE(i.indexes, '[]'), 'grants', COALESCE(g.grants, '{}'),
    'policies', COALESCE(p.policies, '[]'), 'triggers', COALESCE(tr.triggers, '[]'))) AS j
  FROM tbl t
  LEFT JOIN cols c ON c.oid = t.oid LEFT JOIN cons k ON k.oid = t.oid LEFT JOIN idx i ON i.oid = t.oid
  LEFT JOIN grants g ON g.oid = t.oid LEFT JOIN pol p ON p.oid = t.oid LEFT JOIN trg tr ON tr.oid = t.oid
),
funcs_json AS (
  SELECT jsonb_object_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', jsonb_build_object(
    'returns', pg_get_function_result(p.oid),
    'language', l.lanname,
    'security_definer', p.prosecdef,
    'owner', pg_get_userbyid(p.proowner),
    'config', p.proconfig,
    'volatility', p.provolatile,
    'execute', jsonb_build_object(
       'public', has_function_privilege('public', p.oid, 'EXECUTE'),
       'anon', has_function_privilege('anon', p.oid, 'EXECUTE'),
       'authenticated', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
       'service_role', has_function_privilege('service_role', p.oid, 'EXECUTE')),
    'body_md5', md5(p.prosrc))) AS j
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace JOIN pg_language l ON l.oid = p.prolang
  WHERE n.nspname = 'public' AND p.prokind IN ('f','p')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
),
ext_json AS (SELECT jsonb_object_agg(extname, extversion) AS j FROM pg_extension),
seq_json AS (
  SELECT jsonb_agg(c.relname ORDER BY c.relname) AS j FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'S'
),
enum_json AS (
  SELECT jsonb_object_agg(t.typname, (SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid = t.oid)) AS j
  FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e'
),
evt_json AS (
  SELECT jsonb_agg(jsonb_build_object('name', e.evtname, 'event', e.evtevent, 'function', p.proname, 'enabled', e.evtenabled) ORDER BY e.evtname) AS j
  FROM pg_event_trigger e JOIN pg_proc p ON p.oid = e.evtfoid
),
pub_json AS (
  SELECT jsonb_object_agg(pubname, (SELECT jsonb_agg(schemaname || '.' || tablename ORDER BY tablename) FROM pg_publication_tables pt WHERE pt.pubname = p.pubname)) AS j
  FROM pg_publication p
),
mig_json AS (
  SELECT CASE WHEN to_regclass('supabase_migrations.schema_migrations') IS NULL THEN NULL
         ELSE (xpath('/row/j/text()', query_to_xml(
           'select coalesce(jsonb_agg(jsonb_build_object(''version'', version, ''name'', name) order by version), ''[]''::jsonb)::text as j from supabase_migrations.schema_migrations',
           false, true, '')))[1]::text::jsonb END AS j
)
SELECT jsonb_build_object(
  'generated_at', now(),
  'server_version', current_setting('server_version'),
  'database', current_database(),
  'tables', (SELECT j FROM tables_json),
  'functions', (SELECT j FROM funcs_json),
  'extensions', (SELECT j FROM ext_json),
  'sequences', (SELECT j FROM seq_json),
  'enums', (SELECT j FROM enum_json),
  'event_triggers', (SELECT j FROM evt_json),
  'publications', (SELECT j FROM pub_json),
  'migration_history', (SELECT j FROM mig_json)
) AS inventory;
