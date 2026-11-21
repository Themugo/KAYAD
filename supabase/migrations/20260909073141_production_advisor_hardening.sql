-- Production advisor hardening: remove exposed admin helper execution,
-- optimize the admin policy, and remove duplicate indexes already represented
-- by canonical indexes from earlier domain migrations.
--
-- STAGE 13 CORRECTION (2026-10-08), covering BOTH statements below:
--
-- 1) `ad_slots_admin_all` originally replaced its `is_admin()` call with
-- an inline `EXISTS (SELECT 1 FROM public.profiles p WHERE p.id =
-- auth.uid() AND p.role IN (...))`, specifically to avoid needing
-- EXECUTE on `is_admin()` after the REVOKE below. This was proven, on a
-- real local PostgreSQL engine, to NEVER actually grant admin access:
-- `public.profiles` has row-level security enabled with zero policies
-- defined on it, so a plain inline EXISTS against `profiles` -- which
-- evaluates with the INVOKING role's own privileges, not elevated ones
-- -- can never see any row there for `anon`/`authenticated`, silently
-- and permanently defeating this policy's entire admin branch (a
-- non-public ad slot was seeded and confirmed invisible to a real admin
-- fixture querying through this exact policy). `public.is_admin()` is
-- SECURITY DEFINER specifically so it CAN see `profiles` rows despite
-- that lockout -- which is exactly why it exists as a function instead
-- of being inlined. Fixed by calling `public.is_admin()` directly again.
--
-- 2) That only works if `authenticated` can actually call
-- `public.is_admin()`, which the REVOKE below removed. It overshot this
-- function's own defining migration
-- (20260907240500_canonical_authorization_helpers.sql), which explicitly
-- grants EXECUTE to `authenticated` and revokes only from bare `public`
-- (the real target of a "SECURITY DEFINER function exposed to anon/
-- public" advisory). Revoking from `authenticated` too made
-- `public.is_admin()` uncallable from inside ANY RLS policy evaluated as
-- that role -- proven against the same real PostgreSQL engine: every
-- authenticated query against a table whose policy calls `is_admin()`
-- (including the legitimate owner of their own row, not just
-- non-admins) failed outright with `permission denied for function
-- is_admin`, rather than being denied or allowed on its merits. This
-- also broke 20261003090000_hero_commercial_placement.sql's two
-- `hero_placements` policies (dated after this revoke) and
-- 20260918130000_inspection_domain_rls_hardening.sql's policies (also
-- corrected, Stage 13, to keep calling `is_admin()` rather than copying
-- this same broken inline-EXISTS pattern). Fixed by revoking only from
-- `anon` and the bare `public` pseudo-role (matching the function's own
-- original, narrower grant), keeping `authenticated` exactly as its
-- defining migration already intended. This does not reopen any anon/
-- unauthenticated access -- anon still cannot call this function, and
-- the net privilege surface is unchanged from what was always intended.
--
-- 3) `ad_slots_admin_all` was also scoped `TO public`, meaning it is one
-- of the PERMISSIVE policies Postgres must evaluate for `anon` too (two
-- PERMISSIVE policies on the same table are combined with OR, and both
-- sides get evaluated). Since `anon` cannot execute `is_admin()` (by
-- design -- see above), simply attempting to combine the two policies
-- made the ENTIRE table unreadable by anon, including rows that
-- `ad_slots_public_read` alone would have allowed -- proven: a real
-- visible/active ad slot, readable on its own merits, became
-- `permission denied for function is_admin` for `anon` purely because
-- the admin policy also had to be evaluated. Fixed by scoping
-- `ad_slots_admin_all` `TO authenticated` instead of `TO public`:
-- admins always connect as `authenticated` (there is no separate
-- database role for "admin"), so this loses no legitimate access, and
-- `anon` now never has this policy in its evaluated set at all, leaving
-- `ad_slots_public_read` to govern anon's (unchanged) public read access
-- on its own.

DROP POLICY IF EXISTS ad_slots_admin_all ON public.ad_slots;
CREATE POLICY ad_slots_admin_all ON public.ad_slots
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;

DROP INDEX IF EXISTS public.idx_cars_search_brand_model;
DROP INDEX IF EXISTS public.uq_payments_checkout_request_id;
