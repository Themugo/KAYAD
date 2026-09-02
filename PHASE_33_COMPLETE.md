# KAYAD Phase 33 — Canonical Frontend Request Transport

## Objective
Finish the frontend transport boundary by removing the remaining service-level `fetch()` clients. Phase 32 consolidated the Axios-based enterprise service clients; Phase 33 brings the remaining marketplace/auth/content services onto the same canonical transport so credentials, timeout, CSRF and session-expiry behavior cannot diverge by service.

## Changes
- Added `src/api/httpRequest.ts`, a thin fetch-shaped adapter over the single `src/api/httpClient.ts` Axios instance.
- Migrated the remaining 13 API service modules to the canonical request adapter:
  - auth
  - bids
  - inspections
  - loans
  - vehicles
  - chat
  - escrow
  - phone verification
  - support
  - favorites
  - ads
  - hero
  - CMS content
- Removed service-local `fetch()`, `API_BASE`, and CSRF-header construction from those API modules.
- Preserved each service's existing typed error categories and real backend endpoint paths.
- Preserved multipart vehicle listing creation through the canonical Axios transport without manually setting a multipart content type.
- Reconciled the canonical client URL contract so `VITE_API_URL` may be an API origin or an origin ending in `/api`, while the no-env local fallback remains `/api`.
- Added path normalization in `httpRequest.ts` so existing `/api/...` service paths work correctly with the `/api` same-origin fallback and do not become `/api/api/...`.
- Updated service tests to mock the canonical request adapter rather than browser `fetch()`.
- Repaired a pre-existing incomplete `AdminSettingsAuditLog.jsx` closing JSX structure surfaced by the compiler pass.
- Added `scripts/validate-phase33.mjs` and `npm run validate:phase33`.

## Validation
- Phase 33 transport validator: PASS.
- Canonical API service modules checked: 13.
- Direct `fetch()` API clients remaining in `src/services`: 0 (the remaining `fetch()` in `uploadService.js` is local `fileData`/blob conversion, not an API transport client).
- Direct Axios imports/secondary Axios clients in migrated services: 0.
- JavaScript syntax checks: PASS, 0 failures.
- Package JSON parsing: PASS.
- TypeScript compiler was invoked; the isolated archive has no installed npm dependencies, so the compiler reports dependency-resolution errors for React/Vitest/etc. rather than a source syntax failure. The previously malformed `AdminSettingsAuditLog.jsx` was corrected and no longer produces JSX parse errors.
- `npm ci` was not claimed because this environment runs Node 22.16.0 while the repository's required baseline is Node >=22.22.2.

## Production contract
`src/api/httpClient.ts` is the sole frontend Axios transport. API service modules must use `src/api/httpRequest.ts` or `src/api/httpClient.ts`; they must not create private `fetch()` or Axios transports. This preserves one transport policy for authenticated cookies, CSRF, timeout and session-expiry handling.
