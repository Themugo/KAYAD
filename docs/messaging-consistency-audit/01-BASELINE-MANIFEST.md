# 01 — Baseline manifest

Status vocabulary used throughout: **PASS · FAIL · BLOCKED · NOT RUN**.

## Input

| Item | Value |
|---|---|
| Supplied archive | `223f2cf0-KAYAD-MESSAGING-RELIABILITY-FOLLOWUP-20261010.zip` |
| SHA-256 | `027869a47516c6be4d2bfbeb9932e63d47207ee824a434be5477bf6291e189ba` |
| Size | 24,731,201 bytes, 3,336 entries |
| Preserved | Untouched copy kept outside the working tree; baseline run on a separate pristine extraction |
| Brief vs archive | The brief names `KAYAD-MESSAGING-IDEMPOTENCY-FOUNDATION-20261010.zip`. That file was **not supplied**. The supplied RELIABILITY-FOLLOWUP archive already contains the idempotency migration, validators and the follow-up audit (`docs/audits/MESSAGING_RELIABILITY_FOLLOWUP_20261010.md`), so it was used as the foundation. **If a different foundation was intended, this audit applies to the wrong tree.** |
| Git state | **No `.git` directory in the archive.** Source commit cannot be proven from the archive. Last known pushed commit from the earlier session: `d844c6ca` on `Themugo/KAYAD` `main` (user-reported; not verifiable here). Commit parity: **BLOCKED**. |

## Toolchain

| Item | Value |
|---|---|
| Node | `engines.node >=22.22.2`, `.nvmrc` = 22.22.2. Run on **22.22.2** (container default 22.22.0 does not satisfy the engine; 22.22.2 was supplied via `npx node@22.22.2`). |
| npm | 10.9.4 |
| Declared package manager | npm (`package-lock.json` at root and `backend/`). `bun.lock` also exists at root; npm was used. |
| Install | `npm ci` root: exit 0. `npm ci` backend: exit 0. |

## Environment requirements discovered

Backend needs `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL` (payment idempotency, rate limits), `FRONTEND_URL`. Provider secrets (`MPESA_*`, `BREVO_*`, `TWILIO_*`, `COMMUNICATION_WEBHOOK_SECRET`) are optional locally; none were set and no provider was contacted.

## Baseline results (foundation, before any change) — Node 22.22.2

| Command | Exit | Result | Status |
|---|---|---|---|
| `npx tsc --noEmit` | 0 | clean | PASS |
| `npx vite build` | 0 | built | PASS |
| `npx vitest run` (frontend) | 0 | 75 files, 579 passed, 1 skipped | PASS |
| `npm run test:jest` (backend) | 1 | 68 suites passed, **1 suite failed**: `tests/integration/chat-message-integrity.integration.test.js` ("Cannot find module 'test'"), 1038 tests passed | **FAIL** (D-TEST-1) |
| `npm run test:vitest` (backend) | 0 | 5 files, 16 passed | PASS |
| `npm run test:node` | 0 | 1 passed | PASS |
| `npm run test:chat-integrity` | 0 | **1 SKIPPED** (no database env). A skip is not a pass. | NOT RUN |

Raw outputs: `evidence/baseline/`.

## Baseline conclusion

The foundation type-checks, builds and passes its mocked unit suites, but (a) its backend Jest run fails because a `node:test` file is collected by Jest, and (b) the only database-level chat test was skipped. **Nothing in the foundation had been executed against a real database.** Every defect marked "found by integration" in `09-DEFECT-REGISTER.md` was invisible to the baseline for that reason.
