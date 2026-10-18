-- KAYAD Stage 3 — READ-ONLY preflight for gates G1, G2 and G3 (2026-10-18).
-- SELECT-only. Emits no emails, password hashes, tokens or row-level personal data.
-- Run first against an APPROVED, IDENTIFIED target (staging branch preferred). Never against an unidentified host.
-- Wrap in a read-only transaction:
BEGIN TRANSACTION READ ONLY;

-- 0. Target identity (confirm before reading anything else)
SELECT current_database() AS db, current_user AS role, version() AS server, now() AS captured_at;

-- G1-a. Live audit_logs columns (contract matrix input)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- G1-b. Column presence. Since Stage 3A the backend writes only the 10 canonical columns
--       (id, actor_id, action, entity_type, entity_id, details, ip_address, actor_role, actor_name, created_at);
--       those MUST all be present. The others are informational (pre-Stage-3A writers used them).
SELECT c.col, EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = c.col) AS present
FROM unnest(ARRAY['actor','actor_id','actor_role','actor_name','actor_email','target','target_model','target_name',
                  'old_value','new_value','changes','ip_address','user_agent','request_id','session_id','details',
                  'severity','admin','admin_id','user_id','metadata','created_at']) AS c(col);

-- G1-c. feature_flags attribution columns (decides whether Stage 2 change S2-ATTR-01 is safe)
SELECT to_regclass('public.feature_flags') IS NOT NULL AS feature_flags_exists,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='feature_flags' AND column_name='created_by') AS has_created_by,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='feature_flags' AND column_name='updated_by') AS has_updated_by;

-- G1-d. audit_logs RLS, policies, grants
SELECT relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced FROM pg_class WHERE oid = 'public.audit_logs'::regclass;
SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs';
SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='audit_logs' GROUP BY grantee;

-- G2-a. cars.status constraint as it exists on the target
SELECT conname, pg_get_constraintdef(oid) AS definition, convalidated
FROM pg_constraint WHERE conrelid = 'public.cars'::regclass AND contype = 'c';

-- G2-b. Status distribution (counts only)
SELECT status, count(*) AS n FROM public.cars GROUP BY status ORDER BY n DESC;

-- G3-a. Identity objects the current backend requires
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.prosecdef AS security_definer, p.proconfig AS config
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('kayad_register_identity_atomic','kayad_rotate_refresh_token','sync_dealer_profile_from_user','sync_profile_role_from_user');
SELECT p.proname, r.rolname AS grantee, has_function_privilege(r.oid, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN pg_roles r
WHERE n.nspname='public' AND p.proname='kayad_register_identity_atomic' AND r.rolname IN ('anon','authenticated','service_role');

-- G3-b. Identity-critical columns
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' AND (
  (table_name='users' AND column_name IN ('deactivated_at','granted_permissions','revoked_permissions','last_active','escrow_capability_status')) OR
  (table_name='refresh_tokens' AND column_name IN ('token','token_hash','family_id','session_id','revoked_at','reuse_detected_at')) OR
  (table_name='communication_deliveries' AND column_name IN ('idempotency_key','dead_letter')))
ORDER BY table_name, column_name;
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='users' AND indexdef ILIKE '%lower%email%';

-- G3-c. Migration history (versions only)
SELECT count(*) AS applied_versions, max(version) AS latest FROM supabase_migrations.schema_migrations;
SELECT version FROM supabase_migrations.schema_migrations WHERE version >= '20260920000000' ORDER BY version;

ROLLBACK;
