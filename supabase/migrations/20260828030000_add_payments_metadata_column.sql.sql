/*
# Add the missing payments.metadata column
# KAYAD Final Integration Phase 3 - real auction & bidding integration

Found while providing the required "real, persisted bid" evidence for
this phase: services/paymentService.js's initiatePayment() spreads a
caller-supplied `metadata` object directly as top-level columns into
the real payments insert (`...metadata`) - for the real bid-placement
flow (bidController.js), this is `{ bidAmount: amount }`, meaning
every real bid attempt failed with "Could not find the 'bid_amount'
column of 'payments'" the moment payment initiation was reached.

This is not an isolated, one-off caller mistake: paymentCallback.
service.js separately reads `payment.metadata?.planId` elsewhere in
this same codebase, confirming a real, generic JSONB metadata concept
is genuinely expected to exist on this table - it was simply never
added to the schema. Reproduced the real failure directly against a
real, migrated database calling the real placeBid() controller.

Minimal, additive fix: add the one missing JSONB column the existing,
already-correct application code (in more than one file) already
expects. Not a schema redesign, and not a workaround in
paymentService.js's own spreading logic - `...metadata` spread
directly onto row-level columns is itself unusual, but changing that
call site's own established behavior (which other, working payment
types may already depend on) is out of scope for a database-column
fix; adding the column it was always missing is the narrower,
correct repair.
*/

ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB;
