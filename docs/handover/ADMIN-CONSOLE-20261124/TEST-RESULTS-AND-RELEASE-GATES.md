# Test results and release gates (local only, 2026-11-24, second pass)

| Check | Result |
|---|---|
| `npx tsc --noEmit -p .` | VERIFIED exit 0 |
| `npx vitest run` | VERIFIED 230 files; 1983 passed, 1 skipped, 0 failed |
| `npm run build` | VERIFIED exit 0 (chunk-size warning only) |
| backend Jest (alone, maxWorkers=2) | VERIFIED 264 suites passed (1 skipped); 4323 passed, 21 skipped, 0 failed |
| DB journeys `ci/db-journeys/run.sh` (disposable local DB) | VERIFIED 35/35, overall PASS, incl. `26_admin_console` 22/22 |
| Browser admin console (`ci/browser/admin-console.mjs`) | VERIFIED 56/56 at 7 widths (hero, shell, no overflow) |
| Browser route sweep (`ci/browser/admin-sweep.mjs`) | VERIFIED 212 rows; 0 crashed, 0 page errors, 0 error boundaries, 0 overflow; Super Admin opens 53/53; moderator denied 33, opens 20; 13 routes with API 500 (schema gaps) |
| Console errors | 4 baseline per page, environmental (offline external resources / refused connections / 404 / 401); not triaged individually |
| Hosted/production behaviour, email delivery, PR 266 | NOT VERIFIED |
| Schema-gap pages end to end, studio pages' workflow depth | NOT VERIFIED |

Local results are not production results. Not production-ready.
