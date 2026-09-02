# KAYAD Phase 45 — Authoritative Vehicle Data Contract

## Scope

Phase 45 hardens vehicle data presentation so missing backend fields remain missing instead of being silently replaced with fabricated marketplace values.

## Changes

- Removed fabricated defaults for vehicle condition, body type, transmission, and fuel in `mapBackendCarToVehicle`.
- Removed synthetic `createdAt` generation when the backend does not provide `created_at`.
- Removed fabricated vehicle-image fallback from `VehicleDetailPage`.
- Added an explicit empty-image state when a listing has no authoritative vehicle images.
- Disabled image navigation/fullscreen controls when no authoritative images exist.
- Removed fabricated `142 Views`, `Metallic`, and `Excellent` presentation fallbacks.
- Prevented `MarketplaceContext.selectedVehicle` from silently falling back to the first vehicle when no vehicle ID is selected.
- Preserved the Phase 44 authoritative marketplace query/pagination contract.

## Production principle

Server-owned vehicle fields must remain authoritative. The UI may explain missing data, but must not invent vehicle facts.

## Validation

`scripts/validate-phase45.mjs` contains 11 static contract checks covering the mapper, detail page, marketplace context, and primary application vehicle loading path.
