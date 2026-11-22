# 13 - Regression test results (final code, worktree /home/claude/p2, base a652701)

All runs executed in the disposable sandbox with no hosted credentials. Backend Jest ran alone (`--maxWorkers=1`), never concurrently with frontend suites.

| Suite | Command | Result | Label |
|---|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 | VERIFIED |
| Frontend Vitest | `npx vitest run` | 218 files, 1,847 tests: first full run 1 failure (my changed Settings copy broke `DealerWorkflowWrites` exact-text assertion); fixed by restoring the original sentence; the two affected files re-run: 32/32 pass. The other 1,845 passed in the full run | VERIFIED (full run + targeted re-run; the complete suite was not run a second time after that one-line fix) |
| Production build | `npm run build` | exit 0 (chunk-size warning only) | VERIFIED |
| Backend Jest (14 batches) | `/home/claude/stk/jest-batches-p2.sh` | 13 batches all pass; batch 10: 1 failure in `visitorAnalytics.test.js` ("refresh inside 2 seconds"), a timing test: re-run alone 3 times = pass, FAIL, pass. Only `securityLogController.js` changed in the backend, unrelated to analytics. 21 skipped (existing skips) | VERIFIED with 1 known intermittent pre-existing flake (not fixed, test not weakened) |
| Backend Vitest | `vitest run --config vitest.config.js` | 11 files, 61 tests pass | VERIFIED |
| Backend node:test | `npm run test:node` | 34/34 pass | VERIFIED |
| DB journeys | `ci/db-journeys/run.sh` | 209/209 migrations; 20 journeys all exit 0 fails 0; overall=PASS; cleanup confirmed (db dropped, ports closed) | VERIFIED (disposable DB only) |
| Validators | `scripts/validate-*.mjs` (358) | 6 failed on first run. Fixed 2 that could not run at all: unresolved merge-conflict markers on origin/main in `validate-kayad-navbar-branding.mjs` and `validate-stage27-brand-identity-admin-editability-20261012.mjs` (kept the HEAD side, which matches current `BrandingContext`; assertions unchanged). `validate-release` (aggregate gate) then passes. Final: **355 pass, 3 fail** = `validate-communications-provider-certification` (needs provider credentials), `validate-live-runtime` (needs hosted Supabase env), `validate-local-supabase` (needs Docker): all BLOCKED by the environment, identical to the baseline run | VERIFIED 355 of 358; 3 BLOCKED |

evidence/validators-final.txt is updated to the final per-validator results.

## New tests this phase
- `securityLogFallbackRead.test.js` (3 tests, 2 fail on old code)
- `ExperienceStudioModule.test.jsx`, AdminReports (2 added), DealerSettingsCentre (1 added: verification retry)
- `legacyDealerFilesGuard.test.ts` (D-16), `adminCommandOverviewLayout.test.ts`

## Not tested
- Parallel-insert load test for listing numbering (concurrency safety rests on the `INSERT ... ON CONFLICT DO UPDATE` counter, unique index and the existing journeys; no new concurrent stress run was done).
- Real Cloudinary and M-Pesa (BLOCKED); hosted database (read-only checks only); screen reader; per-role write operations for staff.
