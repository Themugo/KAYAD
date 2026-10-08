# KAYAD Auction 360 — Remaining Plan
Date: 2026-10-07

Stage 1 of the 16-stage continuation prompt is source-level complete (see
`P0_P1_SOURCE_CERTIFICATION_20261007.md` and
`AUCTION_360_EXECUTION_LOG_20261007.md`). Stage 2 (API contract convergence)
is now also complete (see `AUCTION_API_CONTRACT_MATRIX_20261007.md` and the
Stage 2 section appended to the execution log) — explicitly classified
**STAGE 2 — API CONTRACT CONVERGENCE: COMPLETE** per the master prompt's own
requirement before Stage 3 may begin. This document plans Stages 3–16, in the
order the master prompt specifies — "CONTINUE FROM WHERE YOU ARE", not a
restart.

## Before Stage 8 (frontend) can begin cleanly — unchanged, still open

1. Apply both Stage-1 migrations
   (`20261007190000_auction_winner_payment_deadline_lock.sql`,
   `20261007200000_inspection_domain_rls_enable.sql`) to a real
   Postgres/Supabase instance and re-run the full validator suite against it,
   to move their status from SOURCE-LEVEL PASS to live-certified.
2. Run a full root `npm install` + `tsc --noEmit` + `npm run build` in an
   environment matching the repo's declared Node engine (`>=22.22.2`) — this
   sandbox still cannot do it (`v22.22.0`), re-confirmed during Stage 2. This
   is also now the explicit blocker for closing the one Stage-2 deferred
   finding below (the vehicle `rejected`-status mapping).

Neither blocks Stage 3 itself (a pure code/journey trace, not a live-
infrastructure task), but both must close out before Stage 8, where a real
build and a real browser matter.

## Carried forward from Stage 2 — not yet fixed, with reasoning recorded

These are real, confirmed findings from Stage 2's trace that were
intentionally not fixed this pass (full reasoning in
`AUCTION_API_CONTRACT_MATRIX_20261007.md`'s matrix rows and "Summary
counts"). They should be picked up explicitly, not silently forgotten:

1. **Vehicle `rejected`-status mapping** (`vehicleApi.ts::mapBackendCarToVehicle`
   collapses backend `rejected` to frontend `'active'`, 33 consumption
   sites) — blocked on a matching-Node-version environment for `tsc
   --noEmit` verification before touching it.
2. **`paymentController.js::mpesaCallback`'s hardcoded-500 catch block** — a
   real defect (a 409 "already received" conflict reaches Safaricom's
   callback log as a generic 500), deliberately left out of Stage 2's scope
   because it is a server-to-server webhook contract, not a frontend
   contract, and warrants its own dedicated, carefully-scoped payment-webhook
   hardening pass rather than a drive-by fix under a contract-convergence
   prompt.
3. **`completeEscrowRefund`'s untyped RPC passthrough** — no frontend
   consumer exists yet; revisit once one is built.
4. **Legacy-vs-canonical inspection system split** — architectural technical
   debt (two non-interoperable backend implementations), explicitly flagged
   as out of scope for any convergence pass; needs its own dedicated
   architecture stage, not a slot in Stages 3–16 as currently numbered.

## Stage 3 — Marketplace/vehicle/auction convergence (next)

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

Source-level backend/contract work (Stages 1–7) is either done (Stage 1:
source-level trust-boundary sweep; Stage 2: API contract convergence) or
scoped and ready to start in order (Stages 3–7). The 4 items carried forward
from Stage 2 above are explicit, recorded exceptions, not silent gaps. All
frontend/UX work (Stages 8–14) is entirely unstarted and gated behind Stages
3–7 landing, per the master prompt's own explicit ordering. No part of this
plan proposes restarting, redesigning, or duplicating anything already built.
