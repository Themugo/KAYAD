# 06 — Authentication redirect diagnosis (Messages → login)

## Verdict

**Reproduced in a real browser and root-caused. Fixed with a one-line identity change in `backend/middleware/auth.js`.** The cause was in the backend, not in the SPA's route guard, CSRF bootstrap or session restoration.

## Reproduction (real Chromium, real Vite dev server, real backend, real PostgreSQL)

`harness/browser/m4-repro.mjs`: Playwright launches Chromium, a Vite dev server proxies `/api` to the real `backend/server.js` running on the chain-built database. The browser context is seeded with the access cookie a login would set (`token`, HttpOnly, host `localhost`), then navigates to `/?nav=chat`.

| Run | `GET /api/v1/auth/me` | Refresh | Final URL | Redirected to login |
|---|---|---|---|---|
| **Foundation** `auth.js` (`harness/evidence/m4-foundation.json`, `.png`) | **401** `{"success":false,"message":"Not authorized"}` (twice) | `POST /api/v1/auth/refresh` → 401 `No refresh token` (twice) | `/login?next=%2F%3Fnav%3Dchat` | **YES** |
| **Patched** `auth.js` (`harness/evidence/m4-patched.json`, `.png`) | **200** with the user | not needed | `/?nav=chat` (Messages workspace renders, signed in as the user) | no |

Network bodies are sanitised: tokens are never recorded; only status, method, path and the first 160 body characters. The valid, correctly signed token was rejected by the foundation — so the 401 is not an expired/absent cookie.

## Root cause (proven with a stack trace from the real middleware, then removed)

```
TypeError: Cannot read properties of undefined (reading 'toString')
    at protect (backend/middleware/auth.js:167)       // id: user._id.toString()
```

`protect()` re-reads the security state with `User.findById(id).select(...).lean()`. In this codebase `lean()` rows are produced by `mapRowIn` in `models/_base.js` and expose `id` plus camelCase aliases but **no `_id`** (only non-lean `wrapDoc` documents define the `_id` getter). `user._id.toString()` therefore threw on **every** authenticated request. The surrounding `catch` converts *any* exception into `401 "Not authorized"`, so the symptom looked like an authentication failure everywhere: `/auth/me` → 401 → SPA tries `/auth/refresh` → 401 → `AuthContext` sets `user = null` → the route guard (`App.tsx`, protected navs include `chat`) calls `navigate(loginPathFor(location))`. The same line existed in `optionalAuth`.

Why it was not caught earlier: unit tests mock the models with objects that have `_id`; no test had run `protect()` against a real row. My own earlier release-gate verification of the pushed commit shared that blind spot — it did not detect this defect.

## Trace of the other suspected paths (all PASS, `harness/tests/m4-login-session-flow.test.mjs`, 6 tests)

* **CSRF bootstrap.** Login without a CSRF token → 403; after `GET /api/v1/auth/csrf` (double-submit cookie + header) → login 200.
* **Login.** Real bcrypt hash; sets `token` and refresh cookies; wrong password → generic 401 and no session.
* **Session restoration.** With the cookie jar only: `/auth/me` 200, `/api/chat/unread` 200, `/api/chat/:id/messages` 200 (after the fix).
* **Refresh rotation.** `POST /auth/refresh` → 200, new access token works.
* **Logout.** Revokes the session; replaying the previous access token → 401.
* **Anonymous** `/auth/me` → clean 401, not a 5xx.

## Security posture of the fix

`req.user.id = String(user._id ?? user.id)`: same identity, same checks. Banned/deactivated/unverified/tokenVersion/session-revocation checks, the 401-on-error fail-closed catch and CSRF are unchanged. Regression test `backend/tests/regression/protectLeanRow.test.js` fails on the old line and passes on the new; it also asserts a banned user is still 403 and a missing token still 401.

## Secondary findings (not patched — out of "demonstrated root cause")

* **D-AUTH-2 (P2, open).** `protect()` maps *infrastructure* errors (database down, schema drift) to `401`. The SPA treats 401 as "logged out", so a transient database error can force users to the login page and mask the real cause in monitoring. Recommendation: return `503` with a distinct code for non-auth exceptions (still fail-closed) **and** make `AuthContext` keep the prior state on a non-401 `getMe()` failure. This is a behaviour change on a security path and was deliberately left for a reviewed change.
* **D-OBS-1 (fixed).** The catch logged `err: {}`; `logError` now keeps plain-object causes and `protect()` passes the real `Error`.
* **Limits of this evidence.** The browser was seeded with the cookie rather than driven through the login form (the API-level login flow is covered separately). The SPA's Socket.IO client script is fetched from `http://localhost:5000` in dev and was unavailable in this run (console: "Realtime unavailable"), so browser realtime was **NOT RUN**. The **production** failure could not be observed (no production access): this diagnosis shows the foundation code *must* produce the reported symptom against any database whose rows are lean-shaped; whether production returned 401 for this reason is **UNCONFIRMED** until the fixed build runs there and `/auth/me` is checked.
