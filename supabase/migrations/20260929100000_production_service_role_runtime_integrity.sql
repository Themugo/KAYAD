-- KAYAD production runtime integrity.
--
-- The backend is authoritative for application data access and uses the
-- Supabase service_role client. The live production runtime exposed that the
-- service_role role could connect to Postgres but lacked table privileges on
-- core application tables (notably cars and saved_searches). That made the
-- readiness probe fail and caused background services to fail independently.
--
-- Keep RLS/policies unchanged for browser-facing roles. These grants apply
-- only to the server-side service_role used by the KAYAD API.

ALTER TABLE public.favorites
  ADD COLUMN IF NOT EXISTS notify_on_price_drop BOOLEAN NOT NULL DEFAULT false;

GRANT USAGE ON SCHEMA public TO service_role;

-- Reconcile the backend's server-side data-access contract for both existing
-- tables and future tables created by the canonical migration chain.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO service_role;

-- Explicit core-table grants document the production-critical contract and
-- make the readiness/background-service dependency obvious in the migration
-- history even though the ALL TABLES reconciliation above is authoritative.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cars TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bids TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.favorites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_searches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_auth TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.refresh_tokens TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.communication_deliveries TO service_role;
