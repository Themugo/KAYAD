# KAYAD — Messages login-redirect fix and complete system audit (2026-10-11)

Foundation: `KAYAD-MESSAGING-CONSISTENCY-RC-20261011.zip` (SHA-256 `9cd0f7ec…98cf91d`), a strict superset of the supplied `KAYAD-MESSAGING-IDEMPOTENCY-FOUNDATION-20261010.zip` (`c7d28b53…97e1454`). No newer foundation was supplied. Runtime: Node 22.22.2 / npm 10.9.4.
Execution restrictions honoured: **local changes only — no commit, push, deployment, production access or production migration.** No migration was added by this fix.

**Evidence level (read this first).** Everything "PASS" below ran in a disposable sandbox: real Chromium → Vite dev server *or* the production `dist/` bundle behind a Vercel-style same-origin `/api` proxy → the real `backend/server.js` → real PostgreSQL 16 built from the 172 migrations, through a **test-only PostgREST emulator**. It is **not Supabase/PostgREST, not Vercel/Render, not the live site.** Nothing is claimed as live-verified.

## 1. Root cause
Two further defects, on top of D-AUTH-1 already fixed in the RC, made a *valid* session look signed-out (full detail: `01-…ROOT-CAUSE-AND-CHANGE-LEDGER`):

1. **Frontend (D-AUTH-3/4):** `AuthProvider` swallowed every session-check failure and set `user=null, loading=false`; the guards (`App.tsx` protected-nav effect, `RequireAuth`) redirect on exactly that state. A 5xx, timeout, network failure, malformed 200 or a failed token refresh therefore ended in `/login?next=%2F%3Fnav%3Dchat`. The HTTP interceptor additionally broadcast "session expired" when the *refresh call itself* failed for any reason.
2. **Backend (D-AUTH-2):** `protect()` answered `401 "Not authorized"` for any unexpected exception (store outage), which the SPA reads as "session over".

## 2. Evidence (before → after, same 18-scenario script; `harness/evidence/p0/`)
| Run | Pre-fix (RC) | Fixed tree (fresh extraction) |
|---|---|---|
| Production bundle | **6 FAIL / 12 PASS** (06 bootstrap 500, 07 single 503, 08 network failure, 09 malformed 200, 15 refresh-CSRF failure, 16 unreachable API → all end at `/login?next=%2F%3Fnav%3Dchat`) | **18 / 18 PASS** (+ 08b true client timeout PASS: recovery screen after 27 s, exactly 3 `/me` calls) |
| Vite dev server | 5 FAIL / 13 PASS (07 passes only because React.StrictMode double-runs the mount effect) | **18 / 18 PASS** (+ 08b PASS) |
| Backend fault injection (`user_auth` offline in real PostgreSQL) | `/auth/me`, `/chat/unread`, `/chat/:id/messages` → **401 "Not authorized"** | **503 `AUTH_TEMPORARILY_UNAVAILABLE`**, `Retry-After`, no internals/payload; same cookie works again after recovery |

Captured per scenario (JSON + screenshots, redacted — paths and status codes only): URL sequence (before/after/final), console errors, `/auth/me`, `/auth/refresh`, CSRF and login traffic. Screenshots: recovery screen `p0-after-prod-06a-recovery-ui.png`; Messages UI `p0-after-prod-01.png`; pre-fix redirect `p0-before-prod-06.png`.

## 3. Correction (smallest proven fix)
Explicit session states `loading | authenticated | unauthenticated | error`; bounded probe (1 try + 2 retries: 600 ms, 1800 ms; 8 s per attempt; ≤ ≈ 26 s), no endless retry/redirect/spinner; `error` grants nothing and does not redirect — it renders a recovery screen with *Try again* (and re-checks on `online`); only a confirmed 401/403 redirects to `/login?next=<current>` so the user returns to `/?nav=chat`; interceptor treats only a definitive refresh rejection as session end; `getMe` validates the response contract; `protect()` returns a retryable 503 for infrastructure errors while staying fail-closed. Ledger and one deliberately rewritten pre-existing test (which had encoded the defect): see `01`.

## 4. Regression evidence (fresh extraction of the archive, after `npm ci`)
| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vite build` | exit 0 |
| Frontend Vitest | **78 files, 622 passed, 1 skipped** (RC: 76 / 580 / 1): +`AuthSessionStates` (22), +`authApi.getMe` (18), +2 `apiResilience` |
| Backend Jest | **73 suites, 1072 passed** (RC: 72 / 1065): +`protectInfraError` (7) |
| Backend Vitest / `test:node` | 5 files 16 passed / 1 passed |
| `test:chat-integrity` (plain run) | 1 **skipped** (no DB env) → **NOT RUN here as such**; executed inside the harness run below (passes, 0 skipped) |
| Harness (`node --test`, real PostgreSQL) | **55 tests: 54 pass, 0 fail, 1 todo** (D-MSG-4, intentional) (RC: 50) — +5 `p0-auth-infra-failure` |
| Browser matrix (production bundle / dev) | 18/18 and 18/18 PASS, +08b both |
| Validators (105 `validate:*`/`verify:*`, excl. live/certify/bootstrap/backup) | 101 pass; the **same 4 fail as on the foundation** (`validate:communications:providers`, `verify:production` (needs a URL → BLOCKED), `validate:phase8-operations` (missing `DISASTER_RECOVERY.md`), `validate:pwa-mobile`) — none touched by this change. `validate:navigation-convergence` 43/43; `validate:phase36`, `validate:release` pass. |
| Repo's own Playwright suite (`e2e/`, chromium only, default grep set) | **5 pass / 14 fail — identical per test on the pre-fix RC with and without a real backend** (stale selectors, e.g. the register role picker; no connection to this change). **PARTIAL / pre-existing FAIL**, not investigated further. `evidence/final-verification/e2e-comparison.txt` |
| Health (local server) | `/api/health`, `/health`, `/health/live`, `/health/ready`, `/api/v1/auth/csrf` 200; `/health/deep` 401 (admin only, NOT RUN with credentials) |

## 5. Security confirmation
Authentication/authorization were not weakened or bypassed; no hardcoded user, mock session or relaxed CSRF/CORS/cookie flag; protected data stays unreachable without a session (API 401 + SPA login redirect) and by non-participants (403/404, no leak; browser + API); a transient failure neither authenticates nor logs out; refresh/CSRF failure is explicit and bounded (6 refresh calls then recovery screen); the 503 body is generic; no credentials/cookies/tokens/message content in logs or evidence. Secret scan of source, production bundle and archive (regex set: private keys, `sk_live_`, `AKIA…`, `xkeysib-`, Twilio SIDs, JWT-shaped strings, `service_role`): no findings (the two validator hits are detector regexes). This is a pattern scan, **not** a gitleaks/history scan (no `.git`).

## 6. System audit
Priorities 1–5 were completed on the RC and are **re-executed on this tree** (harness 55 tests). Details: `docs/messaging-consistency-audit/04…09`. Summary and status:

| Area | Status |
|---|---|
| Message persistence/idempotency (`20261010193000…` inspected; migrations 20261011090000–093100 additive, none edited) | PASS on disposable PostgreSQL; **not applied to staging** |
| Concurrency/ordering (parallel HTTP, isolation assumptions documented in `04`) | PASS |
| Two-account receipts, unread counts, Socket.IO incl. non-participant room denial | PASS via socket.io-client on the real server; **browser realtime NOT RUN** (the Socket.IO script is served from `VITE_SOCKET_URL`/`api.kayad.space`, unreachable in the sandbox) |
| AuthN/AuthZ sweep, IDOR/ownership, privilege escalation, CSRF, governance/config admin routes | PASS for the routes swept; D-AUTHZ-2 (config stats/entries open to any signed-in user) **OPEN** |
| Payment/webhook idempotency, CSRF exemption of provider callbacks | PASS (emulated provider payloads; **real M-Pesa/Brevo/Twilio NOT RUN**) |
| RLS and client privileges at user level (anon/authenticated roles, `kayad_*` RPCs) | PASS on the migration chain; hosted state **UNCONFIRMED** |
| Uploads / private documents | **SOURCE-VERIFIED only**: type + magic-byte filter, 5 MB cap, private folders (`documents`, `receipts`, `inspection`, `escrow`) stored as Cloudinary *authenticated* assets, owner/admin check on `GET/DELETE /api/upload/:id`, `/uploads` static limited to jpg/png/webp with `nosniff`. Finding **D-UPL-1 (P3, OPEN):** `chat` uploads are *public* assets — message attachments are reachable by anyone holding the URL; recommend `private`. Cloudinary not reachable → NOT RUN live. |
| Auction 360 settlement, escrow, ledger/B2C payout | **NOT RUN** (ownership/bid-path tests PASS; full settlement flows not executed) |
| Admin permissions | governance/config PASS for the sweep; full admin UI journey NOT RUN |
| Mobile 320/360/375/390/412/430 px | Messages route PASS at all six (no login redirect, no horizontal overflow); other pages NOT RUN |
| Deployment/env convergence (Vercel/Render/Supabase/Redis) | SOURCE-VERIFIED + procedure `02`; staging **BLOCKED** |
| Secrets in source/bundle/archive | PASS (pattern scan) |

New findings this round: **D-RT-3** strengthened but still UNCONFIRMED (socket auth relies on a host-only cookie while `.env.example` points sockets to `api.kayad.space`); **D-RT-4 (P3, OPEN)** `onlineUsers` broadcast of all connected user ids to every socket incl. anonymous; **D-UPL-1** above; **UX note:** during `error` the navbar still shows "Sign In / Sign Up" (no global banner) — the protected workspace shows the recovery screen.

## 7. Test matrix (PASS / FAIL / PARTIAL / BLOCKED / NOT RUN / SOURCE-VERIFIED)
| Required scenario | Evidence | Status |
|---|---|---|
| Authenticated click Messages | matrix 01 (prod + dev) | PASS |
| Refresh / new tab / from another protected page | 02 / 03 / 04 | PASS |
| Delayed bootstrap (no premature redirect) | 05 (+ unit: spinner, no redirect for 5 s) | PASS |
| Bootstrap 500 (bounded retry → recoverable) | 06, 07 + backend 503 test | PASS |
| Bootstrap timeout | 08 (abort) and **08b (real 8 s client timeout)** | PASS |
| Malformed 200 (wrong host / SPA fallback) | 09 + `getMe` unit tests | PASS |
| Genuinely expired session → login | 10 | PASS |
| Sign in from the Messages redirect → back to Messages | 12 (real form, real bcrypt login) | PASS |
| Sign out then Messages → login | 13 | PASS |
| No session: private data inaccessible | 11 (+ API 401) | PASS |
| Authenticated non-participant denied | 14 + harness `m5-ownership`, `m2` | PASS |
| Refresh/CSRF failure explicit, no loop | 15 (6 calls, recovery screen) | PASS |
| Wrong API hostname/unreachable API diagnosable, no false auth | 16 | PASS |
| Marketplace/auction navigation intact | 17 + `validate:navigation-convergence` 43/43 | PASS |
| Mobile 320–430 | 18 | PASS (Messages route only) |
| Cookie attributes / CORS / Vercel rewrite on real hosts | `02` procedure | **BLOCKED** |
| Production / staging behaviour | — | **BLOCKED / NOT RUN** |
| Live browser realtime | — | NOT RUN |
| Repo Playwright journeys | e2e | PARTIAL (5 pass / 14 pre-existing fail, unchanged) |

## 8. Database changes
None for this fix. Inherited from the RC (additive, none edited): `20261011090000`, `…091000`, `…092000`, `…093000`, `…093100`. **Inspected:** all. **Tested on disposable local PostgreSQL 16:** chain replay 172/172 (with the documented harness stubs for D-MIG-1/D-SCHEMA-1) and the harness suites. **Applied to staging/production: none.** Known chain gaps still **OPEN**: D-MIG-1 (`rls_auto_enable()`), D-SCHEMA-1 (`transactions`), D-SCHEMA-2 (config/dispute/error-budget tables, `escrows.warning_sent`, `bids.bid_count`), D-FF-1 (`FeatureFlag` undefined).

## 9. Remaining blockers / open items
1. Staging environment + real Supabase/PostgREST run of the harness suites and migrations (BLOCKED).
2. Commit/deployment parity (no `.git` in the archive) (BLOCKED).
3. D-RT-3 socket authentication across hosts — prove in staging, then decide among the options in `02` §5.
4. Open defects: D-AUTHZ-2, D-MSG-4 (no outbox), D-MIG-1, D-SCHEMA-1/2, D-FF-1, D-RT-2/3/4, D-UPL-1, D-FIN-3, D-MSG-5 (see `docs/messaging-consistency-audit/09-DEFECT-REGISTER.md`; D-AUTH-2 is now FIXED here, D-AUTH-3/4 FIXED).
5. 4 pre-existing validator failures and 14 pre-existing repo-e2e failures (unchanged by this work).
6. Auction settlement/escrow/ledger/B2C and provider-positive callbacks NOT RUN.
7. A first-ever load of a page behind a *sleeping* Render instance can exceed ≈ 26 s: the user now sees *Try again*, not a logout; an always-on plan removes the cause.
**Release decision:** this change is a **conditional GO to staging**; production certification remains **NOT CERTIFIED / BLOCKED** for the reasons above.

## 10. Archive
`KAYAD-MESSAGES-REDIRECT-FIX-COMPLETE-AUDIT-20261011.zip` — SHA-256 in the `.sha256` sidecar next to the archive (an archive cannot contain its own hash). Contents: corrected source, 172 migrations, tests, docs, lockfiles, config templates. Excludes `.git`, `node_modules`, `dist`, `logs`, `backend/uploads`, `uploads.sqlite*`, `.env*` secrets, caches. Parity: the tree used for every command above is the shipped archive minus exactly these paths, which were generated from or after the run: `docs/audits/00-AUDIT-REPORT-…` (this file), `docs/audits/evidence/**`, `docs/messaging-consistency-audit/harness/evidence/p0/**` (run outputs), and the one-paragraph pointer added to `docs/messaging-consistency-audit/README.md`. The packaging step re-extracts the final archive and compares SHA-256 of every other file with the verified tree.

## Reproduce
```
npm ci && (cd backend && npm ci) && (cd docs/messaging-consistency-audit/harness && npm ci)
npx tsc --noEmit && npx vitest run && (cd backend && npm run test:jest)
# real PostgreSQL 16 database built from supabase/migrations via harness/sql/apply_chain.sh, then:
cd docs/messaging-consistency-audit/harness
KAYAD_TEST_DB=<db> node --test --test-concurrency=1 tests/*.test.mjs
npx vite build --outDir /tmp/dist && PROD=1 DIST=/tmp/dist KAYAD_TEST_DB=<db> node browser/p0-matrix.mjs out.json   # production bundle
KAYAD_TEST_DB=<db> node browser/p0-matrix.mjs out.json                                                              # Vite dev
# against another tree (e.g. pre-fix): APP_ROOT=<tree> KAYAD_BACKEND_DIR=<tree>/backend (add DIST=<its dist> with PROD=1)
```
