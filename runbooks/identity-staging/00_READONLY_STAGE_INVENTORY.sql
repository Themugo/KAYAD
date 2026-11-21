-- KAYAD identity recovery staging gate — READ ONLY ONLY.
-- Execute only against the explicitly approved isolated staging database.
-- Do not run against production. This file contains SELECTs only.

-- 1) Confirm database/server identity without exposing connection secrets.
SELECT current_database() AS database_name,
       current_user AS connected_role,
       current_setting('server_version') AS postgres_version,
       inet_server_addr()::text AS server_address,
       pg_is_in_recovery() AS is_standby;

-- 2) Migration-history shape and ordered versions. Do not repair this table here.
SELECT to_regclass('supabase_migrations.schema_migrations') AS migration_history_table;
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version, name;

-- 3) Identity table existence, columns, types, nullability and defaults.
SELECT table_schema, table_name, ordinal_position, column_name,
       data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('users','user_auth','profiles','dealers','refresh_tokens',
                     'admin_action_requests','owner_profiles')
ORDER BY table_name, ordinal_position;

-- 4) Constraints and indexes relevant to identity uniqueness and linked records.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       con.conname AS constraint_name, con.contype AS constraint_type,
       pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('users','user_auth','profiles','dealers','refresh_tokens')
ORDER BY c.relname, con.conname;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users','user_auth','profiles','dealers','refresh_tokens')
ORDER BY tablename, indexname;

-- 5) RLS state and policies for relevant tables.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('users','user_auth','profiles','dealers','refresh_tokens')
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, permissive, roles,
       cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users','user_auth','profiles','dealers','refresh_tokens')
ORDER BY tablename, policyname;

-- 6) Effective table grants (does not reveal secret values).
SELECT grantee, table_schema, table_name, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('users','user_auth','profiles','dealers','refresh_tokens')
ORDER BY table_name, grantee, privilege_type;

-- 7) Identity-related routines and signatures. Inspect definitions separately
-- in the approved staging environment; do not infer semantics from names alone.
SELECT n.nspname AS schema_name, p.proname AS routine_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_function_result(p.oid) AS result_type,
       p.prosecdef AS security_definer,
       pg_get_userbyid(p.proowner) AS owner_role
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public','auth')
  AND (p.proname ILIKE '%identity%'
       OR p.proname ILIKE '%register%'
       OR p.proname ILIKE '%owner%'
       OR p.proname ILIKE '%auth%')
ORDER BY n.nspname, p.proname, arguments;

-- 8) Account inventory without returning email, names, password hashes or tokens.
-- Counts by role/status/deletion/super-admin flags; do not export user-level PII.
SELECT role,
       COALESCE(status::text, '<null>') AS status,
       COALESCE(is_super_admin::text, '<null>') AS is_super_admin,
       COALESCE(is_deleted::text, '<null>') AS is_deleted,
       count(*) AS records
FROM public.users
GROUP BY role, status, is_super_admin, is_deleted
ORDER BY role, status;

SELECT count(*) AS users_count FROM public.users;
SELECT count(*) AS user_auth_count FROM public.user_auth;
SELECT count(*) AS profiles_count FROM public.profiles;
SELECT count(*) AS auth_users_count FROM auth.users;

-- 9) Detect identity join anomalies using counts only.
SELECT count(*) FILTER (WHERE ua.user_id IS NULL) AS users_without_auth,
       count(*) FILTER (WHERE u.id IS NULL) AS auth_without_user,
       count(*) AS joined_records
FROM public.users u
FULL OUTER JOIN public.user_auth ua ON ua.user_id = u.id;

-- STOP after capture. Do not run any UPDATE/INSERT/DELETE/DDL or migration repair.
