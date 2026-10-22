# Phase 5 System Health — Change Manifest

| File | Change | Rationale |
|---|---|---|
| `src/api/api.exports.ts` | Added `adminAPI.getInfrastructureHealth()` calling existing `/ecp/health` | Reuse a real protected backend health contract instead of inferring health from metrics data |
| `src/pages/admin/OperationsControlRoom.jsx` | Fetch and parse health separately; validated status/latency mapping; remove percent bars; explicit loading/error/unknown/stale states; last-checked time and read-only refresh | Ensure health is evidence-based and available independently of the legacy metrics request |
| `backend/services/ecpService.js` | Monotonic elapsed timing via `performance.now()`; generic error text on failed check | Correct latency measurement semantics and avoid exposing raw internal error messages |
| `src/__tests__/pages/admin/OperationsControlRoom.test.jsx` | Added test cases for service status/duration, request-error handling, stale-result behavior and no synthetic percentage | Focused regression contract for Phase 5 UI |
| `PHASE5-SYSTEM-HEALTH-BASELINE.md` | Added baseline audit | Record route/API/source findings and known issues |
| `PHASE5-SYSTEM-HEALTH-EXECUTION-REPORT.md` | Added execution/release report | Document actual work and truthful release status |
| `PHASE5-SYSTEM-HEALTH-CHANGE-MANIFEST.md` | Added manifest | Audit trail for scoped changes |
| `PHASE5-SYSTEM-HEALTH-VALIDATION-RESULTS.md` | Added validation evidence | Preserve commands, outcomes and blockers |

## Explicitly unchanged
- Public marketplace routes/pages and information architecture.
- `/admin/control-room` route and its existing Super Admin restriction.
- Existing backend authentication/authorization middleware.
- Existing health route and health-check architecture.
- Database schema/migrations, provider integrations, payments and production configuration.

## Known pre-existing mismatch retained
`adminAPI.getOperationsMetrics()` calls `/admin/operations/metrics`; no matching backend route registration was found. This is not replaced with fabricated data or an assumed contract. The health panel no longer depends on this request, but the non-health control-room panels remain affected until the metrics contract is reconciled.

## Source SHA-256 comparison against the verified foundation

| File | Foundation SHA-256 | Result SHA-256 |
|---|---|---|
| `src/api/api.exports.ts` | `740f3dcaeabc3ce4f57c9040ff2043ad5fff2f6b333a949a24d396918c910298` | `d145fc1310f40f2c8dc50a35dcc0a6dd81795e6dc6d049be6ce519d198c89de1` |
| `src/pages/admin/OperationsControlRoom.jsx` | `35219dd2e5cead8d6bb91912d117e99ae777be0e9c031d148a00574bdc165575` | `cd89dff955f8e240991ab8eef279d996187ac236ecdcd80dce074e48c0cc61aa` |
| `backend/services/ecpService.js` | `da076cfbc3ee42ee54a2e015eade4d257faf594b5e3ec560a16b7732eb82fbcc` | `5558298ea28622d27510dc1240aba56f4fa33ab3021fd302d656500c82cbffe6` |
| `src/__tests__/pages/admin/OperationsControlRoom.test.jsx` | `df42f5de5a25de75aead3fa5311e270874022e61d60899c995a0dbf0d541294e` | `9830761558a9296cd84779ecb204c94eea63c02a2999122c3d2d81545a25e605` |
