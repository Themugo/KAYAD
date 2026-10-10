# KAYAD AUCTION 360 — Stage 8: Customer Auction Execution Report
**Date:** 2026-10-08

## What was inspected

The full customer auction/marketplace journey (discovery → detail →
registration → bidding → realtime → countdown → winner/loser → payment
→ optional escrow → fulfilment → history), the public marketplace
trust-signal architecture (AUCTION/ESCROW/INSPECTION badges), the
escrow-capability data model and admin configuration surface, mobile
badge responsiveness, accessibility, and the frontend security boundary.
Full narrative in `CUSTOMER_AUCTION_EXPERIENCE_AUDIT_20261008.md`;
step-by-step table in `CUSTOMER_AUCTION_JOURNEY_MATRIX_20261008.md`;
badge-combination table in `MARKETPLACE_TRUST_SIGNAL_MATRIX_20261008.md`;
escrow architecture detail in `ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md`.

## What was changed

**Backend (2 files):**
- `backend/controllers/carController.js` — `escrowEnabled` added to the
  public `GET /api/cars` list projection (both the `$text`-search and
  plain-query branches). It already existed on the model; it was never
  selected into this response.
- `backend/controllers/auctionController.js` — two fixes:
  1. `toAuctionResponse()`'s nested `car` object now also carries
     `escrowEnabled`/`inspectionStatus`, so the auction detail response
     agrees with the marketplace card.
  2. `getActiveAuctions()`'s filter now excludes `status: "rejected"`.
- `backend/controllers/bidController.js` — `placeBid()` now rejects
  (409) a bid on any `car.status === "rejected"` listing, before the
  existing `auctionStatus`/time checks.

**Frontend (6 files):**
- `src/services/vehicleApi.ts` — `BackendCar`/`mapBackendCarToVehicle`
  now read `car.escrowEnabled` into `vehicle.escrowEligible`, and pass
  through the raw auction lifecycle state as `vehicle.auctionLifecycle`.
- `src/types/index.ts` — added `Vehicle.auctionLifecycle`.
- `src/utils/escrow.ts` — `isEscrowApplicable()` now requires
  `vehicle.escrowEligible` as an absolute precondition in every branch
  (fixes a real fabricated-badge defect — see audit Finding 2).
- `src/components/VehicleCard.tsx` — the image-overlay badge is now
  AUCTION (lifecycle-aware) + ESCROW + INSPECTED (max 3, small icon +
  label), instead of a lone auction-only badge that showed "LIVE"
  unconditionally for any auction-capable vehicle regardless of real
  lifecycle state.
- `src/components/detail/VehicleDetailPage.tsx` — the four "Interactive
  Market Status Badges" (Escrow/Auction-or-Fixed/Inspection/Availability)
  are now gated on real vehicle state instead of rendering
  unconditionally for every vehicle.
- `src/components/auction/AuctionWowExperience.tsx` /
  `src/pages/AuctionLivePage.jsx` — added an Escrow chip to the existing
  auction-detail gallery chip row, sourced from the same backend field.

**Tests (2 new backend files, 3 updated frontend files):**
- `backend/tests/auction/placeBidRejectedListing.test.js` (new, 2 tests)
- `backend/tests/auction/getActiveAuctionsRejectedExclusion.test.js` (new, 2 tests)
- `src/__tests__/utils/escrowOverride.test.ts` (1 case corrected, 2 cases added)
- `src/__tests__/features/escrowRulesConfig.test.ts` (1 case corrected, 1 case added)
- `src/__tests__/components/VehicleCard.test.tsx` (2 cases rewritten to
  match the now-intentional visible escrow/inspection badges, 1 new case)
- `src/__tests__/fixtures/mockVehicles.ts` (added `auctionLifecycle: 'live'`
  alongside existing `isAuction: true` fixtures)

## Real defects found and fixed (4)

1. A listing rejected mid-auction kept appearing in the active-auctions
   feed and kept accepting real bids (admin reject never touched
   `auctionStatus`/`allowBid`). **Fixed** with two canonical gates.
2. The ESCROW trust badge could be fabricated for every dealer vehicle by
   a legitimate, in-app admin action (setting the global "Dealer
   requirement" policy to "Mandatory"), independent of the vehicle's real
   backend `escrow_enabled` state — because (a) that state was never
   wired into the frontend mapper at all, and (b) the badge logic's
   "mandatory" branch ignored eligibility entirely. **Fixed** by wiring
   the real field through and hard-gating the badge logic on it.
3. `VehicleDetailPage.tsx`'s Escrow/Inspection/Availability status badges
   rendered unconditionally for every vehicle regardless of real state.
   **Fixed** by gating each on the real field it claims to represent.
4. (Sub-finding of #1) `VehicleCard.tsx`'s auction badge showed "LIVE"
   (or a countdown) for any auction-capable vehicle regardless of actual
   lifecycle state — a scheduled or already-ended auction on the general
   marketplace list would still render as "LIVE". **Fixed** by keying
   the badge off the real lifecycle state (`draft`/`live`/`ended`)
   instead of the capability flag.

`vehicleApi.ts`'s long-carried-forward `rejected → active` status
mapping was investigated per the master prompt's explicit instruction
and found to have no remaining customer-exposure path once defects #1's
two gates are in place (every surface that could serve a customer a
`rejected` car's data either excludes it or 404s it) — **left
unchanged**, documented as resolved-at-the-source rather than modified
speculatively.

## Regression tests

6 test files touched (2 new, 4 updated), 8 new/corrected test cases
total. Verified via the standard discipline:
- Backend: new tests run in isolation (9/9 pass), then the full suite
  (47/47 suites, 620/620 tests).
- Frontend escrow logic: full revert of `isEscrowApplicable()` to its
  pre-fix body → 3/17 tests failed exactly as predicted (the 2 new +
  1 corrected cases) → restored → 17/17 pass.
- `VehicleCard.test.tsx`: updated assertions run in isolation (14/14
  pass), then the full frontend suite.

## Backend test count

**47/47 suites, 620/620 tests** (up from Stage 7's 45/45, 616/616 — +2
suites, +4 tests).

## Frontend test count

**340 passed / 11 pre-existing unrelated failed / 1 skipped / 352 total**
(up from the Stage 3–7 documented baseline of 336/11/1/348 — net +4
passing tests; the 11 failures are the same pre-existing,
Stage-8-unrelated `Navbar.test.jsx` and `VehicleMarketplace.test.tsx`
mobile-hero-carousel failures present before this stage; confirmed by
name-for-name comparison against the Stage 7 baseline).

## Typecheck

`npx tsc --noEmit`: clean, 0 errors (one real pre-existing type error
surfaced and fixed in passing: `VehicleCard.tsx` used a `Badge`
`variant="emerald"` not in that component's variant union when I first
drafted the fix — corrected to the component's own `escrow`/`inspected`/
`live` semantic variants, which already existed precisely for this
purpose).

## Build

`npm run build`: clean, exit 0.

## Validators

16 relevant validators run, all PASS: `validate:marketplace-core` (12/12),
`validate:inspection-marketplace` (37/37), `validate:auction-transport-convergence`
(5/5), `validate:frontend-runtime-contracts` (PASS), `validate:registration-role-matrix`
(32/32), `validate:database-contract-alignment` (8/8), `validate:domain-lifecycle-integrity`
(PASS), `validate:inspection-domain-rls-enablement` (PASS), `validate:payment-gateway-lifecycle`
(13/13), `validate:payment-escrow-domain` (9/9), `validate:high-risk-boundaries`
(PASS), `validate:escrow-live-operations-scenarios` (21/21 source-level,
staging correctly BLOCKED), `validate:pwa-mobile` (13/13),
`validate:auction-phase-a-financial-integrity` (24/24),
`validate:auction-domain-integrity` (24/24), `validate:auction-bid-surface`
(6/6), `validate:auction-360-hardening-20261007` (28/28).

## Browser/device tests actually executed

**None — ENVIRONMENT-BLOCKED.** No browser/device execution is available
in this sandbox; the six listed mobile breakpoints (320/360/375/390/412/430px)
were reasoned about from the CSS/layout primitives actually used (the
same `flex flex-wrap` + `max-w-[78%]` container the pre-existing
single-badge overlay already relied on), not executed in a real browser
or device. Not claimed as certified.

## Badge combinations verified

All 8 combinations (NONE / AUCTION / ESCROW / INSPECTION / AUCTION+ESCROW
/ AUCTION+INSPECTION / ESCROW+INSPECTION / AUCTION+ESCROW+INSPECTION)
reasoned through and documented in
`MARKETPLACE_TRUST_SIGNAL_MATRIX_20261008.md`, each tied to its exact
authoritative source field. Directly exercised by automated tests: the
escrow-present/escrow-absent pair (new `VehicleCard.test.tsx` case) and
the inspected/not-inspected pair (updated overlay-content test); the
remaining combinations are reasoned from the same three independent
boolean conditions, each already individually tested.

## Escrow capability/configuration result

Escrow capability is real, vehicle-traceable, and role-enforced
server-side (`cars.escrow_enabled`); the platform-level custody-account
admin configuration is already built and unchanged. No per-seller/
per-vehicle admin grant mechanism exists — documented as an intentional
architecture gap, not built this stage (building one would be inventing
new business rules/architecture, explicitly out of scope). Escrow
remains fully optional and launch-disabled-capable; `liveMode` remains
`false` by default. Full detail in
`ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md`.

## Environment-blocked items

Live Postgres/Supabase/Redis/M-Pesa concurrency execution, staging
certification, and real browser/device execution — unchanged from every
prior stage; no reachable staging infrastructure or device/browser
runtime from this sandbox.

## Carry-forward items

- `vehicle.inspection` (rich per-system-score object) declared but never
  populated by the mapper — pre-existing, unrelated to the three
  required badges.
- `VehicleDetailPage.tsx`'s unconditional "Clean Title" image badge —
  not one of the three required signals; flagged, not touched.
- `escrowOverride` / `users.escrow_approved` / `escrow_forced` — inert
  scaffolding, no write path anywhere; kept as-is.
- `authController.js`'s `bankAccount` profile field has no backing
  migration column — appears dead; flagged for a future stage.
- Admin-grantable per-seller/per-vehicle escrow eligibility — documented
  as the deferred future-activation path.

## Whether a new ZIP is required

**Yes** — source files changed (3 backend controllers, 6 frontend
files, 2 new + 4 updated test files).
