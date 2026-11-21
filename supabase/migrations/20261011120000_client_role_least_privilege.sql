-- Least privilege for Supabase client roles (defects RLS-1, RLS-2 — docs/audits/09-RLS-AND-PRIVILEGE-MATRIX-20261011.md).
--
-- Why this is needed only on hosted Supabase: a hosted project grants ALL on every table/function created by `postgres`
-- in `public` to `anon` and `authenticated` (platform default privileges). The application never uses those roles: the
-- browser talks only to the Express API, and the API uses `service_role` (which bypasses RLS). So for client roles, RLS
-- policies and the grants that migrations explicitly revoke are the ONLY barrier against direct PostgREST access with the
-- public anon key, or with an `authenticated` JWT obtained from Supabase Auth (GoTrue) sign-up if it is enabled.
--
-- RLS-1 (Medium): 14 SELECT policies granted `authenticated` USING (true) on internal governance / operations tables
--   (risk assessments, decision registers, change requests, releases, war rooms, ...). Reproduced on a replay with Supabase
--   default privileges: an `authenticated` JWT with an arbitrary `sub` read rows of governance_policies and risk_assessments.
--   Fix: same policies, now gated by the existing is_admin() helper (Supabase-Auth admins keep read access; nobody else).
-- RLS-2 (Low, hygiene): 23 functions remained EXECUTE-able by PUBLIC/anon/authenticated (22 trigger functions — not
--   callable directly — and refresh_inspection_provider_starting_price(uuid), an invoker-rights helper with no caller in the
--   application). Fix: revoke EXECUTE from PUBLIC, anon, authenticated. service_role/postgres keep it; triggers keep firing.
--
-- RLS-3 (Low, verified on production 2026-10-11, read-only catalog): the production default ACL for objects created by
--   `postgres` gives anon/authenticated TRUNCATE, REFERENCES, TRIGGER (and MAINTAIN on PG17) on new tables — 72 public
--   tables carry them. TRUNCATE is not subject to RLS. No Supabase API issues TRUNCATE today, but the privilege is
--   unnecessary for client roles. Fix: revoke those table privileges from anon/authenticated (SELECT/INSERT/UPDATE/DELETE
--   are not touched here; production already grants none of them broadly). Default privileges are NOT altered (platform
--   setting; see docs/audits/11).
--
-- Additive only: no table, column, data or RLS flag is removed; no grant is broadened. Idempotent; tolerant of objects that
-- are absent on a given database (hosted drift): each step checks existence first.
-- Rollback: docs/audits/11-MIGRATION-AND-ROLLBACK-REVIEW-20261011.md.

DO $$
DECLARE
  r record;
  v_policies text[][] := ARRAY[
    ['approval_rules', 'governance_authenticated_approval'],
    ['change_requests', 'governance_authenticated_changes'],
    ['command_center_war_rooms', 'command_center_war_rooms_select'],
    ['country_rules', 'governance_authenticated_countries'],
    ['decision_registers', 'governance_authenticated_decisions'],
    ['enterprise_standards', 'governance_authenticated_standards'],
    ['experiments', 'experiments_authenticated_select'],
    ['feature_lifecycles', 'governance_authenticated_features'],
    ['governance_policies', 'governance_authenticated_read'],
    ['improvements', 'improvements_authenticated_select'],
    ['innovation_ideas', 'ideas_authenticated_select'],
    ['partner_requirements', 'governance_authenticated_partners'],
    ['releases', 'governance_authenticated_releases'],
    ['risk_assessments', 'governance_authenticated_risks']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(v_policies, 1) LOOP
    IF EXISTS (
      SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_policies[i][1] AND p.polname = v_policies[i][2]
    ) THEN
      EXECUTE format('ALTER POLICY %I ON public.%I USING ((SELECT public.is_admin()))', v_policies[i][2], v_policies[i][1]);
    END IF;
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
      AND (p.prorettype = 'trigger'::regtype
           OR p.oid = to_regprocedure('public.refresh_inspection_provider_starting_price(uuid)'))
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.fn);
  END LOOP;
END
$$;

REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
DO $$
BEGIN
  IF current_setting('server_version_num')::int >= 170000 THEN
    EXECUTE 'REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
  END IF;
END
$$;
