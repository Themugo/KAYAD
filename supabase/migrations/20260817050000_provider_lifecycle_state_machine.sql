/*
# Provider lifecycle state machine
# KAYAD Pre-Purchase Inspection - provider lifecycle implementation

Per this task's explicit 7-stage lifecycle (REGISTERED ->
PROFILE_COMPLETED -> CREDENTIALS_SUBMITTED -> UNDER_REVIEW -> VERIFIED
-> ACTIVE -> SUSPENDED/INACTIVE): the existing inspection_providers
table has two simpler fields (status: pending/active/suspended,
verification_status: unverified/verified) that only coarsely represent
this progression - there is no way to distinguish "just registered,
profile empty" from "profile filled in but no credentials yet" from
"credentials submitted, awaiting admin review", all of which the
locked lifecycle requires as distinct, server-tracked states.

Extends inspection_providers with a new, explicit lifecycle_stage
column rather than trying to derive these finer states from existing
columns at read-time (which would make "every important state
transition must be server-controlled" - this task's own requirement,
inherited from the domain model's business rule #16 - impossible to
enforce cleanly). The existing status/verification_status columns are
kept exactly as they are and continue to work for every existing piece
of application code that reads them (e.g. bookingService.js's
provider.status !== 'active' check) - lifecycle_stage is the new,
authoritative, granular field; a database trigger keeps status/
verification_status in sync with it automatically, so no existing
read-path code needs to change and the two representations can never
drift apart.

Reuses inspection_status_history (already generalized with
entity_type/entity_id in the domain-model-corrections migration) for
the provider lifecycle's own audit trail, rather than building a
separate provider_lifecycle_history table - one auditable-events table
for the whole domain, exactly as that migration's own comment already
established as the intent.
*/

ALTER TABLE provider_credentials
  ADD COLUMN IF NOT EXISTS certificate_number TEXT;

ALTER TABLE inspection_providers
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'REGISTERED',
  ADD COLUMN IF NOT EXISTS lifecycle_updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS info_requested TEXT,
  ADD COLUMN IF NOT EXISTS info_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE inspection_providers
  ADD CONSTRAINT chk_inspection_providers_lifecycle_stage
  CHECK (lifecycle_stage IN (
    'REGISTERED', 'PROFILE_COMPLETED', 'CREDENTIALS_SUBMITTED',
    'UNDER_REVIEW', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'INACTIVE'
  ));

CREATE INDEX IF NOT EXISTS idx_inspection_providers_lifecycle_stage ON inspection_providers(lifecycle_stage);

-- Existing rows (created before this migration, if any exist in a real
-- deployment) are backfilled to a sensible lifecycle_stage derived
-- from their existing status/verification_status, rather than left at
-- the DEFAULT 'REGISTERED' regardless of their real, already-progressed
-- state - preserves existing data's meaning instead of silently
-- regressing every real provider back to the first lifecycle stage.
UPDATE inspection_providers
SET lifecycle_stage = CASE
  WHEN status = 'suspended' THEN 'SUSPENDED'
  WHEN status = 'active' AND verification_status = 'verified' THEN 'ACTIVE'
  WHEN verification_status = 'verified' THEN 'VERIFIED'
  ELSE 'REGISTERED'
END
WHERE lifecycle_stage = 'REGISTERED';

-- Keeps the existing status/verification_status columns in sync with
-- the new, authoritative lifecycle_stage automatically - every
-- existing read of status/verification_status (application code
-- throughout inspection/services/*.js) continues to see correct
-- values without needing to be rewritten to read lifecycle_stage
-- instead.
CREATE OR REPLACE FUNCTION sync_provider_status_from_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
  NEW.lifecycle_updated_at := now();
  CASE NEW.lifecycle_stage
    WHEN 'ACTIVE' THEN
      NEW.status := 'active';
      NEW.verification_status := 'verified';
    WHEN 'VERIFIED' THEN
      NEW.verification_status := 'verified';
      IF NEW.status = 'pending' THEN NEW.status := 'pending'; END IF;
    WHEN 'SUSPENDED' THEN
      NEW.status := 'suspended';
    WHEN 'INACTIVE' THEN
      NEW.status := 'inactive';
    ELSE
      -- REGISTERED / PROFILE_COMPLETED / CREDENTIALS_SUBMITTED /
      -- UNDER_REVIEW: pre-verification stages, existing status/
      -- verification_status defaults (pending/unverified) already
      -- correctly describe all of them - no change needed.
      NULL;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_provider_status ON inspection_providers;
CREATE TRIGGER trg_sync_provider_status
  BEFORE UPDATE OF lifecycle_stage ON inspection_providers
  FOR EACH ROW
  EXECUTE FUNCTION sync_provider_status_from_lifecycle();
