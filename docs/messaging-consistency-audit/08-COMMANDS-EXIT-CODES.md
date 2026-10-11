# 08 — Commands, exit codes and test reports

All commands below were run on a **fresh extraction of this release candidate** (the archive minus this file and `evidence/final-verification/`, which are generated from the run — everything else is byte-identical to what ships, see "Parity" below), on **Node 22.22.2 / npm 10.9.4**, after `npm ci`. Raw output: `evidence/final-verification/`. Status vocabulary: PASS · FAIL · BLOCKED · NOT RUN.

## Build and unit suites

| # | Command | Exit | Result | Foundation baseline | Status |
|---|---|---|---|---|---|
| 1 | `npm ci` (root) | 0 | — | 0 | PASS |
| 2 | `npm ci` (backend) | 0 | — | 0 | PASS |
| 3 | `npm ci` (harness) | 0 | pg 8.13.1, socket.io-client 4.8.1 | n/a | PASS |
| 4 | `npx tsc --noEmit` | 0 | clean | 0 | PASS |
| 5 | `npx vite build` | 0 | built | 0 | PASS |
| 6 | `npx vitest run` (frontend) | 0 | 76 files, **580 passed**, 1 skipped (pre-existing skip) | 75 files, 579 passed, 1 skipped | PASS (+1 file, +1 test: reconnect re-join) |
| 7 | `npm run test:jest` (backend) | 0 | **72 suites, 1065 passed** | exit **1**: 68 passed + 1 FAILED suite | PASS (fixed D-TEST-1; +4 regression suites, +27 tests) |
| 8 | `npm run test:vitest` (backend) | 0 | 5 files, 16 passed | same | PASS |
| 9 | `npm run test:node` | 0 | 1 passed | same | PASS |
| 10 | `npm run test:chat-integrity` | 0 | **1 SKIPPED** (no database env in the plain run) | 1 skipped | **NOT RUN** here — executed instead by harness test #`m2-foundation` below (pass 1, skipped 0). A skip is not reported as a pass. |

## Real-PostgreSQL / browser / security tests (local PostgreSQL 16 from the migration chain + emulated REST layer)

Command: `KAYAD_TEST_DB=msg_chain_rc node --test --test-concurrency=1 docs/messaging-consistency-audit/harness/tests/*.test.mjs` → **exit 0, 50 tests: 49 pass, 0 fail, 0 skipped, 1 todo** (D-MSG-4, intentionally reported as TODO).

| File | Tests | Result |
|---|---|---|
| `m2-idempotency.test.mjs` | 12 | 11 pass, **1 todo** |
| `m2-foundation-chat-integrity.test.mjs` | 1 | pass — runs the foundation's own DB test, `# skipped 0` |
| `m3-receipts-realtime.test.mjs` | 9 | pass |
| `m4-login-session-flow.test.mjs` | 6 | pass |
| `m5-authz-sweep.test.mjs` | 4 | pass |
| `m5-financial-webhooks.test.mjs` | 7 | pass |
| `m5-rls-privileges.test.mjs` | 5 | pass |
| `m5-ownership.test.mjs` | 6 | pass |

Browser reproduction (`harness/browser/m4-repro.mjs`, Playwright + Chromium, not part of the batch above): foundation → redirected to login; patched → Messages renders. Outputs and screenshots: `harness/evidence/m4-*`. Status: PASS (reproduced + fixed). The foundation run used the foundation's `auth.js`; the patched run was **repeated on the fresh extraction of this candidate** (`m4-patched-final.json/.png`: `/auth/me` 200, final URL `/?nav=chat`, no redirect). It is not part of the `node --test` batch.

Migration chain: `harness/sql/apply_chain.sh` on an empty database → **applied=172 failed=0** (with the documented `rls_auto_enable()` stub, D-MIG-1) — `evidence/migration-chain/`. Static: `node scripts/validate-supabase-migrations.mjs` → PASS (it states that a real PostgreSQL/Supabase reset is still required; the local replay is that reset against local PostgreSQL only).

## Validators (`npm run validate:*` / `verify:*`, 105 scripts, excluding `live`, `certify`, `bootstrap`, `backup`)

Run on the foundation and on this candidate; results are **identical**: 101 pass, 4 fail, and the same 4 fail on the foundation (pre-existing, unrelated to this audit):

| Validator | Exit | Reason | Status |
|---|---|---|---|
| `validate:communications:providers` | 1 | assertion failure in a provider-wiring check | FAIL (pre-existing; not investigated) |
| `verify:production` | 1 | needs a deployment URL/command (`Invalid URL`) — an online production check | BLOCKED |
| `validate:phase8-operations` | 1 | `ENOENT DISASTER_RECOVERY.md` (file absent from the archive) | FAIL (pre-existing) |
| `validate:pwa-mobile` | 1 | "PWA theme matches Slate Teal chrome" | FAIL (pre-existing) |

`validate:phase36` (and therefore the aggregate `validate:release`) passed on the foundation but failed on the first candidate build because it pinned the buggy `isCsrfExemptPath(req.path)` text; its assertion was replaced by stricter ones (see `03`) and both pass now. Listing: `evidence/final-verification/validators/`, `evidence/baseline-validators/`.

## Health checks (local server on the chain-built database)

`/api/health` 200 (`database: ok`), `/health` 200, `/health/live` 200, `/health/ready` 200, `/api/v1/auth/csrf` 200. `/health/deep` → 401 (requires an authenticated admin; **NOT RUN** with credentials). Staging/production health: **NOT RUN / BLOCKED**. Output: `evidence/final-verification/health.txt`.

## Not run (explicit)

Staging deployment and migrations · production anything · real PostgREST/Supabase · deployment commit parity (no `.git`) · sandbox/real M-Pesa, Brevo, Twilio · full auction settlement, escrow flows, B2C payout, ledger reconciliation · browser realtime and browser form-driven login · load/scalability of the chat JSONB array.

## Parity

The tree used for every command above is the shipped archive **minus exactly these paths**, which were produced from or after the run: `08-COMMANDS-EXIT-CODES.md`, `evidence/final-verification/**`, `evidence/baseline-validators/**`, `harness/evidence/m4-patched-final.{json,png}`. The packaging step re-extracted the final archive and compared SHA-256 of every file against the verified tree: **no file differs; the shipped archive only adds those paths** (comparison list in `final-parity.txt` next to the checksum sidecar). `node_modules/`, `dist/`, `.git` are not shipped; `npm ci` reproduces `node_modules`.
