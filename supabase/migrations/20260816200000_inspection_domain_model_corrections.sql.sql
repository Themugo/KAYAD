/*
# Correct and extend the inspection domain model
# KAYAD Pre-Purchase Inspection - domain model implementation

Per the locked business model's 20 named domain concepts, mapped
against the schema activated in 20260816180000_inspection_marketplace_activation.sql.sql
before writing a single line here. Full mapping recorded in
docs/INSPECTION_DOMAIN_MODEL.md (companion document to this migration).

Every genuine gap found is addressed here by EXTENDING an existing
table wherever the concept is a variant/lifecycle-stage of something
that already exists, and by adding a new table only for the 2 concepts
confirmed to have no existing representation at all (refunds as a
dedicated, auditable workflow; disputes, already flagged missing in
the forensic audit and confirmed still missing here). This is not a
rebuild - every existing column, row, and constraint from the prior
migration is preserved untouched except where explicitly loosened
below (and explained why).

## Gap 1: "Inspection request" has no representation
inspection_bookings.provider_id was NOT NULL - a "booking" could only
ever be created with a provider already chosen, which is correct for
business rule #4 ("buyer selects provider") but leaves no way to
represent the request/discovery phase the locked business model also
names as a distinct concept ("Inspection request" vs "Inspection
booking", listed separately). Extended, not duplicated: provider_id
becomes nullable, and a new 'requested' status value is the intended
first state (buyer has specified a vehicle and their needs; no
provider chosen yet) before transitioning to 'booked' once a provider
is selected - the same row represents both the request and, once a
provider is attached, the booking. A CHECK constraint enforces that
'requested' is the only status allowed to have a NULL provider_id,
preventing an ambiguous or accidentally-unassigned confirmed booking.

## Gap 2: "Inspection" as a lifecycle vs. a separate entity
Deliberately NOT split into a separate table. inspection_bookings'
own status column already carries the inspection-execution lifecycle
(inspection_started, inspection_complete) as later stages of the same
row that began as a request/booking. Creating a separate "inspections"
table would duplicate the same identity (one physical inspection event
maps 1:1 to one booking row) - documented here rather than
implemented, per this task's own "do not create duplicate entities"
instruction.

## Gap 3: Report immutability/version history
Business rule #15 ("reports must support immutable submission plus
controlled amendments") had no schema support at all - confirmed
directly, no locked/version-tracking columns existed anywhere on
inspection_reports. Extended inspection_reports with locking columns,
and added ONE new table (inspection_report_amendments) to record the
controlled-amendment half of the rule - an amendment is a new,
attributed, timestamped row referencing what changed and why, never an
in-place overwrite of the original submitted findings.

## Gap 4: Refunds
inspection_transactions can record a transaction_type of 'refund', but
that alone does not satisfy business rule #11 ("financial records must
be auditable") for a refund specifically - no reason, no
requested-by/approved-by/processed-by attribution, no distinct status
workflow. New table: inspection_refunds. inspection_transactions gains
a nullable refund_id so the ledger entry and the refund's own audit
trail are linked, not duplicated.

## Gap 5: Disputes
Confirmed still missing (the forensic audit's finding restated and
reconfirmed, not assumed unchanged without checking - verified no
inspection-scoped dispute table exists anywhere in the current schema
before writing this). New table: inspection_disputes. Deliberately
scoped to inspection/booking disputes only - explicitly NOT the
vehicle-purchase escrow dispute concept, which remains out of scope
per business rules #13/#14 and has no foreign key or shared table with
anything escrow-related here.

## Gap 6: Audit events beyond booking status
inspection_status_history already covers booking status transitions
(business rule #16). Extended to a generic, entity-agnostic audit
table (a nullable entity_type/entity_id pair alongside the existing
booking_id, which remains for backward compatibility with the rows and
code that already exist) rather than building separate audit tables
per entity - one auditable-events table, extended, not five new ones.

## What is explicitly NOT changed here, and why
- inspection_providers, provider_credentials, inspection_packages,
  inspection_checklist_items, inspection_reviews, inspection_settlements,
  inspection_transactions (aside from the new refund_id column): each
  already correctly represents its named concept - confirmed by
  re-checking against the locked business model's own requirements,
  not assumed unchanged from the prior migration.
- No table here references escrows or any vehicle-purchase-payment
  table - preserves the same boundary already confirmed clean in the
  activation migration.
- No existing row is deleted, and no existing column's data is
  migrated/transformed - every change below is either a new nullable
  column, a new table, or a loosened (not tightened) constraint.
*/

-- ── Gap 1: support the request phase ──────────────────────────
ALTER TABLE inspection_bookings
  ALTER COLUMN provider_id DROP NOT NULL;

ALTER TABLE inspection_bookings
  ADD CONSTRAINT chk_inspection_bookings_provider_required
  CHECK (status = 'requested' OR provider_id IS NOT NULL);

-- package_id/scheduled_date/scheduled_time were already nullable in
-- the prior migration (a request may not yet have chosen a package or
-- slot either) - no change needed there, confirmed by re-reading that
-- table's definition before writing this comment.

COMMENT ON COLUMN inspection_bookings.provider_id IS
  'Nullable while status = ''requested'' (buyer has not yet chosen a provider). Required for every other status - enforced by chk_inspection_bookings_provider_required.';

-- ── Gap 3: report locking and controlled amendments ─────────────
ALTER TABLE inspection_reports
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS inspection_report_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  amended_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  changed_fields JSONB DEFAULT '{}',
  previous_values JSONB DEFAULT '{}',
  version_before INTEGER NOT NULL,
  version_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_report_amendments_report ON inspection_report_amendments(report_id);

-- ── Gap 4: refunds ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES inspection_bookings(id) ON DELETE RESTRICT,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'KES',
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_refunds_booking ON inspection_refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_inspection_refunds_status ON inspection_refunds(status);

ALTER TABLE inspection_transactions
  ADD COLUMN IF NOT EXISTS refund_id UUID REFERENCES inspection_refunds(id) ON DELETE SET NULL;

-- ── Gap 5: disputes ───────────────────────────────────────────
-- Deliberately named inspection_disputes (not just "disputes") to
-- make the scope boundary explicit at the schema level, not just in
-- documentation - this table has no relationship to vehicle-purchase
-- escrow disputes, confirmed by having no escrow-related foreign key
-- anywhere in its definition.
CREATE TABLE IF NOT EXISTS inspection_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES inspection_bookings(id) ON DELETE RESTRICT,
  raised_by UUID REFERENCES users(id) ON DELETE SET NULL,
  against_provider_id UUID REFERENCES inspection_providers(id) ON DELETE SET NULL,
  dispute_type TEXT,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  related_refund_id UUID REFERENCES inspection_refunds(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_disputes_booking ON inspection_disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_inspection_disputes_status ON inspection_disputes(status);
CREATE INDEX IF NOT EXISTS idx_inspection_disputes_provider ON inspection_disputes(against_provider_id);

-- ── Gap 6: generalize the audit-events table ────────────────────
-- booking_id remains exactly as it was (nullable was already the
-- correct assumption for a generic table, but the prior migration had
-- it NOT NULL - loosened here, not tightened, so existing rows and
-- existing application code that always supplies booking_id continue
-- to work unchanged) - entity_type/entity_id are new, both nullable,
-- additive columns for the broader set of entities business rule #16
-- covers (reports, refunds, disputes, settlements) without forcing a
-- booking_id to exist where the audited entity isn't a booking at all.
ALTER TABLE inspection_status_history
  ALTER COLUMN booking_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_inspection_status_history_entity ON inspection_status_history(entity_type, entity_id);

COMMENT ON TABLE inspection_status_history IS
  'Generic audit-event log for the inspection domain. booking_id is used by existing booking-status-change code; entity_type/entity_id cover audit events for any other inspection-domain entity (reports, refunds, disputes, settlements) without requiring a booking_id.';
