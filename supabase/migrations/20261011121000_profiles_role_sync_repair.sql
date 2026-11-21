-- Repair of the profiles <-> users role contract (defect SCH-PROFILES-1 — docs/audits/08-SUPABASE-SCHEMA-RECONCILIATION-20261011.md).
--
-- Contract (stated in 20260710043200_foundational_tables.sql, which created profiles): "profiles.role is kept in sync with
-- users.role via the trigger below rather than being independently writable; users.role remains the one real,
-- authoritative value". Reality on a replay of the chain:
--   * trg_sync_profile_from_user is AFTER INSERT only and does ON CONFLICT DO NOTHING -> a later promotion/demotion in
--     users.role never reaches profiles.role.
--   * trg_profiles_updated_at (gari_motors_full_schema) sets NEW.updated_at, but profiles has no updated_at column (the
--     CREATE TABLE IF NOT EXISTS that declared it was skipped because the foundational migration created profiles first)
--     -> EVERY UPDATE of profiles fails with: record "new" has no field "updated_at".
-- Impact: public.is_admin() (used by RLS policies) reads profiles.role, so a demoted administrator stays "admin" for RLS
-- purposes and a promoted one never becomes admin. The application API itself authorises from users.role (unaffected).
--
-- Fix (additive): add the missing updated_at column; add an AFTER UPDATE OF role trigger that upserts the role; one-time
-- reconciliation of rows whose role already diverged (aligned to users.role, the documented authority).
-- Before applying on a hosted database, list what the reconciliation will change (read-only):
--   select p.id, p.role as profile_role, u.role as user_role from profiles p join users u on u.id = p.id
--   where p.role is distinct from u.role;
-- Rollback: docs/audits/11-MIGRATION-AND-ROLLBACK-REVIEW-20261011.md.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.sync_profile_role_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    INSERT INTO public.profiles (id, role, created_at)
    VALUES (NEW.id, NEW.role, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_role_from_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_profile_role_from_user ON public.users;
CREATE TRIGGER trg_sync_profile_role_from_user
  AFTER UPDATE OF role ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_from_user();

UPDATE public.profiles p
   SET role = u.role
  FROM public.users u
 WHERE u.id = p.id
   AND p.role IS DISTINCT FROM u.role;
