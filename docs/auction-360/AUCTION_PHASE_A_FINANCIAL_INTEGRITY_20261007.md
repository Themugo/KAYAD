# KAYAD Auction Phase A — Financial Integrity Hardening
Date: 7 October 2026
Foundation: KAYAD-AUCTION-360-PHASE1-HARDENED-20261007

## Scope

This phase hardens the financial boundary without introducing a second auction, payment, escrow, or ledger engine.

Canonical target chain:

`KES 1 bid confirmation → bidder commitment → high-value security deposit → M-Pesa callback → atomic bid activation → ledger → auction close → authoritative winner → winner payment → refund/forfeit state → reconciliation → replay/concurrency certification`

## Corrections implemented

### 1. Auction security holds

Added the canonical `auction_security_holds` table for:
- bidder commitment
- high-value deposit
- pending/held/applied/refund-pending/refunded/forfeited/failed/cancelled states
- provider checkout identity
- transaction identity
- M-Pesa receipt
- ledger reference
- linked auction outcome
- policy snapshot

Client writes are denied by RLS; the service-role atomic functions own financial mutation.

### 2. Commitment payment callback convergence

The existing bidder commitment rail used the legacy `transactions` table and direct STK initiation. The production M-Pesa callback path previously only looked for `payments`, which could leave a successful commitment provider callback disconnected from bidder registration.

The canonical payment callback now recognizes `bid_commitment` and `bid_security` transactions and delegates them to the atomic auction security-hold settlement path.

### 3. Atomic commitment settlement

`kayad_settle_auction_security_hold_atomic()` now performs the provider-confirmed state transition for the security hold and, for commitments, bidder registration activation in the same PostgreSQL transaction.

The corresponding refundable liability is posted once to the canonical ledger.

### 4. High-value deposit

The previous bid controller checked for an unrelated generic vehicle escrow record when a bid exceeded KES 5M.

The bid gate now uses the auction-specific security hold with platform-policy values:
- threshold: KES 5,000,000
- deposit: KES 50,000

A canonical high-value deposit initiation endpoint was added under auction registration.

### 5. Nominal KES 1 bid confirmation

The confirmation fee is now platform-policy controlled instead of a hard-coded controller amount.

The atomic bid payment settlement verifies:
- payment type
- bidder identity
- vehicle identity
- exact policy fee
- provider receipt

and posts one idempotent ledger entry to the dedicated auction bid-confirmation revenue account.

### 6. Legacy bid callback convergence

`/api/bids/mpesa/callback` now delegates to the same canonical payment callback processor as `/api/payments/callback`, eliminating a second bid-payment settlement path.

### 7. Commitment application to winning settlement

At auction close, the canonical security reconciliation marks the winning bidder's satisfied commitment as `applied` and moves its liability into the seller payable (direct settlement) or escrow payable (escrow settlement).

The outcome records:
- `commitment_applied_amount`
- `payment_due_amount`
- `security_reconciliation_status`
- `security_reconciled_at`

The winner payment therefore no longer has to infer the amount due from bid history.

### 8. Non-winner refund state

Satisfied security holds for non-winning bidders become `refund_pending` at outcome reconciliation. The ledger liability remains outstanding until the existing governed external refund infrastructure settles it.

No fake external refund success is recorded.

### 9. Winner default / forfeiture

When a winner defaults and re-award is not permitted, the winner's applicable security holds are transitioned through the atomic forfeiture function and the corresponding liability is moved to the dedicated auction security forfeiture revenue account.

### 10. Winner payment authority

Winner payment validation now checks the authoritative auction outcome and `payment_due_amount`, rather than trusting a browser-supplied amount or only the vehicle's public price/winner projection.

Direct winner payment posts a canonical seller payable ledger event exactly once.

### 11. Escrow sequencing correction

A newly closed sale now enters `payment_due` first even when escrow settlement is selected. Escrow creation/funding is a subsequent step after the winner payment/funding requirement is actually satisfied.

This prevents the outcome from entering `escrow_pending_funding` before the winner payment boundary has been completed.

### 12. Field-contract correction in auction settlement

The real Supabase data layer maps database snake_case fields into application camelCase fields. The settlement service/routes contained several stale snake_case reads from mapped records.

The affected winner/settlement reads were corrected so the live service uses the actual application data contract.

## Validation

### Phase A

**24/24 PASS** static financial-integrity contract.

### Existing auction gates

- Phase 7 bidding-room lock: **8/8 PASS**
- Phase 8 settlement/policy: **14/14 PASS**
- Phase 9 fulfilment/exception engine: **21/21 PASS**
- Phase 10 auction certification foundation: **32/32 PASS**
- Auction transport convergence: **5/5 PASS**
- Database contract alignment: **8/8 PASS**
- Domain lifecycle integrity: **PASS**
- Supabase migration preflight: **158/158 unique migration versions PASS**
- Changed backend JavaScript syntax: **PASS**

## Environment-dependent gates intentionally not claimed

This package has not been represented as live financial certification.

Still required on the established Windows Node 22.22.2 + staging infrastructure:

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. reset/apply all Supabase staging migrations
6. real RLS role matrix
7. real M-Pesa sandbox commitment callback
8. real KES 1 bid callback
9. duplicate/replay callback execution
10. amount-mismatch execution
11. concurrent bid execution
12. concurrent auction-close execution
13. winner payment execution
14. commitment refund settlement
15. winner default/forfeiture execution
16. reconciliation/anomaly checks
17. escrow/direct settlement execution
18. final collection/ownership transaction

## Release status

**HARDENED SOURCE FOUNDATION — LIVE FINANCIAL CERTIFICATION PENDING.**

No production deployment was performed by this phase.
