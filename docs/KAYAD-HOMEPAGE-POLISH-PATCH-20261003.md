# KAYAD Homepage Polish Patch — 2026-10-03

This is a controlled presentation-only homepage pass based on the supplied KAYAD foundation.

## Visual direction
- Replace the oversized `Drive Your Dream Today` hero treatment with restrained, centered editorial typography.
- Center the hero message inside a premium translucent card.
- Present one vehicle stage on each side of the central card on desktop.
- Keep the existing real featured-vehicle feed and hero rotation when vehicle data is available.
- Use cropped KAYAD vehicle artwork only as an honest visual fallback when no featured vehicle image is available.
- Keep the Nairobi/KICC environment as supporting context rather than the dominant subject.
- Preserve existing hero CTAs, navigation, admin hero configuration, inventory APIs, and marketplace behavior.
- Preserve responsive behavior and reduced-motion handling.

## Files changed
- `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`
- `src/index.css`
- `public/hero/kayad-land-cruiser-stage.png`
- `public/hero/kayad-mercedes-gle-stage.png`
- `docs/KAYAD-HOMEPAGE-VISUAL-REFERENCE-20261003.png`

## Certification note
The supplied foundation requires Node `>=22.22.2`. The available isolated build environment is Node `22.16.0`, so a fresh dependency installation cannot be used here for a valid project certification. The user's Windows environment has already demonstrated a successful `npm ci` and `npm run build` on the foundation.
