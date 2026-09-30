# KAYAD — CURRENT SYSTEM TRUTH

Date: 2026-09-30

## Authoritative current sweep

This document describes the source state produced by the clean-sweep remediation. It does not claim runtime or production certification when those gates were not executable.

## Canonical browser API contract

- Browser API base: `/api` unless `VITE_API_URL` deliberately points at the API origin.
- Versioned authentication: `/api/v1/auth/*`.
- Browser CSRF bootstrap: `GET /api/v1/auth/csrf`.
- Frontend Axios request path: `/v1/auth/csrf` when the base is `/api`, resolving to `/api/v1/auth/csrf`.
- Browser authentication: cookie-backed with credentials.
- State-changing browser requests require the CSRF contract.
- A browser-supplied Authorization header is not a universal CSRF bypass.

## CSRF incident status

The latest real dealer-registration attempt received `Route not found: /api/v1/auth/csrf`.

Current source inspection shows the route is present in `backend/routes/authRoutes.js`, mounted at `/auth` in `backend/routes/v1.js`, and the versioned router is mounted at `/api/v1` in `backend/server.js`.

Therefore the observed 404 cannot be explained by the current source alone. It indicates runtime/deployment drift, an older backend process/image, or an API/proxy path mismatch. A live probe is mandatory before this is marked resolved.

The canonical route now emits diagnostic headers:

- `X-KAYAD-Canonical-Route: /api/v1/auth/csrf`
- `X-KAYAD-API-Contract: v1`

A dedicated source/runtime validator and non-mocked Playwright regression have been added.

## Security corrections in this sweep

- Production distributed locking no longer silently falls back to a per-process Map.
- Local lock fallback is opt-in and development/test-only.
- Critical idempotency operations fail closed when distributed coordination is unavailable.
- Idempotency request bodies are redacted before persistence.
- Sensitive fields such as passwords, OTPs, tokens, CSRF values, API keys and secrets are never persisted as raw idempotency request parameters.
- Private upload records carry authenticated owner identity.
- Private document/receipt/inspection/escrow uploads require owner/admin authorization on retrieval.
- Upload deletion now authorizes against the persisted upload record instead of trusting public-ID naming conventions.
- Dealer health scoring weights are normalized to a total of 1.0.
- Dealer health scoring no longer converts database/service errors into positive fallback scores.
- Dealer health category/ranking logic no longer depends on undefined model helper methods.

## Runtime certification status

Required Node version: `>=22.22.2`.

Available audit runtime: `Node 22.16.0`.

Therefore:

- Static/source: PASS for executable gates that ran.
- Runtime: BLOCKED by environment.
- Live CSRF route: BLOCKED until a real endpoint is probed.
- Supabase migration reset: BLOCKED until a real PostgreSQL/Supabase environment is available.
- Full build/E2E/provider certification: BLOCKED until the supported runtime/dependencies/environment are available.

## Release rule

This document is not a production certification. The next final foundation must only be created after Node >=22.22.2 runtime, database/RLS, Playwright and required provider gates are actually executed.
