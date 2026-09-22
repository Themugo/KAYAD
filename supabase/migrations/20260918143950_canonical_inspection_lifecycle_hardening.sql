-- KAYAD CANONICAL INSPECTION LIFECYCLE HARDENING
-- Reconciliation target: certified commit 9e2b3dfcf248306a8f84e2beda7c66246856be94
-- Production target: Supabase project ubvgixwhfybbyjuvxboj
--
-- IMPORTANT:
-- This migration intentionally DOES NOT create the dormant five-table
-- digital-inspection subsystem (digital_inspections, inspection_stages,
-- inspection_evidence, inspection_defects, inspection_audit_logs).
--
-- The certified application explicitly declares public.vehicle_inspections
-- as the production canonical inspection execution table. The live schema
-- contains that table and the application bridge returns its id as the
-- digitalInspectionId. The five-table subsystem exists only as a dormant
-- source schema/service implementation and is not the production data path.
--
-- This migration maps only the hardening requirements that are compatible
-- with the canonical live model.

BEGIN;

-- 1. Canonical digital-execution metadata already used by the application.
ALTER TABLE public.vehicle_inspections
  ADD COLUMN IF NOT EXISTS inspector_signature TEXT,
  ADD COLUMN IF NOT EXISTS inspector_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_review_notes TEXT;

-- 2. Canonical execution lookup.
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_inspector_id
  ON public.vehicle_inspections(inspector_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_status
  ON public.vehicle_inspections(status);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_current_stage
  ON public.vehicle_inspections(current_stage);

-- 3. Fail closed on impossible score values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'vehicle_inspections'
      AND c.conname = 'vehicle_inspections_overall_score_check'
  ) THEN
    ALTER TABLE public.vehicle_inspections
      ADD CONSTRAINT vehicle_inspections_overall_score_check
      CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100));
  END IF;
END $$;

-- 4. Canonical customer-review/signature lifecycle metadata.
-- These columns are intentionally additive and nullable because the live
-- table currently has zero rows and existing legacy inspection states do not
-- require these fields to be populated.
COMMENT ON COLUMN public.vehicle_inspections.inspector_signature IS
  'Canonical inspection execution signature captured after customer review.';

COMMENT ON COLUMN public.vehicle_inspections.inspector_signed_at IS
  'Timestamp at which the canonical inspection execution was signed by the inspector.';

COMMENT ON COLUMN public.vehicle_inspections.customer_reviewed_at IS
  'Timestamp at which the customer reviewed the canonical inspection execution.';

COMMENT ON COLUMN public.vehicle_inspections.customer_review_notes IS
  'Customer notes captured during canonical inspection review.';

COMMENT ON TABLE public.vehicle_inspections IS
  'Canonical KAYAD vehicle inspection execution record. Booking/order and digital execution state converge on this record; no parallel digital_inspections entity is required for the production path.';

COMMIT;
