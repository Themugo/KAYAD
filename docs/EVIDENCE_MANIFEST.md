# Reconciliation evidence manifest

Certified commit:
9e2b3dfcf248306a8f84e2beda7c66246856be94

Relevant source artifacts inspected:

- REMOVED: backend/db/digitalInspection.schema.sql (dormant schema removed from shipping tree)
- backend/db/inspection.schema.sql
- REMOVED: backend/digitalInspection/services/inspectionWorkflowService.js (collapsed into canonical vehicle_inspections compatibility controller)
- REMOVED: backend/digitalInspection/services/reportGenerationService.js (canonical report service is backend/inspection/services/reportService.js)
- backend/inspection/routes/inspectionRoutes.js
- backend/routes/inspectionRoutes.js
- backend/server.js
- src/services/inspectionApi.ts
- src/features/InspectionMarketplace/pages/BookingFlow.tsx
- supabase/migrations/20260815080000_vehicle_inspections_complete_columns.sql.sql
- supabase/migrations/20260816180000_inspection_marketplace_activation.sql.sql
- supabase/migrations/20260909092000_inspection_chat_realtime_bridge.sql
- supabase/migrations/20260908070000_inspection_workforce_digital_lifecycle_hardening.sql

Live database checks:
- public.vehicle_inspections exists.
- public.digital_inspections does not exist.
- public.inspection_stages does not exist.
- public.inspection_evidence does not exist.
- public.inspection_defects does not exist.
- public.inspection_audit_logs does not exist.
- public.vehicle_inspections currently has zero rows.
- bridge functions for inspection execution/chat exist.
