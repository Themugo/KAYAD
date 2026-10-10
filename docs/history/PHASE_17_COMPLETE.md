# KAYAD Phase 17 — API Transport Consolidation & Contract Guardrails

## Objective
Eliminate the remaining shared HTTP transport circularity and make the canonical authentication path explicit without breaking existing endpoint callers.

## Implemented
- Introduced `src/api/httpClient.ts` as the single shared Axios transport layer, including credentials, timeout, CSRF propagation, and auth-expiry handling.
- Converted `src/api/api.ts` into a compatibility facade that re-exports the shared transport and endpoint contracts.
- Updated `src/api/api.exports.ts` to depend directly on `httpClient.ts`, removing the previous `api.ts -> api.exports.ts -> api.ts` transport cycle.
- Switched `src/context/AuthContext.tsx` directly to `src/services/authApi.ts` for login, registration, session restoration, logout, and profile updates.
- Removed the unreferenced `src/api/api.exports.backup.ts` backup implementation.
- Added `scripts/validate-phase17.mjs` to guard the canonical transport/auth arrangement, CSRF-aware mutation clients, and browser token persistence policy.

## Validation
- `PHASE 17 API TRANSPORT VALIDATION: PASS`
- Shared transport cycle removed.
- AuthContext uses canonical cookie-based auth service.
- 11 state-changing service clients checked for CSRF helper usage.
- Browser token persistence scan passed.
- Backend JavaScript syntax checks passed for server, CSRF middleware, and auth routes.
- `git diff --check` produced no whitespace errors.
- Full frontend dependency/build validation remains unavailable in this environment because the available Node runtime is 22.16.0 while the repository baseline requires Node >=22.22.2.

## Production truth
No alternate bearer-token auth implementation was introduced. Existing endpoint modules remain compatible through `src/api/api.ts`, while new/critical authentication code uses the canonical cookie-based `services/authApi.ts` transport.
