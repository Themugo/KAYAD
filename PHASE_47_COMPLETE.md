# KAYAD Phase 47 Complete — Comparison State Consolidation & Persistence Hardening

## Scope
Phase 47 removes the duplicate comparison state path and establishes one persisted client-side comparison source for the primary application.

## Changes
- `CompareContext` is now mounted in the primary `App` provider tree.
- `App.tsx` consumes `compareIds` / `toggleCar` from `CompareContext` instead of a second comparison array in `useVehicleCollections`.
- `useVehicleCollections` is narrowed to saved/favorite vehicle responsibilities.
- Persisted comparison IDs continue to use the existing `kayad_compare_ids` local-storage contract.
- Compared vehicles not present in the currently loaded inventory slice are resolved through the authoritative `getCarById` API and mapped through `mapBackendCarToVehicle`.
- Persisted IDs that no longer resolve to a real backend vehicle are removed rather than represented with invented vehicle data.
- The known `App.tsx` `useRef` regression from the Phase 46 archive is corrected in this package.

## Architecture Boundary
Comparison selection is client-owned UI state, so local persistence is appropriate. Vehicle records displayed by comparison remain server-owned and are resolved from the backend when they are not already present in the current inventory response.

## Validation
Run:

```cmd
node scripts/validate-phase47.mjs
```

Then run the existing lint/build and Phase 40–47 validation chain before committing.
