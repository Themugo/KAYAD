# KAYAD Runtime Certification — Wholesale Base 2

Date: 2026-09-26

## Scope

Runtime/certification hardening only. No product features, business rules, marketplace UX, pricing, payment, escrow, auction, or data-model changes were introduced.

## Investigation basis

The Windows certification run established:

- Node 22.22.2 / npm 10.9.7.
- Backend and root dependencies installed successfully.
- TypeScript lint/typecheck passed.
- Production Vite build passed.
- 46 test files passed; 308 tests passed; 1 skipped.
- Health/liveness reached the backend.
- The isolated runtime still timed out on `GET /api/cars`.

## Wholesome runtime findings

The request path was traced across bootstrap, HTTP binding, global middleware, session/cache behavior, security middleware, response wrappers, system status, car routing, cache/tracking middleware, controller behavior, and background services.

The previous route-level degraded guard was valid as defense-in-depth, but it still sat behind the general request stack. The isolated validator also continued starting non-authoritative background services after the HTTP listener was available.

## Consolidated corrections

1. Added an early `/api/cars` degraded-mode contract immediately after health-route registration and before optional request middleware. When Supabase is intentionally unavailable, the canonical public inventory request returns HTTP 503 immediately.
2. Retained the route-level `requireCarsDatabase` guard in `carRoutes.js` as defense-in-depth. Configured production requests continue through the existing validation/cache/tracking/controller chain.
3. Isolated runtime certification now honors `KAYAD_ISOLATED_RUNTIME=true` by skipping background-service startup after database/cache initialization. This keeps certification focused on authoritative HTTP/API behavior and prevents optional jobs from sharing the certification event loop.
4. Local runtime HTTP probes now send `Connection: close`, eliminating connection reuse as a variable in the deterministic certification probe.

## End-to-end gate requirement

This base is not considered certified until Windows runs the full sequence:

install backend dependencies → install root dependencies → lint → build → full tests → local runtime startup → health → readiness → `/api/cars` degraded contract → canonical architecture → release → dependency security → deployment readiness.

Only a complete green run should be committed and pushed to `main`.
