# KAYAD Escrow Live Operations Hardening — 2026-10-06

## Foundation

Started from the KAYAD Escrow Operations Control Center foundation supplied for this phase. No second escrow engine or alternate financial workflow was introduced.

## Scope

This phase advances the canonical escrow lifecycle toward operational certification:

- pending → custody funding → funded
- buyer confirmation → vehicle delivery → release
- seller payout preparation → M-Pesa B2C processing → provider callback → payout ledger
- dispute → resolution → refund payable / seller settlement / commission
- external refund settlement
- idempotency and replay protection
- reconciliation and anomaly visibility
- transaction notifications
- marketplace purchase outcome synchronization
- final ownership/transfer remains a governed post-release fulfilment step

## Critical defects found and corrected

### 1. Duplicate seller-release ledger posting

The database-level atomic escrow transition already posted seller settlement and commission. The application service then called `recordEscrowRelease()` a second time with different ledger external references. That could create duplicate financial events.

Correction: the atomic database transition is now the sole release financial authority. The application service no longer posts a second release ledger event.

### 2. Payment-less refunds could become financially incomplete

The canonical refund transition posted a refund payable for legacy payment-less escrows but did not create a `refunds` record, leaving no external settlement record for the later completion operation.

Correction: an append-only-safe database trigger now guarantees a pending refund settlement record exists whenever an escrow reaches `refunded`, including payment-less legacy escrows. Existing payment-backed refund creation remains idempotent.

### 3. Refund completion was not bound to the URL escrow case

The refund completion route accepted both escrow ID and refund ID but the RPC only received the refund ID. The route could therefore be asked to complete a refund belonging to a different escrow case.

Correction: the controller now loads the refund and rejects the operation unless `refund.escrow_id` exactly matches the URL escrow ID before invoking the canonical completion RPC.

### 4. Escrow Operations Center could not initiate seller payout

The permission `settle_escrow_payout` existed but the Operations Center had no canonical payout initiation action.

Correction: added a settlement-permission protected operations endpoint that reuses the existing `kayad_prepare_dealer_payout_atomic` and `disburseB2C()` path. No second payout engine was introduced.

### 5. B2C provider conversation identity was not persisted immediately

The payout was marked processing before the provider call, but the provider ConversationID was only saved by the callback. A timeout arriving before the callback could not reliably identify the payout.

Correction: the provider ConversationID is persisted immediately after successful provider acceptance.

### 6. B2C timeout was operationally invisible

The timeout callback previously only logged the payload. It now records the timeout observation in payout metadata while deliberately keeping the payout `processing` because a provider timeout is ambiguous and must not be converted into a false failure.

### 7. Seller payout completion had no dedicated transaction event

A successful B2C payout now emits the dedicated `escrow.payout_completed` communication event with the payout ID as the idempotency identity. Duplicate provider callbacks therefore do not generate duplicate notifications.

### 8. Operations case did not reliably expose refund/payout records

The Operations Center case projection now loads the refund record by escrow and the canonical `dealer_payouts` row so operators can see settlement state and perform the appropriate external operation.

## Static certification

The enhanced escrow live-operation contract is **21/21 PASS**.

Additional gates:

- Payment/Escrow domain: **9/9 PASS**
- Transactions & Money initiative: **23 PASS**
- High-risk boundary sweep: **PASS**
- Financial audit/RLS hardening: **7/7 PASS**
- Domain lifecycle integrity: **PASS**
- Deployment readiness: **PASS**
- Canonical architecture: **PASS**
- Frontend runtime contracts: **PASS**
- Vercel CI contract: **PASS**
- UI surface convergence: **9/9 PASS**
- Changed JS syntax checks: **PASS**
- Escrow state-machine direct checks: **PASS**

## Live staging certification status

**BLOCKED — intentionally not fabricated.**

The execution environment has Node `22.16.0`, while the repository requires Node `>=22.22.2`, and it has no staging Supabase credentials.

Therefore these have NOT been represented as live PASS:

- real PostgreSQL concurrent release/refund execution
- real RLS role matrix
- real audit immutability trigger execution
- real M-Pesa B2C callback execution
- real external refund settlement
- real reconciliation/anomaly execution against staging data
- real provider replay tests
- real end-to-end ownership transfer

## Required Windows staging gate

Run on the Windows KAYAD repository using Node 22.22.2 and disposable staging credentials:

```powershell
npm ci
npm run typecheck
npm run build
npm run validate:escrow-live-operations-scenarios
npm run validate:supabase-migrations
```

Then execute the dedicated staging role matrix and real transaction scenarios from `ESCROW_LIVE_OPERATIONAL_CERTIFICATION_20261002.md`.

## Production safety

No production deployment was performed in this phase.

No authentication, RLS, payment provider configuration, Vercel project configuration, production secrets, or production database was modified.

## Changed operational files

- `backend/services/escrow.service.js`
- `backend/services/mpesaB2C.service.js`
- `backend/controllers/paymentController.js`
- `backend/controllers/escrowController.js`
- `backend/controllers/escrowOperationsController.js`
- `backend/routes/escrowRoutes.js`
- `backend/services/communicationEvents.service.js`
- `src/api/api.exports.ts`
- `src/pages/admin/AdminEscrows.jsx`
- `scripts/validate-escrow-live-operations-scenarios.mjs`
- `scripts/validate-high-risk-boundaries.mjs`
- `supabase/migrations/20261006230000_escrow_live_settlement_completion_hardening.sql`
- `.env.production.example`

## Release rule

This package is a **live-operations hardening foundation**, not a claim of completed live financial certification. The production release gate remains blocked until real staging execution passes the full matrix.
