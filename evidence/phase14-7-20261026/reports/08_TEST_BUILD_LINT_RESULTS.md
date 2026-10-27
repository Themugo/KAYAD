# 08 Fresh results vs 14.6 baselines (Order 10)
| Check | 14.6 baseline | 14.7 | Exit |
|---|---|---|---|
| tsc --noEmit | clean | clean | 0 |
| vite build | ok | ok | 0 |
| Vitest (frontend) | 114 files / 940 pass / 1 skipped | 114 files / **943 pass** / 1 skipped | 0 |
| Backend Jest (`npm run test:jest`) | 163 suites / 2,898 | **167 suites / 2,956** | 0 |
| Backend Vitest | 36 | 36 | 0 |
| node:test | 1 | 1 pass | 0 |
| eslint src | 0 errors / 1,565 warnings | 0 errors / 1,565 warnings | 0 |
| eslint . | 2,286 errors (legacy: scripts 2,060, runbooks 130, evidence 84, reports 12) | 2,286 errors (unchanged; scope not altered, nothing suppressed) | 1 (baseline debt) |
| validate:* | 138/143 | **139/143** | 4 fail (see 07) |
| Naming validator `--base` | 9/9 | pass | 0 |
| Dealer source checks | 26/26 | 26/26 | 0 |
| Browser views (mocked API) | 48 clean | **48 clean** at 1280/768/390; no page/console errors, no overflow, axe none | 0 |
| Navigation interruption | 0/40 | 0/20 repro, 0 in the full run | root cause still unproven; condition-based waits kept, no retry hiding |
First full run exposed an own-goal (a new named import broke three suites that mock that module); fixed by reusing the existing `findOne` import, then the full backend was re-run (numbers above are from the re-run). Two older assertions were changed deliberately to the new policy (roster needs canManageTeam) and one frontend assertion (rejected completion screen); no assertions were removed or loosened otherwise.
New tests: listingDeletionGuard 18, carSoftDeleteGuardedQuery 2, dealerTeamLeastPrivilege 32, dealerOnboardingWriteOrder 6 (backend 58), plus 3 Vitest.
Logs: evidence/phase14-7-20261026/logs/.
