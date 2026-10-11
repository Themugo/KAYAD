# Regression matrix — actual command output (2026-10-11 security sweep)

**Run on a fresh extraction** of the candidate tree (`unzip` → `npm ci` in root, `backend/`, harness) in an isolated directory, never in the working tree. Node: see `evidence/security-sweep-20261011/node_version.txt` — the sandbox default is **v22.22.0**, while `package.json` requires **≥ 22.22.2** (the previous sweep ran on 22.22.2). `npm ci` therefore used `--engine-strict=false`. Unit/integration/harness/browser suites ran under 22.22.0 (they passed); the validator battery was **re-run under the official Node v22.22.2 binary** (npm package `node-linux-x64@22.22.2`) to remove the version artefact — the first validator pass on 22.22.0 is kept as `validators-run1-node22.22.0/` (8 failures: the 4 baseline + 2 Node-version-gated + 1 newly introduced OpenAPI gap, described below).
Status words: PASS = ran and succeeded · BLOCKED = infrastructure unavailable · NOT RUN · PARTIAL · FAIL.

## 1. Results versus the foundation baseline
| Check | Foundation (`…REDIRECT-FIX-COMPLETE-AUDIT`) | This candidate | Verdict |
|---|---|---|---|
| `npx tsc --noEmit` | exit 0 | exit 0 | PASS — unchanged |
| `npx vite build` | exit 0 | exit 0 | PASS — unchanged |
| Frontend Vitest | 78 files, 622 passed, 1 skipped | **78 files, 622 passed, 1 skipped** | PASS — unchanged |
| Backend Jest | 73 suites, 1072 passed | **75 suites, 1090 passed** (+2 suites, +18 tests) | PASS |
| Backend Vitest / `test:node` | 5 files 16 passed / 1 passed | 5 files 16 passed / 1 passed | PASS — unchanged |
| `test:chat-integrity` plain run | 1 skipped (no DB env) | 1 skipped | **NOT RUN as such** (executed inside the harness) — unchanged |
| Harness (real PostgreSQL + real server) | 55 tests: 54 pass, 0 fail, 1 todo | **90 tests: 89 pass, 0 fail, 1 skipped** (+12 m6, +9 m7, +9 m8, +5 m9; the former `todo` D-MSG-4 now proven in m8 and skipped in m2) | PASS |
| Migration chain replay (empty DB, with `rls_auto_enable()` stub) | applied=172 failed=0 | **applied=** | PASS (local PostgreSQL only; hosted **BLOCKED**) |
| `scripts/validate-supabase-migrations.mjs` | PASS | PASS (173 files, 173 unique versions) | PASS (states a real reset is still required) |
| Custom validators (105) | 101 pass; 4 fail | **101 pass; 4 fail — the same 4** | pre-existing, unchanged |
| Browser matrix, production bundle | 18/18 + 08b | **19/19 PASS** | PASS |
| Browser matrix, dev server | 18/18 + 08b | **19/19 PASS** | PASS |
| Repo e2e (Playwright, chromium) | 5 pass / 14 fail | **5 pass / 14 fail, identical per test** | pre-existing FAIL (stale selectors), unchanged; with-backend variant NOT RUN this time (identical to no-backend on the foundation) |
| Health (local server) | 200s; `/health/deep` 401 | same; `/api/config/stats` 401, attachment path 401 anonymous | PASS (`/health/deep` with admin credentials NOT RUN) |
| Secret-pattern scan (source + production bundle) | no findings | no findings (`secret_scan.txt`; pattern scan, not gitleaks/history) | PASS (partial method) |

### Baseline failures, classified
| Failure | Class | Note |
|---|---|---|
| `validate:communications:providers`, `verify:production`, `validate:phase8-operations`, `validate:pwa-mobile` | **pre-existing** | unchanged output class; `verify:production` needs a live URL (BLOCKED); `phase8` needs `DISASTER_RECOVERY.md` |
| Repo e2e 14 failures | **pre-existing** | identical test-by-test |
| `validate:wave3-convergence`, `validate:release` — "OpenAPI documents all mapped routes (1120/1121)" | **newly introduced, then corrected** | the new route `GET /api/chat/:chatId/attachments/:uploadId` was undocumented; added to `backend/openapi.yaml`, re-run 1121/1121 PASS |
| `validate:v14:runtime-preflight`, `validate:phase6-release` | **environment artefact** | Node 22.22.0 < 22.22.2; PASS on 22.22.2 |

## 2. New security tests — before/after
| Suite | Foundation code (`evidence/BASELINE-foundation-*.log`) | Candidate |
|---|---|---|
| m6 chat attachments (12) | # pass 2 # fail 10 | 12 pass, 0 fail |
| m7 socket authz (9) | # pass 5 # fail 4 | 9 pass, 0 fail |
| m9 config authz (5) | # pass 1 # fail 4 | 5 pass, 0 fail |
| m8 outbox (9) | n/a — needs the new migration (the failure mode itself is demonstrated inside test #3: recipient not notified, replay does nothing) | 9 pass, 0 fail |
Note: after the full harness run the SEC-02 test (#10) was corrected to seed a pre-fix `visibility:"public"` chat record (the first version seeded a private record, which could not reproduce the flaw on the foundation); m6 was re-run on the fresh tree: 12/12 pass (`harness_m6_rerun_after_seed_fix.txt`), and on the foundation: 2 pass / 10 fail.
Honest scope: these are **real server + real PostgreSQL + real socket.io-client**, but PostgREST is the project's emulator and Cloudinary is not contacted.

## 3. Actual output (excerpts; full files in `evidence/security-sweep-20261011/`)
```
$ npx tsc --noEmit                       -> exit=0
$ npx vite build                         -> exit=0
$ npx vitest run
 Test Files  78 passed (78)
      Tests  622 passed | 1 skipped (623)
$ (backend) npm run test:jest
Test Suites: 75 passed, 75 total
Tests:       1090 passed, 1090 total
$ (backend) npm run test:vitest
 Test Files  5 passed (5)
      Tests  16 passed (16)
$ (backend) npm run test:node
# tests 1
# pass 1
# fail 0
# skipped 0
$ (backend) npm run test:chat-integrity   (no DB env => skipped)
# tests 1
# pass 0
# fail 0
# skipped 1
$ apply_chain.sh msg_chain_f3 supabase/migrations   (empty DB)

$ KAYAD_TEST_DB=msg_chain_f3 node --test --test-concurrency=1 tests/*.test.mjs
# tests 90
# pass 89
# fail 0
# skipped 1
# todo 0
```
Harness test list:
```
ok 1 - foundation chat-message-integrity test executes (not skipped) and passes
ok 2 - concurrent identical key (N=20) -> exactly one canonical message, one non-replay, one notification
ok 3 - retry after lost response replays same message, no duplicate
ok 4 - reused key with changed payload -> rejected, original untouched
ok 5 - key scope: same key from the other participant or another chat is independent
ok 6 - distinct keys, two senders concurrently -> no lost updates, persisted order = createdAt order
ok 7 - non-participant cannot send; missing/invalid key rejected; nothing persisted
ok 8 - SQL rollback atomicity: failing statement in same tx leaves neither message nor idempotency row
ok 9 - replay after recipient read returns stale seenBy snapshot (DEFECT D-MSG-2 characterization)
ok 10 - delete chat cascades idempotency rows
ok 11 - concurrent startChat for the same pair converges on ONE chat, no 5xx (D-MSG-3)
ok 12 - both participants starting the chat simultaneously converge on ONE chat
ok 13 - crash between commit and side effects: retry still notifies recipient exactly once # SKIP D-MSG-4 FIXED by the transactional outbox; proven with real timing control in m8-chat-outbox.test.mjs \#4 (this stack runs the worker at its 15s/30s production cadence)
ok 14 - realtime: participant sockets receive newMessage exactly once; outsider and anonymous receive nothing
ok 15 - persisted vs API vs event agree: identity, text, createdAt, unread counts per user
ok 16 - outsider cannot read, mark seen, or count another chat
ok 17 - read receipt: B marks seen -> per-user seenBy, A gets messagesSeen, unread 0, sender's own message never self-marked; idempotent
ok 18 - concurrent sends and seen calls do not lose receipts or messages
ok 19 - reconnect: a reconnected socket does NOT receive events until it re-emits joinChat (D-RT-1 characterization of client behavior)
ok 20 - socket auth: bearer-in-handshake works; cookie-less (host-only cookie not sent) socket is anonymous and never joins
ok 21 - failure recovery: server restart keeps persisted state; REST resync returns every message; no duplicate on retry with same key
ok 22 - failure recovery: database outage during send returns 5xx, persists nothing, retry with same key succeeds once
ok 23 - anonymous /auth/me is a clean 401 (not a 5xx)
ok 24 - login without CSRF token is refused; with bootstrap it succeeds and sets session cookies
ok 25 - wrong password is a generic 401 and does not set a session
ok 26 - restored session: /auth/me and protected chat API return 200 with the cookie jar only
ok 27 - refresh rotates the session and the new access token works
ok 28 - logout revokes the session: the old cookie is rejected afterwards
ok 29 - discovery found privileged endpoints
ok 30 - anonymous: no privileged endpoint answers 2xx or 5xx
ok 31 - plain authenticated user: no privileged endpoint answers 2xx or 5xx
ok 32 - governance and config audit/export are denied to a plain user with 403
ok 33 - CSRF exemption reaches provider callbacks on /api and /api/v1 (D-FIN-1)
ok 34 - success callback replayed concurrently (N=12): payment settles once, one webhook receipt
ok 35 - sequential replay after success is a no-op and does not change the receipt
ok 36 - amount mismatch is never settled as success
ok 37 - failed callback replayed 8x: one failure notification, status failed
ok 38 - unknown checkout id and malformed bodies create nothing and never settle
ok 39 - communication webhooks: no/incorrect secret rejected; correct secret accepted
ok 40 - rival dealer cannot update or delete another dealer's listing
ok 41 - plain buyer cannot create, update or delete listings
ok 42 - anonymous cannot mutate listings or place/end bids
ok 43 - non-admin cannot end an auction (even the listing owner)
ok 44 - owner can still update their own listing (control: ownership gate is not over-blocking)
ok 45 - bid gates: owner cannot bid on own car; unverified phone blocked; unpublished auction blocked (no bid row written)
ok 46 - every public table has RLS enabled (catalog)
ok 47 - no non-trigger kayad_* function is executable by anon/authenticated/PUBLIC (catalog)
ok 48 - authenticated/anon cannot call money-moving and chat RPCs through the API
ok 49 - authenticated/anon see no rows and cannot write sensitive tables
ok 50 - service_role retains access (control)
ok 51 - sender cannot attach arbitrary URLs, strings, foreign uploads, non-chat uploads or unknown ids
ok 52 - authorized participant: reference stored (no CDN url), response/list expose only the authenticated path
ok 53 - access: unauthenticated 401; sender and recipient 200 with safe headers; outsider 404; random upload id 404
ok 54 - binding: the upload is only readable through the chat that references it (other chat, even as a participant of it)
ok 55 - revoked access: recipient who leaves the conversation, and a blocked chat, lose access immediately
ok 56 - Cloudinary-backed record with no local bytes -> 302 to an authenticated, expiring, signed download (not a permanent URL)
ok 57 - local upload record lost (ephemeral disk / redeploy): participants still get an expiring authenticated redirect; outsiders still 404
ok 58 - legacy attachments (pre-fix {url} entries) are never rewritten; http/javascript legacy values are neutralised on output
ok 59 - realtime newMessage carries the authenticated path, never a CDN url
ok 60 - upload route: GET /api/upload/:id of a chat file is owner/admin only (was readable by any signed-in user with the id, cached public+immutable)
ok 61 - public vehicle media is unchanged: vehicles-folder upload remains publicly cacheable for any signed-in user
ok 62 - POST /api/upload folder=chat: content must match its declared type (RIFF/AVI declared as webp passes the legacy header check but is rejected 400); no CDN url ever returned
ok 63 - presence: no onlineUsers broadcast reaches anonymous or authenticated sockets, and user ids are not disclosed
ok 64 - anonymous and forged-identity sockets cannot join private rooms or receive newMessage
ok 65 - two accounts: participants receive newMessage once; nonparticipant (valid session) cannot subscribe and typing from outside is dropped
ok 66 - room-join input hardening: malformed/foreign/nonexistent ids and spoofed room names are rejected
ok 67 - expired token is anonymous at handshake; a token that expires mid-connection loses its private rooms and is told to reconnect
ok 68 - reconnect: a fresh socket must be re-authorised (no inherited membership); a refreshed credential restores access
ok 69 - membership loss: leaving the conversation evicts live sockets at once and joinChat is refused afterwards
ok 70 - blocked conversation: joinChat denied (parity with REST 423)
ok 71 - public rooms stay public: anonymous sockets can still watch an existing auction room (unchanged contract)
ok 72 - atomic: message and outbox row commit together; a rolled-back append leaves neither
ok 73 - happy path: inline delivery marks the event done; exactly one notification
ok 74 - FAILURE MODE + FIX: notification write fails after commit -> message saved, client replay does nothing, reconciler delivers once the fault clears
ok 75 - worker crash/restart: process killed after commit (before any side effect) -> after restart the recipient is notified exactly once
ok 76 - duplicate processing: re-queueing a delivered event and concurrent claimers never create a second notification
ok 77 - concurrent sends: N messages -> N outbox rows -> N notifications, no loss, no duplicates
ok 78 - retry policy: exponential backoff, dead-letter after 8 attempts (kept for reconciliation), stats expose it
ok 79 - retention: only old done rows are purged; pending/dead are never deleted
ok 80 - authorization: outbox and its functions are not reachable by anon/authenticated
ok 81 - /api/config/stats: anonymous 401; every non-administrator 403; admin/superadmin reach the handler
ok 82 - /api/config/entries: anonymous 401; every non-administrator 403; admin/superadmin reach the handler
ok 83 - /api/config/features: anonymous 401; every non-administrator 403; admin/superadmin reach the handler
ok 84 - a request cannot elevate itself with client-supplied role hints
ok 85 - master data that the product reads stays available to ordinary signed-in users and still requires a session
ok 86 - baseline: valid session -> /auth/me 200 and Messages API 200
ok 87 - auth store unavailable -> 503 AUTH_TEMPORARILY_UNAVAILABLE (retryable), fail-closed, no data, never 401
ok 88 - after the store recovers the SAME cookie works again (session was never revoked)
ok 89 - genuine failures stay 401: no cookie, garbage cookie, revoked session
ok 90 - authenticated non-participant is still denied (403/404), not 503
```
Validators that fail (Node 22.22.2 run):
```
validate:communications:providers rc=1
verify:production rc=1
validate:phase8-operations rc=1
validate:pwa-mobile rc=1
```
Browser matrix, production bundle (`PROD=1`, `dist/` served through a Vercel-like same-origin /api proxy):
```
PASS  01-click-messages-authenticated  final=/?nav=chat
PASS  02-refresh-on-messages  final=/?nav=chat
PASS  03-new-tab  final=/?nav=chat
PASS  04-navigate-from-another-protected-page  final=/?nav=chat
PASS  05-delayed-bootstrap-no-premature-redirect  final=/?nav=chat
PASS  06-bootstrap-500-persistent  final=/?nav=chat
PASS  07-bootstrap-500-then-recovers-automatically  final=/?nav=chat
PASS  08-bootstrap-network-failure-or-timeout  final=/?nav=chat
PASS  08b-bootstrap-true-timeout-axios-8s-per-attempt  final=/?nav=chat
PASS  09-malformed-bootstrap-response-fails-safely  final=/?nav=chat
PASS  10-expired-session-requires-login  final=/login?next=%2F%3Fnav%3Dchat
PASS  11-no-session-redirects-and-private-data-inaccessible  final=/login?next=%2F%3Fnav%3Dchat
PASS  12-sign-in-from-messages-redirect-returns-to-messages  final=/?nav=chat
PASS  13-sign-out-then-messages-requires-login  final=/login
PASS  14-authenticated-non-participant-denied-by-backend  final=/?nav=chat
PASS  15-refresh-csrf-failure-is-explicit-and-bounded  final=/?nav=chat
PASS  16-wrong-api-hostname-diagnosable-no-false-auth  final=/?nav=chat
PASS  17-marketplace-and-auction-navigation-intact  final=
PASS  18-mobile-widths-messages-reachable  final=
exit=0
```
Browser matrix, Vite dev server:
```
PASS  01-click-messages-authenticated  final=/?nav=chat
PASS  02-refresh-on-messages  final=/?nav=chat
PASS  03-new-tab  final=/?nav=chat
PASS  04-navigate-from-another-protected-page  final=/?nav=chat
PASS  05-delayed-bootstrap-no-premature-redirect  final=/?nav=chat
PASS  06-bootstrap-500-persistent  final=/?nav=chat
PASS  07-bootstrap-500-then-recovers-automatically  final=/?nav=chat
PASS  08-bootstrap-network-failure-or-timeout  final=/?nav=chat
PASS  08b-bootstrap-true-timeout-axios-8s-per-attempt  final=/?nav=chat
PASS  09-malformed-bootstrap-response-fails-safely  final=/?nav=chat
PASS  10-expired-session-requires-login  final=/login?next=%2F%3Fnav%3Dchat
PASS  11-no-session-redirects-and-private-data-inaccessible  final=/login?next=%2F%3Fnav%3Dchat
PASS  12-sign-in-from-messages-redirect-returns-to-messages  final=/?nav=chat
PASS  13-sign-out-then-messages-requires-login  final=/login
PASS  14-authenticated-non-participant-denied-by-backend  final=/?nav=chat
PASS  15-refresh-csrf-failure-is-explicit-and-bounded  final=/?nav=chat
PASS  16-wrong-api-hostname-diagnosable-no-false-auth  final=/?nav=chat
PASS  17-marketplace-and-auction-navigation-intact  final=
PASS  18-mobile-widths-messages-reachable  final=
exit=0
```
Repo e2e: see `evidence/security-sweep-20261011/e2e-comparison.txt` (identical to the foundation list).

## 4. Not covered by this matrix
Real Cloudinary / Supabase / Render / Vercel / email / SMS / M-Pesa; multi-instance Socket.IO; real-browser Socket.IO (the client script is served from the socket host, unreachable here); the migration script for legacy attachments; hosted migration state; mobile widths beyond the matrix scenario 18. Staging checklist: `08-STAGING-CERTIFICATION-CHECKLIST-20261011.md`.
