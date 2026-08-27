/*
# Add missing payments columns: processed, paid_at
# KAYAD Phase 9 - escrow and payment safety audit

Found while independently verifying an existing fix (this project's
own earlier "Phase 9: escrow and payment safety hardening" commit,
5ac258a): backend/services/paymentCallback.service.js's
handleMpesaCallback implements a real, well-designed atomic-claim
pattern specifically to prevent M-Pesa's own known duplicate-callback
behavior from double-processing a payment - a single conditional
UPDATE ... WHERE checkout_request_id = ? AND processed = false, only
the first concurrent caller to flip processed false->true proceeds.

Reproduced directly against a real, migrated database, not assumed:
calling the real handleMpesaCallback function throws two separate
errors in sequence, one after the other was fixed - "Could not find
the 'processed' column of 'payments'" first, then (after adding that)
"Could not find the 'paid_at' column of 'payments'" - both PostgREST
error PGRST204, both confirming real columns the real payments table
(confirmed via \d payments) never had. This means every single real
M-Pesa callback would fail outright in production at the first of
these two points; the duplicate-callback protection and the
successful-payment timestamp this logic was specifically written to
provide have never actually been able to run.

Minimal, additive fix: add the two missing columns the existing,
already-correct application logic expects. Not a schema redesign -
the rest of the payments table, and every other column this and other
payment-flow code already reads/writes, remains unchanged. paid_at is
kept as its own, real column (not aliased to the existing updated_at)
since it has a genuinely distinct meaning - updated_at changes on
every write to the row (including the earlier "processed" claim
itself), while paid_at should record specifically when the payment
succeeded.
*/

ALTER TABLE payments ADD COLUMN IF NOT EXISTS processed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payments_checkout_processed ON payments(checkout_request_id, processed);
