# KAYAD Auction 360 — Remaining Plan
Date: 2026-10-07

Stage 1 of the 16-stage continuation prompt is now source-level complete (see
`P0_P1_SOURCE_CERTIFICATION_20261007.md` and
`AUCTION_360_EXECUTION_LOG_20261007.md`). This document plans Stages 2–16,
which have not been started, in the order the master prompt specifies —
"CONTINUE FROM WHERE YOU ARE", not a restart.

## Before Stage 2 can begin cleanly

1. Apply both new migrations
   (`20261007190000_auction_winner_payment_deadline_lock.sql`,
   `20261007200000_inspection_domain_rls_enable.sql`) to a real
   Postgres/Supabase instance and re-run the full validator suite against it,
   to move their status from SOURCE-LEVEL PASS to live-certified.
2. Run a full root `npm install` + `tsc --noEmit` + `npm run build` in an
   environment matching the repo's declared Node engine (`>=22.22.2`) — this
   sandbox cannot do it (`v22.22.0`).

Neither blocks starting Stage 2 itself (which is a pure code/contract trace,
not a live-infrastructure task), but both should close out before Stage 8
(frontend), where a real build and a real browser matter.

## Stage 2 — API contract convergence (next)

Plan: trace every auction-adjacent contract pair front-to-back —
Marketplace, Vehicle, Auction, Registration, Bid, Payment, Escrow, Refund,
Winner, Ownership, Inspection, Provider, Notifications — starting from the
backend response shape (`toXResponse()`-style serializers, where they exist)
against every frontend type/interface and fetch call that consumes it.
Specific things already known to need checking, carried over as open
questions from this pass's tracing (not yet confirmed as defects):
- Confirm `auction_outcomes`/`auctionSettlement.service.js` response shapes
  (just modified this pass, under Item 8) are unchanged for the fields the
  frontend reads — the fix only changed *how* the status transition happens,
  not the outcome object's shape, but this should be explicitly diffed rather
  than assumed.
- `communication_deliveries` status enum (`queued/sending/sent/delivered/
  read/bounced/failed/dead_letter`) vs. whatever the frontend notification
  center expects — not checked this pass.
- Error envelope consistency for the newly-added 409 paths this pass
  introduced (`AUCTION_TERMS_LOCKED` in `carController.js`, and the two new
  409s in `auctionSettlement.service.js`'s race-loser paths) — confirm the
  frontend has (or needs) specific handling for these new codes rather than
  falling through to a generic error toast.

Converge to the existing canonical contracts; do not introduce a new
adapter/abstraction layer to paper over a mismatch — fix whichever side (or
both) is actually wrong.

## Stage 3 — Marketplace/vehicle/auction convergence

Plan: walk the real journey marketplace → vehicle detail → auction detail →
registration → live bidding → close → winner → payment with one real car
record traced through every layer, confirming `auction.id === car.id` (already
established as a hard invariant and re-confirmed this pass and the prior one)
holds through every intermediate read, and that no page falls back to mock or
placeholder inventory on a slow/failed fetch.

## Stage 4 — Account/session/identity UX

Plan: trace create-account → verify → sign-in → session-restore → profile →
registration → bidding → payment → history, specifically checking: CSRF token
handling, session-expiry/refresh behavior, logout (does it clear everything
it should), duplicate-account prevention, and — the specific thing the prompt
calls out — that the UI never shows "signed in" state before the backend has
actually confirmed it.

## Stage 5 — Inspection/provider operations

Plan: much of the access-control half of this is already certified (Item 1 of
Stage 1, now backed by a working RLS layer per this pass's fix). Remaining:
trace the operational workflow itself — assignment, completion, evidence
capture, notification-on-completion, and failure/retry handling — which
Stage 1 didn't cover (Stage 1 was authorization/access-control only).

## Stage 6 — Escrow/purchase/fulfilment

Plan: this pass hardened the two specific races found in auction settlement
and RLS; Stage 6 asks for a full no-double-transition audit end-to-end
(auction close → payment due → payment → escrow → fulfilment → buyer
confirmation → release → seller payout → ownership completion). Much of this
chain's individual links are already certified PASS (Items 3, 5, 6, 8 of
Stage 1). Stage 6's job is to confirm the full chain holds together with no
gap at the seams between links, not to re-prove each link alone.

## Stage 7 — Admin/operations

Plan: audit every privileged admin workflow (auction creation/publishing,
reserve config, closing, winner handling, payment monitoring, escrow ops,
refunds, forfeiture, reconciliation, ownership ops, inspection ops) for
server-side authorization — no hidden-frontend-control reliance. The
`isStaff`/admin-bypass pattern already established and used in this pass's
`carController.js` fix is the template to check every other admin surface
against.

## Stage 8 — Frontend auction experience (gated)

Explicitly gated per the master prompt until backend/source P0/P1/P2
integrity is clean — which, at the source level, it now is. Still blocked on
the infrastructure items above (real build/typecheck) before starting.

## Stages 9–14 — Desktop UX, mobile UX, typography, iconography,
## accessibility, performance

Not started. Each depends on Stage 8 landing first (there's no frontend
auction-experience baseline yet to apply viewport/typography/a11y/performance
passes to).

## Stages 15–16 — Test/regression gate, environment-dependent certification

Ongoing discipline already being followed throughout (every fix this pass and
the prior one ran its narrow test, the full suite, and relevant validators
before being considered done) rather than a discrete end-of-project step —
will continue to apply at every future stage.

## Summary of what's genuinely left

Source-level backend work (Stages 1–7) is either done (Stage 1) or scoped and
ready to start in order (Stages 2–7). All frontend/UX work (Stages 8–14) is
entirely unstarted and gated behind Stages 2–7 landing, per the master
prompt's own explicit ordering. No part of this plan proposes restarting,
redesigning, or duplicating anything already built.
