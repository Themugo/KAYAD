# KAYARD KE — Implementation 03A report

**Source:** `KAYARD-MASTER-IMPLEMENTATION-02-20261119.zip`  
**Scope:** Personal dashboard navigation and account accessibility polish  
**Date:** 19 November 2026

## Source audit findings

1. `PageJourneyNavigation` maintained a six-entry recently visited tab strip. Every `/?nav=dashboard&section=...` route was labelled `Dashboard` because `titleForRoute` resolved only the `nav` parameter and ignored `section`.
2. `PersonalSidebar` used `overflow-y-auto` on the entire sidebar and had no sign-out action. Its trust note was the last child, so there was no persistent account action area.
3. The canonical logout flow already existed in `AuthContext.logout`, which delegates to `signOut`, clears auth/CSRF/admin-view state and only settles the user as unauthenticated after server confirmation (or an already-expired 401 session).
4. `Profile` had its own sign-out button, but it was inside My Account and was not a reliably discoverable global dashboard action.
5. The personal mobile section menu contained navigation only; it had no sign-out action.
6. My Vehicles rendered a primary banner H1 `My vehicles`, followed by a second H2 `My Vehicles`.
7. My Vehicles rendered `Refresh` in the banner and `Refresh listings` above the listing filters. The actions had different scopes: the banner refreshed ownership/listings/escrow plus saved vehicles and overview refresh triggers; the lower control refreshed listings. The lower duplicate was removed while preserving the broader banner refresh and listing-specific retry/action refresh callbacks.

## Changes implemented

- Personal dashboard pages now render Back, Forward and Home controls plus `Personal Account / Current Section`; the recently visited tab strip remains available on non-personal routes.
- `titleForRoute` now resolves personal dashboard section names, including My Vehicles, Seller Enquiries, My Account and Overview.
- The primary App title effect now passes the actual dashboard query string so browser titles follow the active section.
- Added shared `PersonalSignOutButton`, wired through the existing `authLogout` callback passed from `App` into `DashboardHub`.
- Desktop sidebar navigation scrolls independently; the trust note and sign-out footer remain outside the scrolling navigation region.
- Mobile Personal Account menu now exposes the same canonical sign-out action.
- Embedded My Account hides its duplicate local sign-out button because the unified shell owns sign-out; standalone Profile retains its original sign-out action.
- Renamed the My Vehicles secondary heading to `Your listings` and removed the redundant normal-state `Refresh listings` button.
- Preserved the existing listing-specific retry button and post-mutation refresh callbacks.

## Files changed

- `src/App.tsx`
- `src/components/DashboardHub.tsx`
- `src/components/navigation/PageJourneyNavigation.tsx`
- `src/components/dashboard/personal/PersonalSidebar.tsx`
- `src/components/dashboard/personal/PersonalSignOutButton.tsx` (new)
- `src/pages/Profile.tsx`
- `src/utils/pageTitle.ts`
- `src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx`
- `src/__tests__/utils/pageTitle.test.ts`
- `src/__tests__/components/PageJourneyNavigationPersonal.test.tsx` (new)
- `src/__tests__/components/PersonalSignOutButton.test.tsx` (new)
- `src/__tests__/components/PersonalSidebar.test.tsx` (new)
- `scripts/validate-personal-dashboard-navigation-accessibility-03a.mjs` (new)

## Verification actually completed

- 12/12 Implementation 03A static contract checks passed.
- 8/8 existing page journey navigation static checks passed.
- Existing admin/dealer page journey navigation validator passed for 52 admin routes and 5 dealer routes.
- Existing personal-account page audit passed 25/25 checks.
- Existing unified personal-dashboard consolidation validator passed 22/22 checks.
- Existing phone verification refresh and profile edit-cancel validators both passed.
- Source-level inspection confirms sign-out uses the existing AuthContext logout function and only redirects when it returns `{ ok: true }`.
- ZIP source audit confirms no backend, database, role, listing lifecycle or homepage files were changed.

## Verification limitation

The ZIP does not include `node_modules`. The environment provides Node v22.16.0, while the project declares Node >=22.22.2; the locked `jsdom` and `undici` packages also require newer Node versions. `npm ci` first stopped on the engine mismatch. Retrying with `--engine-strict=false` did not complete within the available execution window. Therefore Vitest, TypeScript type-checking, production build and Playwright/browser viewport checks were **not run**. The added component tests are committed to the project but remain unexecuted here.

## Remaining verification before release

1. Run `npm ci` using Node >=22.22.2.
2. Run the three new component test files and existing Profile/DashboardHub tests.
3. Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.
4. Run the actual browser checks at 1440, 1280, 768, 390 and 360px, including Back/Forward, Home, desktop anchored sign-out, mobile sign-out confirmation, successful logout and failed logout.
5. Capture desktop and mobile before/after screenshots.
