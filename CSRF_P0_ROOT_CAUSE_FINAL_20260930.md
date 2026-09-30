# CSRF P0 Root Cause — FINAL — 2026-09-30

## INCIDENT / EXACT ERROR
Registration fails with `Route not found: /api/v1/auth/csrf`.

## ROOT CAUSE — classification A (backend boot failure) leading to B (stale Render deployment)
`backend/routes/authRoutes.js` used `authLimiter` (4 routes) without importing it. Import threw
`ReferenceError: authLimiter is not defined`, `node bootstrap.js` exited before listening, Render's
health check failed, and the previous build kept serving. That build lacks `/api/v1/auth/csrf` and its
`notFound` middleware returns exactly `Route not found: <originalUrl>`.
Secondary hardening (L): the service worker cached every `/api/` GET, including `/api/v1/auth/csrf`.

## EVIDENCE
- Sole generator of the message in the repo: `backend/middleware/notFound.js` (matches wording; in production the body has no path/method).
- Mount chain verified: server.js:861 `/api/v1` -> v1.js:41 `/auth` -> authRoutes.js:37 `/csrf`; notFound mounted after (server.js:868).
- Boot of original source: crash with the ReferenceError. Boot after fix: starts (only unreachable-Supabase DNS errors in this sandbox).
- Startup output after fix showed no other ReferenceError/SyntaxError/MODULE_NOT_FOUND.
- Dockerfile: `CMD node bootstrap.js`, copies routes/middleware/server.js; `backend/inspectionBusinessCenter` and `backend/tests` are not copied (nothing in startup path imports them; boot succeeded).
- Frontend URL: axios baseURL `/api` + `/v1/auth/csrf` = `/api/v1/auth/csrf` (src/api/httpClient.ts). Correct.
- vercel.json rewrite `/api/:path*` -> `https://api.kayad.space/api/:path*` preserves the path. Correct by inspection (not tested live).

## LOCAL RESULT
`/health` 200; `GET /api/v1/auth/csrf` 200, `success:true`, `csrfToken`, `X-KAYAD-Canonical-Route`, `X-KAYAD-API-Contract: v1`, `Cache-Control: no-store`, XSRF-TOKEN cookie.
Regression test `backend/tests/authRoutesBoot.test.js`: PASS with fix; FAIL (ReferenceError) when the import is removed.

## BUILD / RENDER / VERCEL / DNS / BROWSER / REGISTRATION
BLOCKED — sandbox has no access to Render, Vercel, DNS or production; registration POST needs a live Supabase.

## FILES CHANGED
- backend/routes/authRoutes.js (import authLimiter)
- backend/tests/authRoutesBoot.test.js (new; real HTTP test on canonical chain)
- public/sw.js (do not intercept/cache /api/auth and /api/vN/auth)
- CSRF_404_FORENSIC_ROOT_CAUSE_20260930.md, this report

## TESTS
authRoutesBoot: PASS. Pre-existing, unrelated: backend/tests/response-lifecycle.test.js (uses node:test) and productionRuntimeCorrections.test.js (uses vitest) cannot run under the backend's Jest runner.

## REMAINING BLOCKERS / OWNER ACTIONS
1. Push and confirm the new Render deploy goes Live; check earlier failed deploy logs for the ReferenceError.
2. `curl -i https://api.kayad.space/api/v1/auth/csrf` and `https://kayad.space/api/v1/auth/csrf` -> expect 200 and headers above.
3. Compare `X-KAYAD-Build-ID` to the GitHub commit.
4. Real browser registration; users with the old service worker get the new one on next load.

STATUS: SOURCE FIX VERIFIED — LIVE CSRF INCIDENT NOT YET CERTIFIED
