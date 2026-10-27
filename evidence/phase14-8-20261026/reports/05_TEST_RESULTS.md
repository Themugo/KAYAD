# Phase 14.8 - Fresh results vs baseline
| Check | Baseline 14.7 | 14.8 final |
|---|---|---|
| tsc | 0 | 0 |
| Vite build | 0 | 0 |
| Frontend Vitest | 943 + 1 skipped | 943 + 1 skipped (114 files) |
| Backend Jest | 167 suites / 2,956 | 169 suites / 2,972 (single full run) |
| Backend Vitest / node:test | 36 / 1 | 36 / 1 |
| eslint src | 0 errors, 1,565 warnings | 0 errors, 1,565 warnings |
| eslint . | 2,286 errors (legacy) | 2,286 (harness folder added to ignores; no new debt) |
| validators | 139/143 | 141/143 passing; failing: communications:providers, live-runtime (external credentials - intentionally blocked); stage24 and stage5f7 now PASS after authentic docs restored; validate:phaseC-soft-delete regressed mid-phase (used `deletedAt: null`) and was fixed |
| naming/paths validator | 0 | 9/9 PASS |
| DB E2E | n/a | 50/50 + 60/60 |
| Browser (prod build, 3 viewports) | 48 clean views | 48 views, 0 overflow, 0 serious/critical axe, 0 page errors, 29 flows, nav interruptions 0 (20/20 loads) |
Existing tests were not weakened; the one changed expectation (`status.not.in.(sold,reserved)`) follows the reserved policy and is backed by new reserved tests plus a column-contract regression test.
