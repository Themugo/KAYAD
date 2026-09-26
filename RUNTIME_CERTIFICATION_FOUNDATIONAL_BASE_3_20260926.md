# KAYAD Runtime Certification Foundational Base 3

Date: 2026-09-26

## Scope
Runtime certification correction only. No product features, business rules, UI behavior, or marketplace functionality were added.

## Correction
The local runtime validator previously deleted external-service environment variables before spawning `bootstrap.js`. `bootstrap.js` then loaded `.env`, which could repopulate Supabase/Redis/PostHog/Sentry configuration from the developer machine. This made `GET /api/cars` enter the external database path during degraded-mode certification and wait until the validator request timeout.

The validator now supplies explicit empty sentinels and an isolated-runtime marker. Because dotenv does not overwrite explicitly supplied environment values, `.env` cannot silently re-enable local external infrastructure for this certification.

## Expected contract
- `/health/live` -> 200
- `/health` -> degraded
- `/health/ready` -> 503 with database reason
- `/api/cars` -> controlled 503 or 500 degraded response, not a socket timeout

## Existing verified gates from the submitted run
- Node 22.22.2
- npm 10.9.7
- TypeScript/lint passed
- Vite production build passed
- 46 test files passed
- 308 tests passed, 1 skipped

The remaining failure in that run was only `timeout /api/cars`.
