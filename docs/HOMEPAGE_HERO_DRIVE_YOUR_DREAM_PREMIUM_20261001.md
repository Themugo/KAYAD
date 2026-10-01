# KAYAD Homepage Hero — Drive Your Dream Today Premium Refinement

## Scope

Presentation-only refinement of the existing homepage hero in `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`.

## Preserved contracts

- Existing 390px mobile/small and 420px desktop hero footprint.
- Existing real Featured/Promoted vehicle source and admin selection logic.
- Existing vehicle click-through behavior.
- Existing Browse Inventory and How It Works actions.
- Existing featured-vehicle carousel navigation and indicators.
- Existing overlapping search/filter bridge.
- Existing admin-configured hero copy, CTA links and background override.

## Visual refinement

- Strengthened the `Drive Your Dream Today` editorial hierarchy.
- Added a restrained premium micro-label above the headline.
- Refined the hero lighting with layered teal/radial depth while retaining the existing Kenyan road background system.
- Expanded the existing real-vehicle presentation cards slightly within the same hero footprint to remove dead visual space.
- Added a subtle glass presentation stage, ground glow and stronger card elevation so the featured vehicles feel intentionally placed rather than floating in empty space.
- Preserved real vehicle imagery and click targets; no mock vehicle identity or new marketplace capability was introduced.

## Certification

`npm run validate:home-hero-premium` — 9/9 PASS.

Full dependency-backed typecheck/build/test execution remains environment-blocked when `node_modules` is absent; no such gate is represented as passed here.
