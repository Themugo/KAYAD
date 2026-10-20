# KAYAD Stage 5F.2 Change Ledger

Foundation: `KAYAD-STAGE5F1-COMMAND-CENTRE-LAYOUT-FULL-PROJECT-20261020.zip`
Foundation SHA-256: `8f588c8e1a161e5734c85a18b591f753a83da1015ff1e356ce4a2dd269cc0075`

| File | Change | Reason |
|---|---|---|
| `src/features/AdminView.tsx` | Replaced all-or-nothing `Promise.all` dashboard loading with per-source `Promise.allSettled` handling; added statistics loading/ready/stale/error state; preserved successful source data on partial failures; added mapped workflow actions for pending dealers, pending vehicles and support. | Prevent one failed API source from blanking the entire overview; make supported queues actionable without inventing routes. |
| `scripts/validate-stage5f1-command-centre-layout.mjs` | Updated metric-state assertion to match the explicit `statsStatus` state model. | Keep the previous iteration's regression validator aligned with the safer implementation. |
| `scripts/validate-stage5f2-dashboard-data-workflow.mjs` | Added 11 source-contract checks. | Repeatable evidence for data isolation, metric states and workflow mappings. |
| `package.json` | Added `validate:stage5f2-dashboard-data-workflow` script. | Make the new focused validator easy to run. |
| `KAYAD_STAGE5F2_LIVE_DASHBOARD_DATA_WORKFLOW_REPORT_20261020.md` | Added report. | Record findings, tests and limitations. |
| `KAYAD_STAGE5F2_CHANGE_LEDGER_20261020.md` | Added ledger. | Preserve provenance. |

No backend source, API contract, database schema, migration, role, owner record, provider setting or hosted data was changed.
