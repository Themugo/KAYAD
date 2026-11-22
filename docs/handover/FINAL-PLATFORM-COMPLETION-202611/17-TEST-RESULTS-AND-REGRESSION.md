# 17 - Test results and regression (final code: 0400502 + this phase's changes, uncommitted)

All gates were run on the final code. No test was weakened or skipped to obtain a pass; the one change to an existing test file only adds tests (`DealerSectionContracts.test.tsx`).

| Gate | Result | Evidence |
|---|---|---|
| Frontend typecheck (`tsc --noEmit`) | PASS | `evidence/test-logs/g-typecheck-tail.txt` |
| Frontend Vitest (full) | PASS: 220 files, 1,855 passed, 1 skipped (pre-existing) | `g-vitest-tail.txt` |
| Frontend production build | PASS | `g-build-tail.txt` |
| Backend Jest, 14 batches run alone, `--maxWorkers=1` | PASS: 14 of 14 batches rc=0; 4,165 tests passed; 21 skipped (1 suite, pre-existing) | `backend-jest-summary.txt` |
| Backend Vitest | PASS: 11 files, 61 tests | run output |
| Backend `node:test` | PASS: 34 of 34 | run output |
| Validators `scripts/validate-*.mjs` | 358 of 358 exit 0 | `validators-summary.txt`. Note: `validate-local-supabase` reports it cannot reach Docker yet exits 0 (it tolerates the absence); treat that one as NOT EXERCISED |
| DB journeys on a disposable PostgreSQL 16 database (209/209 migrations, real PostgREST and backend) | PASS (overall=PASS): legacy j1-j10, 03, 05, 06, 07, 08, 09, 10, 11, 12, plus the two new journeys 13 (listing-number stress) and 14 (staff write denial matrix) | `db-journeys-summary.txt` |

## New tests this phase
`DealerSectionContracts.test.tsx` (+2: dashboard 403/401, leads 403), `AdminRouteInventory.test.ts` (5, with a snapshot pinning the 19 unlinked routes), `singleEscrowTimeline.test.ts` (2), journeys 13 and 14.

## Flaky tests
`backend/tests/**/visitorAnalytics.test.js` is a pre-existing timing-sensitive test (reproduced earlier as pass, fail, pass); it passed in this run. Not modified. Listed as RISK-04.

## Not run
Hosted/staging database tests (BLOCKED, doc 14), real Cloudinary and Daraja (BLOCKED, docs 10 and 11), browser accessibility and visual re-run on final code (docs 07 and 16), screen reader.
