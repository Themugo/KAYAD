# Staging verification procedure and environment convergence (Vercel / Render / Supabase / Redis)

Nothing in this document was executed against a live environment (no network access to Vercel, Render, Supabase or `api.kayad.space` from the audit sandbox). It is a **procedure to run in staging**, derived from source (`vercel.json`, `render.yaml`, `.env.example`, `backend/server.js`, `authController.js`, `SocketContext.tsx`). Do not run it against production data, and do not apply migrations to production as part of it.

## 1. Topology implied by the repository

| Concern | Source | Consequence |
|---|---|---|
| SPA → API | `vercel.json` rewrite `/api/:path*` → `https://api.kayad.space/api/:path*`; `.env.example` `VITE_API_URL=/api`; `httpClient.ts` baseURL `/api` | Browser sees a **same-origin** API; cookies are **host-only on the app host**; no CORS involved. |
| Cookies | `authController.js`: `token` (1 h default, `ACCESS_COOKIE_MS`) and `refreshToken` (7 d): `httpOnly`, `sameSite:"lax"`, `path:"/"`, `secure` only when `NODE_ENV=production`, **no `domain`** | Correct for the rewrite topology. `Secure` requires HTTPS end to end (Render must see `NODE_ENV=production` and trust the proxy: check `trust proxy` / `X-Forwarded-Proto`). |
| CSRF | stateless double-submit: `XSRF-TOKEN` cookie + `X-CSRF-Token`, bootstrapped by `GET /api/v1/auth/csrf`; SPA keeps an in-memory copy | Works through the rewrite. |
| Realtime | `.env.example` `VITE_SOCKET_URL=https://api.kayad.space`; `SocketContext` connects with `withCredentials` and **no `auth.token`**; server reads the `token` cookie from the handshake | **Cross-host**: a host-only cookie set for the app host is *not* sent to `api.kayad.space`. Expected result in production: the socket connects **anonymously** (`socket.user = null`), so private rooms/`user_<id>` push do not work while REST messaging does. Defect **D-RT-3 — still UNCONFIRMED (NOT RUN)**; this is now source-supported but must be proven in staging. |
| Presence | `server.js` `io.emit("onlineUsers", [all connected user ids])` | Broadcast to every socket including anonymous ones: user-id enumeration. **D-RT-4 (new, OPEN, P3)**. |
| Cold start | `render.yaml` has no `plan` pinned in the inspected excerpt; Render plans that sleep take 30–60 s to answer | First `/auth/me` after sleep can 502/504/time out. The SPA now retries 3× (8 s timeout each, ≈ 26 s) and then shows *Try again*; it never logs the user out. Consider a paid always-on plan for the API. |

## 2. Preconditions (read-only checks first)

1. Staging uses its **own** Supabase project (never the production one). Record `select version, name from supabase_migrations.schema_migrations order by 1 desc limit 10;`.
2. Diff the applied migration list against `supabase/migrations/` (172 files here). Known gaps in the chain that a fresh database will hit (not caused by this change): D-MIG-1 `rls_auto_enable()`, D-SCHEMA-1 `transactions`, D-SCHEMA-2 missing config/dispute tables. Resolve those **before** certification; they are listed in `docs/messaging-consistency-audit/09-DEFECT-REGISTER.md`.
3. Confirm env: `NODE_ENV=production`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `SESSION_SECRET` (distinct, ≥ 32 chars), `FRONTEND_URL` = the exact staging web origin, `CORS_ORIGINS` includes it (only relevant if `VITE_API_URL` is an absolute URL), `REDIS_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only — never in a `VITE_*` variable or the bundle). `BREVO_API_KEY` set ⇒ email verification is enforced by `protect()`; seed the test users as verified.
4. Frontend env: `VITE_API_URL=/api` (rewrite topology). If it is an absolute URL the cookies are scoped to the API host and the same-site/CORS rules change — do not mix.

## 3. Safe staging test users
Create **three** staging-only accounts via the normal registration + verification flow (never production users, never reuse passwords): `qa-alice` (buyer), `qa-bob` (seller), `qa-eve` (unrelated). Start one chat Alice↔Bob through the UI.

## 4. Test procedure (record URL, status codes, console; redact cookies/tokens)

| # | Step | Expected |
|---|---|---|
| 1 | Alice signs in; click navbar **Messages** | stays on `/?nav=chat`, conversation list loads; `/api/v1/auth/me` 200 |
| 2 | Refresh, open a new tab to `/?nav=chat` | same, no login redirect |
| 3 | DevTools → Application → Cookies: `token`, `refreshToken` | `HttpOnly`, `Secure`, `SameSite=Lax`, **Domain = app host (host-only)** |
| 4 | Network: first `/api/v1/auth/me` | 200 via the Vercel rewrite; `Set-Cookie` only on login/refresh |
| 5 | Let the access cookie expire (`ACCESS_COOKIE_MS` small in staging) then click Messages | one `/me` 401 → one `/auth/refresh` 200 → retry 200; no redirect |
| 6 | Revoke the session server-side (sign out in another browser) then click Messages | `/me` 401 → refresh 403 → **login** with `next=%2F%3Fnav%3Dchat`; after sign-in lands on Messages |
| 7 | Stop/suspend the Render service for 60 s, reload `/?nav=chat` | recovery screen (*We couldn't verify your session*), **no** login redirect; after restart press *Try again* → Messages |
| 8 | Point a throw-away preview build at a wrong API host (`VITE_API_URL=https://example.invalid`) | recovery screen, diagnosable via the Network tab; never "signed in" |
| 9 | Eve opens Alice↔Bob chat id by API (`GET /api/chat/:id/messages`) | 403/404, no payload |
| 10 | Realtime: Alice and Bob both open the chat; Bob sends | Alice receives it **without refresh** (proves socket auth + room join). If not, inspect the socket handshake: is the `token` cookie sent to the socket host? Expect it is **not** (D-RT-3). |
| 11 | Unread/receipts: Alice marks read | Bob sees seen state; counts equal on both |

## 5. If step 10 fails (D-RT-3), options (decide with the owner; none implemented here)
1. **Short-lived socket ticket** (preferred): an authenticated REST call (`POST /api/v1/auth/socket-ticket`, CSRF-protected) returns a 60 s JWT with `aud:"socket"`; the client passes it as `auth.token`; the server also re-checks revocation (closes D-RT-2). Adds one endpoint and a few lines client-side.
2. Serve the socket from the same registrable host with a cookie `Domain` (`.kayad.space`): broadens the cookie to every subdomain (security trade-off) and must be tested with Safari ITP.
3. Run Socket.IO behind the same origin (not possible through Vercel rewrites).
Never set `SameSite=None` / widen CORS "to see if it helps".

## 6. Rollback
Frontend: redeploy the previous Vercel build (instant). Backend: redeploy the previous Render image. This change has **no migration**, so no database rollback is involved. The only server-visible behaviour change is `503` instead of `401` on an *internal* auth-store failure; any monitor that alerts on 401-rate should also watch 503 `AUTH_TEMPORARILY_UNAVAILABLE`.

## 7. What staging must still prove (BLOCKED here)
Real PostgREST/Supabase behaviour (pooler, JWT, default privileges), hosted migration state, Vercel rewrite headers/timeouts, Render cold-start timing, cookie attributes as delivered, sandbox M-Pesa callbacks, Brevo/Twilio/Cloudinary, browser realtime, and commit/deployment parity (this archive has no `.git`).
