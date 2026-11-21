# Test results (final, after the last code change)

All runs on the sandbox against a **disposable** PostgreSQL 16 / PostgREST / Redis stack built from this worktree's migrations. No hosted database was written to.

| Suite | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | pass (rc 0) |
| Frontend Vitest (full) | `npx vitest run` | 214 files, **1825 passed**, 1 skipped (pre-existing) |
| Frontend (re-run of touched areas after the final brand edit) | `npx vitest run src/__tests__/context src/__tests__/pages/dealer` | 29 files, 201 passed, 1 skipped |
| Build | `npm run build` | pass |
| Backend Jest (266 files, 14 batches of ≤20, `--maxWorkers=1`) | `node --max-old-space-size=3072 --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --maxWorkers=1 <20 files>` | all batches pass; `evidence/backend-jest-batches.txt`. Batch 06 first showed 1 failure (`listingDeletionGuard`: my guard changed the delete error code); fixed, the file re-run = 20/20. One suite (21 tests) is skipped by its own design, as before |
| Backend Vitest | `npx vitest run --config vitest.config.js` (in `backend/`) | 11 files, 61 passed |
| Backend node:test | `node --test --test-force-exit tests/response-lifecycle.test.js tests/node/personalListingEligibilityProjection.test.js tests/node/dealerLifecycleUnits.test.js` | 32 passed |
| Database journeys (fresh DB, real HTTP) | `ci/db-journeys/run.sh` (with `POSTGREST_BIN`) | 209/209 migrations; **18/18 suites pass**, overall PASS (`evidence/run-sh-full.log`, `evidence/journeys/`). New: 09 (51 checks), 10 (19). Race tests: 12 sale-vs-escrow and 8 sale-vs-settlement concurrent rounds, zero violations |
| Brand migration on a scratch DB | see `evidence/brand-migration-result.txt` | variants fixed, others untouched, 2nd run no change |
| Validators | `for f in scripts/validate-*.mjs; do node $f; done` | 352 of 358 pass. 6 fail identically on untouched `origin/main` 1eb1489 (so not caused by this work): `communications-provider-certification`, `kayad-navbar-branding`, `live-runtime` (needs `SUPABASE_URL` / key), `local-supabase`, `release` (aggregates the others), `stage27-brand-identity-admin-editability-20261012`. One brand validator (`kayard-brand-identity-phase2`) failed because of my first edit of `BrandingContext`; the source was corrected (the pinned statement is kept) and the validator passes. |

## Bugs found by this testing in my own work (fixed)
1. Settlement guard blocked the normal payment-driven `paid` transition → journey 05 failed → guards narrowed to owner-completed sales.
2. Sold-listing delete returned the wrong error code → `listingDeletionGuard` failed → removal keeps its established contract.
3. Sidebar height was measured once and was wrong at some viewports (twice) → observer + polling; final measurement passes.
4. A brand validator pins the source text → kept the pinned statement and added the broader normaliser next to it.

## Not tested / blocked
Real Cloudinary upload (BLOCKED, no credentials); the 30 named journeys individually (see OPEN-ISSUES D-10); dark mode; full screen-reader pass; staff workspace UI (DealershipWorkspace); hosted environment behaviour.
