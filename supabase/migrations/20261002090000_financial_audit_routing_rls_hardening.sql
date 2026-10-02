-- KAYAD: Financial audit routing / RLS hardening
-- Backend-owned financial/audit records. Browser clients must not write them.

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.payment_attempts FROM anon, authenticated;
REVOKE ALL ON TABLE public.payment_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.webhook_events FROM anon, authenticated;

COMMENT ON TABLE public.payment_attempts IS
  'Backend-owned immutable provider attempts. Direct anon/authenticated client access is denied.';
COMMENT ON TABLE public.payment_events IS
  'Backend-owned append-only payment lifecycle audit events. Direct anon/authenticated client access is denied.';
COMMENT ON TABLE public.webhook_events IS
  'Backend-owned replay-protected provider webhook receipts. Direct anon/authenticated client access is denied.';
