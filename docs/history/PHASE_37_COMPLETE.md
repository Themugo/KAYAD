# KAYAD Phase 37 — Session / CSRF Lifecycle Hardening

## Objective
Reconcile the browser CSRF/session lifecycle so the token is stable, readable by the frontend, bound to both cookie and server session state, and protected from cache reuse.

## Changes
- CSRF tokens are generated once per server-side session and reused rather than rotated on every request.
- `XSRF-TOKEN` is scoped to `/` so frontend pages can read it before calling `/api` mutations.
- CSRF validation requires the request header/body token to match both the readable cookie and server-side session token.
- CSRF responses send `Cache-Control: no-store`.
- Session cookie uses an explicit `kayad.sid` name, `SameSite=Strict`, `HttpOnly`, `Secure` in production, and root path.

## Validation
Run:

```bash
npm run validate:phase37
```

The validator checks the canonical CSRF/session contract and fails closed on missing security invariants.
