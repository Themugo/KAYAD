# 10 — Full regression results (worktree p6, this phase's changes applied)
| Gate | Result |
|---|---|
| Typecheck (`tsc --noEmit`) | PASS |
| Production build | PASS |
| Frontend Vitest (all) | PASS — 224 files, 1,879 passed, 1 skipped, 0 failed |
| Backend Vitest | PASS — 11 files, 61 tests |
| Backend `node:test` | PASS — 34 |
| Backend Jest | Only the dealer/team suites were re-run (5 suites, 105 tests PASS: team authorization, least privilege, roles, route policy matrix, workspace delegation). **The full 14-batch Jest suite was NOT re-run**; the only backend source change is the e-mail dealership name in `dealerPlatformController.js` (plus the icon path in the previous phase). Last full result on the same base: 4,185 passed / 21 skipped. |
| DB journeys (`ci/db-journeys/run.sh`, disposable DB, 210/210 migrations) | PASS — overall=PASS, 26 journeys incl. new 17 (39 checks) |
| `validate-release`, brand-identity, PWA validators | PASS (PWA 13/13) |
| Browser: dealer workspace × 13 widths | 52 runs, 0 overflow, 0 errors |
| Browser: marketplace × 15 widths + 4 landscape | 34 runs, 0 overflow, 0 errors, column counts unchanged |
| Accessibility scans | NOT RUN |
| Validators needing Docker/credentials (3 from the earlier phase) | NOT exercised |
