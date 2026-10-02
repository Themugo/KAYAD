-- KAYAD Auction Phase 4: setup + publication contract
-- Preserves cars as the canonical vehicle authority and the existing atomic
-- auction lifecycle. This table stores auction-specific configuration only.

CREATE TABLE IF NOT EXISTS auction_setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL UNIQUE REFERENCES cars(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES users(id),
  publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft','ready','published','suspended','cancelled','amendment_pending')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  readiness_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES users(id),
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_setups_organizer ON auction_setups(organizer_id);
CREATE INDEX IF NOT EXISTS idx_auction_setups_status ON auction_setups(publication_status);

CREATE TABLE IF NOT EXISTS auction_setup_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_setup_id UUID NOT NULL REFERENCES auction_setups(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  proposed_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','withdrawn')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_setup_amendments_setup ON auction_setup_amendments(auction_setup_id, created_at DESC);

ALTER TABLE auction_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_setup_amendments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auction_setups_owner_select ON auction_setups;
CREATE POLICY auction_setups_owner_select ON auction_setups FOR SELECT
  USING (organizer_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super_admin','staff')));

DROP POLICY IF EXISTS auction_setups_owner_write ON auction_setups;
CREATE POLICY auction_setups_owner_write ON auction_setups FOR INSERT
  WITH CHECK (organizer_id = auth.uid());

DROP POLICY IF EXISTS auction_setups_owner_update ON auction_setups;
CREATE POLICY auction_setups_owner_update ON auction_setups FOR UPDATE
  USING (organizer_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super_admin','staff')));

DROP POLICY IF EXISTS auction_setup_amendments_owner_select ON auction_setup_amendments;
CREATE POLICY auction_setup_amendments_owner_select ON auction_setup_amendments FOR SELECT
  USING (requested_by = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super_admin','staff')));

DROP POLICY IF EXISTS auction_setup_amendments_owner_insert ON auction_setup_amendments;
CREATE POLICY auction_setup_amendments_owner_insert ON auction_setup_amendments FOR INSERT
  WITH CHECK (requested_by = auth.uid());

-- Published configuration is immutable at row level. Controlled amendments
-- are represented by a separate auditable request; later approval can create
-- the next setup version without silently mutating a live contract.
CREATE OR REPLACE FUNCTION kayad_lock_published_auction_setup()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.publication_status = 'published' THEN
    IF NEW.car_id IS DISTINCT FROM OLD.car_id
       OR NEW.organizer_id IS DISTINCT FROM OLD.organizer_id
       OR NEW.config IS DISTINCT FROM OLD.config
       OR NEW.version IS DISTINCT FROM OLD.version
       OR NEW.readiness_snapshot IS DISTINCT FROM OLD.readiness_snapshot
       OR NEW.published_at IS DISTINCT FROM OLD.published_at
       OR NEW.published_by IS DISTINCT FROM OLD.published_by
       OR NEW.locked_at IS DISTINCT FROM OLD.locked_at THEN
      RAISE EXCEPTION 'Published auction setup is immutable; create a controlled amendment instead';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_published_auction_setup ON auction_setups;
CREATE TRIGGER trg_lock_published_auction_setup
BEFORE UPDATE ON auction_setups
FOR EACH ROW EXECUTE FUNCTION kayad_lock_published_auction_setup();

CREATE OR REPLACE FUNCTION update_auction_setup_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auction_setups_updated_at ON auction_setups;
CREATE TRIGGER trg_auction_setups_updated_at
BEFORE UPDATE ON auction_setups
FOR EACH ROW EXECUTE FUNCTION update_auction_setup_updated_at();

REVOKE ALL ON FUNCTION kayad_lock_published_auction_setup() FROM PUBLIC;
REVOKE ALL ON FUNCTION update_auction_setup_updated_at() FROM PUBLIC;
