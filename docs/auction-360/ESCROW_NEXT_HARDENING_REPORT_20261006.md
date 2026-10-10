# KAYAD Escrow Next Hardening Report — 2026-10-06

## Scope

This phase continues from `KAYAD-ESCROW-LIVE-OPERATIONS-HARDENED-FOUNDATION-20261006.zip` and performs another production-safe audit of the escrow financial boundary, provider callbacks, reconciliation, dispute settlement, emergency closure, and Marketplace purchase-outcome convergence.

No production deployment was performed.

## Corrections

### 1. B2C callback idempotency classification corrected

`/api/payments/b2c/callback` and `/api/payments/b2c/timeout` contain `/payment` in their paths. The generic payment branch previously matched before the specific B2C branches, which meant deterministic B2C replay keys were not generated.

Correction:
- specific B2C callback/timeout operation types now match first;
- callback keys are deterministic from provider ConversationID/result identity;
- timeout keys are deterministic from ConversationID;
- B2C provider operations use a ConversationID-scoped distributed lock.

### 2. Critical idempotency failures now fail closed

Financial/provider-critical requests no longer continue into the money-moving controller when the idempotency/coordination layer itself fails. They return HTTP 503 with `Retry-After: 5` so the caller can safely retry instead of risking a duplicate financial side effect.

### 3. Unknown B2C callbacks are retained for reconciliation

A successful provider callback that cannot be matched to a canonical `dealer_payouts` ConversationID is now persisted to the service-controlled `webhook_events` boundary with a deterministic dedupe key and an explicit processing error. The event is not silently discarded.

### 4. Partial/split dispute buyer settlements now create external refund records

Full refunds already had a settlement-record path. Partial and split dispute decisions could create a buyer payable without an explicit `refunds` row, especially for payment-less legacy escrows.

A database trigger now creates the pending external refund settlement record whenever a dispute resolution contains a positive buyer settlement, including payment-less cases.

### 5. Escrow → Marketplace purchase outcome reconciliation moved into the database boundary

Application-side `syncPurchaseOutcomeFromEscrow()` remains for compatibility, but the canonical escrow state mutation now has a database trigger that reconciles the linked `purchase_outcomes` row in the same PostgreSQL transaction.

Covered states:
- funded / vehicle_confirmed / delivered → ready-for-collection progression;
- disputed → purchase outcome disputed;
- released → ready/collection/transfer progression consistent with existing outcome state;
- refunded → blocked/refunded outcome progression.

If this reconciliation cannot be completed, the escrow transaction fails rather than silently committing a cross-domain mismatch.

### 6. Emergency escrow closure now uses the canonical atomic state transition

`closeEscrow()` previously performed a direct document update after application-side validation. It now calls `kayad_transition_escrow_atomic()` with the request idempotency key and closure reason, preserving row locking and the canonical state machine during concurrent release/dispute activity.

## Validation

### Passed

- Escrow business integrity: **20/20**
- Escrow admin control plane: **15/15**
- Escrow Operations Center: **16/16**
- Payment/Escrow domain: **9/9**
- Escrow custody domain: **14/14**
- Financial ledger/reconciliation domain: **13/13**
- Escrow live-operations contract: **21/21**
- Escrow next hardening contract: **14/14**
- High-risk boundaries: **PASS**
- Marketplace + Auction + Escrow DB integration: **29/29**
- Marketplace convergence: **17/17**
- Domain lifecycle integrity: **PASS**
- Financial audit/RLS hardening: **7/7**
- Deployment readiness: **PASS**
- Frontend runtime contracts: **PASS**
- UI surface convergence: **9/9**
- Vercel CI contract: **PASS**
- Supabase migration preflight: **155/155 unique migration versions**
- Changed backend JS syntax: **PASS**

### Not executed here

The runtime environment remains Node `22.16.0`, while KAYAD requires Node `>=22.22.2`. There are no staging Supabase credentials in this execution environment and no `psql` client is available.

Therefore this phase does **not** claim:

- `npm ci` on Node 22.22.2;
- fresh TypeScript certification;
- fresh Vite production build;
- real PostgreSQL staging execution;
- real RLS role-matrix execution;
- real M-Pesa B2C callback execution;
- real external refund settlement;
- real reconciliation against staging records;
- real ownership-transfer transaction execution.

## Remaining live gate

The next financial certification must run against disposable staging infrastructure using Node 22.22.2:

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. apply/reset Supabase staging migrations
6. execute escrow role/RLS matrix
7. execute bank funding → funded → buyer confirmation → delivery → release → payout
8. execute duplicate B2C callback and timeout scenarios
9. execute provider amount mismatch
10. execute full refund and partial/split dispute refund branches
11. execute external refund settlement
12. run reconciliation/anomaly detection
13. execute Marketplace collection → ownership transfer
14. verify final listing/ownership state
15. verify notification/event idempotency

## Production safety

No Vercel deployment was performed.

No production secrets, production Supabase configuration, authentication architecture, payment provider configuration, RLS policy boundary, or deployment project configuration was changed.

## Changed files in this phase

- `backend/middleware/idempotency.js`
- `backend/controllers/paymentController.js`
- `backend/services/escrow.service.js`
- `supabase/migrations/20261006240000_escrow_marketplace_reconciliation_hardening.sql`
- `scripts/validate-escrow-next-hardening.mjs`
- `.env.production.example` (preserved from prior foundation packaging)

## Release status

**HARDENED FOUNDATION — NOT LIVE FINANCIAL CERTIFICATION.**
