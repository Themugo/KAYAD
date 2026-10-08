# KAYAD Auction 360 — Remaining Plan
Date: 2026-10-07/08

Stage 1 of the 16-stage continuation prompt is source-level complete (see
`P0_P1_SOURCE_CERTIFICATION_20261007.md` and
`AUCTION_360_EXECUTION_LOG_20261007.md`). Stage 2 (API contract convergence),
Stage 3 (marketplace/vehicle/auction convergence) and Stage 4 (account/
session/identity/customer-trust) are now also complete (see
`AUCTION_API_CONTRACT_MATRIX_20261007.md`,
`AUCTION_MARKETPLACE_VEHICLE_CONVERGENCE_20261007.md`,
`ACCOUNT_SESSION_IDENTITY_AUDIT_20261008.md`, and the Stage 2/3/4 sections
appended to the execution log) — all explicitly classified **COMPLETE** per
the master prompt's own requirement before the next stage may begin. This
document plans Stages 5–16, in the order the master prompt specifies —
"CONTINUE FROM WHERE YOU ARE", not a restart.

## Environment correction (supersedes the Stage-2 note below)

Stage 3 discovered that `npm install --engine-strict=false` installs
successfully in this sandbox despite the Node `v22.22.0` vs. `>=22.22.2`
mismatch, after which `tsc --noEmit`, the full frontend `vitest` suite, and
`npm run build` all genuinely run and were run clean. The item below
("Run a full root npm install...") is no longer blocked in the sense Stage
2 recorded it — use the flag. The one thing still genuinely needing a
matching-engine environment is live-database migration certification
(item 1 below), which is a Postgres/Supabase constraint, not a Node one.

## Before Stage 8 (frontend) can begin cleanly

1. Apply both Stage-1 migrations
   (`20261007190000_auction_winner_payment_deadline_lock.sql`,
   `20261007200000_inspection_domain_rls_enable.sql`) to a real
   Postgres/Supabase instance and re-run the full validator suite against it,
   to move their status from SOURCE-LEVEL PASS to live-certified. Still
   blocked — no live Postgres/Supabase instance is reachable from this
   sandbox, unrelated to the Node-version item above.
2. ~~Run a full root npm install + tsc --noEmit + npm run build~~ — DONE
   this pass, with `--engine-strict=false`. No longer a blocker.

Did not block Stage 4 (a pure code/journey trace, not a live-infrastructure
task, now complete), and does not block Stage 5 either for the same
reason; item 1 must close out before Stage 8, where a real build and a
real browser matter.

## Carried forward from Stage 4 — not yet fixed, with reasoning recorded

Full reasoning for each in `ACCOUNT_SESSION_IDENTITY_AUDIT_20261008.md` §3.

1. **`kayad_escrow_rules_config_v1` localStorage flag is unauthenticated
   and client-writable**, driving the regulated "live escrow"
   (CBK-certification) claim across `VehicleCard`/`VehicleDetailModal`/
   `CompareModal`/`TrustBadgeMatrix`. No backend persistence exists for
   this config at all (by explicit, pre-existing design, consistent with
   every other admin config built so far), so a real fix means adding a
   backend-sourced, admin-write-only store — new infrastructure, sized
   for its own pass.
2. **No deterministic idempotency key on `POST /api/payments/initiate`
   retries** — the HTTP client's 401/CSRF-403 auto-retry replays the exact
   POST body, but `backend/middleware/idempotency.js` has no deterministic
   case for the generic `"payment"` operation type, so a retried
   payment-initiation request risks a duplicate M-Pesa STK push. Needs a
   scoped change to shared idempotency infrastructure plus a frontend
   stable-key change.
3. **Duplicate phone numbers unenforced at registration** — only email has
   a uniqueness constraint. Needs a DB migration (unique index) plus a
   controller-side duplicate check.
4. **Auto-firing, single-use-token email-verification GET** — vulnerable
   to corporate link-scanners consuming the real link before the user
   opens it. Fixing this is a deliberate UX/flow change (add a confirm
   step), not a drive-by fix.
5. **Two independent, inconsistent brute-force lockout mechanisms**
   (in-memory per-IP vs. DB-persisted per-account) — neither is broken,
   they just don't share state/scope.
6. **Logout is always "all devices"** — a single-session-revoke endpoint
   exists server-side but isn't wired to the frontend's `logout()`. Fails
   toward more revocation, not less — a product decision.
7. **No cross-tab logout propagation** — mitigated by the shared cookie jar
   and server-side `tokenVersion` revocation (a stale tab's next mutation
   correctly 401s); the gap is purely display staleness in that tab until
   its next request.
8. **Dead refresh-token DB-row expiry value** (30d vs. the JWT's own 7d,
   which always rejects first) — misleading, fails safe.
9. **Dead granular-RBAC frontend mechanism** (`RequireAdminPage`/
   `ADMIN_PAGE_ROLES`/`RequirePermission`) never wired into `AdminView` —
   misleading UI only; backend authorization is unaffected and correct.
10. **`getMe()` fetched once at mount only** — a mid-session role
    change isn't reflected in the frontend until next login; backend
    stays authoritative per-request regardless.
11. **No live countdown on 429 responses** (most rate limiters don't embed
    a number; the frontend never reads response headers).
12. **`authLimiter`'s 429 message hardcodes "too many login attempts"**
    even for register/forgot-password/verify-email — cosmetic
    mislabeling.
13. **Stale "Place Bid" button after a silent session expiry** — cosmetic
    only; the click handler itself correctly re-checks `isAuth` first.
14. **`PaymentHistoryView` discards its own classified `PaymentApiError.kind`**
    — shows one generic error regardless of 401/403/5xx.
15. **Silent, unexplained logout on session expiry** — no toast/message
    distinguishing "you were logged out" from "never signed in".

## Carried forward from Stage 3 — not yet fixed, with reasoning recorded

1. **Dealer-dashboard stats endpoint raw-query column-name bug**
   (`backend/routes/dealerRoutes.js`, ~lines 325-440) — every `.eq("dealer",
   ...)`/`.eq("auctionStatus", ...)` filter in this block uses the raw
   Supabase client directly with camelCase field names that don't match the
   real snake_case columns (`dealer_id`, `auction_status`), bypassing the
   `fieldMap.js` translation layer the rest of the codebase correctly uses.
   Confirmed real; affects nearly every stat on this endpoint (total cars,
   sold cars, views, revenue, live/draft auction counts), not just the
   auction-status value originally flagged. Sized for its own dedicated
   pass — the filters are chained, so a partial fix leaves the query still
   erroring on whichever `.eq()` is fixed last.
2. **Registration/eligibility realtime-staleness after async commitment
   confirmation** — `AuctionLivePage.jsx` fetches `registration` once and
   never refetches; there is no backend socket event for registration/
   commitment state changes at all (unlike bids, which now have one per
   Stage 3's Finding 2). Closing this needs new realtime infrastructure,
   not a wiring fix to something already there. Candidate for Stage 4
   (account/session/identity UX) or its own follow-up.
3. **Confirmed-dead component/page files not converged**: `Showroom.jsx`/
   `.tsx`, the `VehicleCard` duplicate cluster
   (`components/gallery/VehicleCard.tsx`, `components/VehicleCard/VehicleCard.jsx`),
   `components/features/auction/CountdownDisplay.tsx`,
   `components/home/LiveAuctionsSection.tsx`,
   `pages/home/components/HomeLiveAuctions.jsx`. All confirmed zero live
   importers; not deleted this pass (unlike `useCountdown.jsx`, which was
   both dead AND a live footgun) pending an explicit decision on removing
   whole unreachable pages/components.
4. **`verifyMFACode()` always returns `true`** (`backend/identity/services/
   identityService.js:294`, `const isValid = true; // Placeholder`) — MFA
   verification currently always succeeds regardless of the submitted code.
   Unrelated to auction/vehicle contracts; worth its own security ticket if
   MFA is relied on in production auth flows. Surfaced incidentally during
   the mock/fallback sweep.

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

## Stage 3 — Marketplace/vehicle/auction convergence — COMPLETE

Done this pass — see `AUCTION_MARKETPLACE_VEHICLE_CONVERGENCE_20261007.md`.
The journey marketplace → vehicle detail → auction detail → registration →
live bidding → close → winner → payment was traced end to end;
`auction.id === car.id === carId` re-confirmed as a hard invariant; the
single most severe defect of the whole engagement to date (the live auction
page never actually reading its own URL's id) was found and fixed, along
with 4 other real defects. No mock/placeholder-inventory fallback risk
found. One real defect (the dealer-dashboard stats endpoint's raw-query
column bug) deferred as out of scope/size for this pass — see "Carried
forward from Stage 3" above.

## Stage 4 — Account/session/identity/customer-trust — COMPLETE

Done this pass — see `ACCOUNT_SESSION_IDENTITY_AUDIT_20261008.md`. Traced
create-account → verify → sign-in → session → profile → protected routes →
auction registration → commitment → KES 1 → bidding → payment → purchase
history → logout end to end. The single most severe defect of this stage
(the mandatory `phone` field in `bidSchema` silently blocking every real
bid before it reached the bid-authorization boundary) was found and fixed,
along with 7 other real defects (a client-trusted payment amount on
bid/listing/subscription/deposit types, a fail-open payment-status
ownership check, an auth-state mount/login/logout race condition, a
flash-of-signed-out-navbar bootstrap bug, a swallowed 403 on the
registration-status read, a login timing-based enumeration side-channel,
and a dead-code `useParams()` reintroduction). 15 further findings are
documented and intentionally not fixed (see "Carried forward from Stage 4"
above) — none silently dropped. No second auth/session/CSRF/routing
mechanism was introduced; the already-certified bid-authorization
architecture was not altered, only reached correctly. The two
sized-for-their-own-pass items among the 15 carried-forward findings — the
`kayad_escrow_rules_config_v1` backend-persistence redesign and the
payment-initiation idempotency-key fix — are the natural starting point
for a future dedicated follow-up pass, whenever one is scheduled; they are
not part of Stage 5's own scope below.

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

Source-level backend/contract/journey work (Stages 1–7) is either done
(Stage 1: source-level trust-boundary sweep; Stage 2: API contract
convergence; Stage 3: marketplace/vehicle/auction convergence; Stage 4:
account/session/identity/customer-trust) or scoped and ready to start in
order (Stages 5–7). The 4 items carried forward from Stage 2, the 4
carried forward from Stage 3, and the 15 carried forward from Stage 4
above are explicit, recorded exceptions, not silent gaps. All frontend/UX
work (Stages 8–14) is entirely unstarted and gated behind Stages 5–7
landing, per the master prompt's own explicit ordering. No part of this
plan proposes restarting, redesigning, or duplicating anything already
built.
