# Test matrix: exact commands and actual outcomes (runtime-convergence phase)

**Environment:** sandbox Linux, Node **22.22.2**, disposable local **PostgreSQL 16**, Chromium (Playwright).

**Levels:**
- **local**: PostgreSQL, real `server.js`, real browsers.
- **mocked**: unit tests with stubs.
- **production**: read-only catalog only.

No disposable Supabase project and no staging were used (`23-…`).

**Battery script.** `evidence/runtime-convergence-20261011/battery-p2.sh`; the evidence is in `evidence/runtime-convergence-20261011/final-regression/`. Shorthand used in the commands below:
- `R` is the repository root.
- `H` is `docs/messaging-consistency-audit/harness`.
- Databases `k9_*` are fresh replays of `supabase/migrations`; `k9_main` and `k9_crawl` use `SUPABASE_DEFAULT_PRIVILEGES=1`.

| # | Check | Command | Baseline (previous phase) | Outcome now | Status |
|---|---|---|---|---|---|
| 1 | Migration replay | `bash H/sql/apply_chain.sh <db> R/supabase/migrations <dir>` (plain and with defaults) | 175 applied, 0 failed | **176 applied, 0 failed** ×3 (`+20261011130000`) | PASS |
| 2 | Re-application (idempotency) | `psql -1 -v ON_ERROR_STOP=1 < <migration>` on `k9_plain` and `k9_main` | 6/6 | **8/8** (adds `…130000`) | PASS |
| 3 | Migration validator | `node scripts/validate-supabase-migrations.mjs` | PASS | PASS | PASS |
| 4 | Typecheck | `npx tsc --noEmit` | exit 0 | exit 0 (also re-run after the `vite.config.ts` change) | PASS |
| 5 | Production build | `npx vite build` | built | built (also re-run after the `vite.config.ts` change) | PASS |
| 6 | Frontend tests | `npx vitest run` | 622 passed, 1 skipped | **625 passed, 1 skipped** (+3 mocked socket-ticket tests) | PASS |
| 7 | Backend Jest | `cd backend && npm run test:jest` | 1,145 passed | **1,153 passed** (79 suites; +8 triage regression tests) | PASS |
| 8 | Backend Vitest | `npm run test:vitest` | 16/16 | 16/16 | PASS |
| 9 | Backend node:test | `npm run test:node` | 1/1 | 1/1 | PASS |
| 10 | Chat-integrity script | `npm run test:chat-integrity` | 1 skipped (needs DB; executed inside the harness) | same | unchanged |
| 11 | Syntax check of changed backend files | `node --check <file>` ×34 | — | 34 ok, 0 fail | PASS |
| 12 | Database harness (real server, real DB) | `env KAYAD_TEST_DB=k9_main KAYAD_RLS_DB=k9_main node --test --test-concurrency=1 tests/*.test.mjs` | 119 tests: 118 pass, 1 skip | **141 tests: 139 pass, 1 FAIL, 1 skip** | PASS except the documented FAIL |
| 12a | — the FAIL | `m15` #7 *KNOWN DEFECT FIN-LEDGER-1*, `4000: -260.00 -> 260.00` | — | FAIL (exposes a real defect; not hidden) | FAIL |
| 12b | — RLS and role authorization | `m10` 13/13, `m5-rls-privileges`, `m5-authz-sweep`, `m9-config-authz` | PASS | PASS | PASS |
| 12c | — realtime integration (RT-3) | `m14` 13/13 (before on the foundation backend: 1/13); `m7` 9/9 | `m7` 9/9 | PASS | PASS |
| 12d | — financial | `m5-financial-webhooks` 7/7, `m13` 5/5, `m15` 8/9 | 7/7, 5/5, — | as stated | PASS / FAIL (12a) |
| 12e | — outbox / idempotency | `m8` 5/5, `m8b` 7/7, `m2` | PASS | PASS | PASS |
| 13 | Route-schema crawl (626 GET routes) | `env KAYAD_TEST_DB=k9_crawl node tools/route-schema-crawl.mjs <out> 45000`, then `python3 tools/classify-route-crawl.py <before> <out> <class>` | 205 × 500 (re-run with capture: 206) | **170 × 500 + 2 × 503**; 34 routes fixed; **0 new failures** | PARTIAL (all 172 classified; 170 need owner decisions or HIST-38) |
| 14 | Realtime cross-host browser probe | `node browser/realtime-host-probe.mjs <out> <dist-crosshost> <dist-samehost>` | cross-host anonymous (unresolved) | **cross-host `authState=true`, notification true, newMessage true, no cookie to socket host, no ticket in any URL**; same-host unchanged | PASS |
| 15 | Messages matrix, production bundle | `env PROD=1 DIST=<dist> node browser/p0-matrix.mjs <out>` | 19/19 | **19/19** | PASS |
| 16 | Messages matrix, dev server | `node browser/p0-matrix.mjs <out>` | 19/19 | **19/19** | PASS |
| 17 | Repository E2E (default suite, mocked API by design) | `cd e2e && npx playwright test --config playwright.local.config.ts --project chromium` | 5 pass / 14 fail | **20 pass / 0 fail** (19 + 1 new) | PASS |
| 17a | — battery run before the E2E-ENV-1 fix | same, output redirected inside the repository | (2/17 in the previous phase) | 6/14: root cause found (dev-server reload), fixed, reproduced, then 20/20 | resolved |
| 18 | Custom validators (105) | `npm run <validator>` for each name in `validators/list.txt` | 101 pass, 4 fail | **101 pass, same 4 fail** (`validate:communications:providers`, `verify:production`, `validate:phase8-operations`, `validate:pwa-mobile`) | unchanged |
| 18a | — battery validators before the validator path update | same | — | 98 pass, 7 fail: +3 because the handshake cookie code moved into `socketAuth.service.js`; validators updated to read it (`30-…`) | resolved |
| 19 | Live E2E suites (`E2E_WITH_BACKEND=1`) | — | NOT RUN | NOT RUN (needs seeded staging accounts) | NOT RUN |
| 20 | Disposable Supabase checks | — | NOT RUN | BLOCKED (`23-…`) | BLOCKED |
| 21 | Cloudinary signed delivery, M-Pesa sandbox, staging, production behaviour | — | NOT RUN | NOT RUN | NOT RUN |

## Messages coverage for Priority 5
| Required scenario | Where | Result |
|---|---|---|
| Authenticated navigation to `/?nav=chat` | matrix 01–04 | PASS ×2 builds |
| Bootstrap delay and transient failure | matrix 05–09 | PASS |
| Confirmed session expiry | matrix 10, 13 | PASS |
| Login return path | matrix 12 | PASS |
| Two-account messaging | harness `m3`, `m7` #3, `m14` #9 | PASS |
| Read receipts and unread counts | harness `m3` (receipts, per-user unread, outsider cannot mark seen) | PASS |
| Unauthorized conversation access | matrix 14; `m3` outsider; `m7`/`m14` nonparticipant | PASS |
