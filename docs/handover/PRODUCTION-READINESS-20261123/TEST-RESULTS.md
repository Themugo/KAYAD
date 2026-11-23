# Test results — actual runs only (2026-11-23)
Environment: sandbox, Postgres 16.15, PostgREST 12.2.3, Redis 7.0.15, Node 22.23.4; tree = `main` @ `51f30b6d` plus the changes listed in `README.md` ("Changes made"). **Local results; not production verification.**

| Run | Command | Result | Evidence |
|---|---|---|---|
| Backend unit/regression, full | `node --max-old-space-size=3072 --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --maxWorkers=2 --silent` | **255 suites passed, 1 skipped; 4,222 tests passed, 21 skipped; exit 0** (previous baseline 254/4,216; +1 suite, +6 tests = the new regression file). A first attempt was killed (exit 137, out of memory, no results) and was rerun | `evidence/backend-jest-full-2026-11-23.txt` |
| New regression test | `jest tests/regression/dbOrRangeOperators.test.js tests/regression/phase13gSearchQueryTranslation.test.js` | 14/14 pass. **Against the original `db/index.js` the new file fails and prints exactly the live defect string `updated_at.eq.[object Object],created_at.eq.[object Object]`**; with the fix it passes | this session |
| DB Journeys, clean full run | `ci/db-journeys/run.sh` | **migrations 211/211; overall PASS; all 29 journeys exit 0, 0 failures** | `evidence/db-journeys-clean-*` |
| DB Journeys, first attempt | same | FAILED (13–18, 06, 20, 08) — **invalid: caused by my concurrent `ALTER ROLE authenticator` and extra PostgREST on the shared cluster**; discarded | `evidence/db-journeys-run1-INVALID-*` |
| Replica rehearsals (hosted-shaped schema) | see `replica-validation/` | Registration restore and listing idempotency: all checks PASS, catalog diffs exactly as expected | `replica-validation/evidence/rehearsal-results.txt` |
| PostgREST reproductions (hosted-shaped schema) | loopback PostgREST | 4-arg listing RPC → PGRST202; 3-arg → executes; replay lookup on `cars.creation_idempotency_key` → 400/42703; registration RPC → 2F005/HTTP 400 | `LISTING-RPC-COMPATIBILITY.md`, `LOGIN-ROOT-CAUSE.md` |
| Lifecycle RPC without dependencies | offers core + `20261121160000` on hosted-shaped DB | RPC fails: `relation "public.purchase_outcomes" does not exist` | `MIGRATION-DEPENDENCY-GRAPH.md` |

## Not run (NOT TESTED)
Frontend suites (no frontend file changed); a reduced-group offers journey on the hosted-shaped schema; E4 synthetic financial regression specifically against the hosted-shaped schema (the full-chain journeys cover the repo's own financial scenarios on a clean database only); password reset and email-verification callback in a live browser; real email delivery; anything on production.
