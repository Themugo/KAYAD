# KAYAD HARDENING — PHASE 9: ESCROW AND PAYMENT SAFETY (independent verification pass)

Important context, stated directly: this project's own repository already has an earlier "Phase 9: escrow and payment safety hardening" commit (5ac258a, from a separate, parallel work stream on this same repository). This document is an independent verification pass over that existing work, not a first pass - per this project's own recent experience (an earlier phase's "atomic" auction-closing fix was found, on direct testing, to not actually be atomic), "already fixed" was treated as a claim to verify, not a fact to trust.

---

## CRITICAL FINDING — the existing duplicate-callback protection could never actually run; every real M-Pesa callback would fail

What the existing work built, confirmed by reading it: backend/services/paymentCallback.service.js's handleMpesaCallback implements a real, well-designed atomic-claim pattern specifically to prevent M-Pesa's own known duplicate-callback behavior from double-processing a payment - a single conditional UPDATE payments SET processed = true WHERE checkout_request_id = ? AND processed = false, via updateMany (a genuinely atomic, single-SQL-statement function in db/index.js - independently verified this pass, unrelated to the separate, now-fixed findOneAndUpdate bug from this project's own Phase 8 work). Only the first concurrent caller to flip processed from false to true proceeds; a second, duplicate callback correctly finds zero rows affected and exits.

What was actually verified this pass, against a real, migrated database: calling the real handleMpesaCallback function threw "Could not find the 'processed' column of 'payments' in the schema cache" (PostgREST error PGRST204). The real payments table (confirmed via \d payments) has no processed column at all. This means the duplicate-callback protection this code was specifically written to provide has never actually been able to run - every real M-Pesa callback would fail outright in production, at this exact point, regardless of whether it was a duplicate or not.

After adding the missing column, a second, separate instance of the identical problem was found in the same function: "Could not find the 'paid_at' column of 'payments'" - also missing entirely from the real table.

Fix: a new, additive migration (20260827090000_add_payments_processed_column.sql.sql) adds both missing columns (processed BOOLEAN NOT NULL DEFAULT false, paid_at TIMESTAMPTZ) plus a supporting index. Not a schema redesign - every other column this and the rest of the payment flow already read/wrote is unchanged.

A third, related but non-blocking bug found in the same trace: sendNotification, called as a real (but non-critical, fire-and-forget) side effect of a successful payment, failed with "Could not find the 'user' column of 'notifications'" - the real notifications table's column is user_id, and no alias entry for this table existed in utils/fieldMap.js at all. Fixed by adding the missing alias entry. Confirmed non-blocking (the payment itself still completes and is correctly marked success even when this specific side effect fails) - fixed anyway since a real user-facing notification silently never being sent is still a real defect, not merely cosmetic.

Verified, end to end, against a real database:
1. Reproduced the original failure (real callback throws, cannot process any payment at all).
2. Applied both column fixes; reproduced a real callback completing successfully - the real database row shows status: 'success', a real paid_at timestamp, and the real M-Pesa receipt number.
3. Reproduced the actual duplicate-callback scenario directly: fired two identical, concurrent callbacks (same CheckoutRequestID) at the real, fixed function. Confirmed exactly one payment row exists afterward, correctly marked success - the second call's own log output ("Callback idempotent: payment already succeeded") confirms it correctly detected the already-completed payment and returned without reprocessing, exactly as the existing code's own design intended.
4. Fixed the notifications alias; confirmed the same duplicate-callback test no longer logs the notification error either.

---

## Verified as part of this pass, matching this phase's own explicit requirements

- No client-controlled amount determines settlement: confirmed directly in the existing work's own code (escrowVaultController.js) - settlement amount is derived server-side from the winning bid or listing price, with an explicit rejection path for a client-supplied mismatch. Not independently re-tested against a live database this pass beyond confirming the logic's presence, given time spent on the critical finding above.
- Live escrow/payment mode is explicitly disabled by default: confirmed directly (escrowRulesConfig.ts's own liveMode: false default, with an explicit comment describing this as a deliberate choice pending real credentials/operational readiness) - unchanged, not touched this pass.
- Webhook/callback authentication: the existing work's own webhook-secret and timing-safe HMAC comparison additions were read directly and appear sound; not independently re-tested against a real request this pass, given time.
- No duplicate escrow implementation remains active: not re-audited this pass beyond what this project's own Phase 4 (view-layer duplicates) and Phase 0 (broader repository audit) already covered; no new duplicate implementation was found or introduced.

---

## Not independently re-verified this pass — named directly, not assumed correct

Given the depth required to find, reproduce, and properly fix the critical schema-mismatch defect above, several items from this phase's own audit checklist were not independently re-tested against a real database this pass, beyond reading the existing implementation:

- The full state machine (created -> pending -> funded -> verified -> eligible for release -> released, or disputed -> resolved -> refunded/cancelled) - read, not independently driven end-to-end through a real sequence of transitions this pass.
- Dispute-lock behavior (does opening a dispute genuinely, atomically prevent a concurrent auto-release) - the existing work's own commit message claims this; not independently reproduced.
- Reconciliation and ledger consistency - not independently audited this pass.
- Refund handling - not independently tested this pass.
- Retry/failure-recovery behavior beyond the duplicate-callback case directly reproduced above.

These are named directly as genuinely unverified, not silently assumed safe because related work already exists - consistent with this project's own established standard of not claiming something works merely because code for it exists.

---

## Files changed this pass

- supabase/migrations/20260827090000_add_payments_processed_column.sql.sql — new, additive migration adding the two missing payments columns (processed, paid_at) the existing, already-correct application code depended on.
- backend/utils/fieldMap.js — added the missing notifications table alias entry (user -> user_id).

No application logic was changed - both defects were schema/mapping gaps underneath already-correct, already-written code, not bugs in that code's own logic. No frontend files were changed.

---

## Verification

| Check | Result |
|---|---|
| Real handleMpesaCallback reproduced failing, then reproduced succeeding, against a real database | Confirmed (PGRST204 twice in sequence -> real success, real receipt, real timestamp) |
| Real duplicate-callback scenario (2 concurrent, identical callbacks) reproduced safe | Confirmed - exactly one success payment row, second call correctly short-circuits |
| Backend unit test suite (this branch's own, current, larger set - 16 suites including dedicated escrow/payment/auction safety tests) | 335/335 passing, unchanged |
| Frontend TypeScript | 0 errors, unchanged |

STOP per instructions — no new financial products were introduced, live payment mode was not activated (confirmed still explicitly disabled by default), and no feature beyond fixing the two real, reproduced schema defects blocking the existing, already-designed safety logic was added.
