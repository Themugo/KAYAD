# KAYAD Private Seller Applications — Execution Report

**Date:** 2026-10-29  
**Status:** PARTIAL — source corrections and static validation completed; runtime/build certification blocked by unavailable dependencies and an incompatible Node runtime.

## Foundation verification

- Foundation: `KAYAD-SELLER-MANAGEMENT-POLISH-20261029.zip`
- Expected SHA-256: `44e8e7aabe7b337f6539ebb9c7af72412baf300cdb65bf1c93b846f517f24699`
- Actual SHA-256: `44e8e7aabe7b337f6539ebb9c7af72412baf300cdb65bf1c93b846f517f24699`
- Hash: **MATCH**
- Archive integrity: `ZipFile.testzip()` returned no corrupt member
- Foundation archive entries: 4,965
- Extracted into a separate working directory; no Git metadata was present in the extracted project.

## Principal files inspected

- `src/components/admin/AdminRouteSurface.tsx` — lazy route registration.
- `src/components/admin/AdminSidebar.tsx` — existing navigation entry.
- `src/context/AuthContext.tsx` and `src/utils/permissions.ts` — frontend route/permission mapping.
- `src/pages/admin/AdminPrivateSellerApplications.tsx` — existing page and review actions.
- `src/services/privateSellerCapabilityApi.ts` and `src/api/httpRequest.ts` — canonical request contract and transport errors.
- `src/__tests__/pages/AdminPrivateSellerApplications.test.tsx` and `src/__tests__/pages/Phase13iAdminStaleDecision.test.tsx` — existing UI and stale-decision coverage.
- `backend/server.js`, `backend/routes/privateSellerCapabilityRoutes.js`, `backend/services/privateSellerCapability.service.js`, `backend/middleware/systemCheck.js`, `backend/middleware/maintenanceEnforcement.js`, and `backend/config/maintenancePolicy.js` — route mounting, maintenance policy, permissions and state transitions.
- `supabase/migrations/20261025113000_private_seller_listing_visibility.sql` and `supabase/migrations/20261025130000_private_seller_listing_visibility_hardening.sql` — database-owned listing visibility lifecycle.
- `KAYAD_INCIDENT_20261027_ROOT_CAUSE_REPORT.md` and `KAYAD_MAINTENANCE_SCOPES_20261027_POLICY_MATRIX.md` — previous maintenance evidence and documented policy.
- `package.json`, `package-lock.json`, `.node-version`, `.nvmrc`, `.npmrc` — scripts, lockfile and runtime constraints.

## Findings

### Confirmed in source

1. The page uses the existing `GET /api/private-seller-capability/admin/applications` endpoint and the existing `PATCH /api/private-seller-capability/admin/:userId/decision` workflow. The backend mounts these routes and applies `protect` plus `requirePermission(PERMISSIONS.MANAGE_USERS)` to administrative reads and decisions.
2. The backend maintenance middleware classifies the application-list endpoint as an ordinary route. When the configured maintenance policy disallows it, the server returns HTTP 503 with the structured `SYSTEM_MAINTENANCE` code and `maintenance: true`. The correct response is to report this policy response accurately, not bypass maintenance or create a special admin exception.
3. The included `KAYAD_INCIDENT_20261027_ROOT_CAUSE_REPORT.md` records a read-only hosted observation that global maintenance was active on 2026-10-27. That is historical evidence, not proof of the current hosted flag on 2026-10-29.
4. A read-only GET to `https://api.kayad.space/api/private-seller-capability/admin/applications` could not be completed from this execution environment because DNS resolution for `api.kayad.space` failed (`curl: (6) Could not resolve host`). Therefore current hosted maintenance state and live API behavior remain unverified.
5. The previous page cleared its successful application data after any failed refresh (`setApplications([])`), and did not guard against out-of-order responses when filters changed quickly. The API service trusted `res.data` without validating the success envelope or application-row shape, allowing an unexpected response to appear like an empty result or trigger a rendering failure.

### Not changed

- No backend maintenance policy, role permissions, API routes, service transition rules, database schema, migration, lifecycle trigger, RLS policy or production data was changed.
- Existing server-side compare-and-set status transitions, required reasons, audit logging and database-owned listing visibility lifecycle were preserved.
- No production mutation, migration, deployment, commit or push was performed.

## Corrections made

### `src/pages/admin/AdminPrivateSellerApplications.tsx`

- Classifies maintenance only when the response includes `code: SYSTEM_MAINTENANCE` or `maintenance: true`.
- Separates confirmed maintenance, session expiry, forbidden access, generic service unavailability, server errors and other failures into distinct messages.
- Preserves the last successful rows after a failed refresh and explicitly labels them as potentially stale when they belong to the current filter.
- Prevents results from an earlier filter/request from overwriting a newer filter by using a request sequence guard.
- Does not show rows from a different status filter as if they were current.
- Improves refresh accessibility, loading/refresh feedback and the lifecycle safeguard presentation.
- Preserves the existing decision actions, confirmation behavior, required decision reasons, cache invalidation feedback and post-decision reload.

### `src/services/privateSellerCapabilityApi.ts`

- Validates the established `{ success: true, data: [...] }` response envelope.
- Validates required application fields and supported application statuses before returning rows.
- Raises a structured request error for malformed responses rather than silently converting them to an empty queue.
- Retains the canonical HTTP client and the existing API paths.

### Regression coverage added

- `src/__tests__/pages/AdminPrivateSellerApplications.test.tsx`
  - Explicit maintenance contract classification.
  - Preserve last successful same-filter data on failed refresh.
  - Do not mislabel an unrelated HTTP 503 as scheduled maintenance.
  - Ignore an older filter response arriving after a newer one.
- `src/__tests__/services/privateSellerCapabilityApi.test.ts`
  - Valid success envelope and status filter.
  - Malformed envelope rejection.
  - Malformed row rejection.
  - Preservation of structured maintenance response data.
- `scripts/validate-private-seller-applications-polish.mjs`
  - Source-level invariants for error classification, response validation, stale request protection, permissions, status transitions and lifecycle safeguards.

## Validation results

| Check | Result | Evidence / limitation |
|---|---|---|
| Foundation SHA-256 | PASS | Exact expected hash matched |
| Foundation ZIP integrity | PASS | No corrupt member detected |
| `node --check scripts/validate-private-seller-applications-polish.mjs` | PASS | Validator syntax valid |
| `node scripts/validate-private-seller-applications-polish.mjs` | PASS | 13/13 checks |
| `npm ci --engine-strict=false --ignore-scripts --no-audit --no-fund` | BLOCKED | Timed out; Node `v22.16.0` is below project requirement `>=22.22.2`; warnings also identified engine requirements for `jsdom` and `undici` |
| `npm ci --offline --engine-strict=false --ignore-scripts --no-audit --no-fund` | BLOCKED | Required package tarball not cached (`ENOTCACHED`) |
| `npm run typecheck` | BLOCKED | Partial install left core dependencies/types unavailable (`react`, `vitest`, `@types/node`, etc.); no final typecheck certification possible |
| Targeted Vitest run | BLOCKED | `vitest: not found` because install did not complete |
| `npm run build` | BLOCKED | `vite: not found` because install did not complete |
| Live API GET | BLOCKED | DNS resolution failure for `api.kayad.space` in this environment |
| Browser / Playwright | NOT RUN | Required dependencies and reachable hosted API were unavailable |
| Backend/database lifecycle integration tests | NOT RUN | No database credentials or isolated disposable database available; production was not touched |

The source validator is not a substitute for TypeScript, unit-test, production-build, browser or live integration certification.

## Security and lifecycle invariants

- Admin read and decision endpoints retain authentication and `MANAGE_USERS` authorization.
- The backend remains authoritative for state transitions; the UI does not simulate listing visibility changes.
- Existing database lifecycle trigger remains responsible for hiding/restoring eligible listings.
- Listing ownership and records are retained by the existing policy.
- Private-seller approval does not create dealer accounts, remove buyer access or grant dealer/financial permissions.
- No production data was changed.

## Remaining issues / next verification

1. Re-run dependency installation under Node.js **22.22.2 or newer**, using the unchanged lockfile and normal network access.
2. Run targeted Vitest files, complete typecheck, lint and Vite production build.
3. Run the existing isolated backend/database lifecycle tests and browser workflow against a reachable staging environment.
4. Verify the current hosted maintenance state through an authorized operational path. Do not disable maintenance or bypass the policy merely to make this page load.
5. Verify the deployment is serving the checkpoint containing these changes before claiming the hosted page is fixed.

No database migration was required by the changes made. No commit, push or deployment occurred.
