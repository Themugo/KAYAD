-- KAYAD Stage 4A — READ-ONLY post-migration verification for the three flagged migrations (2026-10-18).
-- NOT EXECUTED against any hosted database. SELECT-only, counts/catalog facts only. Every check states its EXPECTED value.
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS db, current_user AS role, now() AS captured_at;

-- A. 20260930110000
SELECT 'A1 token column dropped'         AS check, NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='refresh_tokens' AND column_name='token') AS ok;       -- expect true
SELECT 'A2 token_hash NOT NULL'          AS check, (SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='refresh_tokens' AND column_name='token_hash') = 'NO' AS ok; -- expect true
SELECT 'A3 unique token_hash index'      AS check, EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uq_refresh_tokens_token_hash') AS ok;                                          -- expect true
SELECT 'A4 rows missing family/session'  AS check, count(*) AS n FROM public.refresh_tokens WHERE family_id IS NULL OR session_id IS NULL;                                                              -- expect 0
SELECT 'A5 rotate fn definer+search_path+privileges' AS check, p.prosecdef AS definer, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_exec
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='kayad_rotate_refresh_token';                     -- expect true, {search_path=public}, false, false, true
SELECT 'A6 RLS enabled on refresh_tokens' AS check, relrowsecurity AS ok FROM pg_class WHERE oid='public.refresh_tokens'::regclass;                    -- expect true
SELECT 'A7 live sessions (compare with preflight live_sessions)' AS check, count(*) AS n FROM public.refresh_tokens WHERE NOT COALESCE(is_revoked,false) AND expires_at > now(); -- expect = preflight value

-- B. 20261008120000
SELECT 'B1 status values valid' AS check, count(*) AS invalid FROM public.users WHERE escrow_capability_status NOT IN ('none','granted','suspended','revoked');                 -- expect 0
SELECT 'B2 status distribution' AS check, escrow_capability_status, count(*) AS n FROM public.users GROUP BY 2 ORDER BY 2;                                                         -- granted = preflight will_become_granted (+ any admin-granted)
SELECT 'B3 backfill reason rows' AS check, count(*) AS n FROM public.users WHERE escrow_capability_reason LIKE 'Stage 9 backfill:%';                                         -- expect = preflight will_become_granted
SELECT 'B4 non-seller roles granted by backfill' AS check, count(*) AS n FROM public.users WHERE escrow_capability_reason LIKE 'Stage 9 backfill:%' AND role <> 'individual_seller'; -- expect 0
SELECT 'B5 index' AS check, EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_users_escrow_capability_status') AS ok;                                    -- expect true

-- C. 20261011121000
SELECT 'C1 users/profiles role mismatch' AS check, count(*) AS n FROM public.users u JOIN public.profiles p ON p.id=u.id WHERE p.role IS DISTINCT FROM u.role;                    -- expect 0
SELECT 'C2 trigger present' AS check, EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_sync_profile_role_from_user' AND tgrelid='public.users'::regclass AND NOT tgisinternal) AS ok; -- expect true
SELECT 'C3 sync fn definer+search_path+privileges' AS check, p.prosecdef AS definer, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='sync_profile_role_from_user';                                                  -- expect true, {search_path=public,pg_temp}, false, false
SELECT 'C4 profiles.updated_at' AS check, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='updated_at') AS ok; -- expect true
SELECT 'C5 admin RLS population' AS check, count(*) FILTER (WHERE role IN ('admin','superadmin')) AS profiles_admin_like FROM public.profiles;                                       -- compare with owner-approved list size

-- Cross-checks
SELECT 'X1 history rows' AS check, version FROM supabase_migrations.schema_migrations WHERE version IN ('20260930110000','20261008120000','20261011121000') ORDER BY 2;       -- expect 3 rows
ROLLBACK;
