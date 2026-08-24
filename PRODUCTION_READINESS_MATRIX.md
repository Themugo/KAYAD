# Phase 12 — Production-Readiness Evidence Matrix

Date: 2026-08-24
Scope: End-to-end workflow certification using the existing Playwright infrastructure against a controlled environment. **No features added. No workflow is marked PASS for merely rendering.**

## Environment parity statement

| Requirement | Status | Evidence |
| --- | --- | --- |
| Same authentication mechanism | PARITY | Playwright drives the same httpOnly-cookie/Bearer auth the backend issues (`backend/controllers/authController.js`). Backend auth is covered by 56 Phase-10 authz tests against the real middleware. |
| Same API contracts | PARITY | E2E `ApiHelper` targets the real `/api/*` routes; backend contract covered by 335 backend tests. |
| Same authorization | PARITY | Same `protect`/`adminOnly`/`authorize` middleware as production (tested, Phase 10). |
| Same database schema | **NOT AVAILABLE** | No Supabase instance is provisioned anywhere in this environment (confirmed: no `backend/.env`, `authApi.ts` header comment, vitest placeholder URLs). The db layer (`db/index.js`) and `db/schema_clean.sql` are the production schema, but no live DB exists to run against. |
| Same frontend build | PARITY | Tests run against the real Vite dev/preview build (`npm run dev`, same artifacts as `vite build`). |
| Same backend build | PARTIAL | Backend boots from the same `server.js`, but without a database every request either errors or hangs (verified empirically — see "Environment finding" below). |

**Bottom line:** this environment can certify the frontend build and the backend logic in isolation, but cannot stand up the full UI → live API → backend → database → UI loop end-to-end. That limitation is stated, not worked around with mocks.

## Environment finding (verified empirically)

1. Existing E2E specs (10 files, ~4,290 lines, 8 workflow areas) all fail at setup: `ApiHelper.loginApi` → **404**, because the frontend dev server on `:3000` does not proxy `/api` to the backend and no backend with a database is reachable. Root cause is **environment**, not application code.
2. The backend without Supabase accepts connections but requests never complete (queue/DB init blocks) — so "backend-only, no DB" is not a usable staging tier either.
3. The pre-existing specs also encode stale UI contracts (e.g. a `firstName`/`lastName` registration form; the deployed `RegisterPage.jsx` uses `name` + a role-picker) — test drift, separate from any app bug.

## Workflow evidence matrix

PASS = the layers listed actually executed and were asserted. Levels: **API** = backend API-level tests (Phases 9–11, 335 tests, all passing). **UI** = real-browser render/navigation (this phase). **DB** = verified against a live database (not available here).

| # | Workflow | Happy path | Unauthorized | Invalid input | Network failure | Refresh | Duplicate submission | State transitions | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Registration | API ✓ (register controller, role clamping) | API ✓ (role escalation → `user`) | API ✓ (password policy, missing fields) | UI ✓ (shell survives API abort) | UI ✓ | API ✓ (duplicate email → 400) | API ✓ (pending vs approved roles) | **API-CERTIFIED; DB-loop NOT VERIFIED** |
| 2 | Login | API ✓ (bcrypt, JWT issue, lockout) | API ✓ (wrong creds → 401 enum-safe) | API ✓ (missing fields → 400) | UI ✓ | UI ✓ | API ✓ (lockout after 5) | API ✓ (tokenVersion issue) | **API-CERTIFIED; DB-loop NOT VERIFIED** |
| 3 | Session restoration | API ✓ (`/auth/me`, protect) | API ✓ (expired/forged/revoked → 401) | — | UI ✓ | UI ✓ (shell re-renders) | — | API ✓ (tokenVersion mismatch → 401) | **API-CERTIFIED; DB-loop NOT VERIFIED** |
| 4 | Logout | API ✓ (refresh revoke, tokenVersion bump) | API ✓ | — | — | — | — | API ✓ (post-logout token rejected) | **API-CERTIFIED** |
| 5 | Buyer marketplace browsing | UI ✓ (shell, marketplace nav, region selector) | — | UI ✓ (unknown route no crash) | UI ✓ (API abort, no crash, no fabricated data) | UI ✓ | UI ✓ (dedupedFetch tested) | — | **UI-CERTIFIED; live-catalog loop NOT VERIFIED** |
| 6 | Vehicle details | API ✓ (car controller ownership/404) | API ✓ | API ✓ | UI ✓ | — | — | API ✓ (status transitions) | **API-CERTIFIED; DB-loop NOT VERIFIED** |
| 7 | Saved vehicle | API ✓ (favorites ownership, CSRF) | API ✓ (403 cross-user) | API ✓ | — | — | API ✓ (idempotent favorite) | — | **API-CERTIFIED; DB-loop NOT VERIFIED** |
| 8 | Seller/dealer listing | API ✓ (car create, ownership) + spec exists* | API ✓ (dealer-only) | API ✓ (validation) | spec exists* | — | API ✓ (duplicate VIN handling) | API ✓ (draft/published/sold) | **API-CERTIFIED; UI spec exists but cannot run (env)** |
| 9 | Inspection request | API ✓ (inspection routes, auth) | API ✓ | API ✓ | — | — | — | API ✓ (status transitions) | **API-CERTIFIED; DB-loop NOT VERIFIED** |
| 10 | Inspection completion | API ✓ (state machine, officer role) | API ✓ (non-officer 403) | API ✓ | — | — | — | API ✓ | **API-CERTIFIED; DB-loop NOT VERIFIED** |
| 11 | Auction creation | API ✓ (auction routes, dealer gate) + spec exists* | API ✓ | API ✓ | — | — | API ✓ (idempotency middleware) | API ✓ | **API-CERTIFIED; UI spec exists but cannot run (env)** |
| 12 | Bidding | API ✓ (bid placement, idempotency, rate limit) + spec exists* | API ✓ | API ✓ (amount validation) | — | — | API ✓ (time-windowed idempotency key) | API ✓ | **API-CERTIFIED; UI spec exists but cannot run (env)** |
| 13 | Auction completion | API ✓ (auction close service, timer) | API ✓ | — | — | — | API ✓ (no double-close) | API ✓ (pending_payment → completed) | **API-CERTIFIED; DB-loop NOT VERIFIED** |
| 14 | Escrow handoff | API ✓ (escrow state machine, 56+ Phase 9/11 tests) + specs exist* | API ✓ | API ✓ | API ✓ (M-Pesa fail-closed) | — | API ✓ (idempotency + atomic claim) | API ✓ (full state machine) | **API-CERTIFIED; UI specs exist but cannot run (env)** |
| 15 | Payment state | API ✓ (payment callback, amount verify, atomic claim) + spec exists* | API ✓ (IP allowlist) | API ✓ (amount mismatch → failed) | API ✓ (timeout/500/malformed fail-closed) | — | API ✓ (duplicate callback idempotent) | API ✓ (pending → success/failed) | **API-CERTIFIED; UI spec exists but cannot run (env)** |
| 16 | Dispute workflow | API ✓ (dispute state machine, cron) + spec exists* | API ✓ | API ✓ | — | — | API ✓ (dispute idempotency key) | API ✓ (open → resolved) | **API-CERTIFIED; UI spec exists but cannot run (env)** |
| 17 | Admin operations | API ✓ (admin routes, superadmin gates) | API ✓ (role matrix, 10 roles) | API ✓ (staff role whitelist) | — | — | — | API ✓ | **API-CERTIFIED; DB-loop NOT VERIFIED** |

\* Existing Playwright specs in `e2e/tests/` cover these workflows' UI paths but **cannot execute** in this environment (no API/database reachable) and contain UI-contract drift noted above.

## New executable E2E evidence (this phase)

`e2e/tests/workflow-certification/workflow-certification.spec.ts` — **8/8 passing** against the real build on system Chromium: build serves and renders the marketplace shell, auth entry points render, marketplace↔auctions navigation with zero uncaught errors, SPA deep links 200, unknown routes don't crash, refresh preserves the shell, full API outage (`route.abort`) doesn't crash or fabricate data, and mobile viewport rendering.

## Fixes made during this phase (existing weaknesses only)

- **Redis in-memory fallback adapter** (`backend/config/redis.js`): the fallback was a plain `Map`, so the `incr/hset/lpush/rpop/lrange` wrappers would throw in degraded mode. Replaced with a minimal adapter implementing the Redis method surface (get/set/del/expire/incr/decr/hget/hset/hgetall/lpush/rpop/lrange). Fixes the residual observation recorded in Phase 11.

## Production-readiness summary

- **Certified (API level, all passing):** all 17 workflows' server-side behavior — authentication, authorization, validation, idempotency, state machines, payment/escrow/dispute logic — 335 backend tests green across Phases 9–12.
- **Certified (UI level, real browser):** build integrity, shell rendering, navigation, routing resilience, refresh recovery, network-failure fail-safe, responsive layout — 8/8 Playwright tests green.
- **NOT certified (environment-blocked, honestly reported):** the complete UI → live API → backend → database → UI round trip. No Supabase instance exists in this environment; the frontend dev server does not proxy `/api`; existing workflow specs require a provisioned staging DB to execute. To close this gap, provision a Supabase project with `db/schema_clean.sql`, set `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`, add a `/api` proxy (or run the built frontend behind the backend), then re-run the existing `e2e/tests/*` suites.
