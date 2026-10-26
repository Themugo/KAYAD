# KAYAD Phase 13H — Route Failure Analysis

Register (one row per route): `KAYAD_PHASE13H_REMAINING_ROUTE_FAILURE_REGISTER.csv`. Reproducible with `runbooks/phase13g-20261026/http/phase13g_route_schema_sweep.mjs`, `runbooks/phase13h-20261026/http/phase13h_route_probe.mjs` and `build_route_register.py`.

## Method and scope
- Freshly migrated disposable database (188 migrations, 208 public tables), real Express backend, PostgREST, Redis.
- **Scope limit:** the sweep calls the **480 parameter-free GET routes** of every mounted router as a super admin. POST/PUT/PATCH/DELETE routes and routes with path parameters were not swept, so further failures may exist there. This is a sample of the API, not a full inventory.
- Each failing route was then called as anonymous, buyer, dealer, admin and super admin (statuses are in the register) and the backend log excerpt for the super-admin call was captured as the root cause. Nothing was fabricated: no tables created, no success faked.

## Result
| | routes | 5xx | note |
|---|---|---|---|
| Baseline (13G code, fresh DB) | 480 | **113** (110×500, 3×503) | reproduces 13G |
| After 13H fixes | 480 | **112** (109×500, 3×503) | `/api/analytics/market/county-trends` fixed; nothing new broke |

## Category summary (112 remaining)
| cat | meaning | routes | disposition |
|---|---|---|---|
| A? | repository schema file exists but is not a migration (`organizations` in `backend/db/identity.schema.sql`) | 1 | owner confirms intended DDL, then promote to a migration |
| A?/C | reader selects a column no DDL defines (`users.country` in `/api/intelligence/countries`) | 1 | owner: does the column exist in production, or correct the reader |
| B | depends on a production-only table (name in the C1 production list; no DDL in the repo) | 8 | blocked on the owner's schema export |
| C | depends on a table in no migration, no schema file and not in the production list | 73 | owner: provision a data model or retire the route. **If the C1 snapshot is still accurate these routes fail in production too** |
| D | code, configuration or provider cause independent of schema | 20 | see below |
| E | protected financial / bid / auction-integrity code | 9 | not changed; domain-owner decision required |

### Category D detail (19 defects + 1 designed behaviour)
- **13 × `ReferenceError`** (`FeatureFlag`, `ListingQuality`, `MarketplaceHealth`, `NotificationAudit`, `JobFailure` used but never imported), **3 × `TypeError`** (`DealerHealthScore.getTopDealers` / `getScoreDistribution`, feature-flag `getAllFlags`). The services were written for Mongoose-style model **statics** (`calculateForCar`, `getFailureStatistics`, `getDeliveryStats`, `isEnabled` …) that the model facade (`createModel`, two lines per model file) never implemented. Importing the model would not make them work; implementing them means inventing semantics and schemas, so this was **not** done. These routes cannot succeed in any environment as written.
- **2 × "Dead letter queue not initialized"** (503) and queue Redis config: `services/queueService.js` builds its BullMQ connection from `REDIS_HOST`/`REDIS_PORT` (default `localhost:6379`) while the rest of the app uses `REDIS_URL`. In this environment (`REDIS_URL` only) queue initialization is refused. Whether production sets `REDIS_HOST`/`REDIS_PORT` is unknown — **verify at preflight**; not changed because queues carry email and notification delivery.
- **1 × `/api/dealer/trade-listings` 503**: deliberate `TRADE_LISTINGS_UNAVAILABLE` (Stage 5C: `cars.wholesale` is not in the schema). Correct as designed, not a defect.
- Of the 20, **only `/api/dealer-health-score/ranking/list` is reachable without logging in** (anonymous 500); `/api/feature-flags/user` fails for every logged-in user. Both depend on unimplemented code. Safe disposition (owner approval needed, not implemented): answer with an explicit `501`/`503` "feature not provisioned" rather than 500; no fake data.

## Fixed in 13H (confirmed defects, non-protected, with regression tests)
1. `GET /api/analytics/market/county-trends` (public): selected `cars.location`, which does not exist (real column `location_city`, alias `city`). Now selects `city`, keeps `location.city` as a legacy fallback. Real-database check: anonymous 200 with correct grouping (matrix H1/H2); unit tests `phase13hCarsLocationColumn.test.js`.
2. **Saved-search cron** (`services/savedSearchCron.js`) had the same defect, found by searching for other `location` selects: every 10-minute run failed on the missing column, so saved-search notifications could never be produced. Same fix; `matches` exported for testing. No notification was sent in any test.

## Launch-criticality
Only the owner can confirm what is launch-critical. Evidence available: every core journey exercised in the browser (buyer, private seller, admin console and review, dealer hub, public marketplace and search, 390px mobile) produced **no 5xx response** (76 checks). The register also lists whether the shipped SPA source references each path (`spa_referenced`) and tiers each failure P1 (public/any-user and SPA-referenced) / P2 (staff and SPA-referenced) / P3 (not referenced). A literal reference in SPA source does not prove the page is mounted in navigation.
