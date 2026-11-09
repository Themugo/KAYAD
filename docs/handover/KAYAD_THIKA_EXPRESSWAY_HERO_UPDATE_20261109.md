# KAYAD-KE — Thika-style expressway hero background update

Date: 2026-11-09

## Scope
Updated the existing homepage hero's default background to an original Kenyan urban expressway scene inspired by the ordinary dual-carriageway/overpass character of Thika Superhighway.

The new scene deliberately contains:
- No location signboards, route labels, county names, or readable signage.
- No embedded vehicle cutouts, text, logos, or interface elements.
- A broad asphalt carriageway with lane markings and safety barriers.
- A generic Nairobi-style urban skyline, flyover, streetlights, landscaped greenery, and bright Kenyan daylight.

## Existing functionality preserved
This is an asset/default-only visual update. The existing hero component structure, real featured/promoted vehicle feed, two-vehicle pairing and rotation, mobile vehicle cards, admin hero editor, backend-configured copy/CTAs, overlays, carousel arrows/dots, and responsive rendering were not replaced.

The new asset is used as the default in:
- `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`
- `src/features/HeroEditor/HeroEditorPanel.tsx`
- `backend/utils/siteDesign.js`

Previously stored built-in defaults (the KICC/skyline background and the prior Kenyan-highlands SVG) are migrated to the new expressway asset. Custom administrator-saved background URLs are preserved.

The existing five-item mobile bottom navigation and all unrelated navigation/authentication flows are untouched.

## Asset
`public/hero/kayad-thika-expressway-no-signs.svg`

This is an original vector background authored for this project. It is lightweight, scalable, and contains no third-party image dependency.

## Validation performed
- Source references checked: new default path used consistently in the three hero/default surfaces.
- Legacy built-in hero background migration checked.
- Custom background preservation branch retained.
- SVG parsed as XML.
- SVG checked for embedded location signage/text and embedded vehicle elements: none present.
- ZIP integrity checked after packaging.

## Not performed
- Full TypeScript/lint/production build.
- Live browser screenshots across all viewports.
- Runtime verification against a connected backend or production configuration.

No commit, push, or deployment was performed.
