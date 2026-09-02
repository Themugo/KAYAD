# KAYAD Phase 42 — Authoritative Marketplace Querying

## Scope

Phase 42 moves the marketplace browsing path from frontend-only filtering and slicing of the initial inventory snapshot to the real `/api/cars` query contract.

## Completed

- Added the backend-supported query fields to `GetCarsParams`.
- VehicleMarketplace now builds a real server query from search, location, make/model, body, fuel, transmission, condition, price, year, mileage, seller type, auction state, sort, page and page size.
- Backend pagination metadata now controls total pages.
- The marketplace no longer slices an already-paginated server response a second time.
- Marketplace loading/error handling now includes query refresh failures without falling back to fabricated inventory.
- Filter-option derivation uses the authoritative fetched page rather than the stale initial inventory snapshot.
- Added `scripts/validate-phase42.mjs`.

## Explicit non-goals

The existing advanced flags `Pre-Purchase Inspected`, `Escrow Protected`, `Finance Available`, and `Recently Added` remain post-filters because this phase does not invent backend query contracts for data that are not exposed by the verified `/api/cars` endpoint. Their backend integration belongs in a later domain-specific phase once authoritative query fields/joins are defined.

## Validation

Run:

```bat
npm run lint
npm run build
node scripts\validate-phase40.mjs
node scripts\validate-phase41.mjs
node scripts\validate-phase42.mjs
```

## Completion gate

Phase 42 is complete when all validation commands pass, the working tree is reviewed, and the Phase 42 commit is pushed to `origin/main`.
