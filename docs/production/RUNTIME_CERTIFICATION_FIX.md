# KAYAD Runtime Certification Consolidation

Foundation: 28e035af

## Corrections

1. Fast health probes were moved ahead of session, CSRF, body parsing, Redis-backed session persistence, and other request middleware.
   - This preserves `/health/live`, `/health`, `/health/ready`, and `/api/health*` reachability when optional runtime infrastructure is degraded.
   - Existing application routes and product behavior were not changed.

2. Local degraded-runtime certification was made deterministic.
   - Local runtime validation now removes Supabase, Redis, PostHog, and Sentry environment variables from the spawned backend process.
   - Production/live certification remains responsible for real external infrastructure.

## Verification performed on the source snapshot

- `node --check backend/server.js` PASS
- `node --check scripts/validate-local-runtime.mjs` PASS
- `node --check backend/middleware/security.js` PASS
- Exactly one `registerHealthRoutes(app)` remains in `backend/server.js`.

## Important

The uploaded source snapshot did not contain `node_modules`. Full npm/Vitest execution was therefore not reproducible in the analysis environment. The user's Windows environment is the authoritative certification environment and uses Node 22.22.2. The foundation previously passed its full foundation certification at commit 28e035af.

No product features were added.
