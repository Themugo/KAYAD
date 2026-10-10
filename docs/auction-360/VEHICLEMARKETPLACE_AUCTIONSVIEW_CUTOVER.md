# KAYAD HARDENING — VEHICLEMARKETPLACE / AUCTIONSVIEW CUTOVER COMPLETION

Resolves the two "unresolved duplicates" flagged at the end of `LEGACY_REMOVAL_REPORT.md` (Phase 4): `VehicleMarketplace` and `AuctionsView` each had two complete, independently-tested implementations, and the one that shipped was the less feature-complete one. This document records the decision made and the verification performed - not a new phase, a direct continuation of Phase 4's own work.

## Decision

Promoted the nested implementation (`features/X/components/X.tsx`) to sole/canonical for both domains, rather than deleting the undeployed work. This was the option Phase 4's report described as "a real, if mechanical, cutover" - chosen because the undeployed versions were confirmed to be complete, tested, and strictly more capable (Featured Picks trust-hero slider, consolidated filters, corrected trust-strip copy, and a real admin home-page-customization panel for `VehicleMarketplace`; a real per-sale escrow-override admin panel and bid-log modal for `AuctionsView`), with no evidence either was abandoned mid-work or superseded by the simpler flat version for a deliberate reason.

## What the cutover required, beyond deleting the old flat files

Deleting `src/features/VehicleMarketplace.tsx` and `src/features/AuctionsView.tsx` was necessary but not sufficient - `App.tsx`'s existing bare imports (`from './features/VehicleMarketplace'`, `from './features/AuctionsView'`) now resolve to the nested versions automatically (via each domain's own `index.ts`), but the nested versions expect props the flat ones never needed:

- **`VehicleMarketplace`**: needs `user` and `isHomePage` (for the admin customization panel's own visibility/scoping logic) - both now passed from `App.tsx`'s real, existing `user` and a literal `isHomePage` flag on the one call site that represents the actual home page.
- **`AuctionsView`**: needs a real `onUpdateVehicleEscrowOverride` handler to make its admin escrow-override panel actually persist a change, not just display inert controls. Added `handleUpdateVehicleEscrowOverride` in `App.tsx`, mirroring the already-established `handleUpdateVehicleAuctionStatus` pattern exactly (a local `vehicles` state update - this project has no dedicated backend endpoint for this specific per-vehicle field yet, consistent with how other vehicle-editing flows already work here, not a new backend dependency invented for this).
- **`VehicleMarketplace`'s own loading/error wiring** (added to the flat file during Phase 3) had to be ported into the newly-canonical nested version too - it never had it, and Phase 3's own change to `App.tsx` (vehicles now start empty and fetch real data on mount) means the nested version's own prior reasoning for leaving this unwired ("mock data is already valid and displayed instantly") no longer holds. Ported directly, matching the flat file's Phase 3 implementation.

## Verification

Not just typecheck and test-pass - the actual production bundle was checked directly for the previously-undeployed content, the same method used throughout this project's audit work:

| Check | Result |
|---|---|
| Frontend TypeScript | 0 errors |
| Frontend unit test suite | 315/316 passing (1 intentionally skipped) - both previously-restored test files (`AuctionsView.test.tsx`, `VehicleMarketplace.test.tsx`) now pass in full against what is genuinely the sole, shipping implementation |
| Frontend production build | Succeeds |
| Built bundle contains "Featured Picks" | Confirmed present (was absent before this cutover) |
| Built bundle contains "Enforce Escrow" (admin override panel) | Confirmed present (was absent before this cutover) |

## Result

`LEGACY_REMOVAL_REPORT.md`'s "Unresolved duplicates" list is now resolved for items 1 and 2. Item 3 (the remaining ~64 duplicate-named files from this project's Phase 0 audit, not part of the 12 domain-level view files resolved across Phase 4 and this cutover) remains open and unaddressed - each would need the same individual build-and-bundle-check verification before any action, not assumed safe from this pattern alone.
