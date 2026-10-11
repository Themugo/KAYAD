-- Schema-contract repair (messaging/financial audit 2026-10-11, defect D-SCHEMA-3).
-- middleware/idempotency.js writes to public.idempotency_audit_logs (via models/IdempotencyAuditLog.js) on every
-- idempotency-protected request, and awaits the insert without a catch in the in-flight-race branch. No earlier
-- migration creates the table, so on a chain-built database concurrent duplicate payment callbacks fail closed (503).
-- Additive and idempotent. Audit data only: no balances, no secrets. RLS on, service_role only.
CREATE TABLE IF NOT EXISTS public.idempotency_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  operation_type text,
  status text NOT NULL,
  checkout_request_id text,
  ip text,
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_audit_logs_key_status ON public.idempotency_audit_logs (key, status);
CREATE INDEX IF NOT EXISTS idx_idempotency_audit_logs_created_at ON public.idempotency_audit_logs (created_at);

ALTER TABLE public.idempotency_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.idempotency_audit_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.idempotency_audit_logs TO service_role;

COMMENT ON TABLE public.idempotency_audit_logs IS 'Audit trail of idempotency decisions (attempted/completed/failed/rejected_duplicate/in_flight_race). Retention policy is an operator decision.';
