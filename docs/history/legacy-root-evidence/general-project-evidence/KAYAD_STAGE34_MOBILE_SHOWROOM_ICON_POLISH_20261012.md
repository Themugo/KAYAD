# KAYAD Stage 34 — Mobile Showroom & Real-Meaning Icons

## Scope
- Renamed the mobile-only `Search` tab to `Showroom`.
- Replaced the magnifying-glass glyph with a vehicle-front icon.
- Used a house icon for Home, gavel for Auction, custom inline vector depicting a mechanic leaning over an open bonnet for Services, and heart for Saved.
- Added semantic color coding per tab while retaining the established navy/teal/mint KAYAD palette.
- Preserved existing destinations and authorization. Showroom navigates to the canonical `marketplace` view and scrolls to the existing `market-results` anchor; it does not create a new route or API.
- Auction continues to use the existing `discovery` destination; Services continues to use `inspections`; Saved continues to use the existing `saved` destination and its existing protected-navigation gate.
- Desktop navigation labels and routing are unchanged.

## Source checks
`node scripts/validate-stage34-showroom-icons.mjs` — 16/16 PASS.

## Not certified in this package environment
The full Vitest component suite, TypeScript compile, Vite production build, and browser/device visual tests were not run because dependencies are not installed in this workspace. Run these on the user's Node.js 22.22.2+ environment before deployment.
