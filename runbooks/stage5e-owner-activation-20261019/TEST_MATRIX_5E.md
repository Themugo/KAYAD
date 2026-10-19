# Stage 5E — Test matrix (all observed; logs in `evidence/stage5e-20261019/`)

Environment tiers: **P** disposable PostgreSQL 16 (loopback); **R** disposable real stack (backend + PostgREST + PostgreSQL + Vite, stub providers); **M** mocked unit; **H** hosted read-only SELECT. No test touched a hosted or real account.

| Check | Command (working directory) | Env | Result | Limitations |
|---|---|---|---|---|
| Lockfile consistency | `npm ci --dry-run --ignore-scripts` (root, `backend/`) + package.json↔lock root-spec comparison | local | no errors; 0 spec mismatches (both lockfileVersion 3) | dry-run; no network install |
| TypeScript | `npx tsc --noEmit` | local | exit 0 | — |
| Frontend build | `npm run build` | local | exit 0 | — |
| Frontend unit | `npx vitest run` | M | 83 files, 662 passed, 1 skipped | the skip pre-exists |
| Backend Jest | `npm run test:jest` (backend) | M/P | 133 suites, 1,941 tests passed | — |
| Backend Vitest | `npm run test:vitest` | M | 6 files, 36 passed | — |
| Node test | `npm run test:node` | M | 1 pass, 0 fail | — |
| **Dealer→owner SQL activation (new)** | `bash evidence/stage5e-20261019/pg/owner_dealer_activation_pg_tests.sh` | P | **63 pass / 0 fail** | uses 5B functions as candidates (not applied hosted); the 38 hosted-only migrations absent from the baseline |
| **Single-owner HTTP journey (new)** | `node role_api_j.mjs` | R | **35 pass / 0 fail** | stub Brevo; stand-in addresses |
| Owner journey | `role_api_d.mjs` | R | 49 / 0 | same |
| Seller journey | `role_api_a.mjs` | R | 70 / 0 | same |
| Dealer journey | `role_api_b.mjs` | R | 67 / 0 | same |
| Inspector journey | `role_api_c.mjs` | R | 55 / 0 | same |
| Cross-role | `role_api_h.mjs`, `role_api_i.mjs` | R | 60 / 0, 64 / 0 | same |
| Browser journeys | `node ui_journeys.mjs` (Chromium via Playwright) | R | 35 pass / 0 fail | local SPA served by Vite dev; stubs |
| Privilege candidate | `bash …/privilege_candidate_rehearsal.sh` | P | defect reproduced (permission denied) → fixed → idempotent → rolled back | rehearsal DB forced to the *observed* hosted ACL |
| Hosted catalog re-verification | SELECT-only, 5 queries | H | 11/11 findings classified | point-in-time |

Fixes made in Stage 5E: **none to production code.** New files only (tests, candidates, docs, harness).
Previously-passing tests that now fail: **none**. Environmental skips: Brevo/SMS live delivery, hosted staging, Windows tree (see gates).
