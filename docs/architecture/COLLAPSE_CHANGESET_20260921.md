# KAYAD Canonical Architecture Collapse — 2026-09-21

## Scope
This source snapshot was collapsed toward one canonical production architecture without changing the live Supabase project.

## Canonicalized
- Inspection HTTP implementation is now one router under `backend/inspection/`.
- `/api/inspection/*` is canonical; `/api/inspections/*` is the compatibility alias to the same router.
- Legacy inspection order/assignment/start/submit endpoints delegate to `vehicle_inspections` instead of the obsolete model/digital-inspection tables.
- The dormant `backend/digitalInspection/` source implementation and dormant schema file were removed from the shipping tree.
- `digitalInspectionId` remains only as an API compatibility alias for `vehicle_inspections.id`.
- Provider review controller now uses the canonical inspection DB adapter.
- Supabase migration filenames are normalized to one `.sql` extension.
- Migration validator now rejects `.sql.sql` and validates required DDL before returning success.
- Added production environment contract `.env.production.example`.
- Added forward-only reconciliation migrations for system status, governance lifecycle integrity, and booking/execution linkage.
- Added a canonical architecture validator.

## Database safety
No live Supabase migration, repair, reset, or direct SQL write was performed by this collapse pass.

## Verification completed in the build workspace
- Supabase migration preflight: 102 files / 102 unique versions — PASS.
- V14 holistic source gate: 18/18 — PASS.
- Inspection marketplace validation: 21/21 — PASS.
- Inspection marketplace activation: 14/14 — PASS.
- V14 live certification contract: 15/15 — PASS.
- Inspection → Chat/Realtime validation: 10/10 — PASS.
- Communication event convergence: 12/12 — PASS.
- Wave 3 convergence: PASS.
- Canonical architecture validation: PASS.
- Static JS/JSX/TS/TSX/MJS/CJS transpile audit: 1452/1452 — PASS.

## Not certified in this environment
A fresh `npm ci`, full Vitest suite, and production Vite build were not executed in this workspace because the available container runtime is Node 22.16.0 while the repository contract requires Node >=22.22.2, and dependency installation timed out. These gates must be run on the user's Node 22.22.2 workstation before the source is pushed or Supabase is synchronized.
