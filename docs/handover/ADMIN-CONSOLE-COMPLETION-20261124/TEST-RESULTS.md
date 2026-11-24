# Test Results (2026-11-24) — local disposable environment only; NOT production evidence

| Suite | Result | Baseline | Status |
|---|---|---|---|
| `tsc --noEmit -p .` | exit 0 | clean | Fixed and verified |
| Vitest (full) | 230 files passed; 1993 passed, 1 skipped (1994) | 1983 / 1 skipped | Verified (+10 new tests) |
| Jest (full, backend) | 265 suites passed, 1 skipped; 4344 passed, 21 skipped (4365) | 4323 / 21 skipped / 264 suites | Verified (+21 tests, +1 suite) |
| `npm run build` | exit 0 | exit 0 | Verified |
| DB journeys (`ci/db-journeys/run.sh`, fresh DB, 215/215 migrations) | 37/37 PASS (`overall=PASS`); new: 27_customer_care (47 checks), 28_support_and_moderation (16 checks) | 35/35 | Verified |
| Browser `admin-console.mjs`, 7 widths | 56/56, run twice | 56/56 | Verified |
| Browser `admin-sweep.mjs` | 212 checks; 0 crashes / page errors / error boundaries / overflow; Super Admin 53/53 opened | 212 | Verified |

## Notes
- One Vitest run (during the heavy concurrent run) reported 1 failure in `PublishedDesignRuntime.test.tsx` (branding colour assertion). A file this task did not touch; it passed 3/3 in isolation and the full suite re-run passed 230/230. Classified as a load-related timing flake; recorded, not suppressed. Risk: may recur under load.
- One earlier 4-width browser run failed 1/32 on `403 /api/analytics/collect` (nonessential guest beacon; see UI-UX-RESPONSIVE-AUDIT.md); 2 later runs 56/56.
- Skips are pre-existing (Vitest 1, Jest 21 tests / 1 suite).
- Evidence: `evidence/vitest-final-full.txt`, `evidence/jest-summary.txt`, `evidence/journeys-final.txt`.
- Not run (by instruction or lack of dependency): hosted/production tests, real e-mail/SMS/payment providers, broadcast sends, panic/recovery actions.
