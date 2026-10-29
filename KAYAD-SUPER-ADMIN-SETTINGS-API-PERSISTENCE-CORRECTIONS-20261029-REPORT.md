# KAYAD Super Admin Settings API & Persistence Corrections — 2026-10-29

## Status: PARTIAL — source-level correction applied; runtime cause and end-to-end persistence remain unverified

### Foundation
- Input archive: `KAYAD-REGISTRATION-AUTH-CONVERGENCE-PARTIAL-20261029 (1).zip`
- Foundation SHA-256: `931833fca4daad3f8381692fade2a96aa8e8c7575d8afc0c9802243ec1e8b78f`
- Archive integrity: passed (`ZipFile.testzip()` returned no corrupt entry); 12,059 entries.
- Extracted project root: `KAYAD-PHASE17-MOBILE-FIRST-LANDING-PAGE-POLISH-20261027/`
- Runtime found in this execution environment: Node `v22.16.0`, not the project-required `>=22.22.2`.

## Findings and root-cause confidence

### Confirmed frontend defect
`src/pages/admin/AdminSettings.jsx` caught failure from `adminAPI.getConfig()` and displayed the warning, but it still rendered the form using hard-coded defaults and left the General, Payments, Reconciliation and Branding save paths enabled. `saveConfig()` had no loaded-state guard. This creates a confirmed unsafe-save path: if the settings API is unavailable, a user could submit frontend defaults or partially initialized values and overwrite stored configuration.

### Request-path findings
- Frontend API client: `src/api/api.exports.ts` calls `GET /admin/config`, `PUT /admin/config`, and `GET /admin/audit-log`.
- API base: `src/api/httpClient.ts` uses `/api` by default and normalizes `VITE_API_URL` values to the `/api` base. Requests use credentials and CSRF headers for state-changing requests.
- Backend mount: `backend/server.js` mounts `adminRoutes` at `/api/admin`.
- Backend route: `backend/routes/adminRoutes.js` defines `GET /config` and `PUT /config`. The router-level `protect` and `adminOnly` middleware is applied before the private config routes. The PUT route additionally uses `adminOrSuper`.
- Persistence: the existing config route reads/writes the existing `PlatformConfig` Mongoose model; no replacement store or migration was introduced.
- Audit Log: existing `GET /admin/audit-log` returns `{ success, entries, pagination }` from the existing `AuditLog` model.

### What is not confirmed
The precise live reason for the screenshot's failed request cannot be established from this ZIP alone. No deployed request/response, backend logs, environment configuration, or safe connected staging database was available to prove whether the live failure is caused by runtime availability, database connectivity, environment drift, authorization/session behaviour, or another operational issue. The endpoint and frontend path both exist in source, so the archive alone does not prove a missing-route defect.

### Existing backend concern observed (not changed)
The current private `GET /admin/config` route calls `PlatformConfig.create({})` when no document exists. This behaviour is already in the foundation. It was not changed in this phase because the authoritative policy for missing configuration and live database state could not be verified safely. Review this behaviour with owner-approved staging evidence before changing initialization semantics.

## Changes made
1. `src/pages/admin/AdminSettings.jsx`
   - Added an explicit `configLoaded` state that starts false and becomes true only after a valid `{ config: object }` response.
   - Failed or malformed config responses keep saving disabled.
   - Added a retry action to the existing error notice.
   - Added a defensive guard inside `saveConfig()` to reject saves unless settings have loaded successfully, and to ignore duplicate submissions.
   - Validates the update response before presenting a success toast.
   - Distinguishes audit-log retrieval failure from a legitimate empty audit log.
2. `src/pages/admin/AdminSettingsBranding.jsx`
   - Added a `canSave` prop and disabled branding saves until the parent confirms server settings loaded.
3. `src/__tests__/pages/admin/AdminSettings.test.jsx` (new)
   - Covers load failure, malformed config response and the normal successful-load/save path.
4. `scripts/validate-admin-settings-safe-load.mjs` (new)
   - Source-level regression checks for the existing route contract and the new safety gates.
5. `KAYAD-SUPER-ADMIN-SETTINGS-API-PERSISTENCE-CORRECTIONS-20261029-REPORT.md` (this report)

No backend route, database schema, migration, payment provider, credentials, production records, homepage, public layout, or navigation was changed. No commit, push, or deployment was performed.

## Validation results

| Check | Result | Evidence / limitation |
|---|---|---|
| Foundation ZIP integrity | PASS | 12,059 entries; no corrupt ZIP entry |
| Targeted source validator | PASS | `node scripts/validate-admin-settings-safe-load.mjs` — 9/9 |
| Existing Super Admin Phase 3 validator | PASS | `node scripts/validate-super-admin-phase3-foundation.mjs` — 12/12 |
| `npm ci` at supplied environment runtime | BLOCKED | Project requires Node `>=22.22.2`; environment has `v22.16.0`, initial install exited with `EBADENGINE` |
| Dependency install retry with engine strict disabled | BLOCKED | timed out before dependencies were installed; no Vitest executable available |
| Vitest component tests | NOT RUN | Dependencies could not be installed in the available runtime window |
| TypeScript / production build | NOT RUN | Same dependency/runtime blocker |
| Backend integration, DB, RLS and migration tests | NOT RUN | No safe connected staging database/configuration supplied |
| Playwright desktop/mobile journeys | NOT RUN | Test dependencies and authenticated safe staging environment unavailable |
| Live API/deployment verification | NOT RUN | No authorized live request evidence or runtime logs available |

The exact source-level validator command was:

```sh
node scripts/validate-admin-settings-safe-load.mjs
```

Result: `9/9 checks passed`.

The existing foundation validator command was:

```sh
node scripts/validate-super-admin-phase3-foundation.mjs
```

Result: `12/12 checks passed`.

## Tab-by-tab disposition
- **General:** normal save is now blocked until config load succeeds; live read/write persistence not verified.
- **Onboarding:** existing dedicated API/component remains unchanged and retains its own server-state, retry, and revision-conflict handling; live endpoint not verified.
- **Branding:** parent config-load failure now disables branding save; upload workflow and public rendering not runtime-verified.
- **Payments:** save blocked until parent config loads; secret masking and live provider configuration not runtime-verified. No real payment initiated.
- **Reconciliation:** save blocked until parent config loads; actual persistence and history preservation not runtime-verified.
- **Audit Log:** retrieval failures now render an explicit error rather than the empty-log state; actual events/pagination/authorization not runtime-verified.

## Security and preservation
- No authorization middleware was removed or weakened.
- No secrets, `.env` values, private keys or production database dumps were intentionally added.
- No database migration or production mutation was run.
- No public page redesign or homepage change was made.
- No payment transaction, deployment, Git commit or push was performed.

## Required follow-up to reach PASS
1. Run the package with Node `22.22.2` or newer and perform a clean `npm ci`.
2. Run the new Vitest component tests, TypeScript check, production build, and relevant backend tests.
3. From an owner-authorized safe staging environment, capture the actual `GET /api/admin/config` status/body (redacting all sensitive fields), backend logs, deployment commit/version, and database connectivity status to determine the live request failure.
4. Execute authenticated Super Admin and denied-role tests for all six tabs; verify saved tagline and settings persist after refresh.
5. Run desktop/mobile Playwright journeys and verify the public homepage remains unchanged.
6. Only then consider changing backend missing-config behaviour, and only with owner-approved evidence/policy.

## Packaging note
The delivered checkpoint retains the complete application/source tree, package manifests and lockfiles, tests, migrations, runbooks, configuration examples, and the new report/validator. To keep the checkpoint transportable and avoid bundling large historical/generated artifacts, the ZIP excludes `node_modules`, `.git`, environment files, coverage/Vite caches, the historical `evidence/` and `evidence-*` folders, generated `validation-logs/` and `validation-logs-*` folders, and the archived `docs/history/` and `docs/repository-convergence/` folders. The source manifest/history files still present in the project remain unchanged. The original uploaded foundation ZIP is preserved separately and its SHA-256 is recorded above.
