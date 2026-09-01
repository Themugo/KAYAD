# KAYAD Phase 14 — Authentication Transport & CSRF Contract Hardening

## Objective
Lock the browser application onto one canonical authentication transport and make cookie-authenticated state-changing API calls carry the backend-issued CSRF token consistently. Also pin the frontend toolchain to a Node version compatible with the current jsdom dependency.

## Completed
- Canonicalized the legacy `authAPI` adapter onto `src/services/authApi.ts` and `/api/v1/auth/*`.
- Kept existing callers compatible with the established `{ success, user }` response shape.
- Moved remaining password, email-verification and phone-verification auth calls in the canonical service to `/api/v1/auth/*`.
- Added a shared browser CSRF helper reading the backend's `XSRF-TOKEN` cookie and emitting `X-CSRF-Token` for POST/PUT/PATCH/DELETE requests.
- Added CSRF propagation to the shared Axios client and critical fetch-based marketplace clients.
- This covers favorites, bidding, escrow, chat, vehicle mutations, inspections, loans, support and phone verification without inventing a second session mechanism.
- Pinned `.nvmrc` to Node `22.22.2`, matching the current `jsdom@30.0.1` engine requirement observed during previous validation.
- Updated the root package engine requirement accordingly so an incompatible Node runtime fails early and explicitly.
- Added `scripts/validate-phase14.mjs` for dependency-free contract validation.

## Integrity Principle
KAYAD must not have multiple authentication transports or silently send cookie-authenticated mutations without the server's CSRF contract. Legacy callers may remain for compatibility, but they must delegate to the same canonical transport.

## Validation
- Dependency-free Phase 14 contract validator passes.
- TypeScript compiler was invoked with the repository dependency tree unavailable; resulting diagnostics are dominated by missing installed modules (`react`, `axios`, `vitest`, etc.). No Phase 14-specific type error remained after the missing-dependency diagnostics were filtered.
- Archive integrity was verified with `unzip -t`.
