# KAYAD Auction Phase 5 — Bidder Registration & Eligibility

## Canonical flow

`Published Auction → Registration → Terms Acceptance → Eligibility Evaluation → Commitment (if configured) → Provider Confirmation → ACTIVE Bidder Registration → Bid Authorization → Live Bidding`

## Implemented

- Auction-specific `auction_registrations` domain.
- One registration per bidder per auction.
- Explicit lifecycle states: pending eligibility, pending commitment, active, suspended, withdrawn, disqualified, expired.
- Terms version and acceptance captured on registration.
- Eligibility snapshot captured server-side from the published auction requirements and bidder account state.
- Deterministic bidder pass/number per auction and bidder.
- Idempotent registration creation through unique `(auction_id, bidder_id)` plus optional idempotency key.
- Commitment transaction linked to the registration.
- Existing M-Pesa callback converges into registration activation after provider-confirmed success.
- Commitment failure returns the registration to `pending_commitment`.
- `placeBid` now requires an active, eligible auction registration and satisfied commitment when configured.
- Browser live-auction UI no longer presents the contradictory legacy 5% commitment modal.
- Live room presents registration/commitment gating before the bid control.
- Registration is server-owned; Supabase clients cannot forge registration state through direct INSERT.
- Existing atomic bidding engine remains canonical; no second bid engine was introduced.

## Important economic boundary

A commitment payment destination must be explicitly configured in the published auction setup (`commitment.recipientAccount`). The implementation fails closed when it is absent. No bidder funds are silently redirected to the KAYAD master paybill.

For percentage commitments, the registration commitment is calculated from the auction starting bid at registration time. If the commercial/legal model requires a different base, that must be made an explicit auction configuration rather than inferred at runtime.

## Static certification

- Registration migration contract: PASS
- Registration service contract: PASS
- Registration routes: PASS
- Bid authorization gate: PASS
- Commitment/payment convergence: PASS
- v1 route mount: PASS
- Backend JavaScript syntax checks: PASS
- Legacy 5% live-room commitment modal: REMOVED

## Environment limitation

Full `npm run typecheck`, browser journeys, Supabase migration execution, real M-Pesa callbacks, Redis/runtime certification, and staging RLS tests were not claimed here because the sandbox does not contain the project's installed dependencies or live staging credentials.
