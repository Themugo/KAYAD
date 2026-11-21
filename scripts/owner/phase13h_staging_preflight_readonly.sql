-- KAYAD Phase 13H — READ-ONLY staging preflight (catalog + migration-history queries only; reads NO application data).
-- Run ONLY against the database you have positively identified as STAGING (see runbook section 2), with a read-only role:
--   psql "$STAGING_READONLY_DB_URL" -v ON_ERROR_STOP=1 -f scripts/owner/phase13h_staging_preflight_readonly.sql > staging_preflight.txt
-- Return staging_preflight.txt; do not paste connection strings. Nothing here writes, migrates or alters anything.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
\echo '=== P1. identity (compare with the staging project record; must NOT match production) ==='
SELECT current_database() AS database, current_setting('server_version') AS server_version, inet_server_port() AS port, now() AS checked_at;
SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS history_table_exists \gset
\echo '=== P2. migration history (names only) -> compare with: node scripts/owner/compare_migration_history.mjs staging_preflight.txt ==='
\if :history_table_exists
  SELECT 'MIGRATION ' || version || ' ' || coalesce(name,'') AS line FROM supabase_migrations.schema_migrations ORDER BY version;
\else
  \echo 'NO supabase_migrations.schema_migrations: schema is not managed through the Supabase CLI history; record the actual process.'
\endif
\echo '=== P3. objects the repository chain (through 20261026100000) is expected to provide ==='
SELECT o.name, to_regclass('public.'||o.name) IS NOT NULL AS present
FROM unnest(ARRAY['users','user_auth','cars','dealers','bids','escrows','payments','private_seller_capabilities','private_seller_listing_visibility_events','admin_alerts','chats','audit_logs']) AS o(name) ORDER BY 1;
\echo '=== P4. RLS state and policies on the 13E/13F/13G objects ==='
SELECT cl.relname, cl.relrowsecurity AS rls_enabled FROM pg_class cl JOIN pg_namespace n ON n.oid=cl.relnamespace
 WHERE n.nspname='public' AND cl.relname IN ('private_seller_capabilities','private_seller_listing_visibility_events','admin_alerts','cars','users') ORDER BY 1;
SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname='public' AND tablename IN ('private_seller_capabilities','private_seller_listing_visibility_events','admin_alerts') ORDER BY 1,2;
\echo '=== P5. grants to anon/authenticated on those objects (expected: none for admin_alerts) ==='
SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
 WHERE table_schema='public' AND table_name IN ('private_seller_capabilities','private_seller_listing_visibility_events','admin_alerts') AND grantee IN ('anon','authenticated','PUBLIC') ORDER BY 1,2,3;
\echo '=== P6. 13F visibility triggers present ==='
SELECT tg.tgname, cl.relname FROM pg_trigger tg JOIN pg_class cl ON cl.oid=tg.tgrelid WHERE NOT tg.tgisinternal AND (tg.tgname ILIKE '%visib%' OR tg.tgname ILIKE '%private_seller%') ORDER BY 2,1;
\echo '=== P7. extensions and roles ==='
SELECT extname, extversion FROM pg_extension ORDER BY 1;
SELECT rolname, rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','authenticator') ORDER BY 1;
\echo '=== P8. admin_alerts shape, if present ==='
SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_alerts' ORDER BY ordinal_position;
\echo '=== P9. lock-risk context for the planned migrations: sizes of tables they touch (planner estimates, no scan) ==='
SELECT relname, reltuples::bigint AS approx_rows, pg_size_pretty(pg_total_relation_size(cl.oid)) AS total_size
FROM pg_class cl JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE n.nspname='public' AND relname IN ('cars','users','private_seller_capabilities') ORDER BY 1;
ROLLBACK;
