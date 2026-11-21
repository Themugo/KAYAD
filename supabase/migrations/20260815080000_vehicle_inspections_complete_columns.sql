/*
# Complete vehicle_inspections columns to match the existing, already-real application code
# KAYAD Phase 5 (inspection workflow hardening)

Found while auditing the inspection lifecycle: routes/inspectionRoutes.js
is genuinely real, well-built application code (real ownership checks,
real state-machine enforcement, real payment integration, real
propagation of inspection results onto the vehicle's trust score -
confirmed by direct read, not assumed) - but its InspectionOrder model
pointed at a table name ("inspection_orders") that does not exist
anywhere in the real, authoritative schema. The real table,
vehicle_inspections (defined in gari_motors_full_schema.sql.sql), has
only a narrow core: car_id/requester_id/inspector_id/status/
scheduled_at/completed_at/report(jsonb)/notes.

This is the same class of bug already found for cars.location (Phase
6) and confirmed-but-deferred for escrow_vaults (Phase 8) and
organizations (Phase 4) - a model/table name or shape mismatch. This
one was judged safe to complete rather than defer, specifically
because the identity/status columns already map cleanly (fixed via
FIELD_ALIASES in the same commit as this migration) and the
additional columns below are purely additive extensions of an
already-correct table, not evidence of two competing designs the way
governance/escrow_vaults were.

## What this migration adds, and why each one is needed
- fee, payment, checkout_request_id: the real payment-integration
  fields /order's real initiatePayment() call and duplicate-order
  check already depend on.
- location: the real fallback-to-car-location field /order already
  sets.
- checklist (jsonb), overall_score (numeric), condition_rating (text),
  images (jsonb): the real fields /submit already writes when an
  inspector completes a report - the actual inspection findings data,
  the core of what this whole feature exists to capture. Deliberately
  NOT packed into the existing `report` jsonb column instead: the
  application code already treats these as distinct, individually
  addressable fields (not a single opaque blob), and no code anywhere
  in this backend currently reads or writes the existing `report`
  column at all - forcing a repack would mean rewriting already-
  correct, already-tested-by-this-audit application logic, which is
  larger and riskier than adding the columns it already expects.

## What this migration deliberately does NOT do
Does not touch car_id/requester_id/inspector_id/status/scheduled_at/
completed_at/report/notes - the real, already-correct core columns.
Does not rename or remove the existing `report` column, even though
it's currently unused by any code found in this audit - removing it
would be a separate, unrelated cleanup decision, not part of
completing this table for the application code that already depends
on it.
*/

ALTER TABLE vehicle_inspections
  ADD COLUMN IF NOT EXISTS fee NUMERIC,
  ADD COLUMN IF NOT EXISTS payment UUID REFERENCES payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checkout_request_id TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS overall_score NUMERIC,
  ADD COLUMN IF NOT EXISTS condition_rating TEXT,
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_checkout_request_id
  ON vehicle_inspections(checkout_request_id);
