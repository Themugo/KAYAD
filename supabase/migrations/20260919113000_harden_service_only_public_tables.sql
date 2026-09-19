-- P0-D: The browser application does not access Supabase tables directly.
-- KAYAD data access is through the backend service-role connection.
-- For public tables that intentionally have no RLS policies, remove direct
-- Data API table privileges from anon/authenticated rather than creating
-- broad policies that would expose internal rows.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_policies p
      ON p.schemaname = n.nspname
     AND p.tablename = c.relname
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    GROUP BY c.relname
    HAVING count(p.policyname) = 0
  LOOP
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM anon, authenticated',
      r.relname
    );
  END LOOP;
END $$;
