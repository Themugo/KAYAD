# KAYAD-KE Distinctive Hero & Forward-Motion Logo Update

**Date:** 9 November 2026  
**Base:** `KAYAD-PUBLIC-NAVBAR-LOGO-IMPROVEMENT-1109.zip`  
**Scope:** Replace the generic Nairobi skyline hero default, redesign the default mark so the vehicle faces/moves toward the viewer, and position the Kenyan flag directly beneath the `KE` suffix. The complete preceding admin/navigation/onboarding improvements are carried forward.

## Changes

### 1. Distinctive Kenyan landscape instead of Nairobi skyline
- Added `public/hero/kayad-kenyan-highlands-road.svg`, an original lightweight vector landscape with highland silhouettes, acacia forms, rolling green terrain, a winding road and warm sky.
- The composition intentionally has no Nairobi skyline and leaves a clear centre stage for the existing real featured vehicle artwork and hero copy.
- Changed the default hero background in `VehicleMarketplace.tsx` and backend `siteDesign.js`.
- Changed the default in the Hero Editor and renamed the homepage admin field from “Nairobi background URL” to “Hero background URL”.
- Updated the Admin Command Centre hero background to the same distinctive KAYAD landscape.
- Added a compatibility normalization: only the known built-in Nairobi skyline URLs are migrated to the new local SVG; administrator-supplied custom hero URLs are preserved.

### 2. Forward-motion KAYAD mark
- Replaced `public/branding/kayad-symbol.svg` with a flat, scalable front-facing automotive mark.
- The vehicle front fascia, windscreen, headlights and wheels face the viewer; the road perspective and motion strokes trail behind it.
- The symbol has no KAYAD lettering, no descriptor and no badge text. It remains suitable for compact website/app use.

### 3. Flag directly beneath KE
- The navbar now nests the Kenyan flag directly below the `-KE` suffix.
- Removed the detached country badge from the navbar lockup; the flag is now part of the wordmark treatment rather than a separate floating badge.
- Kept the descriptor as its own separate text element below the KAYAD-KE wordmark.
- Added responsive sizing for the flag, wordmark and descriptor at narrow mobile widths.

### 4. Preserved functionality
- Existing header routes, nav config, auth-aware menus, account actions, Sell Vehicle flow and mobile drawer behaviour remain unchanged.
- Existing five-item public mobile dock is unchanged.
- Existing custom Admin Branding logo uploads and administrator-selected custom hero URLs remain supported.
- Real featured inventory and the existing hero configuration contract remain authoritative; no showcase art is converted into a listing.
- Existing admin drawer touch-scroll, document scroll ownership, focus management, specialist page responsive improvements, unified registration and provider onboarding changes remain in the ZIP.

## Validation

Passed:
- `validate:kayad-distinctive-brand-hero`
- `validate:homepage-convergence`
- `validate:hero-admin-control`
- `validate:navigation-convergence` — 43/43
- `validate:admin-route-convergence` — 14/14
- `validate:admin-mobile-shell-scroll` — 12/12
- `validate:admin-navigation-page-coverage` — 34/34

Chromium 144.0.7559.96 preview fixture at 390px and 1366px confirmed both new SVG assets load, the flag-under-KE lockup is visible and no horizontal overflow occurs. These are static layout fixtures using the actual assets, not authenticated screenshots of the live React app.

## Remaining release checks

- Full TypeScript, lint, Vitest and production build are still pending. The project requires Node `22.22.2+`; the available runtime is `22.16.0` and dependencies are not installed.
- Live authenticated browser verification is still required.
- No production deployment, database migration, commit or push was performed.

## Modified / added files

1. `public/branding/kayad-symbol.svg`
2. `public/hero/kayad-kenyan-highlands-road.svg` (new)
3. `src/components/Navbar.tsx`
4. `src/styles/kayad-navigation.css`
5. `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`
6. `src/features/VehicleMarketplace/components/HomePageAdminPanel.tsx`
7. `src/features/HeroEditor/HeroEditorPanel.tsx`
8. `src/features/admin-command-centre.css`
9. `backend/utils/siteDesign.js`
10. `scripts/validate-kayad-distinctive-brand-hero.mjs` (new)
11. `scripts/validate-homepage-convergence.mjs`
12. `package.json`
13. `docs/handover/kayad-distinctive-brand-hero/`
14. `docs/handover/KAYAD_DISTINCTIVE_HERO_AND_FORWARD_MOTION_LOGO_20261109.md` (this report)
