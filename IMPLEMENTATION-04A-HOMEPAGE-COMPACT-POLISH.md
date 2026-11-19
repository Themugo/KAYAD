# KAYARD KE — IMPLEMENTATION 04A
## Homepage navbar-to-hero spacing and compact hero refinement

**Source:** KAYARD-KE-MASTER-IMPLEMENTATION-04-20261119.zip  
**Scope:** Public marketplace homepage spacing and PremiumHero responsive sizing only.  
**Date:** 19 November 2026

## Audit findings

The supplied desktop screenshot showed three stacked vertical contributors before the homepage content:

1. The global top notice strip and primary navbar (retained).
2. `PageJourneyNavigation`, which renders recently visited route tabs even on the public marketplace landing page (not useful there).
3. The `#market-journey` inventory context row, whose forced 48px minimum height and padding created an additional band.

The PremiumHero itself also had generous mobile and desktop stage heights. The original design system and admin-driven hero logic were already in place; replacing the hero or its data source would have duplicated functionality and risked the working carousel.

## Changes made

### 1. Public homepage navigation gap
- `src/App.tsx`: PageJourneyNavigation is now omitted only while `activeNav === 'marketplace'`.
- Internal dashboard, dealer, admin and other routes retain their existing page-history navigation.
- Browser history, route state and the home navigation component were not changed.

### 2. Inventory context row
- `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`: reduced vertical utility padding while preserving inventory count, loading/error/retry status, saved count and compare count.
- `src/index.css`: removed the forced 48px minimum height and reduced the row's vertical padding.

### 3. Premium hero responsive sizing
- `src/components/home/premium-hero.css`:
  - Mobile (under 768px): tighter copy spacing, smaller CTA height, reduced trust-row spacing and 150–184px vehicle stage depending on viewport width.
  - Tablet (768–1023px): balanced two-column composition with a 360px minimum inner height.
  - Desktop (1024px+): 392px minimum inner height and 344px vehicle stage.
  - Large desktop (1440px+): restrained 414px minimum inner height and 366px stage.
  - Reduced-motion handling and existing keyboard focus treatments remain intact.

### 4. Existing hero behaviour preserved
No changes were made to `PremiumHero.tsx`, hero API, hero selection, admin controls or vehicle eligibility. The existing parent-owned slide state still controls the featured vehicle, CTA actions, arrows, dots and pause/resume.

## Files changed
- `src/App.tsx`
- `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`
- `src/index.css`
- `src/components/home/premium-hero.css`
- `scripts/validate-homepage-compact-layout.mjs` (new)
- `package.json` (new validation script entry)

## Validation

Passed:
- New compact-layout source contract: 10/10.
- Existing homepage responsive polish: 9/9.
- Existing homepage redesign contract.
- Existing distinctive brand hero contract.
- Existing admin hero control contract.
- Existing hero mobile asset contract.

Not certified in this environment:
- TypeScript: attempted, but dependencies are not installed; output includes missing React, Sentry, PostHog and other module/type declarations. The environment is also Node 22.16.0 while `.nvmrc` and package engine require Node 22.22.2 or newer.
- Production build: attempted, but Vite could not execute (`vite: Permission denied`) in the extracted dependency state.
- Vitest/browser screenshots: not run because project dependencies and browser test runtime are unavailable.
- Authenticated live browser checks: not run; no authenticated live service was connected.

These are environment limitations, not claims of successful compilation. No production database, API, listing lifecycle or authentication behaviour was changed.

## Scope exclusions
- No homepage content rewrite.
- No changes to carousel timing, featured vehicle eligibility, slide ordering or admin settings.
- No changes to global navbar dimensions or mobile menu behaviour.
- No changes to marketplace search, filters, categories, inventory cards or route destinations.

## Next verification
Install dependencies using the project lockfile under Node 22.22.2 or newer, then run:
- `npm run validate:homepage-compact-layout`
- `npm run validate:homepage-responsive-polish` (or the existing script `node scripts/validate-homepage-responsive-polish-20261114.mjs`)
- `npm run test -- --run`
- `npm run typecheck`
- `npm run build`

Capture actual 1440px, 1280px, 768px, 390px and 360px browser screenshots before declaring visual certification complete.
