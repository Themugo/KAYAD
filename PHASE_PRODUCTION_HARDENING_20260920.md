# KAYAD Production Hardening — 2026-09-20

## Phase 1 — Deployment contract
- Restored root `.env.production.example` as a secret-free frontend contract.
- Restored `backend/.env.example` as a secret-free backend contract.
- Canonicalized runtime Supabase service-role environment handling to `SUPABASE_SERVICE_ROLE_KEY`, with `SUPABASE_SERVICE_KEY` retained only as a legacy fallback.
- Changed Vercel installation to reproducible `npm ci`.
- Made Vercel production credentials mandatory in the production deployment workflow; the workflow now fails instead of silently skipping deployment.
- Added build-time `release.json` containing the deployed Git/Vercel commit identity.
- Production verification now checks `/release.json` against `EXPECTED_COMMIT`.

## Phase 2 — Phase 22/API convergence
- Added strict Zod validation for Phase 22 provider, geospatial, report, dispute, evidence, service-job and admin-resolution inputs.
- Added semantic Supabase RPC error mapping (403/404/409/400/500) instead of converting every failure to 409.
- Removed the duplicate legacy `phase22InspectionApi` frontend transport.
- Consolidated frontend Phase 22 calls on `/api/v1/phase22/*`.
- Exposed provider registration, nearby discovery, report access, second-buyer purchase and dispute/evidence methods through the canonical inspection marketplace adapter.

## Phase 3 — Inspection payment lifecycle
- Added authenticated inspection-payment initiation with server-derived booking amount.
- Added rate limiting, CSRF protection and idempotency to payment initiation.
- Kept the direct settlement/reconciliation endpoint admin-only.
- Added `inspection` M-Pesa callback handling so a verified provider callback invokes `kayad_process_inspection_payment_atomic` using the booking ID stored in payment metadata and the verified M-Pesa receipt as the financial reference.
- Updated the booking UI to start a real M-Pesa prompt rather than implying that the browser itself marks the booking paid.

## Validation performed
PASS:
- `validate-deployment-readiness.mjs`
- `validate-production-backend.mjs`
- `validate-backend-runtime-contracts.mjs`
- `validate-runtime-integrity.mjs`
- `validate-frontend-runtime-contracts.mjs`
- `validate-wave3-convergence.mjs`
- Node syntax checks for modified backend JS and production verifier

BLOCKED in this container:
- `npm ci` / full Vite/Vitest validation: repository requires Node >=22.22.2 while this container has Node 22.16.0, and dependency installation could not complete in the network-restricted build environment.
- `validate-release.mjs`: requires the uninstalled `typescript` package.

No production deployment was claimed from this artifact.
