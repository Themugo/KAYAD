# 09 — Defect register

Severity: P0 = financial/security/availability blocker; P1 = serious; P2 = significant; P3 = minor.
Remediation: **FIXED** (patched + test), **FIXED-MIGRATION** (new additive migration, replayed on a fresh chain; hosted state UNCONFIRMED), **OPEN**, **OPEN (RECOMMEND)**.
"Found by" = how it surfaced; all except D-TEST-1 were invisible to the foundation's mocked unit suites.

| ID | Sev | Area | Defect | Found by | Status | Proof / where |
|---|---|---|---|---|---|---|
| D-AUTH-1 | **P0** | auth | `protect()`/`optionalAuth` read `user._id` from lean rows (only `id`) → TypeError → **every authenticated request 401** → SPA refresh fails → redirect to login (the Messages bug) | real browser + real DB | FIXED | `06`, `protectLeanRow.test.js`, `harness/evidence/m4-*` |
| D-FIN-1 | **P0** | payments | CSRF allowlist never matched under `app.use("/api")` → provider callbacks/webhooks got 403 | HTTP against real server | FIXED | `csrfMountedPath.test.js`, `m5-financial-webhooks` |
| D-FIN-2 | **P0** | payments | `IdempotencyKey.getCachedResponse/record` undefined → every idempotency-guarded critical op 503 | HTTP against real server | FIXED | `m5-financial-webhooks` |
| D-SEC-1 | **P0*** | security | client roles could execute SECURITY DEFINER `kayad_*` RPCs, incl. dispute resolution (no caller authz) | catalog + emulated API | FIXED-MIGRATION | `m5-rls-privileges`; *P0 if hosted == chain (UNCONFIRMED) |
| D-SCHEMA-4 | P0 (fresh DB) | schema | `users.deactivated_at/granted_permissions/revoked_permissions/last_active` created by no migration; `protect()` selects them every request | real DB boot | FIXED-MIGRATION | `20261011090000` |
| D-SCHEMA-3 | P1 | schema | `idempotency_audit_logs` created by no migration → concurrent duplicate callbacks 503 | HTTP concurrency | FIXED-MIGRATION | `20261011092000` |
| D-SEC-2 | P1* | security | 11 public tables with RLS off on the chain (incl. `provider_credentials`, `mpesa_transactions`, `refunds`) | catalog | FIXED-MIGRATION | `m5-rls-privileges`; *hosted UNCONFIRMED |
| D-AUTHZ-1 | P1 | authz | `/api/governance/*` readable by any signed-in user | route sweep | FIXED | `m5-authz-sweep` |
| D-DATA-1 | P1 | data | digit-segment columns do not round-trip → every listing edit 500 | HTTP owner PUT | FIXED | `fieldMapDigitColumns.test.js`, `m5-ownership` |
| D-MSG-1 | P2 | messaging | `createdAt` taken before the row lock → array order ≠ timestamp order | concurrency test | FIXED-MIGRATION | `m2` #5, `20261011091000` |
| D-MSG-3 | P2 | messaging | concurrent `startChat` → `500` for losers | concurrency test | FIXED | `m2` #10–11 |
| D-RT-1 | P2 | realtime | SPA does not re-join chat room on socket reconnect | socket test + source | FIXED | `SocketContext.rejoin.test.tsx`, `m3` #6 |
| D-MSG-2 | P3 | messaging | replay returned stale `seenBy` snapshot | test | FIXED-MIGRATION | `m2` #8 |
| D-OBS-1 | P3 | observability | `logError(msg,{error})` logged `err: {}` | log inspection | FIXED | `logErrorPlainObject.test.js` |
| D-TEST-1 | P3 | tests | backend Jest collected a `node:test` file → suite FAIL (exit 1) | baseline | FIXED | jest ignore pattern; still runnable via `npm run test:chat-integrity` |
| D-AUTHZ-2 | P2 | authz | `/api/config/{stats,entries}` readable by any user (subsystem currently 500s); `audit`/`export` now admin-only | route sweep | **FIXED 2026-10-11 (stats, entries, features → admin/superadmin)** | `m9-config-authz`, `docs/audits/05` SEC-07 |
| D-MSG-4 | P2 | messaging | no outbox: crash between commit and side effects loses notification/emit on retry | test (TODO) | **FIXED-MIGRATION 2026-10-11 (transactional outbox; hosted state UNCONFIRMED)** | `m8-chat-outbox` ×9, `20261011100000`, `docs/audits/03` §5 |
| D-MIG-1 | P1 | migrations | `public.rls_auto_enable()` created by no migration; fresh chain fails at two migrations | chain replay | **OPEN** (shim in harness only) | `02` |
| D-SCHEMA-1 | P0 (migration-built DB) | schema | `public.transactions` created by no migration; read by **every** payment callback and bid security; the harness shim hid it | callback 500 | **FIXED IN CODE 2026-10-11** (security payments stored in `payments`, the FK target; legacy fallback) — remaining readers are reporting paths | `m5-financial-webhooks`, `m13`, `docs/audits/13` |
| D-SCHEMA-2 | P2 | schema | missing `config_entries`, `config_audit_logs`, `vehicle_master_data`, `disputes`, `error_budgets`, `escrows.warning_sent`, `bids.bid_count`; cron/SLO jobs error each cycle; `/api/config/*` 500 | server boot logs | **OPEN** | `02` |
| D-FF-1 | P2 | flags | `featureFlagService.js` uses undefined `FeatureFlag` → `/api/feature-flags/user` 500 | route sweep | **OPEN** | `07` |
| D-AUTH-2 | P2 | auth | infrastructure errors in `protect()` surface as 401 (forced logout, masked cause); SPA treats `getMe` failure as logged-out | source + diagnosis | **OPEN (RECOMMEND)** | `06` |
| D-RT-2 | P3 | realtime | socket JWT not checked for revocation/ban/deactivation | source | **OPEN** | `05` |
| D-FIN-3 | P3 | payments | duplicate-callback `200 Processing` acknowledges while first attempt may still fail | source | **OPEN (design note)** | `07` |
| D-MSG-5 | P3 | messaging | single JSONB array per chat: whole-array rewrite per send (scalability) | design review | **OPEN — NOT MEASURED** | `04` |
| D-RT-3 | P2 | realtime | host-only `token` cookie vs direct socket host could leave production sockets anonymous | hypothesis | **UNCONFIRMED — NOT RUN** | `05` |
| D-EVID-1 | — | process | brief names a foundation archive that was not supplied; RELIABILITY-FOLLOWUP archive used | input check | NOTED | `01` |
| D-EVID-2 | — | process | no `.git` in archive: source commit and deployment commit parity unprovable | input check | **BLOCKED** | `01` |

Counts: 15 FIXED / FIXED-MIGRATION, 11 OPEN or UNCONFIRMED (excluding two process notes).

## Added by the 2026-10-11 security sweep (details: `docs/audits/05-SECURITY-FINDINGS-REGISTER-20261011.md`)
| ID | Sev | Area | Defect | Status | Proof |
|---|---|---|---|---|---|
| D-UPL-1 | P1 | uploads | `chat` uploads public; client-supplied attachment URLs persisted/echoed (SEC-01, SEC-02) | **FIXED for new uploads**; legacy data OPEN-documented | `m6` ×12 |
| D-UPL-2 | P1 | uploads | `fileFilter` read `file.stream` → process crash on every image upload (SEC-03) | **FIXED** (production impact UNCONFIRMED) | `m6` #12 |
| D-RT-4 | P2 | realtime | `onlineUsers` broadcast of all user ids to all sockets (SEC-04) | **FIXED** | `m7` #1 |
| D-RT-5 | P2 | realtime | socket outlives its access token; stays in rooms after leaving/blocked (SEC-05/06) | **FIXED** | `m7` #5, #7, #8 |
| D-RT-2 | P3 | realtime | revocation/ban of a still-valid token not checked on sockets | OPEN | — |
| D-RT-3 | P2 | realtime | production cookie scope vs socket host | UNCONFIRMED / BLOCKED | `docs/audits/08` §B |

## Added by the 2026-10-11 Supabase reconciliation phase (details: `docs/audits/08`–`19`)
| ID | Sev | Area | Defect | Status | Proof |
|---|---|---|---|---|---|
| FIN-CB-1 | P1 | payments | successful security callback threw (null into destructured arg) after settling → 500 to provider, webhook unprocessed | **FIXED** | `m13` #1 |
| FIN-1 | P1 | escrow | auto-release + warnings dormant (column alias + array filter); enabling moves money | **OPEN — owner decision** | `docs/audits/13` §3 |
| RLS-1 | P2 | rls | 14 `authenticated USING (true)` policies on governance tables | **FIXED-MIGRATION** 20261011120000 | `m10` |
| RLS-2 | P3 | rls | 23 functions client-executable under hosted default privileges | **FIXED-MIGRATION** 20261011120000 | `m10` #3 |
| SCH-PROFILES-1 | P2 | schema | profiles UPDATE always fails; role never synced → stale `is_admin()` | **FIXED-MIGRATION** 20261011121000 | `m10` #12 |
| SCH-NOTIF-1 | P3 | schema | ops dashboards queried `notifications.is_read` | **FIXED** | `m11` #2 |
| SCH-ESCROW-2 | P3 | schema | ops dispute queues filtered snake_case dispute columns | **FIXED** | `m11` #1 |
| SCH-101 | P1 | schema | 101 tables referenced by deployed code exist in no migration; 205/626 GET routes 500 on a migration-built DB | **OPEN — hosted state unknown** | `docs/audits/08` |
| HARNESS-1 | — | process | `apply_chain.sh` counted a stopped server as success; earlier RLS checks ran without hosted default privileges | **FIXED** | `docs/audits/11` |
| RT-3 | P1 | realtime | (was D-RT-3) cross-host socket anonymous — **reproduced in real Chromium** | **OPEN — design decision** | `docs/audits/15` |
