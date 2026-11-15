# KAYAD Unified Navigation Convergence — 14 November 2026

## Screenshot finding
The supplied mobile screenshots show three overlapping navigation surfaces:
1. The hamburger opens the dark grouped KAYAD navigation drawer, which already contains signed-in identity, role-aware workspace links and sign-out.
2. The profile avatar separately opens a white account dropdown containing many of the same account/workspace destinations.
3. The bottom dock repeats high-frequency destinations (Auction, Saved, Payments, Profile).

This duplication makes the hamburger and profile controls appear to be competing navigation systems.

## Design decision
Keep the canonical grouped drawer as the single full navigation surface. The drawer remains responsible for:
- Signed-in account identity and role label
- Role-aware workspace destinations
- Marketplace, auction, services, escrow and support groups
- Notifications and messages where applicable
- Sign out / sign in actions

The account avatar is now an account destination (Profile), not a second dropdown menu. The compact bottom dock remains a shortcut bar for high-frequency mobile destinations; it is not a second full menu. Existing route identifiers, role checks, backend permissions and canonical `NAV_PRIMARY` configuration are unchanged.

## Source change
- `src/components/Navbar.tsx`: profile control no longer toggles the duplicate account dropdown; it navigates through the existing `handleNavSelect('profile')` route flow.
- The canonical mobile drawer remains the one full navigation panel and retains identity, sign-out, grouped destinations and role-aware workspace links.
- Added `scripts/validate-unified-navigation-convergence.mjs` to assert the single-menu source contract.

## Validation run
- `node scripts/validate-unified-navigation-convergence.mjs` — PASS (4/4)
- `node scripts/validate-admin-dealer-page-journey-navigation.mjs` — PASS (52 admin routes, 5 dealer routes)
- `node scripts/validate-page-journey-navigation.mjs` — PASS (8/8)
- `node scripts/validate-navigation-convergence.mjs` — PASS (43/43)

## Test and cleanup notes
The existing `NavbarStaffMenu.test.jsx` contains assertions for the old account-dropdown interaction. Those expectations are obsolete under the unified navigation decision and must be migrated to assert the canonical drawer/profile destination instead. The Vitest suite could not be run because dependencies remain unavailable in this environment (Node.js version is below the declared minimum and npm registry DNS resolution failed). The legacy dropdown JSX remains in the source but is no longer reachable from the profile control; a follow-up cleanup should remove the dead JSX and update the related tests together after the full dependency environment is available.

## Visual/browser certification
Not certified. The source contract is validated, but a real browser session is still required to verify that profile opens the account page, the hamburger opens the sole navigation drawer, the drawer closes after route selection, and the bottom dock remains unobstructed on 320–430px phones and wider screens.

No backend API, role, permission, database, payment, deployment, commit or push changes were made.

## Role consistency follow-through
- The canonical drawer now uses the existing `isSellerRole` helper from `src/utils/authRoutes.ts` to show a `Selling Workspace` destination only to seller roles (`individual_seller`, `broker`, and `dealer`); dealers continue to receive their dedicated dealer workspace section, so the personal seller shortcut does not duplicate dealer inventory navigation.
- Personal buyers receive a `Buyer Dashboard` label; individual sellers/brokers receive `My Account` plus `Selling Workspace`.
- Staff and mechanics retain their existing staff/provider-specific destinations. Backend authorization and route guards remain unchanged.
- Re-ran unified navigation validator: 6/6 PASS; admin/dealer page journey validator PASS (52 admin + 5 dealer); page journey validator 8/8 PASS; canonical navigation convergence 43/43 PASS.
- Runtime/browser and full Vitest checks remain unrun due to the previously documented dependency/runtime/network installation block.
