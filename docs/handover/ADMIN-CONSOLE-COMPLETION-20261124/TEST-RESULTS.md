# Test results (2026-11-24, finalisation phase) — local disposable environment only; NOT production evidence

Final run after the last code change (UI access mirror + migration revoke). Baselines are the previous handover's numbers.

| Suite | Result | Baseline | Status |
|---|---|---|---|
| `tsc --noEmit -p .` | exit 0 | clean | PASS |
| Vitest (full) | 231 files passed; **2004 passed, 1 skipped** (2005) | 1983 / 1 skipped | PASS (+21 tests) |
| Jest (full, backend, run alone) | **265 suites passed, 1 skipped; 4345 passed, 21 skipped** (4366) | 4323 / 21 skipped / 264 suites | PASS (+22 tests, +1 suite) |
| `npm run build` | exit 0 | exit 0 | PASS |
| DB journeys (`ci/db-journeys/run.sh`, fresh DB, 215/215 migrations) | **38/38 PASS** (`overall=PASS`); new: 27 (47 checks), 28 (16), 29 permission matrix (114) | 35/35 | PASS |
| Browser `admin-console.mjs`, 7 widths | 56/56, run twice after the final UI change | 56/56 | PASS |
| Browser `admin-sweep.mjs` | 212 rows; 0 crashes / page errors / error boundaries / overflow; Super Admin 53/53 at 1440 and 390; moderator 26 open / 27 denied | 212 checks | PASS |

Skips are unchanged (Vitest 1; Jest 21 tests, 1 suite). No test count decreased.

## Environmental limitations and flakes (recorded, not suppressed)
1. **Jest killed by the kernel (exit 137, cgroup OOM)** when run in the same chain right after the journeys' backend stack. Re-run alone: 265/265 suites passed. Class: test-environment limitation (memory). Risk: running Jest concurrently with other heavy processes can be killed; the project note "parallel runs OOM" applies.
2. **Vitest `PublishedDesignRuntime.test.tsx`** failed once in an earlier full run under load (branding colour assertion), passed 3/3 alone and in the final full run. Class: load-related flake in a file this task did not touch.
3. **Sweep runs**: one crashed ("browser closed", environment); one false-positive on Super Admin from the detector matching audit rows titled "Access Denied" (fixed in the harness, see DEFECTS D12). Final sweep valid.
4. **Browser start race**: an early admin-console attempt read credentials before the freshly started stack finished seeding (401 on login, 5 checks failed). Class: test-environment race; two reruns 56/56.
5. `403 /api/analytics/collect` once at 390px (nonessential guest beacon); not reproduced.

## Coverage statements
- A page that only opens is **not** counted as verified. Per-route state is in `53-ROUTE-AUDIT-MATRIX.md`; 16 of 53 routes have a workflow verified by a journey or test; the others are labelled PARTIAL / NOT VERIFIED / NOT PROVISIONED.
- Not run: hosted/production tests; real e-mail, SMS, payment or broadcast sends; panic/recovery actions.

Evidence files: `evidence/vitest-final-full.txt`, `evidence/jest-summary.txt`, `evidence/journeys-final.txt`, `evidence/permission-matrix-read.json`, `evidence/migration-rehearsal-output.txt`.
