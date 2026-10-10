# KAYAD — Escrow End-to-End Business Audit & Fix Sweep

Date: 2026-10-02
Baseline: `KAYAD-ESCROW-ONBOARDING-RUNTIME-INTEGRATED-FOUNDATION-20261002.zip`

## Scope

This sweep audited the escrow business as a complete domain rather than only the escrow controller/service:

- custody and funding
- payment linkage
- escrow state machine
- buyer/seller/admin authorization
- auto-release
- release accounting
- seller payout
- disputes and dispute settlement
- refund approval and refund settlement
- ledger/accounting invariants
- payment/car lifecycle synchronization
- idempotency/concurrency
- audit/history
- reconciliation surfaces
- notifications
- RLS/backend ownership
- payout/refund provider boundaries

## Critical findings corrected

### 1. Escrow release was not financially atomic
The escrow status could become `released` before the application-side ledger call completed.

**Fix:** the canonical database escrow transition now posts the seller settlement and commission ledger entries inside the same transaction as the state transition.

### 2. Escrow refund used the wrong accounting consequence
The old application-side refund posting treated a refund as cash leaving the custody asset immediately. That could falsely represent a refund as completed while the `refunds` row was still pending.

**Fix:** escrow refund now reclassifies:

`Escrow Payable (2000) → Refund Payable (2100)`

Actual cash movement is a separate refund-settlement operation.

### 3. Dispute settlement used incorrect ledger accounts
The previous dispute resolution RPC used `1100`/`2100` combinations that did not correctly consume the escrow payable created by the original funding event.

**Fix:** dispute settlement now consumes `2000 Escrow Payable` and routes amounts to:

- `5000 B2C Disbursement Payable` for seller settlement
- `2100 Refund Payable` for buyer refunds
- `4000 Commission Revenue` for platform commission

### 4. Bank-transfer funding lacked a canonical ledger event
The custody verification function changed escrow state to funded but did not create the corresponding financial journal entry.

**Fix:** bank funding now atomically records:

`Bank Account (1200) → Escrow Payable (2000)`

while recording the custody funding reference and release window.

### 5. Seller payout stopped at payable creation
Escrow release created a seller payout payable but the successful B2C payout callback did not create the final cash-side ledger event.

**Fix:** successful dealer payout now records:

`B2C Disbursement Payable (5000) → Cash - M-Pesa (1000)`

with the payout ID as the idempotent external reference.

### 6. Payout transaction ID was polluted with an application idempotency key
The B2C initiation path previously stored the payout idempotency key as `transaction_id` before Safaricom supplied the actual provider transaction.

**Fix:** the canonical provider transaction field remains empty until the provider callback supplies the real transaction identifier.

### 7. Refund completion had no canonical settlement boundary
A refund could be approved and remain pending without a controlled, idempotent operation to reconcile the actual external settlement.

**Fix:** added:

`POST /api/escrow/:id/refund/:refundId/complete`

protected by escrow-admin authorization and idempotency. It requires the external refund reference and explicitly selects the cash account used for settlement.

### 8. Custody/reference replay protection
Funding references and refund provider references are now unique at database level.

## Canonical financial lifecycle

### Purchase funded by M-Pesa

`M-Pesa Cash 1000`
→ `Escrow Payable 2000`
→ buyer/seller workflow

### Bank-transfer escrow

`Bank Account 1200`
→ `Escrow Payable 2000`
→ buyer/seller workflow

### Normal release

`Escrow Payable 2000`
→ `Seller Payout Payable 5000`

and

`Escrow Payable 2000`
→ `Commission Revenue 4000`

Then when B2C succeeds:

`Seller Payout Payable 5000`
→ `M-Pesa Cash 1000`

### Full refund

`Escrow Payable 2000`
→ `Refund Payable 2100`

Then when the external refund is actually settled:

`Refund Payable 2100`
→ `M-Pesa Cash 1000` or `Bank Account 1200`

## Business state coverage

| Business event | Canonical state/control |
|---|---|
| Escrow created | `pending` |
| Bank funding verified | `funded` + custody reference + ledger |
| Vehicle confirmed | `vehicle_confirmed` |
| Delivery confirmed | `delivered` |
| Buyer requests release | admin workflow/audit signal |
| Automatic release | system transition after eligibility window |
| Admin release | atomic release + ledger |
| Dispute opened | `disputed` + dispute workflow |
| Full refund decision | `refunded` + Refund Payable |
| Partial dispute settlement | seller payable + buyer refund payable + commission |
| Seller payout prepared | `dealer_payouts.pending` |
| B2C payout submitted | `processing` |
| B2C payout succeeds | `paid` + final cash ledger |
| B2C payout fails | `failed`, retryable |
| Refund submitted | `processing` |
| Refund externally settled | `completed` + final cash ledger |
| Escrow closed | `closed` terminal state |

## Concurrency/idempotency coverage

- escrow state transitions lock the escrow row
- repeated state actions can converge through idempotency keys
- financial ledger entries are idempotent by external reference + source
- funding references are unique
- refund provider references are unique
- payout state transitions are locked and constrained
- paid payouts cannot be downgraded
- B2C callbacks use the canonical payout record
- dispute resolution has an idempotency key
- refund completion is idempotent

## Areas intentionally preserved

No second escrow service, payment service, ledger, dispute engine, or payout engine was introduced.

Existing canonical components remain authoritative:

- `escrow.service.js`
- `escrowStateMachine.js`
- `kayad_transition_escrow_atomic`
- `kayad_settle_purchase_payment_atomic`
- `ledgerService.js`
- `kayad_post_ledger_entry_atomic`
- `kayad_resolve_dispute_atomic`
- `dealer_payouts`
- `kayad_prepare_dealer_payout_atomic`
- `kayad_mark_dealer_payout_atomic`

The new migration is a convergence/hardening layer over those components.

## Remaining external certification

The following still require the real runtime/staging environment and were **not** claimed as passed here:

- Node >=22.22.2 dependency install
- live Supabase migration execution
- live RLS matrix
- Redis
- Playwright
- real M-Pesa sandbox/provider callbacks
- B2C payout provider certification
- real refund-provider settlement
- complete staging buyer/dealer journey
- production deployment verification

## Static certification

**Escrow business integrity: 20/20 PASS**

Additional existing gates remain green from the current foundation, including high-risk boundaries, payment/escrow domain, financial RLS, passport authorization, transactions/money, and database contract alignment.

## Next phase

The next escrow-specific phase should be **Live Escrow Transaction Certification**:

1. create pending private-seller escrow
2. verify real custody funding
3. verify ledger balances
4. buyer confirmation
5. seller delivery
6. dispute branch
7. normal release branch
8. dealer payout B2C
9. full refund branch
10. refund external settlement
11. duplicate/retry callbacks
12. reconciliation report
13. buyer/dealer notifications
14. final ownership/listing state
15. close escrow

Only after that should escrow be considered release-certified.
