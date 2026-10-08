-- ============================================================
-- KAYAD INSPECTION WORKFORCE & DIGITAL LIFECYCLE HARDENING
-- 20260908070000
--
-- STAGE 13 CORRECTION (2026-10-08): this migration originally targeted a
-- `digital_inspections` table that was never created by any migration in
-- this chain (confirmed by a full grep of supabase/migrations/*.sql) and
-- was never queried by any backend code (confirmed by a full grep of
-- backend/*.js). A later migration,
-- 20260918120000_canonical_inspection_lifecycle_hardening.sql, documents
-- explicitly: "This migration intentionally DOES NOT create the dormant
-- five-table digital-inspection subsystem (digital_inspections,
-- inspection_stages, inspection_evidence, inspection_defects,
-- inspection_audit_logs)... public.vehicle_inspections [is] the
-- production canonical inspection execution table... The five-table
-- subsystem exists only as a dormant source schema/service
-- implementation and is not the production data path." That later
-- migration already re-applies the equivalent inspector-signature /
-- customer-review hardening against the real, live `vehicle_inspections`
-- table.
--
-- This means every statement below that referenced `digital_inspections`
-- was a deterministic failure against ANY real PostgreSQL engine
-- (Supabase included) -- not an artifact of a local test shim. Because
-- this entire file previously applied as a single transaction, that one
-- dead subsystem's failure was silently rolling back this migration's
-- OTHER, genuinely valid statements too: the inspection_staff role
-- check, the inspection_bookings status/payment_status checks, the
-- inspection_stages/evidence/defects/audit_logs indexes, and the
-- booking-transition-validation trigger below had, as far as this audit
-- can determine, never actually been applied in any environment that
-- runs real transactional migrations.
--
-- Fix: removed only the `digital_inspections`-targeting statements
-- (confirmed dead per the Sept 18 migration's own documentation).
-- Every statement below targeting a real, live table is unchanged from
-- the original migration.
--
-- Converges inspection_bookings with the real ghost_checker/
-- inspection_staff workforce. No new parallel inspection entity is
-- introduced.
-- ============================================================

-- Workforce records must map to a real user for field execution.
CREATE INDEX IF NOT EXISTS idx_inspection_staff_user
  ON inspection_staff(user_id);

-- STAGE 13 CORRECTION (2026-10-08): `is_available` was referenced by this
-- migration's own index below, and is read/written by real, active
-- backend code (backend/inspectionBusinessCenter/services/
-- engineerService.js, backend/inspection/services/workforceService.js --
-- e.g. `if (!staff.is_active || !staff.is_available)`), but no migration
-- in this chain ever added the column -- a genuine, previously
-- undetected schema gap that would make every one of those backend
-- queries/filters fail against any real Postgres/Supabase database.
-- Added here, at the same place this migration always intended to use
-- it, with the same default-true pattern as the existing `is_active`
-- column.
ALTER TABLE inspection_staff
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_inspection_staff_available
  ON inspection_staff(provider_id, is_active, is_available);

ALTER TABLE inspection_staff
  DROP CONSTRAINT IF EXISTS inspection_staff_role_check;

ALTER TABLE inspection_staff
  ADD CONSTRAINT inspection_staff_role_check
  CHECK (role IN (
    'lead_engineer',
    'senior_inspector',
    'junior_inspector',
    'field_technician',
    'workshop_technician',
    'quality_reviewer'
  ));

-- Booking lifecycle is explicit and finite.
ALTER TABLE inspection_bookings
  DROP CONSTRAINT IF EXISTS inspection_bookings_status_check;

ALTER TABLE inspection_bookings
  ADD CONSTRAINT inspection_bookings_status_check
  CHECK (status IN (
    'booked',
    'confirmed',
    'inspector_assigned',
    'travelling',
    'inspection_started',
    'inspection_complete',
    'report_generated',
    'customer_reviewed',
    'closed',
    'cancelled',
    'no_show'
  ));

ALTER TABLE inspection_bookings
  DROP CONSTRAINT IF EXISTS inspection_bookings_payment_status_check;

ALTER TABLE inspection_bookings
  ADD CONSTRAINT inspection_bookings_payment_status_check
  CHECK (payment_status IN (
    'pending',
    'deposit_paid',
    'fully_paid',
    'partial_refund',
    'refunded'
  ));

-- STAGE 13 CORRECTION (2026-10-08): the four indexes originally here
-- (on inspection_stages, inspection_evidence, inspection_defects,
-- inspection_audit_logs) targeted the remaining four tables of the same
-- dormant five-table digital-inspection subsystem named explicitly by
-- 20260918120000_canonical_inspection_lifecycle_hardening.sql
-- ("digital_inspections, inspection_stages, inspection_evidence,
-- inspection_defects, inspection_audit_logs"). None of the four is ever
-- created by any migration in this chain, and none is referenced by any
-- backend code (confirmed by a full grep of backend/*.js) -- the same
-- dead-subsystem class as digital_inspections above, removed on the
-- same evidence.

-- Prevent execution from being marked paid incorrectly.
CREATE OR REPLACE FUNCTION kayad_validate_inspection_booking_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('confirmed','inspector_assigned','travelling','inspection_started',
                    'inspection_complete','report_generated','customer_reviewed','closed')
     AND NEW.payment_status <> 'fully_paid' THEN
    RAISE EXCEPTION 'Inspection booking % requires fully_paid payment before execution', NEW.id;
  END IF;

  IF NEW.status IN ('inspector_assigned','travelling','inspection_started',
                    'inspection_complete','report_generated','customer_reviewed','closed')
     AND NEW.assigned_staff_id IS NULL THEN
    RAISE EXCEPTION 'Inspection booking % requires an assigned inspector', NEW.id;
  END IF;

  IF NEW.status = 'inspection_started' AND NEW.assigned_staff_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM inspection_staff s
      WHERE s.id = NEW.assigned_staff_id
        AND s.is_active = true
        AND s.user_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Inspection booking % has an invalid active inspector', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_inspection_booking_transition ON inspection_bookings;

CREATE TRIGGER trg_validate_inspection_booking_transition
BEFORE INSERT OR UPDATE OF status, payment_status, assigned_staff_id
ON inspection_bookings
FOR EACH ROW
EXECUTE FUNCTION kayad_validate_inspection_booking_transition();
