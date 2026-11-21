-- STEP 2 — APPLY (WRITES to production schema). NEEDS EXPLICIT AUTHORIZATION. NOT EXECUTED BY CLAUDE.
-- Scope: ONLY the communication_deliveries email-ledger fix = verbatim statements of repo migrations
--   20260930111500_advanced_communication_idempotency.sql  (sha256 2e224b43360fe98d62d1055bc3c6d74affd7600520b40c2b6b45cf74eefa1aef)
--   20260930113000_communication_state_machine_hardening.sql (sha256 633c3758f8d30ed4f9de223ad3c510710f9e1aa0766dbbcccc66a05774aa6368)
-- Run STEP 1 first; stop if any row says BLOCKER. Run the whole script as ONE execution.
-- It is one transaction: every statement succeeds or none is kept. Re-running is a no-op.
BEGIN;
SET LOCAL lock_timeout = '5s';        -- fail fast instead of queueing behind other sessions
SET LOCAL statement_timeout = '30s';

DO $guard$
BEGIN
  IF to_regclass('public.communication_deliveries') IS NULL THEN
    RAISE EXCEPTION 'communication_deliveries missing - aborting';
  END IF;
  IF EXISTS (SELECT 1 FROM public.communication_deliveries WHERE provider_event_id IS NOT NULL GROUP BY provider, provider_event_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'duplicate (provider, provider_event_id) rows exist - unique index cannot be created';
  END IF;
END
$guard$;

-- migration 20260930111500
ALTER TABLE public.communication_deliveries ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_communication_delivery_idempotency ON public.communication_deliveries(provider, channel, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_communication_delivery_provider_event ON public.communication_deliveries(provider, provider_event_id) WHERE provider_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communication_delivery_source_event ON public.communication_deliveries(source_event_id) WHERE source_event_id IS NOT NULL;

-- migration 20260930113000
ALTER TABLE public.communication_deliveries DROP CONSTRAINT IF EXISTS communication_deliveries_status_check;
ALTER TABLE public.communication_deliveries ADD CONSTRAINT communication_deliveries_status_check CHECK (status IN ('queued','sending','sent','delivered','failed','bounced','read','dead_letter'));

COMMIT;
