-- Communication delivery idempotency + monotonic provider status.
ALTER TABLE public.communication_deliveries
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_communication_delivery_idempotency
  ON public.communication_deliveries(provider, channel, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_communication_delivery_provider_event
  ON public.communication_deliveries(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_communication_delivery_source_event
  ON public.communication_deliveries(source_event_id)
  WHERE source_event_id IS NOT NULL;
