-- ROLLBACK for STEP 2 (use only if STEP 2 was committed and must be undone). WRITES. NEEDS AUTHORIZATION.
-- LIMITATIONS: (1) dropping idempotency_key discards stored keys (duplicate-send protection is lost until re-applied);
-- (2) the OLD status check cannot hold 'dead_letter', so such rows are first converted to 'failed' (their last_error is kept);
-- (3) nothing is restored for other tables. STEP 2 is one transaction, so a failed STEP 2 needs no rollback.
BEGIN;
SET LOCAL lock_timeout = '5s';
UPDATE public.communication_deliveries SET status = 'failed' WHERE status = 'dead_letter';
ALTER TABLE public.communication_deliveries DROP CONSTRAINT IF EXISTS communication_deliveries_status_check;
ALTER TABLE public.communication_deliveries ADD CONSTRAINT communication_deliveries_status_check CHECK (status IN ('queued','sending','sent','delivered','failed','bounced','read'));
DROP INDEX IF EXISTS public.uq_communication_delivery_idempotency;
DROP INDEX IF EXISTS public.uq_communication_delivery_provider_event;
DROP INDEX IF EXISTS public.idx_communication_delivery_source_event;
ALTER TABLE public.communication_deliveries DROP COLUMN IF EXISTS idempotency_key;
COMMIT;
