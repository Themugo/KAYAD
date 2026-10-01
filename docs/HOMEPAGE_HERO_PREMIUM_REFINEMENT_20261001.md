# KAYAD Homepage Hero Premium Refinement — 2026-10-01

## Scope

Presentation-only refinement of the existing homepage hero in `VehicleMarketplace.tsx`.

## Preserved contracts

- Existing hero footprint: 390px mobile/small and 420px desktop.
- Existing real Featured/Promoted vehicle source and admin selection logic.
- Existing Browse Inventory and How It Works actions.
- Existing featured-vehicle carousel navigation and indicators.
- Existing overlapping search/filter bridge.
- Existing admin-configured hero copy, CTA links and background override.

## Visual correction

The previous hero composition used two floating vehicle artwork slots around a large central copy area, which could leave visually empty or awkward areas when listing imagery was unavailable or rectangular. The refinement presents the same real featured vehicles as premium, contained photography cards over a Kenyan road scene, giving the hero a complete automotive composition without adding a new feature or changing the hero footprint.

## Road backdrop

The default fallback road image is a Nairobi/Kenya traffic photograph published by Piqsels as a public-domain image. The code retains the existing admin-managed hero background override, so the road image is only the default visual fallback.
