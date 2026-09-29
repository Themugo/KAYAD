# KAYAD API Availability Holistic Correction — 2026-09-29

## Foundation

This correction is based on the session-availability foundation derived from the certified production foundation and commit `b0b3838f523a57148d8bf0ab27464d5fcdcb6574`.

## Production symptom

Healthy probes return normally while general API requests can remain connected without receiving response bytes:

- `/health` — healthy
- `/health/ready` — healthy
- `/health/live` — healthy
- `/api/health` — healthy
- `/api` — hangs
- `/api/v1` — hangs
- `OPTIONS /api/v1/auth/register` — hangs
- `POST /api/v1/auth/register` — hangs

## Root availability risk addressed

The previous CSRF implementation stored the browser CSRF token inside `express-session`. That caused ordinary anonymous API requests to participate in the server-side session lifecycle solely to obtain CSRF state. Because the session store is Redis-backed in production, this made API availability unnecessarily dependent on the session persistence path.

## Holistic correction

CSRF is now implemented as a stateless double-submit-cookie contract:

1. Generate a cryptographically random token when the browser has no XSRF cookie.
2. Store the token only in the host-only `XSRF-TOKEN` cookie.
3. Expose the same token through `res.locals.csrfToken` for existing response consumers.
4. Validate state-changing browser requests by comparing the request header/body token to the XSRF cookie.
5. Keep JWT-authenticated requests exempt as before.
6. Keep explicitly authenticated machine callbacks exempt as before.
7. Keep safe methods (`GET`, `HEAD`, `OPTIONS`) immediately bypassing CSRF validation.
8. Leave express-session available for workflows that explicitly require server-side session state.
9. Retain the bounded session-store operations as defense-in-depth for routes that genuinely use sessions.

## Why this is holistic

The correction removes an unnecessary infrastructure dependency from the browser CSRF control plane instead of adding another timeout around the same dependency. Session-backed workflows remain available, while anonymous API availability no longer requires a session write merely to obtain CSRF state.

## Validation contract

- CSRF availability tests cover generation, reuse, safe-method bypass, successful double-submit validation, and rejection of mismatched tokens.
- Session availability tests remain intact.
- `validate:api-availability` verifies the canonical source contracts.
- Existing application tests, typecheck, build, worker runtime, production runtime corrections, C1-C5 convergence, email reliability, optional integrations, deployment readiness, and migration preflight remain required release gates.

## Release gate

This correction must be certified on the user's Windows Node `22.22.2+` environment and then verified against the live Render deployment before it becomes the production release foundation.
