# Canonical Inspection Model Reconciliation

## Decision

**Production canonical execution record: `public.vehicle_inspections`.**

The five-table digital inspection subsystem is **not introduced into production**.

## Evidence

1. `backend/db/digitalInspection.schema.sql` contains a complete dormant schema for
   `digital_inspections`, `inspection_stages`, `inspection_points`,
   `inspection_evidence`, `inspection_defects`, and `inspection_audit_logs`.
   This proves the five requested tables were intentionally designed for KAYAD;
   they were not random names.

2. The production application, however, explicitly converged on `vehicle_inspections`.
   `supabase/migrations/20260909092000_inspection_chat_realtime_bridge.sql` states:
   "vehicle_inspections is the production canonical inspection execution table."

3. That same bridge function returns:
   `vehicleInspectionId = v_vi.id` and `digitalInspectionId = v_vi.id`.
   Therefore `digitalInspectionId` is currently an API/domain alias for the
   canonical `vehicle_inspections` record, not evidence of a second production table.

4. The production server mounts `backend/routes/inspectionRoutes.js` and
   `backend/inspection/routes/inspectionRoutes.js`. The dormant
   `backend/digitalInspection` workflow service is not mounted as an independent
   production route tree.

5. The active route flow creates an inspection order, bridges it into
   `vehicle_inspections`, establishes the inspection chat, assigns the inspector,
   starts the inspection, and writes completion data back to `vehicle_inspections`.

6. The live `vehicle_inspections` schema already contains the execution fields:
   `checklist`, `evidence`, `current_stage`, `stage_progress`,
   `condition_rating`, `overall_score`, `overall_grade`, `inspector_notes`,
   `chat_id`, `inspector_id`, `requester_id`, and lifecycle timestamps.

7. The live database currently contains zero `vehicle_inspections` rows and zero
   of the five dormant digital-inspection tables. This makes the reconciliation
   clean: no production digital-inspection data needs migration.

## Consequence

The source migration `20260908070000_inspection_workforce_digital_lifecycle_hardening.sql`
is not suitable for direct production execution. Its requirements must be mapped to
the canonical `vehicle_inspections` model instead.

The only directly compatible missing hardening fields are:
- inspector_signature
- inspector_signed_at
- customer_reviewed_at
- customer_review_notes

The stage/evidence/defect/audit requirements remain represented by the existing
canonical JSONB execution model and inspection-domain tables rather than creating
a second execution graph.

## Safety

No production migration was applied during this reconciliation.
