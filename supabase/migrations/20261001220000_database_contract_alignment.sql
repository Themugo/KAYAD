-- KAYAD database contract alignment
-- Forward-only hardening for the current application/database contract.
-- This migration does not introduce a new product capability; it closes
-- schema gaps that can otherwise make existing code fail at runtime.

-- Inspector applications: one active pending application per user/email.
CREATE UNIQUE INDEX IF NOT EXISTS uq_inspector_applications_pending_user
  ON public.inspector_applications(user_id)
  WHERE user_id IS NOT NULL AND status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS uq_inspector_applications_pending_email
  ON public.inspector_applications(lower(btrim(email)))
  WHERE status = 'pending';

-- Dealer domain: one canonical dealer profile per identity.
CREATE UNIQUE INDEX IF NOT EXISTS uq_dealers_user_canonical
  ON public.dealers("user");

-- User-auth identity: the application contract requires exactly one auth row.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_auth_user_canonical
  ON public.user_auth(user_id);

-- Communication delivery records are backend-owned and must retain their
-- state-machine terminal status while remaining queryable by the service role.
ALTER TABLE public.communication_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.communication_deliveries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_deliveries TO service_role;

-- Registration identity RPC must remain service-role-only. Re-state the
-- privilege boundary so later grants cannot accidentally widen it.
REVOKE EXECUTE ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ)
  TO service_role;

-- Dealer profile synchronization is backend-owned.
REVOKE EXECUTE ON FUNCTION public.sync_dealer_profile_from_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_dealer_profile_from_user() TO service_role;

-- Inspector application writes are backend-owned.
REVOKE ALL ON public.inspector_applications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspector_applications TO service_role;

-- Keep timestamps consistent for newly created/updated inspector applications.
DROP TRIGGER IF EXISTS trg_inspector_applications_updated_at ON public.inspector_applications;
CREATE TRIGGER trg_inspector_applications_updated_at
  BEFORE UPDATE ON public.inspector_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_snake();
