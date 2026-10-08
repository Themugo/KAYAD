# KAYAD AUCTION 360 — Stage 8: Marketplace Trust Signal Matrix
**Date:** 2026-10-08

Authoritative sources (all pre-existing fields, no new schema):
- **AUCTION** capability: `cars.auction_status !== 'none'` (generated `has_auction` column / `isAuction` alias). Lifecycle presentation: raw `auctionStatus` ('draft'→Upcoming, 'live'→Live, 'ended'→Ended), now carried through as `vehicle.auctionLifecycle`, kept distinct from capability.
- **ESCROW** capability: `cars.escrow_enabled` (role-enforced server-side: `true` only for `individual_seller`-owned cars) → `vehicle.escrowEligible` → `isEscrowApplicable(vehicle)` (admin policy tier + per-sale override, both now hard-gated on `escrowEligible`).
- **INSPECTION** capability: `cars.inspection_status === 'passed'` (the existing, already-established "passed" gate used by `auctionSetup.contract.js`) → `vehicle.inspectionPassed`.

| Vehicle/listing state | Auction badge | Escrow badge | Inspection badge | Authoritative source | Public meaning | Detail-page behavior | Mobile behavior | Result |
|---|---|---|---|---|---|---|---|---|
| NONE | hidden | hidden | hidden | all three capability fields false/none | plain fixed-price, non-escrow, uninspected listing | status row shows "Verified Fixed Price" only; no escrow CTA; inspection CTA reads "Book Inspection" | overlay renders empty, no layout shift | PASS |
| AUCTION only | shown (lifecycle-aware label) | hidden | hidden | `auctionStatus≠none`; `escrowEnabled=false`; `inspectionStatus≠passed` | auction vehicle, no escrow, not yet inspected | "Live/Upcoming/Ended Auction" label; no escrow CTA; "Book Inspection" | 1 badge, no wrap | PASS |
| ESCROW only | hidden | shown | hidden | `auctionStatus=none`; `escrowEnabled=true`; not inspected | fixed-price, escrow-protected listing | "Verified Fixed Price"; Escrow CTA shown; "Book Inspection" | 1 badge | PASS |
| INSPECTION only | hidden | hidden | shown | `auctionStatus=none`; `escrowEnabled=false`; `inspectionStatus=passed` | fixed-price, pre-inspected, no escrow | "Verified Fixed Price"; no escrow CTA; "150-Point Inspected" | 1 badge | PASS |
| AUCTION + ESCROW | shown | shown | hidden | both true, not inspected | auction + escrow-protected | lifecycle-aware auction label + Escrow CTA | 2 badges | PASS |
| AUCTION + INSPECTION | shown | hidden | shown | auction + inspected, no escrow | auction + pre-inspected | auction label + "150-Point Inspected" | 2 badges | PASS |
| ESCROW + INSPECTION | hidden | shown | shown | fixed-price, escrow + inspected | fixed-price, escrow-protected, pre-inspected | Escrow CTA + "150-Point Inspected" | 2 badges | PASS |
| AUCTION + ESCROW + INSPECTION | shown | shown | shown | all three true | full trust profile | all three status elements shown | 3 badges — the overlay's existing "Max 3" design cap, unchanged | PASS |

## Consistency across surfaces

The same three capability booleans drive the badge on every surface —
none is recalculated independently:
- Marketplace card / search results: `VehicleCard.tsx` (single component,
  confirmed mounted for both via `VehicleMarketplace.tsx`).
- Vehicle detail: `VehicleDetailPage.tsx`'s status-badge row (now gated,
  Finding 4).
- Auction detail: `AuctionLivePage.jsx` → `AuctionCinematicGallery` chip
  row (escrow chip added this stage, sourced from the same
  `toAuctionResponse()` field now threaded through — Finding 2).

## Badge failure behavior

If the canonical vehicle/auction response does not contain a field (e.g.
an older cached response, or a partial/failed secondary fetch), the
corresponding badge simply does not render — no badge is calculated from
any fallback, guess, or client-side-only signal. The one condition that
previously violated this (admin's global escrow policy tier overriding
real `escrowEligible`) is fixed — see Finding 2 in
`CUSTOMER_AUCTION_EXPERIENCE_AUDIT_20261008.md`.
