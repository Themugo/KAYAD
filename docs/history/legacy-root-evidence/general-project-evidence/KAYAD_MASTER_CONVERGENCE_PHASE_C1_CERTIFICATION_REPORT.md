# KAYAD Master Convergence — Phase C.1 Certification Report

**Date:** 21 October 2026 · **Release decision: `READY FOR APPROVED STAGING`** (not ready for production review; §12)
**Foundation:** `KAYAD-MASTER-CONVERGENCE-PHASE-C-DATA-INTEGRITY-20261021.zip`, SHA-256 `385b6cd29f9f8e7e8b3a7a682d6f537269eeac1a7c10dbd61c5385c7aa6bcd68`
**Deliverable:** `KAYAD-MASTER-CONVERGENCE-PHASE-C1-RUNTIME-CERTIFICATION-20261021.zip` (SHA-256 in the sibling `.sha256` file)
**Production changes:** none. **Push / merge / deploy:** none. **Production writes:** none. Production was read only for metadata
(release/health endpoints, table names, applied-migration history).

Supporting reports (`reports/phase-c1/`): `PHASE_C1_BASELINE.md`, `PHASE_C1_SCHEMA_RECONCILIATION.csv`,
`PHASE_C1_SOFT_DELETE_CALLSITE_INVENTORY.csv`, `PHASE_C1_TEST_RESULTS.md`, `PHASE_C1_CHANGE_LEDGER.md`,
`PHASE_C1_REMAINING_DEFECTS.md`, `PHASE_C1_STAGING_RUNBOOK.md`, plus `logs/`, `evidence/`, `screenshots/`, `tools/`.

---

## 1. Summary

Phase C.1 is the first run of this checkpoint with a **real database**. Phase C's shared null-filter change was correct, but
it introduced one backend test failure. Running the public read paths against PostgREST also exposed defects that Phase C's
static sweep could not see:

1. **Soft-deleted vehicles stayed public.** `Car.softDelete()` stamps `deleted_at` but keeps `status`, while the public
   listing, vehicle detail, vehicle sitemap and search filtered on `status: "available"` only. A dealer-deleted car remained in
   the marketplace. **Fixed and proven** (red 14/21 → green 21/21 on PostgREST; HTTP; browser).
2. **No Redis cache invalidation worked in production.** `cacheDelPattern` used a node-redis call shape on an ioredis client;
   every call threw and was swallowed. Production uses Redis (`render.yaml` → `kayad-redis`). Separately, the anonymous public
   listing cache (`vehicle_search:*`) was never invalidated by any mutation, and three delete/hide paths invalidated nothing.
   **Fixed and proven against a real Redis.**
3. Model adapter `$ne: null` raised PostgreSQL 22007; the cache-hit-rate SLI threw on every tick. **Fixed.**

The full migration chain (184 migrations) was applied to an empty PostgreSQL for the first time: **184/184 apply**. The schema
reconciliation answers the "87 vs 100" question with database evidence. It shows the real risk is **production schema drift in
both directions** (§5): this is the main blocker for production review.

## 2. Foundation, provenance and environment

See `PHASE_C1_BASELINE.md`.
- No `.sha256` was supplied with the ZIP, so the hash could not be checked against an expected value (**NOT VERIFIED**).
- Provenance was proven instead: the ZIP equals the Phase B release (`68c55272…`) plus exactly the 16 modified and 5 added files
  that Phase C declares, with no deletions.
- Remote `main` is `2e9e098` (Phase B), deployed to both the frontend (`release.json`) and the backend (`/health`); the
  Phase B skew is resolved.
- `main` also carries two stray files committed with Phase B (R-11).
- Runtime: Node v22.22.2 (official binary), npm 10.9.4, Linux x86_64. `npm ci` (root + backend) PASS; all four manifest
  hashes are unchanged by installation and by Phase C.1.

## 3. Commands, exit codes and results

Full table in `PHASE_C1_TEST_RESULTS.md` (all from a fresh extraction of the candidate + `npm ci`).

| | Phase C as supplied | Phase C.1 |
|---|---|---|
| Typecheck / build | PASS / PASS | **PASS / PASS** |
| Frontend Vitest | 759 + 1 skipped | **759 + 1 skipped** |
| Backend Jest | **FAIL** 2,569/2,570 | **PASS 2,573/2,573** (153 suites) |
| Backend Vitest / node:test | 36/36, 1/1 | **36/36, 1/1** |
| `validate:*` | 131 PASS / 4 FAIL | **132 PASS / 4 FAIL** (same 4, outside all gates) |
| CI + deploy workflow replay | — | **35/35 steps exit 0** (incl. both `npm audit` gates, secret scan) |
| Migration chain (disposable PG16) | — | **184/184** |

## 4. Failures, root causes and corrections

| ID | Failure | Root cause | Correction | Before → after |
|---|---|---|---|---|
| C1-D0 | Backend Jest `stage5f5CommandCenterSnapshot` | Phase C changed the controller filter literal; the parity test pinned the old literal | Expected literal updated; assertion still exact. Equivalence proven against PostgREST | FAIL → PASS |
| C1-D1 | Soft-deleted vehicles in public listing, pagination totals, detail page, vehicle sitemap, search/facets/suggestions | `softDelete` keeps status; public paths filtered status only; Phase C's sweep only converted existing `deletedAt` filters | Add `deletedAt: {$exists:false}` to the four public paths; `getCar` 404s deleted listings except for owner/staff | 14/21 → 21/21; HTTP P9–P14; UI U2–U4 |
| C1-D2 | Model `{ $ne: null }` → `22007 invalid input syntax for type timestamp: "null"` | `.neq(col, null)` sends the string "null" | `IS NOT NULL`, matching `db/index.js` | FAIL → PASS |
| C1-D3 | Redis pattern invalidation deletes nothing | ioredis `scan` called with node-redis signature; error swallowed | Positional `SCAN … MATCH … COUNT`, `[cursor, keys]` | real Redis 0/2 → 2/2 |
| C1-D4 | Deleted/edited vehicles stay in the anonymous public listing until TTL; admin delete, user delete and duplicate removal invalidate nothing | Listing cache key `vehicle_search:*` never invalidated; `invalidateVehicleSearchCache` imported but never called | `utils/publicListingCache.js` helper used by all 9 listing-mutation sites | HTTP P9 FAIL → PASS |
| C1-D5 | "SLI computation failed" on every reliability tick | Code read `metric.other.other`; config defines `metric.denominator.other` | Correct path | Jest FAIL → PASS; boot log clean |
| C1-T1 | Phase C validator scanned `backend/node_modules` (~14k files) when dependencies are installed | Directory walk had no exclusion | Exclude `node_modules`; add checks for C1-D1/D2 | — |

## 5. Schema reconciliation (`PHASE_C1_SCHEMA_RECONCILIATION.csv`, 394 rows)

**Sources (all recorded under `reports/phase-c1/evidence/`):**
- **Repository schema:** introspection of a disposable database built from all 184 migrations (205 tables), 2026-10-21.
- **Production metadata (read-only, 2026-10-21):** `list_tables` (209 tables) and `list_migrations` (135 versions) for
  `ubvgixwhfybbyjuvxboj`.
- **Live code:** the backend module graph from `bootstrap.js` (554 reachable files).
- **Staging:** none exists, so every staging column is `BLOCKED_NOT_VERIFIABLE`.

| Classification | Rows | Meaning |
|---|---|---|
| ALIGNED | 185 | In repository migrations **and** production (75 model tables; 53 used only via SQL functions/RPC) |
| DDL_MISSING_FROM_REPOSITORY | 87 | 24 exist in production but no repository migration creates them (production-only DDL); 63 exist nowhere and are referenced by reachable code |
| OBSOLETE_OR_UNREACHABLE | 76 | Referenced only by code not reachable from `bootstrap.js` |
| MIGRATION_EXISTS_NOT_APPLIED | 20 | Repository migration exists; table absent from production (14 used by reachable code) |
| RENAMED_OR_LEGACY_REFERENCE | 13 | Code names a non-existent table where a canonical one exists (e.g. `marketplace_healths` → `marketplace_health`, `notification_audits` → `notification_audit`, `disputes`, `announcements`, `subscriptions`) |
| PARTIALLY_IMPLEMENTED | 13 | DDL only in `backend/db/*.schema.sql` or a runbook candidate (Stage 5B owner governance) |

**The 87-vs-100 discrepancy is resolved:** the two counts answered different questions.
- **Of the 181 model tables, 105 are not created by any migration** (authoritative: the migrations were executed).
- **101 have no `CREATE TABLE` anywhere** in the repository. This is Phase C's question; its regex found 100.
- **89 are absent from both the migrations and production.** This is Phase 0's question; its regex found 87.

Neither count means "create 100 tables": per-table actions are in the CSV.

**Migration history:**
- 97 repository migrations are recorded in production history under the same version, and 21 under a different version.
- **66 repository migrations do not appear in production history**, including RLS and privilege hardening such as
  `20261011093100_enable_rls_remaining_public_tables` and `20261011120000_client_role_least_privilege`.
- **38 production migrations have no repository file.**
- Some effects exist out-of-band (for example `idempotency_audit_logs`), so object-level comparison on staging is required
  before any claim about those security migrations.

No migrations were generated or applied: every gap needs data-contract and RLS review (runbook §E).

## 6. Soft-delete certification (`PHASE_C1_SOFT_DELETE_CALLSITE_INVENTORY.csv`)

- Source references: 63 across 21 files: 42 active-only filters, 6 soft-delete writes, 3 deletion stamps, 2 visibility
  decisions, 10 other references.
- Unsafe explicit-null filters: **0**. Only `cars`, `users` and `profiles` have `deleted_at`, and every active-only filter
  targets `cars`, so no filter is applied to a table without the column.
- A nullable-filter AST scan (`evidence/nullable-filter-scan.csv`) found **no caller that relied on "`null` means no filter"**.
  The optional-filter routes guard with `if (status)` and similar. Several callers are corrected by Phase C's semantics
  (`deactivatedAt: null`, global feature flags `country: null`, and the `$ne: null` reconciliation and anomaly queries that
  previously sent `neq.null`).

**Runtime results (real PostgREST + PostgreSQL), against the prompt's 12 requirements:**

| # | Requirement | Result |
|---|---|---|
| 1, 2 | Active vehicles listed; soft-deleted excluded | **PASS** (data layer, HTTP P1/P9, UI U4) |
| 3 | Sitemap excludes soft-deleted vehicles | **PASS** (data layer, HTTP P14) |
| 4 | Soft-deleted listings excluded from dealer limits (documented rule) | **PASS** (`listingsUsed` = 2) |
| 5 | Authorised history can read deleted rows | **PASS** (service layer `$exists:true`; owner/admin detail 200: HTTP P12/P13) |
| 6 | Unauthorised users can't see deleted rows or another dealer's data | **PASS** (public/other-dealer 404 P10/P11; my-listings isolation P15; anon/authenticated PostgREST RLS deny-all on `cars`) |
| 7 | Tables without soft-delete columns unaffected | **PASS** (`users.deactivated_at`, `payments.car_id` null filters) |
| 8 | Explicit null / undefined / omitted / non-null filters | **PASS** (`$eq`, `$ne`, `$and`, `$or`, `$exists`) |
| 9 | Pagination and counts agree | **PASS** |
| 10 | Concurrency | **PASS** (8 concurrent soft-deletes → exactly one stamp; concurrent creates and deletes keep `count` = rows) |
| 11 | Auction, escrow, payment and ledger not weakened | **PASS** (all backend suites; 5F.10 46/46; DB refused a reused payment reference) |
| 12 | Ownership and RLS enforced | **PASS** (RLS enabled on all 205 tables; PostgREST role checks) |

## 7. Identity, authorisation and financial regression

- Backend suites cover auth, CSRF, JWT, sessions, RBAC, ownership, payments, ledger, escrow, auctions and disputes: 2,573 Jest,
  36 Vitest and 1 node:test, all passing.
- **New HTTP authorisation matrix: 30/30.** Anonymous, buyer, dealer, moderator, admin and non-owner superadmin were checked
  against listing writes, CSRF, admin users, the Command Centre snapshot (its count equals the database's active rows), the
  owner-only staff catalogue, owner governance, a forged JWT and `adminOrSuper` deletes.
- **Stage 5F.10 custody: 46/46. Chat integrity: 1/1.**
- **Not verified:**
  - live M-Pesa, payment gateway and provider delivery (by policy);
  - real owner-membership flows, because the governance tables exist only as a candidate migration (R-06);
  - registration and onboarding through the browser (the onboarding Playwright spec is in the legacy opt-in set).

## 8. Browser and runtime results

The real SPA ran against the real backend in Chromium, with the network locked to loopback, at desktop (1280) and phone (390)
widths.

| Suite | Result | Notes |
|---|---|---|
| New C.1 journeys | **25/27** | Public home and marketplace; active and deleted vehicle; Command Centre; **CMS Content Studio renders** (the Phase B build fix proven in a browser); staff restriction; dealer hub; buyer denial; no horizontal overflow on phones |
| Stage 5F.10 journey | 21/23 | Selector-updated scratch copy |
| Default Playwright suite | 37/40 frontend-only, 35/40 with backend | |

- **Every** browser failure is classified:
  - `GET /api/admin/alerts` returns 500 on every admin page (`admin_alerts` table exists nowhere) — R-19;
  - admin sidebar accessibility — R-21;
  - stale or mobile-mismatched specs — R-12, R-22.
- **Public-page regression:** the frontend bundle is byte-identical to Phase B (the live code) for 184/185 files; the only
  difference is the `release.json` timestamp.
- **Blocked:** Firefox and WebKit (not installed), staging, legacy opt-in suites.

## 9. Security and dependency review

- `npm audit` (high): **PASS** for root and backend.
- Secret scan: **PASS**. Diff review found no credentials or customer data; the logs were scanned for the throwaway
  local secrets used here, with none found.
- `git diff --check`: clean.
- No migration was applied to production, and nothing changed in deployment, DNS, providers or payments.
- Lockfiles are unchanged.
- No test was removed, skipped or loosened: the single changed expectation (C1-D0) stays exact. The stale existing UI harness
  was left unchanged (R-22).

## 10. Changed files

See `PHASE_C1_CHANGE_LEDGER.md`.
- **Modified (15):** `backend/controllers/{carController,bulkAdminController,duplicateController}.js`, `backend/models/_base.js`,
  `backend/routes/adminRoutes.js`, `backend/services/{searchService,sitemapService,sliTrackingService}.js`,
  `backend/utils/cache.js`, `backend/jest.config.js`, `backend/package.json`,
  `backend/tests/regression/stage5f5CommandCenterSnapshot.test.js`, `package.json`, `scripts/local-db/README.md`,
  `scripts/validate-phaseC-soft-delete-integrity.mjs`.
- **Added (13):** `backend/utils/publicListingCache.js`; 2 integration tests and 2 regression tests;
  `scripts/validate-phaseC1-runtime-integrity.mjs`; `scripts/local-db/{supabase-default-privileges.sql,rest-v1-proxy.mjs}`;
  `runbooks/phase-c1-runtime-20261021/` (HTTP matrix, UI journeys, results, staging runbook).
- **Reports:** this report and `reports/phase-c1/`.

## 11. Remaining blockers and next actions

Full register: `PHASE_C1_REMAINING_DEFECTS.md`. Production-review blockers:
- **R-01:** 20 repository tables are missing from production, 14 of them used by live code.
- **R-02:** production-only DDL is not in the repository.
- **R-03:** 66 repository migrations are absent from production history.
- **R-04:** no staging environment exists.
- **R-05:** 89 model tables exist nowhere.
- **R-19:** `GET /api/admin/alerts` returns 500 on every admin page.

**Next actions, in order:**
1. Remove the two stray files on `main` (R-11).
2. Create the staging project (runbook §B).
3. Capture production-only DDL into reviewed migrations (§E.1).
4. Apply the repository migrations to staging and run runbook §D.
5. Make the owner decisions: D1, R-05 per feature, R-19, R-20.
6. Schedule production schema reconciliation with a backup.

## 12. Release decision

**`READY FOR APPROVED STAGING`**

The checkpoint passes every repository, CI and deployment gate from a clean install. It applies its full migration chain to an
empty database, and its corrected data-integrity, cache and authorisation behaviour is proven at runtime against PostgreSQL,
PostgREST, Redis, the real backend and the real SPA. It is **not** ready for production review: production's schema diverges
from the repository in both directions (R-01–R-03), staging does not exist (R-04), and admin pages raise a 500 (R-19).

Merging to `main` deploys production automatically. The C.1 changes contain no schema change and fix live leaks, but that
merge remains your decision and is not authorised by this report.
