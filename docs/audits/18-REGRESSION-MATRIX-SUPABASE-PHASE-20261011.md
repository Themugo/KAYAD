# Regression matrix — Supabase reconciliation phase (actual output vs foundation)

All runs used Node 22.22.2 and disposable local PostgreSQL 16 in this sandbox. **Local PostgreSQL testing only**: no disposable Supabase project and no staging. Production was inspected read-only (catalog), never exercised.
Foundation = `KAYAD-SECURITY-BOUNDARY-REMEDIATION-AND-REALTIME-INTEGRITY-20261011.zip`, extracted untouched.

| Suite | Foundation | This phase (final tree) | Status | Evidence |
|---|---|---|---|---|
| Migration chain replay, plain | 173 applied (previous evidence) | **175 applied, 0 failed** | PASS | `final-tree-delta-20261011/chain_summary.txt` |
| Migration chain replay, Supabase default privileges | not available (mode added this phase) | **175 applied, 0 failed** | PASS | same |
| Re-apply of 20261011100000 / 120000 / 121000 (idempotency), both modes | — | 6/6 OK | PASS | `final-tree-delta-20261011/reapply.txt` |
| Client TRUNCATE/REFERENCES/TRIGGER grants after the chain (defaults mode) | (production: 72 tables) | **0 tables** | PASS | `client_truncate_refs_trigger_count.txt` |
| `validate-supabase-migrations.mjs` | PASS | PASS | PASS | `final-tree-delta-20261011/validate_supabase_migrations.txt` |
| Backend Jest | 75 suites / 1,090 tests pass | **78 suites / 1,145 tests pass** (+55: 8 store, 13 inventory, 33 fieldMap, 1 legacy-transactions) | PASS | `final-tree-delta-20261011/be_jest.txt`, `foundation_be_jest.txt` |
| Backend Vitest | 16/16 | 16/16 | PASS | `certification-20261011/be_vitest.txt` |
| Backend node:test | 1/1 | 1/1 | PASS | `certification-20261011/be_node.txt` |
| Frontend Vitest | 622 pass, 1 skipped | 622 pass, 1 skipped | PASS (unchanged) | `certification-20261011/fe_vitest.txt` |
| `tsc --noEmit` / `vite build` | exit 0 / built | exit 0 / built | PASS | `certification-20261011/tsc.txt`, `vite_build.txt` |
| Real-database harness (`node --test`, real `server.js`) | 90 tests: 89 pass, 1 skip (with the old test-only `transactions` shim) | **119 tests: 118 pass, 0 fail, 1 skip** (no shim, Supabase default privileges) | PASS | `final-tree-delta-20261011/harness.txt` |
| — `m5-financial-webhooks` without the shim | **3/7** (every payment callback 500 `relation "public.transactions" does not exist`) | 7/7 | PASS (fixed) | `supabase-reconciliation-20261011/BEFORE-m5-…log` |
| — `m13-auction-security-payments` | **1/5** | 5/5 | PASS (fixed) | `BEFORE-m13-…log` |
| — `m10-rls-supabase-defaults` | **6/12** | 13/13 | PASS (fixed) | `BEFORE-m10-…log` |
| — `m11-schema-drift-fixes` | **0/2** | 2/2 | PASS (fixed) | `BEFORE-m11-…log` |
| — skipped test | D-MSG-4 crash-window (proven by `m8` #4 instead) | same | unchanged, by design | |
| P0 Messages redirect matrix (real Chromium), prod bundle / dev | 19/19, 19/19 | 19/19, 19/19 | PASS (preserved) | `certification-20261011/matrix_prod.txt`, `matrix_dev.txt` |
| Realtime host probe (real Chromium) | — | cross-host: connects but **anonymous** (no cookie to socket host); same-host: authenticated delivery | diagnostic (RT-3 reproduced, not fixed) | `certification-20261011/browser/realtime-host-probe.json` |
| Route schema crawl (626 GET routes, migration-built DB) | — | 205 × 500 (missing tables/columns; see `08-…` §3) | diagnostic | `certification-20261011/schema/route-schema-crawl.json` |
| Custom validators (105) | 101 pass, 4 fail | 101 pass, same 4 fail | unchanged | `certification-20261011/validators/index.txt` |
| Repository Playwright e2e (chromium, no backend) | 5 pass / 14 fail | **5 pass / 14 fail, identical test by test** | unchanged | `certification-20261011/e2e-rerun-isolated.txt` |

## Note on the e2e run inside the battery
The first e2e run in the full battery reported 2 pass / 17 fail. That run started right after the browser matrix and the realtime probe, with the
dev server under load. Three marketplace-controls tests failed with elements detaching during re-render and with empty dropdowns.
The frontend source, e2e specs and Vite config are **byte-identical** between the foundation and this tree, because this phase changed no frontend file.
Re-run in isolation:
- marketplace-controls on the foundation tree gave 3 pass / 4 fail, and on this tree **the same 3 pass / 4 fail**, run back to back.
- The full suite on this tree gave **5 pass / 14 fail**, the same tests as the foundation baseline.

The battery log is kept as `e2e-battery-run-under-load.txt`, and the 2/17 result is classified as environmental. This is not hidden: both runs ship.

## Not run
- Disposable Supabase project.
- Staging.
- Cloudinary signed-delivery enforcement.
- M-Pesa sandbox.
- GoTrue sign-up setting.
- Multi-instance Socket.IO.

These are covered by `17-STAGING-CERTIFICATION-CHECKLIST-SUPABASE-20261011.md`.
