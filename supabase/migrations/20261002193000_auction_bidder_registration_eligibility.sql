-- KAYAD Auction Phase 5: bidder registration + eligibility contract
CREATE TABLE IF NOT EXISTS auction_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registration_started' CHECK (status IN ('not_registered','registration_started','pending_verification','pending_eligibility','pending_commitment','active','suspended','withdrawn','disqualified','expired')),
  eligibility_status TEXT NOT NULL DEFAULT 'pending' CHECK (eligibility_status IN ('pending','eligible','ineligible')),
  eligibility_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  terms_version TEXT NOT NULL,
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  commitment_required BOOLEAN NOT NULL DEFAULT false,
  commitment_amount NUMERIC,
  commitment_status TEXT NOT NULL DEFAULT 'not_required' CHECK (commitment_status IN ('not_required','pending','payment_pending','satisfied','failed','refunded','forfeited')),
  commitment_transaction_id UUID REFERENCES payments(id),
  commitment_receipt TEXT,
  bidder_number TEXT NOT NULL,
  registration_source TEXT NOT NULL DEFAULT 'web',
  idempotency_key TEXT,
  activated_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  disqualified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auction_id, bidder_id),
  UNIQUE(auction_id, bidder_number)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auction_registration_idempotency ON auction_registrations(auction_id, bidder_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auction_registrations_auction_status ON auction_registrations(auction_id, status);
CREATE INDEX IF NOT EXISTS idx_auction_registrations_bidder ON auction_registrations(bidder_id, created_at DESC);

CREATE TABLE IF NOT EXISTS auction_registration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES auction_registrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auction_registration_events_registration ON auction_registration_events(registration_id, created_at DESC);

ALTER TABLE auction_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_registration_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auction_registrations_bidder_select ON auction_registrations;
CREATE POLICY auction_registrations_bidder_select ON auction_registrations FOR SELECT USING (bidder_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super_admin','staff')));
DROP POLICY IF EXISTS auction_registrations_bidder_insert ON auction_registrations;
-- Registration is a server-owned domain transition. The API uses the service role;
-- clients must not be able to forge ACTIVE/eligible/commitment states directly.
CREATE POLICY auction_registrations_bidder_insert ON auction_registrations FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS auction_registration_events_bidder_select ON auction_registration_events;
CREATE POLICY auction_registration_events_bidder_select ON auction_registration_events FOR SELECT USING (EXISTS (SELECT 1 FROM auction_registrations r WHERE r.id = registration_id AND (r.bidder_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super_admin','staff')))));

CREATE OR REPLACE FUNCTION update_auction_registration_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_auction_registrations_updated_at ON auction_registrations;
CREATE TRIGGER trg_auction_registrations_updated_at BEFORE UPDATE ON auction_registrations FOR EACH ROW EXECUTE FUNCTION update_auction_registration_updated_at();
REVOKE ALL ON FUNCTION update_auction_registration_updated_at() FROM PUBLIC;
