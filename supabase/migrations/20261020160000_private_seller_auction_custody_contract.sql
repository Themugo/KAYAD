-- KAYAD Stage 5F.8: private-seller auction verification and physical custody contract.
-- Local source migration only. NOT applied to any hosted database.
-- Separate trust workflow; do not overload cars.auction_status or financial escrow.
CREATE TABLE IF NOT EXISTS private_seller_auction_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), car_id uuid NOT NULL, seller_user_id uuid NOT NULL REFERENCES users(id),
 proposal_version integer NOT NULL DEFAULT 1 CHECK (proposal_version > 0), evidence_version integer NOT NULL DEFAULT 1 CHECK (evidence_version > 0),
 proposal_status text NOT NULL DEFAULT 'draft' CHECK (proposal_status IN ('draft','submitted','under_review','changes_requested','approved','rejected','withdrawn')),
 verification_status text NOT NULL DEFAULT 'not_started' CHECK (verification_status IN ('not_started','awaiting_payment','assigned','in_progress','passed','failed','inconclusive','expired','disputed')),
 custody_status text NOT NULL DEFAULT 'awaiting_partner' CHECK (custody_status IN ('awaiting_partner','handover_scheduled','received','in_custody','release_authorized','released','refused','incident_hold')),
 appeal_status text NOT NULL DEFAULT 'not_requested' CHECK (appeal_status IN ('not_requested','submitted','under_review','upheld','overturned','closed')),
 inspection_payment_id uuid, inspection_payment_confirmed_at timestamptz, assigned_provider_id uuid, inspection_report_id uuid, inspection_passed_at timestamptz,
 custody_received_at timestamptz, custody_received_by uuid REFERENCES users(id), custody_location_id uuid, custody_intake_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 admin_decision_by uuid REFERENCES users(id), admin_decision_at timestamptz, admin_decision_reason text, approved_proposal_version integer, approved_evidence_version integer,
 policy_version text NOT NULL DEFAULT 'private-seller-auction-v1', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(car_id, proposal_version)
);
CREATE INDEX IF NOT EXISTS idx_psap_seller_status ON private_seller_auction_proposals(seller_user_id, proposal_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_psap_car_status ON private_seller_auction_proposals(car_id, proposal_status, verification_status, custody_status);
CREATE INDEX IF NOT EXISTS idx_psap_provider_status ON private_seller_auction_proposals(assigned_provider_id, custody_status, verification_status);
CREATE TABLE IF NOT EXISTS private_seller_auction_evidence_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), proposal_id uuid NOT NULL REFERENCES private_seller_auction_proposals(id) ON DELETE RESTRICT,
 proposal_version integer NOT NULL, evidence_version integer NOT NULL, event_type text NOT NULL CHECK(event_type IN ('evidence_submitted','payment_confirmed','inspection_assigned','inspection_result','custody_assigned','custody_received','custody_movement','custody_incident','admin_decision','correction_requested','reinspection_requested','appeal_submitted','appeal_decision','release_authorized','vehicle_released')),
 actor_user_id uuid REFERENCES users(id), actor_role text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psap_events_proposal ON private_seller_auction_evidence_events(proposal_id, created_at);
CREATE TABLE IF NOT EXISTS vehicle_custody_capabilities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_id uuid NOT NULL, provider_kind text NOT NULL CHECK(provider_kind IN ('garage','dealer')),
 capability_status text NOT NULL DEFAULT 'pending' CHECK(capability_status IN ('pending','active','suspended','revoked')), approved_by uuid REFERENCES users(id), approved_at timestamptz,
 approved_premises jsonb NOT NULL DEFAULT '[]'::jsonb, agreement_version text, insurance_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider_id)
);
CREATE INDEX IF NOT EXISTS idx_vehicle_custody_capabilities_active ON vehicle_custody_capabilities(provider_id, capability_status);
ALTER TABLE private_seller_auction_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_seller_auction_evidence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_custody_capabilities ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE private_seller_auction_proposals IS 'Versioned private-seller auction trust states; not auction live state or financial escrow.';
COMMENT ON TABLE private_seller_auction_evidence_events IS 'Audit events for private-seller evidence, custody, decisions and appeals.';
COMMENT ON TABLE vehicle_custody_capabilities IS 'Explicit custody approval for garages/dealers, independent from inspection capability.';
