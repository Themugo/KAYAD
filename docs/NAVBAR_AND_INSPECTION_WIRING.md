# NAVBAR SIMPLIFICATION AND INSPECTION-MARKETPLACE WIRING

Direct implementation of explicit product direction: navbar reduced to exactly 3 items, and the "each car should have a pre-inspection option" requirement traced end-to-end and fixed where it was genuinely incomplete.

---

## 1. Navbar reduced to exactly 3 items: Marketplace, Auction, Pre-Purchase Inspection

Removed "Support" from the main desktop nav bar per explicit instruction. Checked before removing, not assumed safe: Support remains reachable via the footer's existing "Support & Disputes" link (confirmed directly in App.tsx), so this is a narrower top-level bar, not a loss of access.

Caught and fixed a real syntax break introduced by the removal in the same pass: the initial edit left orphaned JSX from the deleted button's closing tags sitting after the new `</nav>`, which would have been invalid markup. Found via `tsc --noEmit` immediately after the change, not left for a later check.

Updated the one existing test that asserted the old 4-item nav (`Navbar.test.jsx`) to match the new, correct 3-item behavior - an intentional, expected update given the explicit product change, not a regression.

## 2. Auction workflow: confirmed the requested Live/Sold/Upcoming structure already exists

Checked `AuctionsView.tsx` directly before assuming anything needed building: a three-status model (`Live`, `Upcoming`, `Ended`) with timeline-aware filtering, category counts, and a dedicated "Recently Sold" section already exists and is already reasonably well-implemented (existing code comments show it was already hardened in prior work - an inconsistency in how "All" counted statuses was already found and fixed before this pass). Not rebuilt, since the request ("live, sold or coming and timelines") already matches what's there structurally. Whether the underlying auction data and the seller/dealer-configurable workflow are backed by real or mock data was not re-verified in this specific pass - this program's earlier audits found the Auctions UI running on mock data, and nothing in this pass re-confirmed that status has changed.

## 3. Pre-purchase inspection: found and fixed a real, specific gap in the "wired directly" requirement

Checked whether "each car should have a pre-inspection option" already existed before building anything new. It partially did: `VehicleDetailModal` already has a real "Book Inspection & Reserve" button with an `onRequestInspection` prop, and `InspectionsView` already accepts an `initialSelectedVehicle` prop specifically designed to carry a vehicle's context into the inspection flow.

The actual gap: neither end was connected to the other. `onRequestInspection` in App.tsx just called `navigateTo('inspections')` with no vehicle information at all, and `InspectionsView` was never passed the `initialSelectedVehicle` prop it already supports. Clicking "Book Inspection" on any specific vehicle silently dropped which vehicle you'd clicked and landed on a generic, unscoped inspection page.

Fixed by mirroring the exact, already-established pattern used for the equivalent escrow flow (`escrowPrefillVehicle`/`handleStartEscrow`) rather than inventing a new one: added `inspectionPrefillVehicle` state and a `handleRequestInspection` handler with the same shape, wired `onRequestInspection` to actually capture and store the clicked vehicle, and passed it through as `initialSelectedVehicle` to `InspectionsView`. Confirmed directly that this prop has a real, load-bearing effect inside the component (`targetVehicleId` initializes from it) - not a prop that was accepted but silently ignored.

A full duplicate action was deliberately not added directly onto every vehicle card in the grid, to avoid recreating the exact crowding problem just fixed on the navbar - the one-click-away detail modal (already the standard pattern this app uses for "Start Escrow" and other vehicle-specific actions) is the consistent, appropriate place for this.

---

## Verification

| Check | Result |
|---|---|
| Frontend TypeScript | 0 errors |
| Frontend lint | Clean |
| Frontend unit test suite (Vitest) | 197/197 passing (1 test updated to match the intentional nav change) |
| Frontend production build | Succeeds |
