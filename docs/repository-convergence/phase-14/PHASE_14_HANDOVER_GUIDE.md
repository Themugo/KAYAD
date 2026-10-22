# KAYAD Maintainer Handover Guide — Phase 14

## Status
`PASS WITH BLOCKERS — APPROVAL OR EXTERNAL EVIDENCE OUTSTANDING`

## Foundation
Phase 14 uses `KAYAD-REPOSITORY-CONVERGENCE-PHASE-13-HANDOVER-READY-REPOSITORY-20261022.zip`. Its SHA-256 is `d2cdbf4eae9caefbc0be9e872ae768c757c35c0dc67db32eaa95c810a1a617cf` and its byte size is 78763141. The source archive was verified before changes. The extracted project root is `kayad-phase6-final-completion-work-20261022/`.

## Repository map
- `src/`: frontend/application source (directory exists; exact modules should be inspected for task-specific work).
- `backend/`: backend implementation.
- `lib/`: shared libraries/utilities.
- `public/`: public/static assets.
- `supabase/`: Supabase-related configuration/migrations and associated assets; review contents before operational changes.
- `tests/`, `e2e/`, `load-tests/`: test-related trees. Their presence does not certify current runtime behavior.
- `scripts/`: operational and validation scripts; inspect the exact script and invocation context before execution.
- `docs/`, `evidence/`, `reports/`, `runbooks/`, `validation-logs/`: documentation, evidence, reports, operational guidance, and logs. Treat historical results as historical until revalidated.
- `.github/`, `helm/`, `k8s/`, `nginx/`, `grafana/`: CI/infrastructure/observability-related configuration locations. No external deployment was performed.

## Safe maintenance rules
1. Start from the latest verified phase ZIP, not a stale checkout.
2. Record SHA-256 before editing and preserve a rollback copy.
3. Do not move/rename/delete files without exact approval and consumer analysis.
4. Never put secret values in docs, reports, or example files.
5. Separate repository organization from application/runtime certification.
6. Keep historical checkpoints and manifests traceable.

## Current blockers
- Exact file-level owner approvals for structural changes are absent.
- External CI/hosting and dynamic consumers have not been independently verified.
- Some documentation authority decisions remain open.
- Application build, runtime, database/RLS, payment, and deployment certification were not performed in this phase.

See the adjacent Phase 14 registers for evidence and dispositions.
