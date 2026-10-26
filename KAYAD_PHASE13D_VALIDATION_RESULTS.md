# KAYAD Phase 13D — Validation Results
All commands run in the separate working copy; logs are in `validation-logs/` inside the package. Baseline = pristine foundation before any edit.

| Check | Command | Baseline | After 13D | Verdict |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0, no output | exit 0, no output | no regression |
| Production build | `npm run build` | exit 0 (built in 2.98s) | exit 0 (built in 2.75s) | no regression |
| Frontend tests | `npx vitest run` | 103 files, 808 passed, 1 skipped | 103 files, 808 passed, 1 skipped | identical |
| ESLint | `npx eslint src` | exit 1: 5 errors, 1,556 warnings | exit 1: 5 errors, 1,556 warnings | identical (pre-existing) |
| Backend authorization subset (12 suites) | jest `--runInBand` | 351 passed | 12 suites still pass (inside the 14-suite run below) | no regression |
| Backend subset + `leadManualCreateAuthorization` + new 13D suite | jest `--runInBand` | n/a | 14 suites, **554 passed**, exit 0 | pass |
| New 13D suite alone | jest | pristine code: **73 failed / 100 passed** (173) | **173 passed** | fails before, passes after |
| Full backend Jest suite | `jest --forceExit --maxWorkers=4` | not run at baseline | 154 suites, **2,747 passed**, exit 0 | pass (no failures to separate) |
| Validators (18) | `npm run -s validate:*` | 17 pass; `stage5f7-private-auction-contract` exit 1 | 17 pass; same one fails (exit 1) | identical; the failure is pre-existing (a relocated document path) |

## Honest notes on the runs
- My first post-change `tsc` used `-p tsconfig.app.json` (a different project file than the baseline command) and reported legacy unresolved-module errors; the baseline command `npx tsc --noEmit` was then run and exits 0. The first output was overwritten by the correct run.
- My first post-change ESLint ran over `.` (scripts and runbooks included) and reported 2,250 errors; the baseline scope is `src`. Re-run with `npx eslint src`: identical to baseline. The backend directory is excluded by the ESLint config, so the changed backend files were not linted (a direct run reports "ignored").
- The first full-fix attempt (router-wide guard) failed 7 existing tests; that is recorded in the defect reproduction and ledger. The shipped state passes them.
- Test-generated empty directories (`logs/`, `backend/uploads/`) were removed before packaging.

## Not exercised (no certification claimed)
Backend Vitest and `node:test` runners (the Jest runner covers 154 suites); Playwright/e2e; real database, RLS, cookies/CSRF on a real domain, email/OTP; any browser or rendered-UI check; staging and production.

## Command log (exit codes)
`validation-logs/` holds: `pre-*.txt/.exit` and `post-*.txt/.exit` for tsc, build, vitest, eslint and backend authz; `new-tests-BEFORE-fix.txt`, `new-tests-AFTER-fix.txt`; `post-backend-full.txt/.exit` (0); `post-validators.txt` and per-validator `post-val-*.txt`.
