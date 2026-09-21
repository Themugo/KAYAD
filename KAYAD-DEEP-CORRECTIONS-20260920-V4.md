# KAYAD Deep Corrections V4 — 2026-09-20

## Continuation from V3

- Retained the canonical backend bootstrap entrypoint so dotenv configuration is loaded before import-time JWT validation.
- Retained the `protectAccount` import correction in `backend/routes/adminRoutes.js`.
- Retained canonical `system_settings` / `system_status` control-plane handling; no `GlobalSettings` model was restored.
- Audited backend relative imports; all resolvable relative imports now point to an existing JS/MJS module or index module.
- Canonicalized remaining deployment/setup documentation references from `SUPABASE_SERVICE_KEY` to `SUPABASE_SERVICE_ROLE_KEY`. Runtime compatibility continues to accept the legacy alias where explicitly documented in code.

## Validation note

Static backend runtime, deployment-readiness, and runtime-integrity validators pass. Full npm install/test/build certification must be run under the project's required Node >=22.22.2 runtime; the audit container is Node 22.16.0 and therefore is not used to claim that release gate.
