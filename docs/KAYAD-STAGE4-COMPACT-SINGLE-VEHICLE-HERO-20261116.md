# KAYAD Stage 4 — Compact Single-Vehicle Hero

**Date:** 16 November 2026  
**Foundation:** Stage 3 canonical component/data-flow checkpoint  
**Scope:** Homepage hero presentation only. No new API, route, table, permission or inventory source.

## Objective
Move the canonical homepage hero from a paired-vehicle composition to a compact single-vehicle feature while preserving the established campaign, featured-inventory, showcase fallback, hero slide, admin and navigation contracts.

## Implementation

### Canonical source selection
`VehicleMarketplace.tsx` continues to call `selectHeroVehicles()` with:
1. Active campaign vehicles first.
2. Configured featured/selected real inventory second.
3. Illustrative showcase artwork only after real inventory and campaign resolution, and only when fallback is enabled.

The selected vehicles are now grouped one per slide. This changes presentation grouping only; the selection utility, campaign service, feed, API, campaign order and featured-inventory API are unchanged.

### Desktop
- One prominent vehicle image on the left, one copy/CTA panel on the right.
- Compact stage dimensions and card spacing.
- Existing vehicle image source, gallery override validation, click-through, info card, image error fallback and admin positioning settings remain wired.
- Vehicle imagery remains `object-contain`; edges are not cropped.

### Mobile
- Existing copy and CTA card retained.
- One vehicle is shown beneath it in a single-column stage.
- Image stage is reduced in height while retaining the dedicated mobile image source and `object-contain` behavior.
- Existing previous/next, dots, pause/resume and reduced-motion contracts remain available when multiple slides exist.

### Preserved controls and sources
- Public campaign current feed and real vehicle resolution.
- Featured inventory query (`featured: true`).
- Platform public configuration and existing HomePageAdminPanel.
- Separate backend hero slides and editable CTA copy.
- Admin-configured desktop/mobile hero imagery and vehicle card content.
- Reduced-motion behavior, pause on hover/focus, interaction cooldown and explicit pause control.
- Empty inventory messaging and truthful illustrative labels.
- Existing search bridge below the hero.

## Files changed
- `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`
- `src/features/VehicleMarketplace/components/homepage-redesign.css`
- `scripts/validate-home-hero-premium.mjs` (updated obsolete paired-vehicle expectations)
- `scripts/validate-stage4-single-vehicle-hero.mjs` (new 12-point validator)

## Validation
Passed:
- Stage 4 single-vehicle hero validator: **12/12**.
- Premium homepage hero validator: **12/12**.
- Hero admin-control contract.
- Hero mobile-asset contract.
- Homepage convergence.
- Homepage responsive polish: **9/9**.
- Homepage design direction at 320–430px: **10/10**.
- Navigation convergence: **43/43**.
- Unified navigation convergence: **6/6**.
- Mobile navigation polish: **38/38**.
- Stage 35 hero regression validator: **12/12**.

Not run / limitations:
- Full TypeScript/Vite build and browser visual regression were not run because project dependencies are not installed in this extracted workspace.
- No live campaign API, Cloudinary, production database or device-browser certification was performed.
- Static validators confirm source contracts; they do not replace runtime rendering tests.

## Scope boundary
No commit, push or deployment. No changes to payment, campaign pricing, inventory APIs, listing lifecycle, saved vehicles, comparison, seller workflows or admin dashboard business behavior.
