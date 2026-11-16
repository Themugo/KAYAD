# KAYAD R19 — Homepage responsive polish
**Baseline:** `KAYAD-FULL-CORRECTED-2026-11-14-R18.zip`
**Date:** 14 November 2026
**Scope:** Improve the existing homepage on desktop and mobile without replacing the existing marketplace, APIs, navigation, vehicle selection, admin-managed hero settings, filters or listing actions.

## Changes applied

### 1. Mobile hero now includes the featured vehicle pair at phone widths
The two-vehicle showcase previously had `hidden sm:block`, which suppressed the dedicated vehicle stage on narrow phones. It now renders at all mobile widths using the existing live/curated hero source, image fallback, card content and selection actions.
- Retains `object-fit: contain` so the full vehicle remains visible.
- Uses a responsive image-stage height with a dedicated <=379px compact treatment.
- Keeps the vehicle caption legible and separate from the image.
- Does not convert visual showcase vehicles into real inventory.

### 2. Mobile hero copy and actions
- Keeps the support paragraph visible at mobile sizes.
- Refines title scale, spacing and line-height.
- Keeps both existing hero CTAs and their existing destinations/actions.
- Improves button hover/focus transition while respecting reduced motion.

### 3. Category strip and page flow
- Removes sticky positioning from the category strip so it cannot slide underneath or collide with the global sticky header.
- Retains horizontal scrolling and existing category filter actions.
- Adds scroll margin to the search bridge.

### 4. Desktop and inventory presentation
- Refines the homepage surface, hero image shadow and card depth.
- Refines quick-action spacing and visual elevation.
- Improves toolbar, sidebar, inventory card and CTA elevation/radii.
- Adds more deliberate mobile toolbar control layout and small-screen compaction.
- Preserves existing filters, sort, pagination, grid/list controls, saved/compare, contact seller and inventory data.

### 5. Validation
Added `scripts/validate-homepage-responsive-polish-20261114.mjs` and npm script `validate:homepage-responsive-polish`.

Results:
- Homepage responsive polish: 9/9 PASS
- Homepage convergence: PASS (9 checks)
- Homepage redesign source contract: PASS
- Hero mobile asset contract: PASS
- Mobile navigation polish: 38/38 PASS

The homepage convergence validator had stale expectations for a previous featured-feed page limit and outdated showcase copy. It was updated to match the current implementation (`limit: 24` and `not a listing`); no production data behavior was changed by this validator correction.

## Build status / limitations
Environment Node: `v22.16.0`. Root `node_modules` is absent. `npm run build` was attempted and stopped with `vite: not found`. This is an environment/dependency installation blocker, not a passing build. The project's Node engine requirement is higher than this environment's version.

Not certified in this pass:
- Vite production build
- TypeScript
- Vitest/Jest suites
- Real browser screenshots and device testing at 320, 360, 390, 430px
- Live backend/API behavior

## Change control
No schema or migration changes. No API, database, listing lifecycle, navigation route or permission changes. No commit, push, merge or deployment. R18 remains the rollback baseline.

## Next required verification
On Node 22.22.2+ (or the exact version specified by the project), install root dependencies using `npm ci`, then run:
1. `npm run validate:homepage-responsive-polish`
2. `npm run validate:homepage-convergence`
3. `npm run validate:mobile-navigation-polish`
4. `npm run typecheck`
5. `npm test -- --run`
6. `npm run build`

Then use browser/device tests at 320, 360, 390, 430, 768, 1024, 1366 and 1920px, checking hero pair visibility, navbar collision, bottom dock clearance, filters, card grid, image containment, keyboard navigation and reduced-motion behavior.
