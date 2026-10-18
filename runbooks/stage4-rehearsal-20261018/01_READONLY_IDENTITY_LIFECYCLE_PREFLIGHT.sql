-- KAYAD Stage 4 — READ-ONLY preflight for identity, session, role and listing-lifecycle contracts (2026-10-18).
-- SELECT-only. Emits counts and catalog facts only: NO emails, names, password hashes, tokens or other personal data.
-- Run against an APPROVED, IDENTIFIED target (staging branch preferred). NEVER against an unidentified host.
-- It complements (does not replace) ../stage3-database-contract-20261018/01_READONLY_PREFLIGHT_G1_G2_G3.sql (audit_logs, cars.status,
-- register-function privileges) and ../ONBOARDING_V2_1_PREFLIGHT_READONLY.sql.
-- A statement that fails with "relation ... does not exist" is itself a finding: record it, do not work around it.
-- Each section states the EXPECTED outcome and the ABORT condition for any migration or deployment decision that depends on it.
BEGIN TRANSACTION READ ONLY;

-- 0. Target identity — confirm this is the approved target before reading anything else.
SELECT current_database() AS db, current_user AS role, version() AS server, now() AS captured_at;

-- S1. Soft-delete columns required by Model.softDelete (cars + users: deleted_at, deleted_by). Stage 4 S4-C-04.
--     EXPECTED: all four rows present = true.  ABORT deploying the Stage 4 backend if any is false
--     (DELETE /cars/:id, admin car/user/staff delete would fail with PGRST204 / 42703).
SELECT t.tbl, c.col,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = t.tbl AND column_name = c.col) AS present
FROM (VALUES ('cars'), ('users')) AS t(tbl)
CROSS JOIN (VALUES ('deleted_at'), ('deleted_by')) AS c(col)
ORDER BY 1, 2;

-- I1. Duplicate identities after normalisation (blocks uq_users_email_normalized, migration 20260930112000).
--     EXPECTED: duplicate_email_groups = 0.  ABORT the unique-index migration if > 0; reconcile accounts with the owner first
--     (do NOT delete or merge accounts from this script).
SELECT count(*) AS duplicate_email_groups, COALESCE(sum(n), 0) AS rows_in_duplicate_groups
FROM (SELECT lower(btrim(email)) AS e, count(*) AS n FROM public.users GROUP BY 1 HAVING count(*) > 1) d;

-- I2. Is the normalised unique index already present?  (informational)
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'users' AND indexdef ILIKE '%lower%btrim%email%';

-- I3. users <-> user_auth mapping integrity.
--     EXPECTED: all three counts = 0.  Non-zero = accounts that cannot sign in (users without credentials), credential rows with no
--     account, or multiple credential rows for one account (uq_user_auth_user_canonical, migration 20261001220000, would fail).
SELECT
  (SELECT count(*) FROM public.users u WHERE NOT EXISTS (SELECT 1 FROM public.user_auth a WHERE a.user_id = u.id)) AS users_without_user_auth,
  (SELECT count(*) FROM public.user_auth a WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.user_id)) AS user_auth_without_user,
  (SELECT count(*) FROM (SELECT user_id FROM public.user_auth GROUP BY user_id HAVING count(*) > 1) x) AS users_with_multiple_user_auth;

-- I4. Role integrity. Allowed stored roles are the final profiles_role_check list (migration 20260824070000).
--     EXPECTED: roles_outside_allowlist = 0 and users_profiles_role_mismatch = 0.
--     executive / staff / super_admin / manager / engineer must NOT appear (they cannot be stored; code that tests them is dead).
SELECT role, count(*) AS accounts FROM public.users GROUP BY role ORDER BY role;
SELECT count(*) AS roles_outside_allowlist FROM public.users
WHERE role IS NULL OR role NOT IN ('user','individual_seller','dealer','broker','ghost_checker','moderator','ad_manager','marketing',
                                   'escrow_officer','technical_support','hr','accounts','admin','superadmin');
SELECT count(*) AS users_profiles_role_mismatch
FROM public.users u JOIN public.profiles p ON p.id = u.id WHERE p.role IS DISTINCT FROM u.role;
SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_role_check';

-- I5. Privileged accounts: counts only (the owner decides who should hold these; this script never changes roles).
SELECT count(*) FILTER (WHERE role = 'superadmin') AS superadmins,
       count(*) FILTER (WHERE role = 'admin') AS admins,
       count(*) FILTER (WHERE is_banned) AS banned,
       count(*) FILTER (WHERE deactivated_at IS NOT NULL) AS deactivated
FROM public.users;

-- R1. refresh_tokens shape — decides the impact of the DESTRUCTIVE migration 20260930110000 (drops the plaintext `token` column).
--     EXPECTED before that migration: token present = true, token_hash present = true.  After it: token present = false.
SELECT c.col,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'refresh_tokens' AND column_name = c.col) AS present
FROM (VALUES ('token'), ('token_hash'), ('family_id'), ('session_id'), ('revoked_at'), ('reuse_detected_at')) AS c(col)
ORDER BY 1;
SELECT count(*) AS refresh_token_rows FROM public.refresh_tokens;
--     If `token` is present, quantify rows that would lose their only credential form (run ONLY if present = true above):
--       SELECT count(*) FILTER (WHERE token IS NOT NULL AND token_hash IS NULL) AS rows_without_hash FROM public.refresh_tokens;
--     STAGE 4A CORRECTION: the migration backfills token_hash from token before dropping it, so sessions survive; rows with neither token nor hash make it FAIL
--     (use ../stage4a-gate-closure-20261018/02_READONLY_PREFLIGHT_PENDING_THREE_MIGRATIONS.sql section A2).
--     This step is IRREVERSIBLE: plaintext tokens cannot be reconstructed. A verified backup is mandatory.

-- F1. Registration function: presence, definer rights, pinned search_path, argument list, execute privileges.
--     EXPECTED: security_definer = true, proconfig contains search_path=public, anon_exec = false, authenticated_exec = false,
--     service_role_exec = true. A row missing => registration returns 503 DATABASE_MIGRATION_REQUIRED (apply 20261001090000 first).
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       p.prosecdef AS security_definer,
       p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_exec,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_exec
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'kayad_register_identity_atomic';
--     Definition text for a manual diff against 20261001090000_registration_onboarding_integrity.sql (no data):
SELECT pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'kayad_register_identity_atomic';
--     Record any DIFFERENCE between this definition and the repository (the 2026-10-11 production catalog observation is historical evidence only).

-- C1. Listing statuses present vs the live constraint (decision D3; Stage 4 S4-C-01..03).
--     EXPECTED: no status outside the CURRENT constraint list. 'rejected' and 'deleted' can only exist if the constraint was relaxed or dropped.
SELECT status, count(*) AS listings FROM public.cars GROUP BY status ORDER BY status;
SELECT count(*) AS rows_outside_proposed_list FROM public.cars
WHERE status IS NULL OR status NOT IN ('available','sold','pending','reserved','hidden','draft','rejected');
SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid = 'public.cars'::regclass AND contype = 'c' ORDER BY conname;
SELECT count(*) FILTER (WHERE deleted_at IS NOT NULL) AS soft_deleted_listings,
       count(*) FILTER (WHERE deleted_at IS NOT NULL AND status = 'sold') AS soft_deleted_sold_listings
FROM public.cars;
--     soft_deleted_sold_listings > 0 means a completed sale was removed from the marketplace: list the ids for the owner (counts only here).

-- D1. Dispute read model: columns the party projection reads (Stage 4 S4-F-02). EXPECTED: all present.
SELECT c.col,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'escrows' AND column_name = c.col) AS present
FROM (VALUES ('disputeInternalNotes'), ('disputeMediation'), ('disputeResolution'), ('disputeAppeal'), ('disputeCategory'),
             ('disputeWorkflowStatus'), ('disputeEvidence'), ('disputeTimeline')) AS c(col)
ORDER BY 1;

-- G1. Feature flags (Stage 4 S4-G). EXPECTED per repository evidence: feature_flags_exists = false (no migration defines it).
--     Do not infer its columns; if it exists, capture them for the owner decision.
SELECT to_regclass('public.feature_flags') IS NOT NULL AS feature_flags_exists;
SELECT column_name, data_type, is_nullable FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'feature_flags' ORDER BY ordinal_position;

-- M1. Applied migration history (supabase_migrations.schema_migrations). Compare with KAYAD_MIGRATION_INVENTORY_20261013.tsv.
SELECT count(*) AS applied_versions, min(version) AS first_version, max(version) AS last_version
FROM supabase_migrations.schema_migrations;
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 25;

ROLLBACK;
