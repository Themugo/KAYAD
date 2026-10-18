-- KAYAD Stage 4A — READ-ONLY preflight for the three flagged pending migrations (2026-10-18):
--   20260930110000_advanced_identity_session_hardening.sql   (refresh_tokens: hash backfill, NOT NULL, DROP COLUMN token — IRREVERSIBLE)
--   20261008120000_escrow_seller_capability_authority.sql    (users: bulk backfill escrow_capability_status = 'granted')
--   20261011121000_profiles_role_sync_repair.sql             (profiles.role overwritten from users.role — can raise OR lower RLS privilege)
-- NOT EXECUTED against any hosted database. REQUIRES an approved, IDENTIFIED target (staging branch preferred). SELECT-only; counts only —
-- no emails, names, tokens, hashes or ids are returned. Columns that may not exist yet are read through to_jsonb(row) so this script
-- runs both BEFORE and AFTER each migration; a NULL there means "column absent", which is itself a finding.
-- Run as a role that can read the tables (service/postgres role on the approved target). Capture the whole output as evidence.
BEGIN TRANSACTION READ ONLY;

-- 0. Target identity.
SELECT current_database() AS db, current_user AS role, version() AS server, now() AS captured_at;

-- 1. Which of the three are already applied? (supabase_migrations.schema_migrations)
SELECT version FROM supabase_migrations.schema_migrations
WHERE version IN ('20260930110000','20261008120000','20261011121000') ORDER BY version;
--    EXPECTED before rehearsal: 0 rows. Any row => that migration has run; skip its section's "before" assertions.

-- 2. Size / lock-exposure context (planning only).
SELECT c.relname, c.reltuples::bigint AS approx_rows, pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('users','profiles','refresh_tokens') ORDER BY 1;
SELECT count(*) AS other_sessions_now FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();
--    ADD CONSTRAINT ... CHECK (users_escrow_capability_status_check) scans users under ACCESS EXCLUSIVE; choose a quiet window if users is large.

-- ===== A. 20260930110000 refresh_tokens =====
-- A1. Shape. EXPECTED before: token present, token_hash may be present or absent.
SELECT c.col,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='refresh_tokens' AND column_name=c.col) AS present
FROM (VALUES ('token'),('token_hash'),('family_id'),('session_id'),('replaced_by'),('revoked_at'),('revoke_reason'),('reuse_detected_at'),
             ('is_revoked'),('expires_at'),('token_version')) AS c(col) ORDER BY 1;

-- A2. Row population and the three things that make the migration FAIL or lose data.
SELECT count(*) AS total_rows,
       count(*) FILTER (WHERE NOT COALESCE(r.is_revoked,false) AND r.expires_at > now()) AS live_sessions,
       count(*) FILTER (WHERE to_jsonb(r)->>'token' IS NULL AND to_jsonb(r)->>'token_hash' IS NULL) AS rows_with_neither_token_nor_hash,
       count(*) FILTER (WHERE to_jsonb(r)->>'token' IS NOT NULL AND to_jsonb(r)->>'token_hash' IS NULL) AS rows_hash_will_be_backfilled
FROM public.refresh_tokens r;
--    rows_with_neither_token_nor_hash > 0  => ALTER COLUMN token_hash SET NOT NULL FAILS (migration aborts if run in one transaction). ABORT; owner decides
--                                             whether to delete those unusable rows (they cannot authenticate anyone) — NOT done by this script.
--    live_sessions are PRESERVED by the backfill (token_hash = sha256 hex of token, identical to models/RefreshToken.js hashToken) — but only if
--    the backfill runs before the column is dropped, which this migration does in order.

-- A3. Collisions that make CREATE UNIQUE INDEX uq_refresh_tokens_token_hash fail.
SELECT
  (SELECT count(*) FROM (SELECT to_jsonb(r)->>'token' AS t FROM public.refresh_tokens r WHERE to_jsonb(r)->>'token' IS NOT NULL
                          GROUP BY 1 HAVING count(*) > 1) d) AS duplicate_plaintext_tokens,
  (SELECT count(*) FROM (SELECT to_jsonb(r)->>'token_hash' AS h FROM public.refresh_tokens r WHERE to_jsonb(r)->>'token_hash' IS NOT NULL
                          GROUP BY 1 HAVING count(*) > 1) d) AS duplicate_existing_hashes;
--    EXPECTED: 0 and 0. >0 => ABORT; investigate (likely duplicated sessions), do not delete from this script.

-- A4. Irreversibility acknowledgement data: after the migration the plaintext token cannot be reconstructed. Backup mandatory.
--     (No query; recorded in the runbook as the abort gate "no verified backup => no step A".)

-- ===== B. 20261008120000 escrow capability backfill =====
-- B1. Columns and constraint. EXPECTED before: all 4 columns absent (or present with only 'none').
SELECT c.col,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name=c.col) AS present
FROM (VALUES ('escrow_capability_status'),('escrow_capability_granted_by'),('escrow_capability_updated_at'),('escrow_capability_reason'),
             ('escrow_approved'),('escrow_forced')) AS c(col) ORDER BY 1;

-- B2. Exact population the backfill will change. Counts only.
SELECT count(*) FILTER (WHERE role = 'individual_seller') AS individual_sellers,
       count(*) FILTER (WHERE role = 'individual_seller' AND COALESCE(to_jsonb(u)->>'escrow_capability_status','none') = 'none') AS will_become_granted,
       count(*) FILTER (WHERE role = 'individual_seller' AND COALESCE(to_jsonb(u)->>'escrow_capability_status','none') = 'none' AND is_banned) AS of_which_banned,
       count(*) FILTER (WHERE role = 'individual_seller' AND COALESCE(to_jsonb(u)->>'escrow_capability_status','none') = 'none' AND deactivated_at IS NOT NULL) AS of_which_deactivated,
       count(*) FILTER (WHERE role = 'individual_seller' AND (to_jsonb(u)->>'escrow_approved') = 'true') AS legacy_escrow_approved,
       count(*) FILTER (WHERE role = 'individual_seller' AND (to_jsonb(u)->>'escrow_forced') = 'true') AS legacy_escrow_forced
FROM public.users u;
--    The migration comment states the backfill PRESERVES the former role-hardcoded eligibility of every individual_seller. The owner must confirm that
--    this is the intended population (including banned/deactivated rows, which can still not sign in). Differences from the owner's expectation => ABORT.

-- B3. Values that would violate users_escrow_capability_status_check. EXPECTED: 0 (or column absent => NULL).
SELECT count(*) AS invalid_existing_status FROM public.users u
WHERE to_jsonb(u)->>'escrow_capability_status' IS NOT NULL
  AND to_jsonb(u)->>'escrow_capability_status' NOT IN ('none','granted','suspended','revoked');

-- ===== C. 20261011121000 profiles.role reconciliation =====
-- C1. Rows the final UPDATE would change, by (users.role -> profiles.role). Counts only.
SELECT u.role AS users_role, p.role AS profiles_role, count(*) AS accounts
FROM public.users u JOIN public.profiles p ON p.id = u.id
WHERE p.role IS DISTINCT FROM u.role GROUP BY 1,2 ORDER BY 3 DESC, 1, 2;
--    EXPECTED per owner: the set the owner already knows about. Any unexpected pair => ABORT and review.

-- C2. Privilege direction of the reconciliation (RLS policies read profiles.role).
SELECT
  count(*) FILTER (WHERE u.role IN ('admin','superadmin') AND p.role NOT IN ('admin','superadmin')) AS profile_gains_admin_rls,
  count(*) FILTER (WHERE p.role IN ('admin','superadmin') AND u.role NOT IN ('admin','superadmin')) AS profile_loses_admin_rls,
  count(*) FILTER (WHERE u.role IN ('moderator','ad_manager','marketing','escrow_officer','technical_support','hr','accounts','ghost_checker')
                     AND p.role NOT IN ('moderator','ad_manager','marketing','escrow_officer','technical_support','hr','accounts','ghost_checker','admin','superadmin')) AS profile_gains_staff_role
FROM public.users u JOIN public.profiles p ON p.id = u.id WHERE p.role IS DISTINCT FROM u.role;
--    profile_gains_admin_rls > 0 => the migration GRANTS database-level admin visibility to those accounts. Owner sign-off per count is mandatory.

-- C3. Coverage and constraint compatibility.
SELECT (SELECT count(*) FROM public.users u WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)) AS users_without_profile,
       (SELECT count(*) FROM public.profiles p WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.id)) AS profiles_without_user,
       (SELECT count(*) FROM public.users u JOIN public.profiles p ON p.id = u.id
         WHERE p.role IS DISTINCT FROM u.role
           AND u.role NOT IN ('user','individual_seller','dealer','broker','ghost_checker','moderator','ad_manager','marketing',
                              'escrow_officer','technical_support','hr','accounts','admin','superadmin')) AS diffs_whose_target_violates_profiles_role_check;
--    EXPECTED: last = 0. >0 => the UPDATE fails on profiles_role_check. users_without_profile > 0 are NOT repaired by this migration (the trigger only upserts on a later role change).
SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_role_check';
SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='updated_at') AS profiles_updated_at_present;

ROLLBACK;
