# KAYAD AUCTION 360 — Stage 10: Auction UX Execution Report
**Date:** 2026-10-08

## What was inspected

The full customer-facing visual/UX surface of the marketplace and auction
experience: the main paginated inventory grid card, the Stage 8
`VehicleCard.tsx` component, the vehicle detail page's trust badges, the
live auction room, bid interaction state, countdown, winner settlement,
payment journey, optional escrow signal, inspection surfaces, mobile/
responsive architecture, `prefers-reduced-motion` handling, typography/
design-token sources, and icon usage sitewide. Full narrative in
`PREMIUM_AUCTION_UX_AUDIT_20261008.md`; card/badge deep-dive in
`MARKETPLACE_VISUAL_HIERARCHY_AUDIT_20261008.md`; step-by-step journey
table in `AUCTION_CUSTOMER_EXPERIENCE_MATRIX_20261008.md`.

Stages 1–9's canonical business logic was re-confirmed intact and was not
reopened: `escrow_capability_status`, `computeEffectiveEscrowEnabled()`,
auction lifecycle computation, and payment authority were read, never
modified, by every fix below.

## What was changed

**Frontend only (4 source files + 1 test file; 0 backend files):**

- `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx` —
  the real defect of this stage. The main inventory grid's card (a fourth,
  hand-rolled card distinct from `VehicleCard.tsx` — see the visual-
  hierarchy audit's "Card inventory" finding) computed its auction label
  from a single mutually-exclusive "ribbon" keyed off `v.isAuction` (a
  capability flag), not `v.auctionLifecycle` (the actual lifecycle state),
  and had no escrow signal at all. This meant a **scheduled or already-
  ended auction on the real customer-facing grid could show "🔴 Live
  Auction"** — reintroducing, on an undiscovered fourth card, exactly the
  defect Stage 8 believed it had fixed everywhere. Fixed by replacing the
  ribbon with the same three independent, canonical signals already used
  elsewhere (`auctionLifecycle === 'live'/'draft'/'ended'`,
  `isEscrowApplicable()` imported — not reimplemented — and
  `inspectionPassed`), applied consistently across 5 call sites on this
  file: the badge row, the "Current bid" banner, the category eyebrow
  label, and both homepage hero-slide eyebrow labels/narration.
- `src/components/detail/VehicleDetailPage.tsx` — two trust-badge fixes:
  1. Removed the unconditional, fabricated "Clean Title" badge (no
     backing field existed anywhere in the type, mapper, or backend; no
     authoritative verification workflow exists to make it truthful).
  2. Gated the previously-unconditional "Duty Paid" chip on a real,
     already-existing backend field (`cars.duty_status`, written only by
     the NTSA admin verification workflow) that was already selected by
     the backend but never wired to the frontend.
- `src/services/vehicleApi.ts` — added `duty_status`/`dutyStatus` to the
  `BackendCar` interface and computed `dutyPaid` in
  `mapBackendCarToVehicle()`, to support the "Duty Paid" fix above.
- `src/types/index.ts` — added `Vehicle.dutyPaid?: boolean`.
- `src/__tests__/components/VehicleMarketplace.test.tsx` — one new test
  asserting the grid card shows lifecycle-correct, independent auction/
  escrow/inspection signals (never a single ribbon, never "Live Auction"
  for a scheduled or ended auction).

No backend file was changed this stage — every fix reads a field the
backend already authoritatively provides.

## Real defects found and fixed (summary — full detail in the two audit docs)

1. Lifecycle-vs-capability confusion on the main inventory grid card
   (5 call sites) — the primary functional defect, directly matching
   Step 10D's explicit prohibition.
2. Fabricated "Clean Title" trust badge on the vehicle detail page —
   removed (Step 10M).
3. Unwired "Duty Paid" field on the vehicle detail page — connected to
   its real backend source rather than left unconditional (Step 10M).

## Visual-hierarchy findings reviewed, not changed (carry-forward — full
detail in `MARKETPLACE_VISUAL_HIERARCHY_AUDIT_20261008.md` and
`PREMIUM_AUCTION_UX_AUDIT_20261008.md`)

- Three parallel, unreconciled design-token/typography systems.
- Inconsistent icon-to-concept mapping sitewide (partially improved where
  this stage directly touched a surface; not mass-replaced).
- `prefers-reduced-motion`: functional state is unaffected by motion, but
  4 components re-implement the matchMedia check instead of reusing the
  existing hook, and the richest decorative motion isn't gated at all.
- Orphaned, already-deprecated `src/components/mobile/MobileCarCard.jsx`
  (not wired into the real mobile rendering path, which uses CSS
  container queries instead).
- `VehicleDetailPage.tsx`'s second, parallel bid-submission path has no
  loading/disabled/duplicate-click-prevention state, unlike the live
  auction room's form — not fixed because the underlying product question
  (should this second path still exist) is outside this stage's scope.

## Tests

- **Backend:** 48/48 suites, 644/644 tests passing — unchanged from the
  Stage 9 baseline, since Stage 10 made zero backend changes.
- **Frontend:** 341/353 passing (11 pre-existing, unrelated failures; 1
  skipped) — exactly the Stage 8/9 baseline (340/352) plus the one new
  Stage 10 regression test, with zero regressions. The new test was
  verified via the standard revert-confirm-fail-restore-confirm-pass
  discipline: reverting the fix reproduced a "multiple elements found"
  failure proving the old code's defect, and restoring the fix returned
  the suite to green.

## Typecheck / build / validators

- `npx tsc --noEmit` — clean.
- `npm run build` — clean.
- 11 relevant validators run — all passing: `marketplace-core` (12/12),
  `inspection-marketplace` (37/37), `auction-transport-convergence`
  (5/5), `frontend-runtime-contracts` (PASS), `pwa-mobile` (13/13),
  `auction-domain-integrity` (24/24), `auction-bid-surface` (6/6),
  `auction-360-hardening-20261007` (28/28), `payment-escrow-domain`
  (9/9), `registration-role-matrix` (32/32), `domain-lifecycle-integrity`
  (PASS).

## Browser/device/accessibility/performance observations

No live browser-automation or physical device grid was available in this
sandbox this stage; all findings above (mobile breakpoints, reduced
motion, accessibility, performance) were verified by static source
reading — confirmed CSS container-query behavior, confirmed the fix
introduced no new network calls/renders/images/scripts, confirmed no
icon-only unlabeled interactive element was introduced. No regression was
possible from the actual code change made (a ternary-to-boolean-consts
rewrite plus a few conditionally-rendered existing-style `<span>`
elements).

## Environment-blocked items

Live browser/device execution, a dedicated axe/screen-reader pass, and
pixel-level re-verification at the 6 named breakpoints (320/360/375/390/
412/430) — unchanged limitation from every prior stage; no reachable
browser/device runtime from this sandbox. Reasoned about statically
instead (see `PREMIUM_AUCTION_UX_AUDIT_20261008.md` Steps 10N/10S).

## Carry-forward items (6)

- Reconcile the three parallel design-token/typography systems into one
  canonical set (Step 10Q).
- Unify icon-to-concept mapping sitewide beyond the surfaces directly
  touched this stage (Step 10R).
- Route all 4 inline-`matchMedia` components through the shared
  `usePrefersReducedMotion` hook; gate the live-room's framer-motion
  transitions and the detail page's image-zoom under reduced motion
  (Step 10O).
- Remove or finish retiring the already-deprecated, orphaned
  `src/components/mobile/MobileCarCard.jsx`.
- Decide whether `VehicleDetailPage.tsx`'s second bid-submission path
  should remain a live entry point or be retired in favor of the live
  auction room's form, then add the missing loading/disabled state to
  whichever path remains (Step 10G).
- Re-verify the 6 named mobile breakpoints and run a dedicated
  accessibility pass once a browser/device runtime is reachable
  (Steps 10N/10S).

## Whether a new ZIP is required

**Yes** — source files changed (4 frontend source files, 1 updated test
file, plus the 4 new Stage 10 documents and 2 updated log/plan files).
