# KAYAD CSRF Bootstrap Fix — 2026-09-30

## Root cause

The backend used a stateless double-submit CSRF contract correctly, but the
frontend attempted its first POST (registration) before it had ever received
the `XSRF-TOKEN` cookie. The global middleware only issued that cookie while
processing the same POST, which was too late: `csrfProtection` rejected the
request before the controller ran.

## Fix

- Added public `GET /api/v1/auth/csrf`.
- The existing global `csrfToken` middleware issues/reuses the cookie before
  this route executes.
- The endpoint returns the same token for the frontend bootstrap.
- The Axios request interceptor now automatically bootstraps CSRF before the
  first POST/PUT/PATCH/DELETE when the readable cookie is absent.
- Concurrent state-changing requests share one bootstrap promise.
- Existing double-submit validation remains unchanged.

## Security

No CSRF exemption was added to registration or other state-changing routes.
The protection remains fail-closed. The bootstrap endpoint is GET-only and
does not create authentication/session state.

## Expected production flow

Browser -> GET /api/v1/auth/csrf -> XSRF-TOKEN cookie
Browser -> POST /api/v1/auth/register + X-CSRF-Token -> registration succeeds

