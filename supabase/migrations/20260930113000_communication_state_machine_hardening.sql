-- Durable communication state machine: explicit dead-letter terminal state.
ALTER TABLE public.communication_deliveries
  DROP CONSTRAINT IF EXISTS communication_deliveries_status_check;
ALTER TABLE public.communication_deliveries
  ADD CONSTRAINT communication_deliveries_status_check
  CHECK (status IN ('queued','sending','sent','delivered','failed','bounced','read','dead_letter'));
