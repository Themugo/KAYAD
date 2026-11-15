# KAYAD Mobile Menu Ordering Polish — 2026-11-14

## Scope
Focused continuation of the existing R22 mobile navigation. This is not a new navigation system or a redesign.

## Source inspection
- `src/components/Navbar.tsx` is the existing canonical mobile drawer.
- `src/components/navigation/navConfig.ts` remains the single canonical primary-navigation registry and preserves the administrator-controlled ordering/visibility contract.
- `src/styles/kayad-navigation.css` already contains the final single-column mobile drawer layer; no duplicate stylesheet or replacement layout was introduced.
- `src/components/MobileBottomNav.tsx` remains the existing five-item dock: Home, Showroom, Auction, Services and Saved.

## Existing primary navigation retained
1. Marketplace
   - Browse vehicles
   - Saved vehicles (authenticated only)
   - Vehicle financing
2. Auction
   - Live now
   - Starting soon
   - Completed
   - Saved for you (authenticated only)
3. Auto Services
   - Inspect a car before you buy
   - Find a mechanic or garage
   - Roadside and recovery
   - My requests and reports (authenticated only and hidden for restricted dealer/staff workspaces)
4. Escrow
   - How escrow works
   - My escrow deals (authenticated only and hidden for restricted dealer/staff workspaces)
   - Start a protected transaction
5. Support & Disputes (existing direct destination)

Primary order continues to come from `applyNavigationConfig`; no route, link, permission, or backend behavior was added.

## Change made
- Made the signed-in workspace section conditional on a signed-in user. Guests no longer see a misleading empty/Quick access workspace heading.
- Renamed the signed-in personal workspace heading to `Your KAYAD`; dealer, staff and provider headings remain role-specific.
- Moved the existing Price Alerts action into a distinct `Quick access` section for all account states.
- Preserved the same `onOpenAlerts` callback and drawer-close behavior.
- Kept the existing Sell Vehicle / Add Vehicle CTA and county context.
- Added regression tests for guest and signed-in section separation.
- Extended the unified mobile-menu source validator to enforce the separation and single Price Alerts entry.

## Files changed
- `src/components/Navbar.tsx`
- `src/__tests__/components/Navbar.test.jsx`
- `scripts/validate-unified-mobile-menu.mjs`
- `docs/handover/KAYAD_MOBILE_MENU_ORDERING_POLISH_20261114.md`

## Validation
- `node scripts/validate-unified-mobile-menu.mjs` — PASS
- `node scripts/validate-mobile-navigation-polish-20261012.mjs` — 38/38 PASS
- `node scripts/validate-navigation-convergence.mjs` — 43/43 PASS

Vitest and production build were not run because this extracted archive has no `node_modules`. The archive declares Node `>=22.22.2`; the available runtime is Node `22.16.0`. No live authenticated Android/browser test was performed.

## Preservation
No new navigation registry, routes, destination handlers, account permissions, APIs, database changes, bottom-navigation changes, commits, pushes or deployments.
