# Stage 5F.6 — Auction, Inspection, Purchase and Escrow Flow

## Intended convergence path

1. **Discover:** buyer opens the existing marketplace or canonical auction discovery surface.
2. **Watch/register/bid:** use the existing auction details/live room, registration rules and canonical server-side bid service. The dashboard only summarizes records returned by the existing `fetchMyBids()` endpoint.
3. **Auction result:** the auction backend remains authoritative for closing, winner binding and required payment. The dashboard does not infer a win or create a purchase record.
4. **Inspection:** buyer uses the existing inspection account workspace and `inspectionApi.ts`. The existing canonical request path is `/api/inspections/order`; buyer orders are read through `/api/inspections/my`. Supported fields and statuses remain those defined by the existing backend contract.
5. **Purchase/escrow:** buyer opens the existing participant-scoped `ParticipantEscrowDesk`, which uses `getMyEscrowOverview()` and the existing allowed-action list. The dashboard does not issue payment or release calls of its own.
6. **Fulfilment/settlement:** backend escrow, ledger and ownership state remain authoritative. A requested action is not presented as completed settlement unless the canonical API confirms it.

## Stage 5F.6 changes

- Added an actual buyer bid summary using the existing `/api/bids/my` service client.
- Added navigation into existing auction, inspection, marketplace and messaging destinations.
- Added an anchor to the existing participant escrow workspace for purchase/escrow quick actions.
- Retained existing inspection and escrow components in the buyer account workspace.

## Runtime evidence still required

- Browser journey from a real staging auction to registration and eligible bid placement.
- Backend-confirmed winning result and winner/payment handoff.
- Inspection request creation, ownership enforcement, status and report visibility.
- Buyer access to own escrow only; denial for another buyer's escrow ID.
- Duplicate request/idempotency behavior and final ledger/settlement state.
- Any provider or payment callback behavior using approved sandbox/staging credentials.

No live money movement was performed during this stage.
