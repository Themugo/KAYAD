# KAYAD Wave 2 — Transaction & Financial Invariant Hardening

Date: 2026-09-18
Foundation: KAYAD Wave 1 production-hardened tree

## Scope

1. Listing / entitlement atomicity
2. Media failure recovery
3. Auction → payment → escrow → ledger invariants
4. Inspection → report → payout invariants
5. Dispute → financial consequence invariants

## Implemented

### 8. Listing / entitlement atomicity
- Added `listing_entitlement_reservations` as a durable idempotency/audit boundary.
- Added `kayad_create_dealer_listing_atomic()`.
- Dealer listing capacity is checked while the dealer row/subscription is locked with a transaction-scoped advisory lock.
- Listing insertion and dealer listing-count consumption commit together or roll back together.
- Backend dealer listing creation now calls the canonical RPC and accepts an `Idempotency-Key`.

### 9. Media failure recovery
- Added `media_upload_jobs` with persistent retry state and dead-letter state.
- Added atomic job registration, failure recording and completion RPCs.
- Listing media upload failures are persisted rather than leaving only an in-memory retry loop.
- Successful Cloudinary uploads reconcile the listing image and recovery job together.

### 10. Auction → payment → escrow → ledger
- Bid-payment confirmation now records a canonical ledger posting in the same database transaction as payment/bid confirmation.
- Added durable `financial_workflow_events` for cross-domain idempotency/audit correlation.
- Added structural escrow amount/allocation checks.

### 11. Inspection → report → payout
- Inspection settlement payout now refuses to pay a settlement when its recorded booking set has missing inspection reports.
- Payout remains atomic with the canonical ledger posting and settlement state transition.
- Added inspection score and settlement arithmetic constraints.

### 12. Dispute → financial consequence
- Dispute resolution now posts the corresponding buyer refund, seller settlement and platform commission ledger consequences inside the same database transaction as the escrow/payment state change.
- Resolution remains idempotent through the existing dispute action key and canonical workflow-event correlation.

## Certification state

Static Wave 2 invariant validator: PASS.

Supabase migration preflight: PASS — 90 migration files, 90 unique versions.

JavaScript syntax checks for the changed backend files: PASS.

A full release gate was **not** claimed in the container because the Wave 1 archive intentionally has no `node_modules`; the container also runs Node 22.16.0 while the repository release contract requires Node >=22.22.2. The authoritative workstation certification must therefore run `npm ci`, `npm test`, `npm run build`, and `npm run validate:release` on the user's Windows Node 22.20/22.22+ environment after the Wave 2 tree is installed.

The migration has not been applied to the user's Supabase production project from this environment.
