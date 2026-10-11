# 03 — File-by-file change ledger

Every changed file against the supplied foundation, with the reason, the dependents reviewed and the test that proves it. Nothing else in the tree differs (verified with `diff -rq` against a fresh extraction of the supplied archive, excluding `node_modules`, `dist` and this audit directory; server runs create `backend/uploads`, `logs/` and `backend/data/uploads.sqlite`, which were removed before packaging).

## Application source (9 files)

| File | Change | Defect | Callers / dependents reviewed | Proof |
|---|---|---|---|---|
| `backend/middleware/auth.js` | `req.user.id = String(user._id ?? user.id)` in `protect()` and `optionalAuth()`; `findByIdAndUpdate(user._id ?? user.id, …)`; `logError("AUTH ERROR", err)` passes the real error. 401 semantics unchanged; still fail-closed. | D-AUTH-1, D-OBS-1 | Every `protect`/`optionalAuth` consumer; `req.user.id` is the only identity field downstream code reads. Non-lean documents still expose `_id`, so behaviour there is identical. | `backend/tests/regression/protectLeanRow.test.js` (fails on old code, passes on new); browser reproduction `harness/evidence/m4-*.json`; all HTTP harness tests |
| `backend/middleware/csrf.js` | Allowlist is matched against `baseUrl + path` with `/api/vN/` folded to `/api/`; added `/api/communications/webhooks/` (each handler authenticates by secret/provider signature). Cookie/header double-submit logic unchanged. | D-FIN-1 | `server.js` mounts `app.use("/api", csrfProtection)`; payment, B2C, bid-callback, escrow-vault, sms-bidding and communication webhook routes | `backend/tests/regression/csrfMountedPath.test.js`; harness `m5-financial-webhooks` (CSRF exemption on `/api` and `/api/v1`; non-exempt route still 403) |
| `backend/models/IdempotencyKey.js` | Implemented `getCachedResponse(key)` and `record({...})` over the existing `idempotency_keys` table (unique `key`). Only successful responses replay; a recorded failure never blocks a retry; a success may replace a failure, never the reverse. | D-FIN-2 | `middleware/idempotency.js` (two call sites each), `idempotencyCheck` on payments, escrow, bids, callbacks | harness `m5-financial-webhooks` (12 concurrent identical callbacks → one settlement; replay keeps first receipt) |
| `backend/controllers/chatController.js` | `startChat`: on unique-violation (`23505`) from `uq_chats_participants_car`, re-select and return the winner's chat; lead creation only for the creator. | D-MSG-3 | `POST /api/chat`; `findOrCreateLeadFromChat` | harness `m2-idempotency` (10 concurrent starts; both participants simultaneously) |
| `backend/routes/governanceRoutes.js` | `router.use(allowRoles("admin","superadmin","executive","manager"))` after `protect`. Controller write checks unchanged. | D-AUTHZ-1 | Admin governance UI (`GovernanceStudio`, `GovernanceDashboard`) is admin-only | harness `m5-authz-sweep` (plain user → 403; admin → not 403) |
| `backend/routes/configurationRoutes.js` | `GET /audit` and `GET /export` now `allowRoles("admin","superadmin")`. | D-AUTHZ-2 (partial) | `/api/config/*` currently 500s for schema reasons (D-SCHEMA-2); no UI dependence found for audit/export | harness `m5-authz-sweep` |
| `backend/utils/fieldMap.js` | Aliases for `cars.reminder_sent_{5,15,30,60}min` and `vehicle_valuations.future_value_{12,24}m`. | D-DATA-1 | `models/_base.js` mapping used by every model write | `backend/tests/regression/fieldMapDigitColumns.test.js`; harness `m5-ownership` (owner PUT now 200) |
| `backend/infrastructure/logging/index.js` | `logError(msg, plainObject, meta)` logs the object as structured fields instead of `err: {}`. `Error` instances unchanged. | D-OBS-1 | `utils/logger.js` re-export; hundreds of call sites | `backend/tests/regression/logErrorPlainObject.test.js` |
| `src/context/SocketContext.tsx` | `joinMessages` also re-emits `joinChat` on every socket `connect` (removed with the channel). | D-RT-1 | `SocketContext` consumers; server `joinChat` is idempotent (`socket.join`) | `src/__tests__/context/SocketContext.rejoin.test.tsx` (fails without fix); harness `m3` |

## Validator script (1 file)

| File | Change | Why |
|---|---|---|
| `scripts/validate-phase36.mjs` | Replaced the assertion that pinned the **defective** source text `isCsrfExemptPath(req.path)` with three assertions: the call must use `fullRequestPath(req)`, `fullRequestPath` must be built from `req.baseUrl + req.path`, and the mount-relative form must be absent. All other assertions in the file, including the explicit exemption list, are unchanged. This **strengthens** the check (it now encodes the mounted-path requirement) and was needed because the old text-match failed on the corrected code (`validate:phase36` and the aggregate `validate:release` went FAIL until it was updated). | D-FIN-1 |

## Build/test configuration (1 file)

| File | Change | Defect | Proof |
|---|---|---|---|
| `backend/jest.config.js` | `testPathIgnorePatterns` += the `node:test`-based `chat-message-integrity.integration.test.js` (still runnable via `npm run test:chat-integrity`). No assertion changed or weakened. | D-TEST-1 | Backend Jest exit 1 → 0 |

## Migrations (5 new, none edited)

| File | Purpose | Defect |
|---|---|---|
| `20261011090000_users_security_state_columns.sql` | additive `users` columns read by `protect()` | D-SCHEMA-4 |
| `20261011091000_chat_idempotent_append_ordering_and_replay.sql` | `CREATE OR REPLACE kayad_append_chat_message_idempotent`: `createdAt` taken after the row lock; replay returns the live stored message. Same signature and grants. The foundation migration is **not** edited, so an environment that already applied it converges by applying this one. | D-MSG-1, D-MSG-2 |
| `20261011092000_idempotency_audit_logs.sql` | audit table used by the idempotency middleware; RLS on, service_role only | D-SCHEMA-3 |
| `20261011093000_revoke_client_execute_on_kayad_rpcs.sql` | `REVOKE … FROM PUBLIC, anon, authenticated` on every non-trigger `kayad_*` function; `GRANT … TO service_role` | D-SEC-1 |
| `20261011093100_enable_rls_remaining_public_tables.sql` | enable RLS + revoke client grants on 11 tables that had RLS off (skips missing tables) | D-SEC-2 |

All five pass `validate-supabase-migrations.mjs` (static) and replayed from an empty database (172/172).

## Tests added (not application code)

`backend/tests/regression/{protectLeanRow,csrfMountedPath,fieldMapDigitColumns,logErrorPlainObject}.test.js`, `src/__tests__/context/SocketContext.rejoin.test.tsx`, and `docs/messaging-consistency-audit/harness/**` (emulator, stack, 6 `node:test` files, browser reproduction, SQL helpers). No existing test was modified, weakened or skipped.

## Explicitly not changed

Authentication/CSRF/RLS/ownership controls were not relaxed. The only security-relevant relaxation is the CSRF exemption for `/api/communications/webhooks/*`, which is non-browser, secret/signature-authenticated and cannot use a cookie session. No UI, navigation, marketplace, auction or business-workflow code was touched beyond the one reconnect handler.
