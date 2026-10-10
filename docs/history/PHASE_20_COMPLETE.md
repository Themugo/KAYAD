# KAYAD Phase 20 — Canonical Auction Dependency Reconciliation

## Scope
Reconcile every production backend dependency that still queried or modeled a separate `auctions` table after Phase 19 established `cars` as the authoritative auction record.

## Completed
- Removed the stale `Auction` model/table mapping from the generic backend model map.
- Reconciled auction-dependent services to canonical `cars` + `bids` data:
  - auction integrity detection
  - bid-security initiation
  - lead creation from auctions
  - marketplace health metrics
  - vehicle market analytics
  - dealer auction scoring
  - auction-ending reminders
  - auction sitemap generation
- Removed the duplicate JavaScript auction service; the TypeScript service is now the single frontend auction wrapper.
- Updated the frontend auction service type to match the real API contract (`draft | active | ended`, `startingBid`, `highestBid`, `bidCount`, etc.).
- Reconciled `backend/openapi.yaml` with the actual routes and canonical response shape; removed the unsupported auction-creation and `/auctions/{id}/bids` documentation.
- Updated the production truth map so auction architecture is no longer documented as mock/separate-table based.

## Validation
- OpenAPI YAML parses successfully.
- Backend JavaScript syntax checks pass for all changed auction services/models.
- No production `findAll/findById/count("auctions")` database dependency remains under backend services/controllers/models/routes.
- Canonical auction source remains `cars` with bids keyed by `bids.carId`.
