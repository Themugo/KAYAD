# KAYAD Stage 35 — Homepage Hero Mobile Pair & Admin Showcase

## Scope
- Preserved the desktop hero composition, stage dimensions, background, center card, CTAs, desktop vehicle lanes, and existing featured-vehicle pair rotation.
- Rebuilt the mobile hero around the approved Option 1 direction: premium center message card followed by two simultaneously visible, fully contained featured-car visuals. The layout uses the same hero background and KAYAD navy/teal/mint styling.
- Removed the one-car mobile carousel composition. Mobile pair navigation now follows the existing canonical pair index and only appears when there are more than two hero vehicles.
- Uses `object-contain` and the transparent cutout/mobile WebP assets so vehicle silhouettes are not cropped. Vehicle image stage height stays within controlled responsive bounds.
- Added an admin-controlled curated showcase pair to the existing `platform_config.hero_presentation.showcaseVehicles` JSONB contract. The existing protected admin config endpoint saves changes; no second CMS or new table was added.
- Added `showcaseFallbackEnabled` and a `vehicleSource` option for `featured`, `selected`, or `showcase`. If fewer than two real featured listings are available, the curated pair can keep the marketing composition complete.
- The Toyota Land Cruiser and Mercedes-Benz GLE visuals are presentation-only. They are not inserted into `public.cars`, do not count as inventory, have no price/seller/transaction state, are visibly labeled as a visual showcase, and clicking them takes visitors to actual marketplace results rather than a fake detail page.
- Added migration `20261012103000_home_hero_showcase_pair_and_mobile_composition.sql` to repair/seed the showcase images and enable the fallback in the existing platform configuration record.
- Added admin controls for showcase make/model, desktop and mobile image paths, descriptor, visibility, source mode and fallback behavior.
- Updated hero component tests and source-contract validators for the new two-car mobile design.

## Validation performed
- `node scripts/validate-hero-admin-control.mjs` — PASS
- `node scripts/validate-home-hero-premium.mjs` — 12/12 PASS
- `node scripts/validate-hero-mobile-assets.mjs` — PASS
- `node scripts/validate-stage34-showroom-icons.mjs` — 16/16 PASS
- `node scripts/validate-stage35-home-hero-pair.mjs` — run before packaging
- TypeScript command attempted; full typecheck cannot be certified because this workspace has no `node_modules` and React/Vitest type packages are unavailable.

## Required before production
- Run the Supabase migration in staging and confirm `platform_config.hero_presentation.showcaseVehicles` contains the two visual assets.
- Run `npm ci` and `npm run typecheck`, `npm test`, `npm run build` on Node.js 22.22.2 or newer.
- Browser-test at 320, 360, 375, 390, 412, 430, tablet and desktop sizes, including image load failures, no real featured listings, one real featured listing, and 2+ real featured listings.
- Verify admin changes survive refresh and appear consistently across devices.

No commit, push or deployment was performed.
