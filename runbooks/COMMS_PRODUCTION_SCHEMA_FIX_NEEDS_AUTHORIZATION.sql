-- KAYAD communications: PRODUCTION SCHEMA FIX — NEEDS AUTHORIZATION. NOT APPLIED by Claude.
-- Root cause of missing registration/verification/reset emails (found 2026-10-13, read-only):
-- hosted public.communication_deliveries has no idempotency_key column and its status CHECK lacks 'dead_letter'.
-- Every deliver() call fails before Brevo is contacted. These two statements are the verbatim repo migrations
-- 20260930111500 and 20260930113000. Both are additive/idempotent (verified on a local PG16 copy of the hosted table).
-- Apply in the Supabase SQL editor (or `supabase db push` only if you intend ALL pending migrations), then redeploy not required.

ALTER TABLE public.communication_deliveries ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_communication_delivery_idempotency ON public.communication_deliveries(provider, channel, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_communication_delivery_provider_event ON public.communication_deliveries(provider, provider_event_id) WHERE provider_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communication_delivery_source_event ON public.communication_deliveries(source_event_id) WHERE source_event_id IS NOT NULL;

ALTER TABLE public.communication_deliveries DROP CONSTRAINT IF EXISTS communication_deliveries_status_check;
ALTER TABLE public.communication_deliveries ADD CONSTRAINT communication_deliveries_status_check CHECK (status IN ('queued','sending','sent','delivered','failed','bounced','read','dead_letter'));

-- Verify afterwards (read-only):
-- select column_name from information_schema.columns where table_name='communication_deliveries' and column_name='idempotency_key';
-- Then: GET https://<api>/health  ->  checks.communications.status must be "ready".
