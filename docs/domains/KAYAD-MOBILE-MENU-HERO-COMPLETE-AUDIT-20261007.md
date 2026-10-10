# KAYAD Mobile Menu + Hero Artwork Audit & Fix — 2026-10-07

## Scope
Controlled presentation/runtime repair of two reported public-surface defects:
1. Mobile navigation/menu did not feel premium and left the persistent bottom dock visible behind the open menu.
2. Homepage hero vehicle artwork could appear incomplete because the desktop showcase defaults referenced low-resolution `*-clean.png` artwork with tight bounds; the desktop stage also clipped its vehicle wrapper.

No backend, database, RLS, payment, escrow, inspection, or marketplace business logic was changed.

## Mobile menu findings
- The previous drawer used a dense dashboard-like grid with many equally weighted controls.
- Guest authentication used two separate CTAs inside the drawer.
- The persistent mobile bottom navigation remained visible while the drawer was open, creating visual overlap and making the menu feel like a second navigation system.
- The drawer was an in-flow block rather than a dedicated modal surface with backdrop, scroll containment and clear hierarchy.

### Fixes
- Replaced the mobile drawer with one premium, full-width modal navigation surface.
- Added a restrained backdrop and scroll-contained drawer.
- Added a compact KAYAD account/guest identity panel.
- Consolidated guest authentication into one `Sign In / Sign Up` action routed through the existing login flow.
- Grouped public marketplace actions, account actions, role tools and seller CTA into deliberate sections.
- Kept all existing navigation destinations and role-specific actions; no business behavior was removed.
- Locks body scroll while open.
- Hides the persistent mobile bottom dock while the drawer is open so the user sees one navigation surface at a time.
- Added reduced-motion handling.
- Desktop guest auth was also consolidated to one `Sign In / Sign Up` control for consistency.

## Hero findings
- The configured desktop showcase vehicles referenced `kayad-land-cruiser-clean.png` and `kayad-mercedes-gle-clean.png`.
- Those files are small (390x226 and 358x195) and their transparent subject bounds run tightly to the image edges.
- The repository already contains complete high-resolution transparent cutouts at 1021x634 and 1028x610.
- Desktop vehicle wrappers used `overflow-hidden`, which could clip the artwork when scaled or positioned near a lane boundary.

### Fixes
- Switched the default desktop showcase assets to the existing high-resolution transparent cutouts:
  - `/hero/kayad-land-cruiser-cutout.png`
  - `/hero/kayad-mercedes-gle-cutout.png`
- Preserved the existing complete mobile artwork:
  - `/hero/kayad-land-cruiser-mobile.webp`
  - `/hero/kayad-mercedes-gle-mobile.webp`
- Changed desktop vehicle wrappers to `overflow-visible` and slightly increased the artwork stage height.
- Kept `object-contain`, bounded lane geometry, and the existing center hero card so the vehicles remain complete and separated from the center card.
- No vehicle data, admin controls, pricing, CTA logic or rotation rules were changed.

## Preserved architecture
- Existing Navbar and MobileBottomNav remain the canonical navigation surfaces.
- Existing hero admin configuration remains authoritative.
- Existing showcase/featured vehicle source logic remains unchanged.
- No new marketplace, route, API, database table, or asset mapping system was introduced.

## Verification
- Backend JavaScript syntax check: PASS.
- TypeScript/JSX parser check using TypeScript 5.8.3 with dependency resolution disabled: no syntax/parse errors in the three changed TSX files; expected module-resolution errors are due to dependencies not being installed in this environment.
- Asset inspection: PASS; both replacement desktop cutouts are RGBA transparent and high-resolution.
- Browser/device visual verification: NOT claimed from this environment. The provided mobile screenshots were used as design evidence, but no real browser session was available here.

## Files changed
- `src/components/Navbar.tsx`
- `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`
- `src/App.tsx` (preserved the previously identified Sell Vehicle lazy-export fix)
- `src/index.css`

## Deployment
Not deployed.
