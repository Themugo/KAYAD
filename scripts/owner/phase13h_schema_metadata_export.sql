-- KAYAD Phase 13H — READ-ONLY schema METADATA export for the database owner.
-- Purpose: obtain the actual definition of the 24 production-only tables (plus admin_alerts) so that each can be classified
-- (application-owned / externally managed / legacy / optional / protected) before any migration is written.
-- SAFETY: catalog queries only. No SELECT from any application table, so NO customer, listing, identity, payment, token or secret data
-- is read. The session is forced read-only. Run it against the database you intend to describe, with a read-only role, e.g.
--   psql "$READONLY_DB_URL" -v ON_ERROR_STOP=1 -f scripts/owner/phase13h_schema_metadata_export.sql > phase13h_schema_metadata.txt
-- and return phase13h_schema_metadata.txt. Do not paste connection strings or passwords into any message.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
\echo '=== 0. identity of what was described (not a secret) ==='
SELECT current_database() AS database, current_setting('server_version') AS server_version, now() AS exported_at;
\set tabs '{admin_action_requests,admin_control_registry,admin_control_state,auction_integrity_flags,auction_risk_profiles,bid_logs,contacts,conversion_funnels,dealer_analytics,dealer_health_scores,escrow_anomalies,escrow_provider_integrations,escrow_risk_scores,inspection_commercial_config,inspection_provider_availability,inspection_provider_scorecards,inspection_report_downloads,job_failures,market_data,marketplace_health,notification_audit,ntsa_verification_requests,sms_bidders,transactions,admin_alerts}'


\echo '=== 1. which of the listed tables exist ==='
SELECT t.name, to_regclass('public.'||t.name) IS NOT NULL AS exists_in_public FROM unnest(:'tabs'::text[]) AS t(name) ORDER BY 1;
\echo '=== 2. columns, types, nullability, defaults, generated/identity ==='
SELECT c.table_name, c.ordinal_position, c.column_name, c.data_type, c.udt_name, c.is_nullable, c.column_default, c.is_identity, c.is_generated
FROM information_schema.columns c JOIN unnest(:'tabs'::text[]) AS _t(name) ON _t.name=c.table_name WHERE c.table_schema='public' ORDER BY 1,2;
\echo '=== 3. constraints (PK, FK, UNIQUE, CHECK, EXCLUDE) ==='
SELECT cl.relname AS table_name, con.conname, con.contype, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con JOIN pg_class cl ON cl.oid=con.conrelid JOIN pg_namespace n ON n.oid=cl.relnamespace JOIN unnest(:'tabs'::text[]) AS _t(name) ON _t.name=cl.relname WHERE n.nspname='public' ORDER BY 1,2;
\echo '=== 4. indexes ==='
SELECT tablename, indexname, indexdef FROM pg_indexes JOIN unnest(:'tabs'::text[]) AS _t(name) ON _t.name=tablename WHERE schemaname='public' ORDER BY 1,2;
\echo '=== 5. triggers (definitions) ==='
SELECT cl.relname AS table_name, tg.tgname, pg_get_triggerdef(tg.oid) AS definition
FROM pg_trigger tg JOIN pg_class cl ON cl.oid=tg.tgrelid JOIN pg_namespace n ON n.oid=cl.relnamespace JOIN unnest(:'tabs'::text[]) AS _t(name) ON _t.name=cl.relname WHERE n.nspname='public' AND NOT tg.tgisinternal ORDER BY 1,2;
\echo '=== 6. RLS state and policies ==='
SELECT cl.relname AS table_name, cl.relrowsecurity AS rls_enabled, cl.relforcerowsecurity AS rls_forced, pg_get_userbyid(cl.relowner) AS owner
FROM pg_class cl JOIN pg_namespace n ON n.oid=cl.relnamespace JOIN unnest(:'tabs'::text[]) AS _t(name) ON _t.name=cl.relname WHERE n.nspname='public' ORDER BY 1;
SELECT p.tablename, p.policyname, p.permissive, p.roles, p.cmd, p.qual, p.with_check FROM pg_policies p JOIN unnest(:'tabs'::text[]) AS _t(name) ON _t.name=p.tablename WHERE p.schemaname='public' ORDER BY 1,2;
\echo '=== 7. grants (who can touch these tables) ==='
SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants g JOIN unnest(:'tabs'::text[]) AS _t(name) ON _t.name=g.table_name WHERE g.table_schema='public' ORDER BY 1,2,3;
\echo '=== 8. sequences owned by these tables ==='
SELECT s.relname AS sequence, t.relname AS owned_by_table FROM pg_class s JOIN pg_depend d ON d.objid=s.oid AND d.deptype='a' JOIN pg_class t ON t.oid=d.refobjid JOIN unnest(:'tabs'::text[]) AS _t(name) ON _t.name=t.relname WHERE s.relkind='S' ORDER BY 1;
\echo '=== 9. views / materialized views that depend on them (definitions) ==='
SELECT v.schemaname, v.viewname FROM pg_views v WHERE v.schemaname='public' ORDER BY 2;
SELECT schemaname, matviewname FROM pg_matviews WHERE schemaname='public' ORDER BY 2;
\echo '=== 10. functions/procedures in public (names + definitions of those that mention a listed table) ==='
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.prosecdef AS security_definer, pg_get_userbyid(p.proowner) AS owner
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY 1;
SELECT p.proname, pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN unnest(:'tabs'::text[]) AS _t(name) ON p.prosrc ILIKE '%'||_t.name||'%' WHERE n.nspname='public' AND p.prokind IN ('f','p') ORDER BY 1;
\echo '=== 11. installed extensions ==='
SELECT extname, extversion FROM pg_extension ORDER BY 1;
\echo '=== 12. migration history (names/versions only) ==='
SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS history_table_exists \gset
\if :history_table_exists
  SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
\else
  \echo 'supabase_migrations.schema_migrations does not exist: record how schema changes are applied (external process?)'
\endif
\echo '=== 13. roles relevant to the API (no passwords) ==='
SELECT rolname, rolcanlogin, rolbypassrls, rolinherit FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','authenticator','postgres','supabase_admin') ORDER BY 1;
\echo '=== 14. approximate row counts only (planner statistics, no table scan) ==='
SELECT relname, reltuples::bigint AS approx_rows FROM pg_class cl JOIN pg_namespace n ON n.oid=cl.relnamespace JOIN unnest(:'tabs'::text[]) AS _t(name) ON _t.name=cl.relname WHERE n.nspname='public' ORDER BY 1;
ROLLBACK;
