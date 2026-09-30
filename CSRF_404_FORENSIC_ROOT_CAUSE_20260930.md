# CSRF 404 Forensic Root Cause — 2026-09-30

## Incident
`Route not found: /api/v1/auth/csrf` on registration.

## Root cause (category F — deployed commit drift, triggered by a boot crash)
`backend/routes/authRoutes.js` used `authLimiter` (lines 467, 468, 548, 549) but only imported
`registrationLimiter, recoveryLimiter, verificationLimiter`. Importing the module throws
`ReferenceError: authLimiter is not defined`, so `node bootstrap.js` exits before listening.
A Render deploy of this source therefore fails its health check and the previous (older) build keeps serving.
That older build has no `/api/v1/auth/csrf`, and its `notFound` middleware emits exactly
`Route not found: <originalUrl>` (production body has no `path`/`method` fields).

## Evidence
- Source mount graph is correct: server.js:861 `/api/v1` -> v1.js:41 `/auth` -> authRoutes.js:37 `/csrf`.
- `Route not found` is generated only by `backend/middleware/notFound.js`.
- Booting current source locally (Node 22.22.2): crash with the ReferenceError above.
- After adding `authLimiter` to the import: `GET /api/v1/auth/csrf` -> 200, `/health` -> 200,
  unknown route `/api/v1/auth/nope` -> 404 from notFound (expected).

## Correction
One line: add `authLimiter` to the rateLimiter import in `backend/routes/authRoutes.js`.
Regression test added: `backend/tests/authRoutesBoot.test.js` (router must import and expose GET /csrf).
No CSRF bypass, no duplicate route, no frontend fallback.

## Not verified (network blocked / no access)
Production API, production proxy, Render deploy logs and commit, DNS, browser registration, staging.

## Owner actions
1. Deploy this fix; in Render > kayad-backend > Events/Logs confirm the previous deploys failed with the ReferenceError.
2. After deploy: `curl -i https://api.kayad.space/api/v1/auth/csrf` and `https://kayad.space/api/v1/auth/csrf` (expect 200, `X-KAYAD-Canonical-Route`).
3. Check `X-KAYAD-Build-ID` matches the GitHub commit (note: locally it reads `unknown`; Render sets `RENDER_GIT_COMMIT`).
4. Run a real registration from the browser.

## Other findings
- `backend/Dockerfile` does not COPY `backend/inspectionBusinessCenter` — confirm nothing imports it.
- `authLimiter` is now applied twice on some routes (v1.js mount plus per-route); harmless but redundant.

STATUS: CSRF SOURCE FIX VERIFIED — LIVE INCIDENT NOT YET CERTIFIED
