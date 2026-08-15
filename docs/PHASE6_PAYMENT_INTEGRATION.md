# PHASE6_PAYMENT_INTEGRATION.md
**KAYAD — Phase 6, Payment Architecture**

Scope note, confirmed with the project owner before this phase began: this work is for KAYAD, not a separate "Meggs Kitchen" project referenced in the original phase brief - that appears to be an unrelated template/naming mix-up, confirmed explicitly not to be touched. The generic "checkout to order to fulfillment" architecture requested has been mapped onto KAYAD's actual domain: vehicle bid/purchase payments and escrow, not retail orders.

---

## 0. The Headline Finding: Much of This Already Existed, More Solidly Than Expected

Before building anything new, this phase audited the existing payment code in full. What was found changes the right approach significantly: KAYAD already has a genuinely sophisticated M-Pesa payment/callback system - confirmed by direct code read of `backend/services/paymentCallback.service.js` (238 lines):

- Idempotent callback claiming: a "claim" pattern (`findOne(..., { processed: false })` then `update(..., { processed: true })`) that prevents double-processing the same callback.
- Duplicate callback handling: explicit early-return with logging when a callback arrives for an already-succeeded payment.
- Amount verification: real, working `Number(amount) !== Number(payment.amount)` rejection.
- Escrow creation gated on seller verification: will not fund escrow if the seller isn't a verified dealer, refunding and notifying the buyer instead.
- Multi-layered HTTP protection: the callback route (`routes/paymentRoutes.js`) is already guarded by `mpesaIpWhitelist` (real Safaricom production/sandbox IP ranges), `validateMpesaCallback`, and `idempotencyCheck` (the Phase 1-documented `idempotency_keys` middleware) - three layers before the request even reaches the application-layer claim logic above.

Given this, this phase's approach was consolidation and extension, not replacement - building the requested entities (PaymentProvider, PaymentAttempt, PaymentEvent, Refund, WebhookEvent) additively on top of the existing `payments`/`escrows` tables, rather than the large, risky rewrite a from-scratch build would have required. This matches this program's consistent principle of preferring the smallest safe correction, applied here to the highest-stakes category of code in the entire project.

---

## 1. A Real, Confirmed Bug Found and Fixed

`services/paymentService.js`'s `initiateStkPush()` calls `create("mpesa_transactions", {...})` on every single STK push initiation - confirmed by direct code read. No `mpesa_transactions` table exists anywhere in `supabase/migrations/` (the authoritative schema, per Phase 1) or in the stale `backend/db/*.sql`. This call is wrapped in `.catch()`, so it does not crash the STK push flow (the `payments` row is still created successfully) - but every `mpesa_transactions` insert has been silently failing since this code was written, logged only as a swallowed warning ("Payment notification failed").

Fixed this phase: `mpesa_transactions` table added via migration, with the exact column set the existing code already writes (`checkoutRequestID`, `phone`, `amount`, `status`, `carId` mapping to `checkout_request_id`, `phone`, `amount`, `status`, `car_id` via the existing `mapKeyOut` translation layer - no application code changed, no new `FIELD_ALIASES` entry needed).

---

## 2. New Schema: supabase/migrations/20260815060000_payment_architecture_extension.sql.sql

| Table | Purpose | Status before this phase |
|---|---|---|
| `mpesa_transactions` | Fixes the confirmed bug above | Missing, actively written to (bug) |
| `payment_providers` | Provider registry (M-Pesa Daraja seeded; future-ready for card processors) | Did not exist - app was hardcoded to M-Pesa everywhere with no data-layer provider concept |
| `payment_attempts` | One row per STK-push attempt, distinct from the final `payments` row - supports customer retry after timeout without losing attempt history | Did not exist |
| `payment_events` | Append-only audit trail (stk_initiated, callback_received, amount_verified, marked_paid, escrow_funded, duplicate_callback_ignored, amount_mismatch_rejected) | Did not exist - `audit_logs` exists (Phase 1) but is generic/cross-domain, not a dedicated payment timeline |
| `refunds` | Dedicated refund entity | Did not exist at all - confirmed zero Refund model, zero table, despite escrowRoutes.js/escrowVaultRoutes.js already referencing refund concepts in their paths |
| `webhook_events` | Append-only inbound webhook log with payload-hash-based replay protection | The Webhook model existed with no backing table at all (same class of bug as mpesa_transactions) |

Explicit credential-safety design: `payment_providers.config` is a JSONB column intended for non-sensitive configuration only (callback URLs, timeouts) - no credential columns exist on this or any new table, per this phase's own explicit instruction. Real M-Pesa credentials remain exclusively in environment variables, confirmed unchanged (`services/mpesaAuth.service.js` reads `process.env` directly, not touched this phase).

What this migration deliberately does not do: does not modify any column or constraint on `payments` or `escrows`, does not backfill historical data (no live database with historical data exists to backfill from), and does not implement any logic itself - schema only, per this program's now-consistent separation between migrations (structure) and service code (behavior).

---

## 3. Application-Layer Changes

### backend/models/_base.js
5 new TABLE_MAP entries (PaymentProvider, PaymentAttempt, PaymentEvent, Refund, WebhookEvent), purely additive. 5 new minimal model files following the codebase's exact existing pattern (`export default createModel("X")`).

### backend/services/paymentCallback.service.js
Added a fire-and-forget `logPaymentEvent()` helper, called at 5 points in the existing callback flow (callback_received, duplicate_callback_ignored, amount_verified/amount_mismatch_rejected, marked_paid, escrow_funded) - zero existing control-flow logic was changed. Every call is non-blocking and independently caught, matching the exact convention this file already used for sendNotification/sendDigitalReceipt calls (`.catch((e) => logWarn(...))`) - a payment audit log write failing must never be able to fail a real payment.

### backend/controllers/paymentController.js
Added payload-hash-based replay protection (`webhook_events.dedupe_key`, a SHA-256 hash of CheckoutRequestID + the full raw payload), applied before `handleMpesaCallback` is invoked. This is distinct from the existing `idempotencyCheck` middleware, which keys on a client-supplied idempotency-key header - M-Pesa's own Daraja callbacks don't send one, so that existing protection couldn't catch a byte-identical replayed webhook body. This closes that specific gap. On a detected duplicate, responds `200 { success: true }` without reprocessing - deliberately not a 5xx, since an error response would likely trigger the provider's own retry logic, compounding the problem rather than resolving it. The dedupe-check query itself is fail-open (`.catch(() => null)`) - a failure to check for a duplicate does not block real payment processing, consistent with treating this new table as an enrichment, not a hard dependency of the critical path.

---

## 4. Authoritative Flow - Requested vs. Actual

| Requested step | KAYAD's actual, now-slightly-extended equivalent |
|---|---|
| Checkout to create order | Buyer initiates a bid/purchase - paymentService.js creates a payments row (status: 'pending') |
| Initiate payment to pending | Real STK push via mpesaService.js; payment_attempts row now available for multi-attempt tracking (schema ready; not yet wired into paymentService.js's attempt-creation logic - see section 6) |
| Provider callback | mpesaIpWhitelist -> validateMpesaCallback -> idempotencyCheck -> new: webhook dedupe check -> handleMpesaCallback |
| Validate callback | Real, pre-existing: format check, ResultCode check |
| Idempotency check | Real, pre-existing: "claim" pattern; new: payload-hash dedupe on top |
| Verify amount | Real, pre-existing: exact numeric comparison; new: outcome logged to payment_events |
| Verify reference | Real, pre-existing: checkoutRequestId lookup |
| Mark payment paid | Real, pre-existing: payments.status = 'success'; new: event logged |
| Mark order paid / release fulfillment | Real, pre-existing: escrow creation (for purchase type) or bid/car update (for bid type), gated on seller verification; new: event logged |

---

## 5. Survival Scenarios - Assessed Against Existing + New Code

| Scenario | Handling |
|---|---|
| Duplicate callback | Pre-existing "claim" pattern + new payload-hash dedupe (two independent layers) |
| Late callback | Handled the same as any callback - no time-window rejection exists; not identified as a gap this phase, but not independently verified either |
| Wrong amount | Pre-existing rejection, now logged as a distinct event type |
| Wrong order/reference | Pre-existing checkoutRequestId lookup; a callback for an unrecognized reference logs a warning and returns without action |
| Network timeout (provider-side) | Not independently tested - depends on Daraja's own retry behavior, outside this codebase's control |
| Customer retry | Partially supported - a new STK push creates a new payments row today; payment_attempts schema exists to properly link retries to one logical transaction, but paymentService.js was not modified this phase to actually populate it (see section 6) |
| Provider timeout | Same as network timeout - not independently tested |
| Payment cancellation | payment_attempts.status includes 'cancelled' in its schema; no application code currently sets it - flagged, not built, this phase |

No successful payment is faked in any fallback mode - confirmed by reading paymentService.js's existing STK push error handling: a failed STK push in non-development environments re-throws (`if (process.env.NODE_ENV !== "development") throw err`); the "mock mode" fallback is explicitly development-only and was not modified or extended this phase.

---

## 6. What This Phase Did NOT Build (Explicit, Not Silent)

- payment_attempts is schema-only - not yet populated by paymentService.js. Wiring real multi-attempt tracking into the STK push initiation flow is a genuine next step, not done here, given the risk of modifying the core initiation path itself (as opposed to the callback path, which only received additive, non-blocking logging calls this phase).
- Reconciliation admin tooling: backend/services/reconciliationService.js (1,630 lines, confirmed to exist in Phase 0) was not read or extended this phase. The new payment_events/webhook_events tables provide better raw material for reconciliation than existed before, but no new admin-facing reconciliation UI or endpoint was built.
- Refund processing logic: the refunds table and Refund model exist; no service-layer code was written to actually create/process a refund through them. escrowVaultRoutes.js's existing admin-refund endpoint was not modified to use the new table.
- Sandbox/test mode: payment_providers.is_sandbox and the existing MPESA_ENV=sandbox env var (confirmed real in mpesaSecurity.js) both exist; they are not yet connected to each other.
- Live verification of any of this - no live database or deployed backend exists anywhere reachable in this program, the standing constraint restated at every phase. This migration and code are evidence-based against the real, authoritative schema and the actual existing service code, not verified by running them.

---

## 7. Verification Run This Phase

| Check | Result |
|---|---|
| Backend syntax validation (node --check, all files) | 0 errors |
| Backend unit test suite (npm test, Jest) | 216/216 passing - confirms no regression from any change this phase |
| Frontend TypeScript | 0 errors (frontend untouched this phase) |
| Frontend test suite | 180/180 passing (unaffected) |
| Live migration application | Not possible - no reachable database |

PHASE 6 STATUS: PARTIAL PASS. The confirmed mpesa_transactions bug is fixed, all 5 requested entities now have real schema and minimal models, and the callback flow has genuinely new audit logging and replay protection layered onto its already-solid existing behavior - all verified not to regress the 216 real backend tests. What remains open, named explicitly rather than implied complete: payment_attempts population, refund processing logic, reconciliation tooling, and sandbox/provider-config wiring. This phase strengthened the foundation significantly without risking the parts that already worked.
