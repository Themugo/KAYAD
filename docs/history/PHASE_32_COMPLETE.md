# KAYAD Phase 32 — Frontend API Transport Consolidation

## Objective
Complete the frontend transport boundary so all service-level API clients use the canonical KAYAD HTTP client instead of creating independent Axios instances.

## Changes
- Consolidated all 17 service API modules onto `src/api/httpClient.ts`.
- Removed every secondary `axios.create()` from `src/services`.
- Preserved each service's backend route prefix (`/ai`, `/automation`, `/cms`, `/command-center`, `/config`, `/dealer-platform`, `/digital-twin`, `/ecp`, `/integration`, `/ghost-checkers`, `/governance`, `/improvement`, `/intelligence`, `/lowcode`, `/platform-factory`, `/vxp`, `/xos`).
- Centralized credentials, timeout, CSRF request headers, and session-expiry handling through the canonical client.
- The canonical client now honors `VITE_API_URL` with `/api` as the fallback, preserving the existing deployment contract.
- Removed unused default exports of obsolete per-service Axios instances; named API functions remain the supported service contract.
- Added `npm run validate:phase32` and a dedicated validator.

## Validation
- Phase 32 transport validator: PASS.
- 17 API service modules scanned.
- Exactly one frontend Axios client remains: `src/api/httpClient.ts`.
- No service module directly imports Axios or creates its own Axios client.
- JavaScript syntax checks: PASS, 0 failures.
- Backend/scripts JavaScript syntax checks: PASS, 0 failures.
- Root and backend package JSON parsing: PASS.
- Full Vite/TypeScript build was not claimed because dependencies are not installed in the isolated phase archive.

## Production contract
All frontend mutation requests made through these service modules inherit the canonical CSRF protection and authenticated-cookie transport. No service module may introduce a private Axios client without explicitly revisiting the transport architecture.
