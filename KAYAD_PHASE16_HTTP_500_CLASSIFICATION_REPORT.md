# KAYAD Phase 16 — Classification of the HTTP 500 route-probe results

Method: all 786 mounted privileged/admin-prefixed routes × 16 roles were probed on the **final tree** against a **fully migrated disposable PostgreSQL** (all 188 repo migrations replay with 0 failures → 208 tables; Supabase compatibility shim documented). Each route that returned a 500 was re-called as an authorised admin while the backend log was captured, and classified by the logged cause. Data: `KAYAD_PHASE16_ROLE_ROUTE_PROBE_MATRIX.csv` (full matrix) and `KAYAD_PHASE16_HTTP_500_CLASSIFICATION.csv` (one row per route).

## Result
Phase 15 reported 239 routes with a 500 on a *minimally* migrated DB. On a *correctly* migrated DB the count is **238** — the migration level was not what produced most of them.

| Class | Routes | Meaning | Security finding? |
|---|---:|---|---|
| `missing_schema:table` | **146** | handler queries a table that no repo migration creates. 126 of these tables are **also absent from hosted production** (feature not provisioned anywhere); 20 exist hosted but not in repo migrations (migration-history drift) | No (reachability/availability defect) |
| `application_exception` | **66** | code defects reached only after authentication/authorisation passed: `ReferenceError: FeatureFlag is not defined` (7), `DealerHealthScore.getTopDealers is not a function`, `s.replace is not a function`, “required”/“not found” conditions returned as 500 instead of 400/404, PostgREST embed errors, 21 with a generic logged “Server Error” | No authorisation failure; correctness defects |
| `invalid_fixture` | **25** | the probe sent an empty body to a handler whose NOT NULL column/validation rejects it — probe limitation | No |
| `missing_schema:column` | **1** | column absent from repo schema | No |

**None of the 238 is an authorisation bypass.** In every case authentication and the route guard ran first. 4 of the 238 are anonymous-reachable routes returning 500 (not 2xx) and 30 are signed-in-user routes with no role guard that fail because their table does not exist; those need authorization tests *before* their tables are ever provisioned (notably `/api/organizations/:id/*`, which has authentication but no role guard).

## Phase 16 effect on the matrix (before vs after the new gates, same 786 routes)
Exactly **15 routes** changed, all intended: communications admin read/write/retry (10) and ledger reads (5) now return 403 to staff who lack the relevant permission (previously 200/404/500 to all 9 staff roles). 0 anonymous 2xx on authenticated routes. 500 count unchanged (238) — the gates did not mask or create any.

## Dispositions
* **Not fixed in this phase** (stated scope: classify, don't hide): the 66 application defects and 146 unprovisioned-table routes are recorded for a dedicated hardening phase; fixing them requires product decisions (do these features ship?) and, for the tables, new reviewed migrations.
* **Recommendation:** gate unprovisioned features behind a feature flag that returns 404/501 rather than 500; add role guards to `/api/organizations/*` before provisioning.
