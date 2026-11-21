-- KAYAD Auction Phase 8: dealer-configured settlement with platform policy.
-- KAYAD is the platform provider. Dealers choose auction settlement rules
-- inside the published configuration, while KAYAD controls the allowed envelope.

CREATE TABLE IF NOT EXISTS auction_platform_policies (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config JSONB NOT NULL DEFAULT '{
    "allowedSettlementModes": ["direct", "escrow"],
    "allowDealerReaward": true,
    "allowDealerCustomDefaultRules": true,
    "allowDealerCustomCollectionRules": true,
    "allowDealerCustomCancellationRules": true,
    "minPaymentDeadlineHours": 1,
    "maxPaymentDeadlineHours": 168
  }'::jsonb,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO auction_platform_policies (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS auction_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL UNIQUE REFERENCES cars(id) ON DELETE CASCADE,
  auction_setup_id UUID NOT NULL REFERENCES auction_setups(id),
  organizer_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('payment_due','payment_received','escrow_pending_funding','completed','no_sale','defaulted','reaward_pending','disputed','cancelled')),
  winner_user_id UUID REFERENCES users(id),
  winning_bid_id UUID REFERENCES bids(id),
  winning_amount NUMERIC NOT NULL DEFAULT 0,
  reserve_met BOOLEAN NOT NULL DEFAULT false,
  no_sale_reason TEXT,
  settlement_mode TEXT NOT NULL CHECK (settlement_mode IN ('direct','escrow')),
  escrow_required BOOLEAN NOT NULL DEFAULT false,
  escrow_id UUID REFERENCES escrows(id),
  payment_id UUID REFERENCES payments(id),
  payment_status TEXT NOT NULL DEFAULT 'not_required',
  payment_receipt TEXT,
  payment_due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  defaulted_at TIMESTAMPTZ,
  defaulted_by UUID REFERENCES users(id),
  reaward_enabled BOOLEAN NOT NULL DEFAULT false,
  reaward_count INTEGER NOT NULL DEFAULT 0,
  collection_status TEXT NOT NULL DEFAULT 'pending_payment',
  transfer_status TEXT NOT NULL DEFAULT 'pending_payment',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_outcomes_winner ON auction_outcomes(winner_user_id);
CREATE INDEX IF NOT EXISTS idx_auction_outcomes_status ON auction_outcomes(status);
CREATE INDEX IF NOT EXISTS idx_auction_outcomes_due ON auction_outcomes(payment_due_at);

ALTER TABLE auction_platform_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auction_platform_policy_admin_select ON auction_platform_policies;
CREATE POLICY auction_platform_policy_admin_select ON auction_platform_policies FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super_admin','staff')));
DROP POLICY IF EXISTS auction_platform_policy_admin_write ON auction_platform_policies;
CREATE POLICY auction_platform_policy_admin_write ON auction_platform_policies FOR ALL
USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super_admin','staff')))
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super_admin','staff')));

DROP POLICY IF EXISTS auction_outcomes_participant_select ON auction_outcomes;
CREATE POLICY auction_outcomes_participant_select ON auction_outcomes FOR SELECT
USING (
  organizer_id = auth.uid()
  OR winner_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super_admin','staff'))
);

CREATE OR REPLACE FUNCTION update_auction_outcome_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_auction_outcomes_updated_at ON auction_outcomes;
CREATE TRIGGER trg_auction_outcomes_updated_at BEFORE UPDATE ON auction_outcomes FOR EACH ROW EXECUTE FUNCTION update_auction_outcome_updated_at();

REVOKE ALL ON FUNCTION update_auction_outcome_updated_at() FROM PUBLIC;
