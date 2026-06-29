# Duplicate Logic Audit Report

Generated: 2026-06-28

## 1. Auth Middleware Duplication

### Files Involved

| File | Status | Role |
|------|--------|------|
| `backend/middleware/auth.js` | **Canonical** | Primary auth middleware (262 lines). Exports `protect`, `adminOnly`, `dealerOnly`, `optionalAuth`, `allowRoles`. Used by ~82 files. |
| `backend/middleware/rbac.js` | **Canonical** | RBAC permission engine (162 lines). Exports `requirePermission`, `requireRole`, `requireAtLeast`. Used by `auctionAdminRoutes.js`. |
| `backend/middleware/role.js` | **Wrapper** | Re-exports from `rbac.js` + adds `authorize()`. Acceptable as backward-compat layer. |
| `backend/middleware/authRole.js` | **Redundant** | 11-line `authRole` closure. Only used by `marketRoutes.js`. Trivially replaceable with `rbac.js`'s `requireRole`. |
| `backend/middleware/authentication.js` | **Dead duplicate** | 352 lines, zero imports. Duplicates `auth.js` functionality. |
| `backend/middleware/authorization.js` | **Dead duplicate** | 200 lines, zero imports. Duplicates `rbac.js` functionality. |

### Resolution
- Delete `authentication.js`, `authorization.js` (already dead, covered in dead code report)
- Migrate `marketRoutes.js` from `authRole` to `requireRole` from `rbac.js`, then delete `authRole.js`

## 2. Validation System Duplication

### Files Involved

| System | Files | Library | Lines |
|--------|-------|---------|-------|
| System A (monolithic) | `backend/utils/validationSchemas.js` | Joi | 410 |
| System B (granular) | `backend/validation/*.schema.js` (16 files) | Zod | ~1,200 |

### Overlapping Domains

| Domain | Joi Schema (validationSchemas.js) | Zod Schema (validation/*.schema.js) |
|--------|----------------------------------|-------------------------------------|
| Auth | `authSchemas.login/register/changePassword/forgotPassword/resetPassword` | `auth.schema.js` (same + more) |
| Car | `carSchemas.create/update/listFilters/search` | `car.schema.js` (same + more fields) |
| Query | `commonSchemas.pagination/sorting` | `query.schema.js` (more exhaustive) |

### Additional Duplication: `platform.schema.js`

`backend/validation/platform.schema.js` duplicates schemas found in domain-specific Zod files:

| Schema | In `platform.schema.js` | Also In | Differs? |
|--------|------------------------|---------|----------|
| `createChatSchema` | Different structure | `chat.schema.js` | **YES** — different field sets |
| `sendMessageSchema` | `content` field | `chat.schema.js` uses `message` field | **YES** — field name mismatch |
| `releaseOtpSchema` | 4-digit OTP | `escrow.schema.js` uses 6-digit OTP | **YES** — potential bug! |
| `createSavedSearchSchema` | Different structure | `savedSearch.schema.js` | **YES** — different field sets |

### Resolution
- Delete `backend/utils/validationSchemas.js` (already dead, covered in dead code report)
- Consolidate `platform.schema.js` into domain-specific schemas to eliminate overlap
- Fix `releaseOtpSchema` OTP length inconsistency (4 vs 6 digits)

## 3. Frontend API Duplication

### `src/api/api.ts`

| Issue | Location | Details |
|-------|----------|---------|
| Legacy dispute aliases | Lines 560-564 | `_adminAPI` has legacy `disputeGet`, `disputeResolve`, `disputeAddNote`, `disputeGetAll`, `disputeStats` — explicitly marked as backward-compat. Full implementation exists in `disputeAPI` (lines 581-616). |
| `savedSearchAPI.remove` vs `delete` | Lines 690-691 | Both call `DELETE /saved-searches/${id}`. `delete` is explicitly marked as backward-compat alias. |

### Resolution
- Remove legacy `_adminAPI.dispute*` aliases (migrate callers to `disputeAPI`)
- Remove `savedSearchAPI.delete` (keep `remove`)

## 4. Notification Service Duplication

### Files Involved

| File | Lines | Used? |
|------|-------|-------|
| `backend/services/notification.service.js` | 68 | **YES** — imported by 10+ controllers/routes |
| `backend/services/notificationService.js` | 277 | **NO** — zero imports |

Both export `sendNotification` with similar signatures. The dot-notation version (`notification.service.js`) is the canonical one.

### Resolution
- Delete `backend/services/notificationService.js`

## 5. Recommendation Service Duplication

### Files Involved

| File | Lines | Used? |
|------|-------|-------|
| `backend/services/recommendation.service.js` | 36 | **NO** — zero imports; trivial scoring function |
| `backend/services/recommendationService.js` | 346 | **YES** — imported by `recommendationController.js`; full personalized engine |

### Resolution
- Delete `backend/services/recommendation.service.js`

## 6. Valuation/Pricing Service Duplication

### Files Involved

| File | Lines | Used? | Purpose |
|------|-------|-------|---------|
| `backend/services/valuationService.js` | 344 | **NO** | Full valuation service with `captureListingPrice`, `captureAuctionPrice`, `captureEscrowPrice`, `estimatePrice` |
| `backend/services/vehicleValuationService.js` | 504 | **NO** | Same functions as above + extra analytics methods |
| `backend/services/priceEstimator.js` | 3 | **NO** | Trivial re-export of `estimatePrice` from `valuationService.js` |
| `backend/services/pricingRecommendationService.js` | 74 | **YES** | Market-based pricing recommendations (different purpose — NOT duplicate) |

`valuationService.js` and `vehicleValuationService.js` have nearly identical function signatures and implementations. `priceEstimator.js` is a 3-line re-export stub.

### Resolution
- Delete `valuationService.js`, `vehicleValuationService.js`, `priceEstimator.js`

## 7. Cache System Duplication

### Three Parallel Systems

| System | Files | Backend | Status |
|--------|-------|---------|--------|
| A | `utils/cache.js` + `apiCache.js` + `searchCache.js` | Redis + in-memory | **USED** (most routes) |
| B | `services/cacheService.js` + `cacheMiddleware.js` | Redis only | **USED** (carRoutes, healthRoutes) |
| C | `services/redisCacheService.js` | Redis (older `redis` package) | **DEAD** (zero imports) |

### Resolution
- Delete `services/redisCacheService.js` (dead)
- Consolidation of System A and B is deferred (requires careful migration of all route imports)

## 8. Demo Data Duplication

### Files Involved

| File | Lines | Used? | Content |
|------|-------|-------|---------|
| `src/data/demoData.js` | 393 | **YES** (by `demoAPI.js`) | `DEMO_CARS`, `DEMO_USERS`, CRUD functions, comprehensive demo data |
| `src/data/mockCars.js` | 87 | **YES** (by `CarDetailPage.jsx` — only `getMockCar`) | `MOCK_CARS`, `MOCK_DEALERS`, `filterMockCars` |

Both build car arrays from the same `CAR_SPECS` source using the same `buildCarImages` helper. `mockCars.js` has auction-specific fields (`bidsCount`, `currentBid`, `auctionEnd`) that `demoData.js` doesn't populate.

### Resolution
- Migrate `getMockCar` usage in `CarDetailPage.jsx` to `getDemoCar` from `demoData.js`
- Add auction fields to `DEMO_CARS` in `demoData.js`
- Delete `mockCars.js`

## 9. Infra TypeScript/JavaScript Duplication

### Files Involved

All 8 `.ts` files in `backend/infrastructure/` are exact duplicates of their `.js` counterparts:

**Logging** (5 files):
- `child-logger.ts` ↔ `child-logger.js`
- `index.ts` ↔ `index.js`
- `serializers.ts` ↔ `serializers.js`
- `sentry-integration.ts` ↔ `sentry-integration.js`
- `transports.ts` ↔ `transports.js`

**Queues** (3 files):
- `deadLetterQueue.ts` ↔ `deadLetterQueue.js`
- `index.ts` ↔ `index.js`
- `workerManager.ts` ↔ `workerManager.js`

### Resolution
- Delete all 8 `.ts` files (`.js` files are the canonical, used versions)

## Summary

| Category | Redundant Files | Deferred? | 
|----------|----------------|-----------|
| Auth middleware duplicates | `authentication.js`, `authorization.js`, `authRole.js` | Delete all 3 |
| Validation duplicate | `validationSchemas.js`, overlap in `platform.schema.js` | Delete `validationSchemas.js`; consolidate `platform.schema.js` |
| Frontend API aliases | Legacy `_adminAPI.dispute*` and `savedSearchAPI.delete` | Remove aliases |
| Service duplicates | `notificationService.js`, `recommendation.service.js`, `valuationService.js`, `vehicleValuationService.js`, `priceEstimator.js`, `redisCacheService.js` | Delete all 6 |
| Demo data duplicates | `mockCars.js` | Consolidate into `demoData.js` |
| Infra `.ts` duplicates | 8 `.ts` files | Delete all 8 |
| Cache system consolidation | System C dead; A vs B consolidation | Delete System C; defer consolidation of A vs B |
