# Phase 35 — Production Environment Security Hardening

## Scope
Harden the backend environment boundary so an unset/unknown `NODE_ENV` cannot silently receive development security behavior.

## Changes
- Backend now defaults to production-safe mode when `NODE_ENV` is absent.
- Development/test CORS behavior is available only when explicitly selected.
- Production requires the core Supabase, JWT, refresh-token, session, frontend, and backend environment variables.
- Production JWT/session secrets must be at least 32 characters.
- Production frontend/backend URLs must be valid HTTPS absolute URLs.
- Production 5xx responses no longer expose internal messages or stack traces; only explicit development/test modes expose debugging details.
- Removed the obsolete/dead CORS branch left from the previous boundary hardening.

## Validation
Run `npm run validate:phase35`.
