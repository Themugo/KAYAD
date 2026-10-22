# PHASE C.1 — Change Ledger

Baseline: Phase C foundation (`385b6cd2…bcd68`). 15 files modified (+110/−57), 13 source/test/tool files added, plus reports and evidence under `reports/phase-c1/`.
No lockfile, migration, deployment configuration, frontend source, public stylesheet, route, role or permission changed.

## Product code (backend)

| File | Change | Defect | Proof |
|---|---|---|---|
| `backend/controllers/carController.js` | `getCars` public query adds `deletedAt: { $exists: false }`; `getCar` treats a soft-deleted listing like a non-public status (404 unless owner/staff); five listing-mutation sites call `invalidatePublicListingCaches()` instead of the partial invalidation | C1-D1 public listing/detail leak; C1-D4 cache | soft-delete-integrity tests; HTTP matrix P1–P16; UI U2–U4 |
| `backend/services/sitemapService.js` | Vehicle sitemap filters soft-deleted vehicles | C1-D1 sitemap leak | soft-delete-integrity; HTTP P14 |
| `backend/services/searchService.js` | Public search, facets and suggestions use the public-inventory definition (`status: available` + not soft-deleted) | C1-D1 search leak | soft-delete-integrity |
| `backend/models/_base.js` | `$ne: null` → `IS NOT NULL` (was `.neq(col, null)`, PostgreSQL 22007 on typed columns) | C1-D2 | soft-delete-integrity (model adapter) |
| `backend/utils/cache.js` | `cacheDelPattern` uses the ioredis SCAN signature (`scan(cursor,'MATCH',p,'COUNT',n)` → `[cursor, keys]`) | C1-D3 every Redis pattern invalidation was a silent no-op | cache-invalidation (real Redis): FAIL on original, PASS after |
| `backend/utils/publicListingCache.js` (new) | `PUBLIC_LISTING_CACHE_PATTERNS` (`cars:list:*`, `vehicle_search:*`, facets, suggestions) + `invalidatePublicListingCaches()`. Separate module so existing `utils/cache.js` test mocks keep working unchanged. | C1-D4 anonymous listing cache (`vehicle_search:*`) never invalidated | Jest regression + real Redis |
| `backend/controllers/bulkAdminController.js` | Bulk moderation uses the shared invalidation helper | C1-D4 | static guard |
| `backend/routes/adminRoutes.js` | Admin car delete and admin user delete (cascading car soft-delete) invalidate public caches (previously none) | C1-D4 | static guard |
| `backend/controllers/duplicateController.js` | Duplicate removal (`status: hidden` + soft delete) invalidates public caches (previously none) | C1-D4 | static guard |
| `backend/services/sliTrackingService.js` | cache-hit-rate SLI reads `metric.denominator.other.counter` (configured path) instead of non-existent `metric.other.other` | C1-D5 SLI threw on every tick | Jest regression (FAIL on original); boot log no longer shows "SLI computation failed" |

## Tests (backend)

| File | Change | Note |
|---|---|---|
| `tests/regression/stage5f5CommandCenterSnapshot.test.js` | Expected queue literal `deletedAt: null` → `deletedAt: {$exists:false}` | Phase C changed the controller's form; both compile to `deleted_at IS NULL` (proven by soft-delete-integrity). The parity assertion stays exact. Not weakened. |
| `tests/integration/soft-delete-integrity.integration.test.js` (new) | 21 tests against real PostgREST/PostgreSQL. Opt-in (`KAYAD_DISPOSABLE_DB=1`), refuses non-loopback URLs, own fixtures with per-run token, cleans up. | Excluded from default Jest run; `npm run test:soft-delete-integrity` |
| `tests/integration/cache-invalidation.integration.test.js` (new) | 2 tests against a real local Redis (250 keys across SCAN pages) | Opt-in; `npm run test:cache-invalidation` |
| `tests/regression/phaseC1PublicListingCacheInvalidation.test.js` (new) | In-memory path of the helper (runs in CI) | 2 tests |
| `tests/regression/phaseC1CacheHitRateSli.test.js` (new) | cache_hit_rate SLI = 75 for 30 hits / 10 misses, no error logged | FAIL on original |
| `backend/jest.config.js` | Ignore the two opt-in node:test integration files (same pattern as the existing chat-integrity test) | |
| `backend/package.json` | Scripts `test:soft-delete-integrity`, `test:cache-invalidation` | Scripts only; lockfile unchanged |

## Validators, harnesses and tooling

| File | Change |
|---|---|
| `scripts/validate-phaseC-soft-delete-integrity.mjs` | Excludes `node_modules` (with dependencies installed it scanned ~14k third-party files); adds checks for model `$ne:null`, getCars, getCar, vehicle sitemap, search/facets/suggestions. Fails on the Phase C sources (5 findings), passes after. Existing checks unchanged. |
| `scripts/validate-phaseC1-runtime-integrity.mjs` (new) + npm script `validate:phaseC1-runtime-integrity` | 12 static checks guarding the cache fixes and opt-in harness safety. Fails 3/12 on Phase C sources. |
| `scripts/local-db/supabase-default-privileges.sql` (new) | Hosted-Supabase default privileges so local GRANT/REVOKE semantics match |
| `scripts/local-db/rest-v1-proxy.mjs` (new) | Loopback-only `/rest/v1` → PostgREST proxy |
| `scripts/local-db/README.md` | Rewritten: previous content described another project's database |
| `runbooks/phase-c1-runtime-20261021/http/phase_c1_http_authz_matrix.mjs` (new) + `.result.txt` | 30 server-side authorization/soft-delete checks over real HTTP |
| `runbooks/phase-c1-runtime-20261021/ui/phase_c1_ui_journeys.mjs` (new) + `.result.txt` | Chromium journeys (public, deleted vehicle, Command Centre, CMS, staff restriction, dealer, buyer), axe |
| `runbooks/phase-c1-runtime-20261021/PHASE_C1_STAGING_RUNBOOK.md` (new) | Staging creation, read-only verification SQL, certification suites, production reconciliation plan |
| `package.json` | npm script `validate:phaseC1-runtime-integrity` only |

## Not changed (deliberately)

- **Existing harness** `runbooks/stage5f10-…/ui/ui_5f10.mjs` uses a stale selector (`/^Auctions$/`; the module button has been named "Auctions module" since `447c4dd`). It was **left unchanged**; a scratch copy with only that selector updated was run for evidence (21/23). Register R-22.
- Table-name defects that require production column verification (`marketplace_healths`, `notification_audits`, `admin_alerts`): recorded, not changed (R-07, R-19).
- Rate-limiter policy for `GET /api/v1/auth/me` (R-20): security tuning decision, not changed.
