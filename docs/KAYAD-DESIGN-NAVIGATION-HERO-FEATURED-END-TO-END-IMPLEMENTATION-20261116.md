# KAYAD Design, Navigation, Hero, Featured Vehicles & Admin Sync — Implementation Report

**Date:** 16 November 2026  
**Baseline:** `KAYAD-admin-dashboard-sync-pass3.zip`  
**Scope:** Reinforcement and integration only. No redesign, deployment, Git commit or push.

## 1. Executive result

The existing canonical KAYAD experience was inspected and reinforced. The approved teal/navy visual direction, public navigation architecture, responsive mobile dock/drawer, homepage hero composition, campaign-first hero vehicle selection, admin dashboard and permission model were preserved.

Two focused source changes were made in this pass:

1. Featured-campaign hero data now refreshes when a visitor returns to the tab/window, pauses polling while the document is hidden, retains the five-minute fallback refresh, and ignores stale overlapping responses. This improves synchronization without creating a second realtime transport or changing the campaign source of truth.
2. The existing homepage administration panel now supports upload and preview of separate desktop and mobile curated hero showcase creatives through the existing authenticated upload service. Uploads are limited to JPG/PNG/WebP and 5 MB, are validated before being applied, and remain unpublished until the existing Save hero composition action is used. The backend now restricts the `marketing` upload folder to existing `admin`, `superadmin`, `marketing` and `ad_manager` roles for both single and multiple upload endpoints.

## 2. Canonical architecture established by source inspection

### Public experience

- The actual homepage route mounts `VehicleMarketplace` from `src/features/VehicleMarketplace` (`src/App.tsx`).
- The canonical homepage hero is inside `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx` and uses `HeroDesktopVehicle.tsx`, `heroSelection.ts`, the existing admin-managed `heroPresentation` configuration and the existing home page admin panel.
- The hero's real vehicle priority is: currently running featured campaign, then real featured/selected inventory, then clearly illustrative curated showcase artwork only when no eligible real vehicle is available. This is enforced by `selectHeroVehicles` and its tests.
- `HeroDesktopVehicle` uses `object-contain` for vehicle imagery and labels illustrative artwork separately from real listings.
- The canonical public navigation uses `src/components/Navbar.tsx`, `src/components/MobileBottomNav.tsx`, `src/components/navigation/navConfig.ts` and the existing route/navigation authority. The mobile drawer and bottom dock remain distinct, complementary surfaces; a second menu was not introduced.
- `src/components/home/Hero.tsx` and `src/components/home/FeaturedVehicles.tsx` exist as older/alternate components, but the homepage convergence validator confirms the live homepage uses `VehicleMarketplace`. They were not promoted or duplicated.

### Hero management

- The existing home page admin panel persists composition and showcase vehicle settings through the existing platform configuration flow.
- The existing hero slide editor uses `src/services/heroApi.ts` and the existing `/api/hero` API.
- The new upload controls extend the existing home page administration panel and use the existing `/api/upload` endpoint and Cloudinary-backed upload infrastructure. No new media table, upload service or hero persistence API was created.
- Uploaded media URL is checked with the same client-side hero URL safety function used by the existing presentation sanitizer.
- The upload is only staged into the panel's local draft; the existing explicit save action persists the presentation.

### Featured vehicle and campaign flow

- The hero's real inventory source uses `getCars({ featured: true })` from the canonical vehicle API.
- The campaign source uses `GET /api/featured-campaigns/current` through `getCurrentFeaturedCampaignCarIds()`, then resolves the canonical car records through `getCarById()`.
- The campaign service remains authoritative for currently scheduled campaign IDs. The current feed is not replaced by local state or a second endpoint.
- Existing campaign governance settings and role gates remain unchanged: manual and automatic payment policy switches are separate and default closed; campaign management uses `MANAGE_ADS`.
- Existing payment/campaign integration gaps identified in the earlier audit are not silently claimed as resolved by this design pass. No campaign price was invented.

### Admin dashboard

- `/admin` and `/admin/dashboard` continue to use the canonical `AdminView` inside `AdminLayout` and `AdminSidebar`.
- `AdminDashboard.jsx` remains a legacy page and was not made a competing dashboard.
- The dashboard's existing stats, user, vehicle, audit, system health and alerts sources remain in use.
- Existing 60-second refresh, hidden-tab polling pause, visibility/focus refresh, Nairobi last-checked display, manual refresh, pause/resume, authenticated `controlPlaneUpdated` subscription and sidebar alert refresh remain intact.
- Existing permission-aware requests and server authorization remain authoritative.

## 3. Changes in this pass

| File | Change | Reason |
|---|---|---|
| `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx` | Campaign feed refresh now skips hidden-tab polling, refreshes on focus/visibility, retains 5-minute fallback, and rejects stale overlapping responses | Campaign changes are reflected sooner when a visitor returns, with less unnecessary background traffic |
| `src/features/VehicleMarketplace/components/HomePageAdminPanel.tsx` | Added desktop/mobile showcase creative upload, validation, progress/status feedback and preview | Makes the existing external creative replacement workflow operable without changing the hero composition design |
| `backend/routes/uploadRoutes.js` | Restricted `marketing` folder uploads to existing admin/ad-management roles on both upload endpoints | Prevents ordinary authenticated marketplace users from publishing shared marketing assets |
| `scripts/validate-homepage-campaign-refresh-sync.mjs` | Added static regression validator | Locks refresh lifecycle and cleanup behavior |
| `scripts/validate-hero-creative-upload.mjs` | Added static regression validator | Locks upload controls, file restrictions, preview and backend role gate |
| `docs/KAYAD-DESIGN-NAVIGATION-HERO-FEATURED-END-TO-END-IMPLEMENTATION-20261116.md` | This implementation and evidence report | Records architecture, scope, test results and limitations |

## 4. Existing work explicitly preserved

- Public desktop navbar and mobile drawer share the existing navigation configuration.
- Five-item buyer mobile dock and dealer-specific dock remain intact.
- Admin sidebar remains permission-filtered and route coverage remains mapped to registered pages.
- Homepage hero typography, composition, showroom background, configured positioning, CTA controls, carousel pause/reduced-motion behavior and mobile-specific hero composition remain intact.
- Hero admin controls remain backed by the existing config persistence and sanitization contract.
- Campaign-first real vehicle selection remains intact; showcase art is never treated as a live listing.
- Featured campaign policy remains closed by default and uses existing finance/ads permissions.
- Existing marketplace listing cards, search, filters, view controls, listing details and transaction workflows were not rewritten.
- Existing admin dashboard data sources and synchronization remain intact.

## 5. Validation evidence

### Passed in this pass

| Validator | Result |
|---|---:|
| `validate-navigation-convergence.mjs` | 43/43 |
| `validate-unified-navigation-convergence.mjs` | 6/6 |
| `validate-mobile-navigation-polish-20261012.mjs` | 38/38 |
| `validate-kayad-navbar-branding.mjs` | Pass |
| `validate-homepage-convergence.mjs` | Pass |
| `validate-home-hero-premium.mjs` | 12/12 |
| `validate-hero-admin-control.mjs` | Pass |
| `validate-hero-mobile-assets.mjs` | Pass |
| `validate-featured-campaign-governance.mjs` | 10/10 |
| `validate-admin-command-centre-live-sync.mjs` | 20/20 |
| `validate-admin-dashboard-mobile-premium.mjs` | 17/17 |
| `validate-admin-navigation-page-coverage.mjs` | 34/34 routes |
| `validate-admin-route-convergence.mjs` | 14/14 |
| `validate-homepage-campaign-refresh-sync.mjs` | 9/9 |
| `validate-hero-creative-upload.mjs` | 11/11 |
| `node --check backend/routes/uploadRoutes.js` | Pass |

### Existing validator failures reproduced

The following four checks fail on the current source and match the previously recorded baseline failures. They are not counted as passes:

1. `validate-admin-broadcast-end-to-end.mjs`: dealer audience includes individual sellers expectation fails; remaining checks pass.
2. `validate-admin-inspector-applications.mjs`: two frontend source-contract expectations fail (refresh errors converted to empty records and status counts source); 32/34 pass.
3. `validate-admin-moderation-page.mjs`: retaining prior records on refresh errors fails; 13/14 pass.
4. `validate-admin-settings-logo-flow.mjs`: expected FormData field contract fails; other checks pass.

These are outside the narrow design/navigation/hero scope and were not changed without a dedicated review of their business contracts.

### Build and test limitation

- `node_modules` is absent in the supplied project.
- `npm run typecheck` cannot complete because React, Vitest, Axios, Node types and other declared dependencies are not installed. It also surfaces downstream typing errors in this dependency-missing state; those are not treated as a clean typecheck.
- `npm test -- --run` cannot start because `vitest` is not installed.
- A Vite production build and browser/device automation were not run.
- No live Cloudinary upload, production storage, Supabase, payment-provider or deployed browser test was possible from this source-only environment.

## 6. Remaining items requiring live or broader certification

- Run `npm ci` in the user's normal build environment, then typecheck, lint, Vitest and production build.
- Exercise the new marketing creative upload with authorized admin/ad-manager accounts and confirm CDN URL persistence in the existing config save flow.
- Confirm a regular user receives HTTP 403 when attempting to upload into the `marketing` folder, while existing allowed roles can upload.
- Browser-test all requested viewport widths, especially 320px, 360px, 390px, 430px, 768px, 1024px, 1366px, 1440px and 1920px.
- Finish the previously identified featured campaign payment linkage only after the campaign pricing rule is established. Do not invent a fee.
- Resolve the four pre-existing admin validator failures in a separate evidence-based pass.

## 7. Safety and release status

- No source archive was overwritten.
- No Git commit or push was made.
- No deployment or publication was performed.
- The final ZIP is a source handoff, not a claim of live production certification.
