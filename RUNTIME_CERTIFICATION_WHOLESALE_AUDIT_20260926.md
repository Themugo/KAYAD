# KAYAD Wholesale Runtime Audit — 2026-09-26

## Purpose
This pass treats the current runtime-certification work as one integrated system rather than applying isolated endpoint patches.

## Evidence reviewed
- Latest Windows certification log: Node 22.22.2 / npm 10.9.7.
- Root lint and production build completed successfully.
- Vitest: 46 files passed; 308 tests passed; 1 skipped.
- Runtime certification reached health/readiness and then stalled on `GET /api/cars`.
- Current runtime files reviewed together: server bootstrap, health registration, database initialization, global middleware ordering, timeout middleware, response wrapper, system-status middleware, car route, car controller, query/response validation, cache middleware, search tracking/latency middleware, Supabase utility, session store, and local runtime validator.

## Root-cause finding
The previous degraded-mode hardening added an early database availability guard to `backend/routes/carRoutes.js`, but the route referenced `isSupabaseConnected()` without importing that symbol. This was a cross-file integration defect: syntax/type/build checks do not execute the HTTP request path, so the defect survived those gates.

## Consolidated corrections
1. Import `isSupabaseConnected` in `carRoutes.js` alongside `getSupabase`.
2. Keep the early database guard before optional cache and analytics middleware so a deliberately database-less local certification cannot depend on non-authoritative infrastructure.
3. Keep the existing controller-level database guard as defense in depth for real production failures.
4. Improve the local runtime validator so a `/api/cars` timeout includes captured backend output, making the next failure diagnostic rather than opaque.
5. Preserve the existing explicit HOST binding, early HTTP bind, cache timeout boundary, system-check degraded-mode bypass, and Framer Motion test-mock cleanup from the preceding foundation.

## End-to-end invariant
A change is not considered complete until the Windows gate passes in this order:

`backend npm ci -> root npm ci -> lint -> production build -> full Vitest -> local runtime startup -> /health/live -> /health -> /health/ready -> /api/cars degraded contract -> canonical architecture -> release -> dependency security -> deployment readiness`

## Non-blocking observations
The current test suite still emits React `act(...)` warnings from asynchronous state updates in several UI tests. They do not currently fail the suite and are intentionally not mixed into this runtime correction, because changing test timing without a failing contract would increase the change surface.

## Scope
Runtime/certification hardening only. No product feature, pricing, marketplace rule, payment rule, auction rule, or user-facing capability was added or intentionally changed.

## Verification limitation
The assistant container does not have the repository-required Node 22.22.2 runtime, so final dependency-backed end-to-end certification must be performed on the user's Windows environment with Node 22.22.2. This archive is therefore a consolidated correction candidate, not a claim that the final Windows gate has already passed.
