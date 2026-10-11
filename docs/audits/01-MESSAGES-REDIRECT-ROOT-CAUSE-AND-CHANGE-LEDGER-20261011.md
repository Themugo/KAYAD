# Messages → login redirect: root cause, evidence and change ledger

Scope: a signed-in user clicking the existing navbar **Messages** control (`/?nav=chat`) must reach the real messaging UI; unauthenticated users and non-participants must stay denied. Local changes only (no commit, push, deployment or production migration was performed). Environment of every statement below: Chromium (Playwright) → Vite dev server **or** the production `dist/` bundle behind a Vercel-style same-origin `/api` proxy → the real `backend/server.js` → real PostgreSQL 16 built from the migration chain, through a test-only REST emulator (`harness/postgrest-emulator.mjs`). **It is not Supabase/PostgREST and it is not the live site**; nothing here is a live verification.

## 1. Root causes (two independent defects produce the same symptom)

The redirect is produced by the guard in `src/App.tsx` (protected-nav effect) and `RequireAuth`, which send the visitor to `loginPathFor(location)` as soon as `loading === false && user === null`. Two defects made `user === null` for a *valid* session:

| ID | Layer | Defect | Status |
|---|---|---|---|
| D-AUTH-1 | backend | `protect()` read `user._id` from lean rows that only have `id` → TypeError on **every** authenticated request → caught and reported as `401 "Not authorized"` → SPA refresh fails → logged out. | Fixed in the foundation this work builds on (RC `KAYAD-MESSAGING-CONSISTENCY-RC-20261011`). |
| D-AUTH-2 | backend | `protect()`'s catch-all answered **401** for *any* unexpected error (database / PostgREST / network failure). A store outage looked exactly like "your session is over". | **Fixed here**: `503 AUTH_TEMPORARILY_UNAVAILABLE` (`retryable: true`, `Retry-After`), still fail-closed. |
| D-AUTH-3 | frontend | `AuthProvider` swallowed **every** `getMe()` failure (`.catch(() => {})`) and set `loading=false, user=null`: a 5xx, timeout, network drop, CORS error or malformed 200 was indistinguishable from "signed out" → guards redirected a possibly-valid user to login. There was no session status, no retry, no error state. | **Fixed here** (explicit four-state session model, below). |
| D-AUTH-4 | frontend | `httpClient` response interceptor: when a 401 triggered a refresh and the **refresh itself** failed for any reason (network, timeout, 5xx, 429, CSRF mismatch) it dispatched `kayad:auth-expired` (global logout) or surfaced the stale 401. | **Fixed here**: only a *definitive* rejection (401, or 403 that is not a CSRF error) ends the session; anything else is surfaced as an unknown/retryable failure and never broadcast as expiry. |

Plausible production trigger for D-AUTH-2/3/4 (source-level inference, **not observed live**): `vercel.json` rewrites `/api/*` to `https://api.kayad.space`; any backend cold start, restart, Redis/DB hiccup or 502/504 at the rewrite during the **first** `/api/v1/auth/me` call of a page load used to log the user out.

## 2. Reproduction before editing (evidence)

Run against the unmodified foundation (RC tree + RC backend), production bundle, `harness/evidence/p0/p0-before-prod.{log,json}` and screenshots; backend fault injection `p0-auth-infra-failure.before.tap`:

* `/?nav=chat` with a valid cookie while `GET /api/v1/auth/me` returns **500**, a network failure, a **malformed 200** (HTML), or `/auth/refresh` returns a **CSRF 403** → final URL `/login?next=%2F%3Fnav%3Dchat` (6 scenarios FAIL).
* A single transient **503** on the first probe → login redirect in the production bundle. (In the dev server the same case "passed" only by accident: React.StrictMode runs the mount effect twice and the second call succeeded; the production build has no such double call. Evidence file `p0-before.log` scenario 07 vs `p0-before-prod.log` scenario 07.)
* Real backend with the auth store (`user_auth`) renamed away in PostgreSQL: `/auth/me`, `/chat/unread`, `/chat/:id/messages` → **401 `{"message":"Not authorized"}`** for a valid cookie (the same string that drives the SPA logout).
* Unaffected: valid session click / refresh / new tab / navigation from another protected page, expired session, no session, sign-in from the redirect, sign-out, non-participant denial, marketplace/auction navigation (all PASS before and after).

## 3. The correction

### 3.1 Session model (`src/context/AuthContext.tsx`)

`sessionStatus: 'loading' | 'authenticated' | 'unauthenticated' | 'error'` plus `sessionError` (`network | server | rate_limited | csrf | forbidden | unexpected`, status only — no bodies, tokens or message content) and `retrySession()`.

| Probe outcome | Status | Access | Guard behaviour |
|---|---|---|---|
| valid user object | `authenticated` | yes | render |
| `401` (after the interceptor's single refresh attempt also definitively failed) / `403` | `unauthenticated` | no | redirect to `/login?next=<current>` (e.g. `/?nav=chat`) |
| network, timeout (8 s/attempt), 5xx, 429, CSRF, malformed 200, any unknown | retried **2 more times** (600 ms, 1800 ms), then `error` | **no** | **no redirect**; recovery screen (`data-testid="session-recovery"`) with *Try again* and an explicit *Sign in* link |
| unresolved | `loading` | no | spinner, never a redirect |

`isAuth` is still exactly `!!user`; **nothing grants access except a validated server response**. `error` does not mean signed-out and does not mean signed-in. While in `error` the page re-checks once on `window` `online`. A stale probe cannot overwrite a newer login/logout (existing sequence guard retained); a failed sign-in while a probe was in flight no longer leaves the app stuck in `loading`.

### 3.2 Guards
`RequireAuth`, `RequireDealer`, `RequireSeller`, `RequireEmailVerified`, `RequireAdmin`, `RequireAdminPage`, both `AdminLayout` copies and the `App.tsx` protected-nav effect/render show `SessionRecovery` instead of redirecting when `sessionStatus === 'error'`. The literal `protectedNavs = new Set([...])` that two validators pin is preserved. The canonical `/?nav=chat` route, the existing navbar button and `LoginPage`'s `next` handling are unchanged (no new Messages page, no navigation redesign).

### 3.3 Transport (`src/api/httpClient.ts`, `httpRequest.ts`, `authApi.ts`)
* `isDefinitiveSessionRejection(err)`: 401, or 403 whose message is not a CSRF failure.
* On a 401 → refresh → refresh failure: definitive → previous behaviour (probe gets the 401; other endpoints broadcast `kayad:auth-expired`); **not** definitive → reject with the refresh error, no broadcast. One refresh per request (already `_kayadRetried`), CSRF retry once — no loops (measured: exactly 6 refresh calls in the persistent-CSRF-failure scenario = 3 bounded probe attempts × (1 refresh + 1 CSRF retry), then the recovery screen; 3 `/auth/me` calls for a persistent 500).
* `getMe({timeoutMs})` validates the response contract (`{ user: { id|_id } }`); an HTML SPA fallback (wrong API host), proxy error page or truncated body is thrown as `unknown` (retryable error state) instead of guessed.

### 3.4 Backend (`backend/middleware/auth.js`)
Catch-all → `503 { success:false, code:"AUTH_TEMPORARILY_UNAVAILABLE", retryable:true }` + `Retry-After: 2`. All genuine verdicts keep their codes (401 missing/invalid/expired/revoked/version-mismatch/unknown user, 403 banned/deactivated/unverified). No protected data, internals or credentials are returned or logged. CSRF, RBAC and participant checks are untouched.

## 4. Change ledger (against `KAYAD-MESSAGING-CONSISTENCY-RC-20261011`)

| File | Change |
|---|---|
| `backend/middleware/auth.js` | catch-all 401 → fail-closed retryable 503 (D-AUTH-2) |
| `src/context/AuthContext.tsx` | session status machine, bounded probe, `retrySession`, `SessionRecovery`, guards (D-AUTH-3) |
| `src/api/httpClient.ts` | `isDefinitiveSessionRejection`; no expiry broadcast on unknown refresh failure (D-AUTH-4) |
| `src/api/httpRequest.ts` | optional per-request `timeout` |
| `src/services/authApi.ts` | `getMe` contract validation + timeout; doc comment corrected |
| `src/App.tsx` | no redirect while `error`; recovery render; module-level `protectedNavs` (same literal) |
| `src/components/admin/AdminLayout.tsx`, `src/components/layout/AdminLayout.tsx` | recovery instead of redirect in `error` |
| `src/__tests__/api/apiResilience.test.ts` | **one existing test deliberately rewritten**: it asserted that a *network-failed refresh* must dispatch `kayad:auth-expired` — i.e. it encoded D-AUTH-4. Replaced by: definitive refresh rejection dispatches expiry (401, 403); unknown refresh failures (network, 500, 503, 429, CSRF 403) do not; probe + definitive failure still surfaces the 401. |
| new tests | `src/__tests__/context/AuthSessionStates.test.tsx`, `src/__tests__/services/authApi.getMe.test.ts`, `backend/tests/regression/protectInfraError.test.js`, `harness/tests/p0-auth-infra-failure.test.mjs`, `harness/browser/p0-matrix.mjs` (+ `prod-server.mjs`) |

No migrations were added or applied for this fix. No validator was edited (a first draft renamed `protectedNavs` and broke `validate:navigation-convergence`; the code was changed instead). No changes to marketplace, auction, payment, navigation architecture, CSRF or RBAC code.

## 5. Security confirmation
* No authentication bypass: access still requires a server-validated user; `error` and `loading` grant nothing.
* Not all errors became "authenticated" and not all became "unauthenticated" — three distinct outcomes plus loading.
* No hardcoded users, mock sessions or relaxed CSRF/CORS/cookie flags; cookies were **not** modified (see the staging procedure for how to diagnose them).
* Non-participants: backend 403/404 and no payload leak (browser + API, scenario 14); anonymous: 401 on the API and login redirect in the SPA (scenario 11).
* The 503 body is generic; internals (table names, PostgREST errors) are asserted absent in `p0-auth-infra-failure`.
* No credentials, cookies, tokens or message content are logged by the new code; the redacted evidence contains only paths and status codes.
