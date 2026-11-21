-- Security remediation (audit 2026-10-11, defect D-SEC-2). On the migration chain these public tables have RLS DISABLED:
-- distributed_locks, inspection_branches, inspection_checklist_items, inspection_packages, inspection_providers,
-- mpesa_transactions, payment_providers, provider_credentials, refunds, roadside_service_requests, vehicle_service_offerings.
-- On a hosted Supabase project, a table without RLS that anon/authenticated can reach is readable/writable through the
-- public REST API. (In the hosted project an event trigger, rls_auto_enable(), may already have enabled RLS; that function
-- is created by no migration, so this is UNCONFIRMED in production.) The backend uses service_role (bypasses RLS) and
-- the SPA has no direct database client, so enabling RLS with no policy and revoking client grants is deny-by-default
-- and does not change application behaviour. Tables that do not exist are skipped. Idempotent.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['distributed_locks','inspection_branches','inspection_checklist_items','inspection_packages',
    'inspection_providers','mpesa_transactions','payment_providers','provider_credentials','refunds',
    'roadside_service_requests','vehicle_service_offerings']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;
