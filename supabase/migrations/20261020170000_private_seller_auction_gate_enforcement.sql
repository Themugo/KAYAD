-- KAYAD Stage 5F.10: database-level enforcement of the private-seller auction verification + physical custody gate.
-- LOCAL SOURCE MIGRATION ONLY. NOT applied to any hosted database. Additive and idempotent where PostgreSQL allows.
--
-- Builds on 20261020160000_private_seller_auction_custody_contract.sql (Stage 5F.8) and reconciles it with the real identifiers:
--   cars.id / cars.dealer_id (owner = users.id), users.role, inspection_providers.id, inspection_staff, inspection_bookings
--   (canonical payment = payment_status 'fully_paid' set by kayad_process_inspection_payment_atomic), inspection_reports.
--
-- Policy (fixed by the business owner): physical custody is mandatory for every private-seller auction; the seller pays disclosed
-- inspection/custody charges before inspection; failed/inconclusive verification blocks the auction; admin approval is separate from
-- inspection success and from physical custody; financial escrow is not physical custody. No exception policy is authorised, so none exists.
--
-- Classification (authoritative, server-side, fail-closed): an auction is exempt from this gate ONLY when the vehicle's owner
-- (cars.dealer_id -> users.role) is 'dealer' or 'broker'. Every other owner (individual_seller, user, staff, unknown, NULL) is gated.
--
-- Rollback: see runbooks/stage5f10-private-seller-custody-20261020/rollback_20261020170000.sql (non-destructive: restores the previous
-- RPC bodies and removes triggers/functions; the three data tables and their rows are preserved).

-- ---------------------------------------------------------------------------------------------------------------------------
-- 1. Reconcile the 5F.8 tables with the real schema
-- ---------------------------------------------------------------------------------------------------------------------------
ALTER TABLE private_seller_auction_proposals
  ADD COLUMN IF NOT EXISTS inspection_booking_id uuid,
  ADD COLUMN IF NOT EXISTS inspection_provider_id uuid,
  ADD COLUMN IF NOT EXISTS authority_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS authority_verified_by uuid,
  ADD COLUMN IF NOT EXISTS inspection_valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS custody_vin_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custody_status_before_hold text,
  ADD COLUMN IF NOT EXISTS custody_hold_reason text,
  ADD COLUMN IF NOT EXISTS custody_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS custody_released_by uuid;

DO $$ BEGIN
  ALTER TABLE private_seller_auction_proposals ADD CONSTRAINT fk_psap_car FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE private_seller_auction_proposals ADD CONSTRAINT fk_psap_booking FOREIGN KEY (inspection_booking_id) REFERENCES inspection_bookings(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE private_seller_auction_proposals ADD CONSTRAINT fk_psap_inspection_provider FOREIGN KEY (inspection_provider_id) REFERENCES inspection_providers(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE private_seller_auction_proposals ADD CONSTRAINT fk_psap_report FOREIGN KEY (inspection_report_id) REFERENCES inspection_reports(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE private_seller_auction_proposals ADD CONSTRAINT fk_psap_authority_by FOREIGN KEY (authority_verified_by) REFERENCES users(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE private_seller_auction_proposals ADD CONSTRAINT fk_psap_released_by FOREIGN KEY (custody_released_by) REFERENCES users(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- internal consistency: a state that claims a fact must carry the fact
DO $$ BEGIN
  ALTER TABLE private_seller_auction_proposals ADD CONSTRAINT chk_psap_in_custody_has_receipt
    CHECK (custody_status NOT IN ('in_custody','release_authorized','released') OR (custody_received_at IS NOT NULL AND custody_received_by IS NOT NULL AND assigned_provider_id IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE private_seller_auction_proposals ADD CONSTRAINT chk_psap_approved_has_decision
    CHECK (proposal_status <> 'approved' OR (admin_decision_by IS NOT NULL AND admin_decision_at IS NOT NULL AND approved_proposal_version IS NOT NULL AND approved_evidence_version IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE private_seller_auction_proposals ADD CONSTRAINT chk_psap_passed_has_report
    CHECK (verification_status <> 'passed' OR (inspection_report_id IS NOT NULL AND inspection_passed_at IS NOT NULL AND inspection_booking_id IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- one live (non-terminal) proposal per vehicle
CREATE UNIQUE INDEX IF NOT EXISTS uq_psap_one_open_per_car
  ON private_seller_auction_proposals(car_id) WHERE proposal_status NOT IN ('rejected','withdrawn');

-- audit events: widen the vocabulary and add idempotency; the table is append-only (trigger below)
ALTER TABLE private_seller_auction_evidence_events ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE private_seller_auction_evidence_events DROP CONSTRAINT IF EXISTS private_seller_auction_evidence_events_event_type_check;
ALTER TABLE private_seller_auction_evidence_events ADD CONSTRAINT private_seller_auction_evidence_events_event_type_check
  CHECK (event_type IN ('proposal_created','proposal_submitted','proposal_withdrawn','evidence_submitted','authority_verified','payment_confirmed','inspection_assigned',
    'inspection_result','custody_assigned','custody_received','custody_movement','custody_refused','custody_incident','custody_hold_released','admin_decision',
    'correction_requested','reinspection_requested','appeal_submitted','appeal_decision','release_authorized','vehicle_released','inspection_expired'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_psap_events_idempotency
  ON private_seller_auction_evidence_events(proposal_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- custody capability: real provider identity + audit
ALTER TABLE vehicle_custody_capabilities
  ADD COLUMN IF NOT EXISTS requested_by uuid,
  ADD COLUMN IF NOT EXISTS status_reason text;
DO $$ BEGIN
  ALTER TABLE vehicle_custody_capabilities ADD CONSTRAINT fk_vcc_requested_by FOREIGN KEY (requested_by) REFERENCES users(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE vehicle_custody_capabilities ADD CONSTRAINT chk_vcc_active_is_approved
    CHECK (capability_status <> 'active' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND agreement_version IS NOT NULL AND jsonb_array_length(approved_premises) > 0));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS vehicle_custody_capability_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_id uuid NOT NULL REFERENCES vehicle_custody_capabilities(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('requested','approved','suspended','revoked','reinstated')),
  actor_user_id uuid REFERENCES users(id),
  actor_role text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vcc_events_capability ON vehicle_custody_capability_events(capability_id, created_at);

-- ---------------------------------------------------------------------------------------------------------------------------
-- 2. Append-only audit + protected-column guard
-- ---------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_psap_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit table % is append-only', TG_TABLE_NAME USING ERRCODE = '42501';
END; $$;

DROP TRIGGER IF EXISTS trg_psap_events_append_only ON private_seller_auction_evidence_events;
CREATE TRIGGER trg_psap_events_append_only BEFORE UPDATE OR DELETE ON private_seller_auction_evidence_events
  FOR EACH ROW EXECUTE FUNCTION kayad_psap_append_only();
DROP TRIGGER IF EXISTS trg_psap_events_no_truncate ON private_seller_auction_evidence_events;
CREATE TRIGGER trg_psap_events_no_truncate BEFORE TRUNCATE ON private_seller_auction_evidence_events
  FOR EACH STATEMENT EXECUTE FUNCTION kayad_psap_append_only();
DROP TRIGGER IF EXISTS trg_vcc_events_append_only ON vehicle_custody_capability_events;
CREATE TRIGGER trg_vcc_events_append_only BEFORE UPDATE OR DELETE ON vehicle_custody_capability_events
  FOR EACH ROW EXECUTE FUNCTION kayad_psap_append_only();
DROP TRIGGER IF EXISTS trg_vcc_events_no_truncate ON vehicle_custody_capability_events;
CREATE TRIGGER trg_vcc_events_no_truncate BEFORE TRUNCATE ON vehicle_custody_capability_events
  FOR EACH STATEMENT EXECUTE FUNCTION kayad_psap_append_only();

-- Protected state may only be written by the SECURITY DEFINER transition functions below (they set kayad.psap_fn for the transaction).
-- A direct UPDATE/INSERT with the service key (a bug, a script, a forged client path) is refused.
CREATE OR REPLACE FUNCTION kayad_psap_guard_writes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- The marker is only honoured when the statement runs inside the (definer-owned) transition functions: a session that is itself
  -- anon / authenticated / service_role cannot forge it by calling set_config() itself.
  IF COALESCE(current_setting('kayad.psap_fn', true), '') = 'on'
     AND current_user NOT IN ('anon', 'authenticated', 'service_role', 'authenticator') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Direct writes to % are not permitted; use the transition functions', TG_TABLE_NAME USING ERRCODE = '42501';
END; $$;

DROP TRIGGER IF EXISTS trg_psap_guard_writes ON private_seller_auction_proposals;
CREATE TRIGGER trg_psap_guard_writes BEFORE INSERT OR UPDATE OR DELETE ON private_seller_auction_proposals
  FOR EACH ROW EXECUTE FUNCTION kayad_psap_guard_writes();
DROP TRIGGER IF EXISTS trg_psap_events_guard_writes ON private_seller_auction_evidence_events;
CREATE TRIGGER trg_psap_events_guard_writes BEFORE INSERT ON private_seller_auction_evidence_events
  FOR EACH ROW EXECUTE FUNCTION kayad_psap_guard_writes();
DROP TRIGGER IF EXISTS trg_vcc_guard_writes ON vehicle_custody_capabilities;
CREATE TRIGGER trg_vcc_guard_writes BEFORE INSERT OR UPDATE OR DELETE ON vehicle_custody_capabilities
  FOR EACH ROW EXECUTE FUNCTION kayad_psap_guard_writes();
DROP TRIGGER IF EXISTS trg_vcc_events_guard_writes ON vehicle_custody_capability_events;
CREATE TRIGGER trg_vcc_events_guard_writes BEFORE INSERT ON vehicle_custody_capability_events
  FOR EACH ROW EXECUTE FUNCTION kayad_psap_guard_writes();

CREATE OR REPLACE FUNCTION kayad_psap_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_psap_updated_at ON private_seller_auction_proposals;
CREATE TRIGGER trg_psap_updated_at BEFORE UPDATE ON private_seller_auction_proposals FOR EACH ROW EXECUTE FUNCTION kayad_psap_touch_updated_at();
DROP TRIGGER IF EXISTS trg_vcc_updated_at ON vehicle_custody_capabilities;
CREATE TRIGGER trg_vcc_updated_at BEFORE UPDATE ON vehicle_custody_capabilities FOR EACH ROW EXECUTE FUNCTION kayad_psap_touch_updated_at();

-- ---------------------------------------------------------------------------------------------------------------------------
-- 3. Provider identity helper
--    garage  : inspection_providers.id  (owner user, or a CONFIRMED inspection_staff member)
--    dealer  : users.id of a dealer
-- ---------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_psap_provider_ids(p_user uuid) RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT x), '{}'::uuid[]) FROM (
    SELECT ip.id AS x FROM inspection_providers ip WHERE ip.user_id = p_user
    UNION
    SELECT s.provider_id FROM inspection_staff s
      WHERE s.user_id = p_user AND s.affiliation_status = 'confirmed' AND COALESCE(s.is_active, true)
    UNION
    SELECT u.id FROM users u WHERE u.id = p_user AND u.role = 'dealer'
  ) t WHERE p_user IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION kayad_psap_provider_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_psap_provider_ids(uuid) TO service_role;

-- A custody partner is usable only while its underlying identity is itself in good standing.
CREATE OR REPLACE FUNCTION kayad_psap_partner_in_good_standing(p_provider_id uuid, p_kind text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_kind = 'garage' THEN
    RETURN EXISTS (SELECT 1 FROM inspection_providers ip
                    WHERE ip.id = p_provider_id AND ip.status = 'active' AND ip.verification_status = 'verified');
  ELSIF p_kind = 'dealer' THEN
    RETURN EXISTS (SELECT 1 FROM users u
                    WHERE u.id = p_provider_id AND u.role = 'dealer' AND COALESCE(u.is_banned, false) = false AND u.deactivated_at IS NULL);
  END IF;
  RETURN false;
END; $$;
REVOKE ALL ON FUNCTION kayad_psap_partner_in_good_standing(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_psap_partner_in_good_standing(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 4. THE GATE. One definition, called from every activation / bid mutation in the same transaction.
--    p_lock = true : takes FOR SHARE locks on the proposal and capability rows so that a concurrent hold / revocation / evidence change
--                    either commits first (and is seen) or waits until the guarded mutation commits.
--    Lock order everywhere: cars -> proposal -> capability.
-- ---------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_private_seller_gate(p_car_id uuid, p_lock boolean DEFAULT true) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_car cars%ROWTYPE;
  v_owner_role text;
  v_owner users%ROWTYPE;
  v_p private_seller_auction_proposals%ROWTYPE;
  v_cap vehicle_custody_capabilities%ROWTYPE;
  v_booking inspection_bookings%ROWTYPE;
  v_b text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO v_car FROM cars WHERE id = p_car_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'scope', 'unknown', 'code', 'VEHICLE_NOT_FOUND', 'blockers', jsonb_build_array('Vehicle not found'));
  END IF;

  SELECT * INTO v_owner FROM users WHERE id = v_car.dealer_id;
  v_owner_role := CASE WHEN FOUND THEN v_owner.role ELSE NULL END;

  -- Professional sellers keep their existing lifecycle. Everything else (including unknown / NULL owner) is a private-seller auction.
  IF v_owner_role IN ('dealer', 'broker') THEN
    RETURN jsonb_build_object('eligible', true, 'scope', 'dealer_exempt', 'code', 'ELIGIBLE', 'blockers', '[]'::jsonb);
  END IF;
  IF v_car.dealer_id IS NULL OR v_owner_role IS NULL THEN
    v_b := array_append(v_b, 'Seller classification cannot be established for this vehicle');
  END IF;

  -- Current proposal = highest version that is not terminal-withdrawn / rejected.
  IF p_lock THEN
    SELECT * INTO v_p FROM private_seller_auction_proposals
     WHERE car_id = p_car_id AND proposal_status NOT IN ('rejected','withdrawn')
     ORDER BY proposal_version DESC LIMIT 1 FOR SHARE;
  ELSE
    SELECT * INTO v_p FROM private_seller_auction_proposals
     WHERE car_id = p_car_id AND proposal_status NOT IN ('rejected','withdrawn')
     ORDER BY proposal_version DESC LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    v_b := array_append(v_b, 'No private-seller verification proposal exists for this vehicle');
    RETURN jsonb_build_object('eligible', false, 'scope', 'private_seller', 'code', 'PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE', 'blockers', to_jsonb(v_b));
  END IF;

  -- seller authority / identity
  IF v_p.seller_user_id IS DISTINCT FROM v_car.dealer_id THEN v_b := array_append(v_b, 'Proposal seller does not match the current vehicle owner'); END IF;
  IF v_owner_role IS NOT NULL AND (COALESCE(v_owner.is_banned, false) OR v_owner.deactivated_at IS NOT NULL) THEN v_b := array_append(v_b, 'Seller account is suspended or deactivated'); END IF;
  IF v_p.authority_verified_at IS NULL OR v_p.authority_verified_by IS NULL THEN v_b := array_append(v_b, 'Seller authority to sell has not been verified'); END IF;

  -- admin approval bound to the current versions
  IF v_p.proposal_status <> 'approved' THEN v_b := array_append(v_b, 'Admin approval is not current'); END IF;
  IF v_p.admin_decision_by IS NULL OR v_p.admin_decision_at IS NULL THEN v_b := array_append(v_b, 'Admin decision is missing'); END IF;
  IF v_p.approved_proposal_version IS DISTINCT FROM v_p.proposal_version THEN v_b := array_append(v_b, 'Approval does not match the current proposal version'); END IF;
  IF v_p.approved_evidence_version IS DISTINCT FROM v_p.evidence_version THEN v_b := array_append(v_b, 'Approval does not match the current evidence version'); END IF;

  -- canonical payment + inspection (re-derived from the canonical records, never from denormalised flags alone)
  IF v_p.inspection_booking_id IS NULL THEN
    v_b := array_append(v_b, 'No paid inspection booking is linked');
  ELSE
    SELECT * INTO v_booking FROM inspection_bookings WHERE id = v_p.inspection_booking_id;
    IF NOT FOUND THEN
      v_b := array_append(v_b, 'Linked inspection booking not found');
    ELSE
      IF v_booking.payment_status IS DISTINCT FROM 'fully_paid' OR v_booking.paid_at IS NULL THEN v_b := array_append(v_b, 'Seller inspection/custody payment is not confirmed'); END IF;
      IF v_booking.vehicle_id IS DISTINCT FROM p_car_id THEN v_b := array_append(v_b, 'Inspection was performed for a different vehicle'); END IF;
      IF v_booking.customer_id IS DISTINCT FROM v_p.seller_user_id THEN v_b := array_append(v_b, 'Inspection was not paid for by the seller of record'); END IF;
      IF v_booking.status IN ('cancelled','refunded') THEN v_b := array_append(v_b, 'Inspection booking was cancelled'); END IF;
      IF v_p.inspection_provider_id IS DISTINCT FROM v_booking.provider_id THEN v_b := array_append(v_b, 'Inspection provider does not match the booking'); END IF;
    END IF;
  END IF;
  IF v_p.verification_status <> 'passed' THEN v_b := array_append(v_b, 'Vehicle verification has not passed'); END IF;
  IF v_p.inspection_report_id IS NULL OR v_p.inspection_passed_at IS NULL THEN v_b := array_append(v_b, 'Passed inspection evidence is missing'); END IF;
  IF v_p.inspection_valid_until IS NOT NULL AND v_p.inspection_valid_until <= now() THEN v_b := array_append(v_b, 'Inspection result has expired'); END IF;
  IF v_p.inspection_report_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM inspection_reports r WHERE r.id = v_p.inspection_report_id AND r.booking_id = v_p.inspection_booking_id) THEN
    v_b := array_append(v_b, 'Inspection report does not belong to the linked booking');
  END IF;

  -- physical custody
  IF v_p.custody_status <> 'in_custody' THEN v_b := array_append(v_b, 'Vehicle is not recorded in approved physical custody'); END IF;
  IF v_p.custody_status IN ('incident_hold','refused') THEN v_b := array_append(v_b, 'Vehicle custody is on hold or was refused'); END IF;
  IF v_p.custody_status IN ('release_authorized','released') THEN v_b := array_append(v_b, 'Vehicle custody has ended or release is authorised'); END IF;
  IF v_p.custody_received_at IS NULL OR v_p.custody_received_by IS NULL OR NOT v_p.custody_vin_confirmed THEN v_b := array_append(v_b, 'Physical custody receipt (with VIN confirmation) is missing'); END IF;
  IF v_p.assigned_provider_id IS NULL THEN
    v_b := array_append(v_b, 'Approved custody partner is not assigned');
  ELSE
    IF p_lock THEN
      SELECT * INTO v_cap FROM vehicle_custody_capabilities WHERE provider_id = v_p.assigned_provider_id FOR SHARE;
    ELSE
      SELECT * INTO v_cap FROM vehicle_custody_capabilities WHERE provider_id = v_p.assigned_provider_id;
    END IF;
    IF NOT FOUND OR v_cap.capability_status <> 'active' OR v_cap.approved_by IS NULL THEN
      v_b := array_append(v_b, 'Assigned partner lacks active approved custody capability');
    ELSE
      IF v_cap.insurance_expires_at IS NOT NULL AND v_cap.insurance_expires_at <= now() THEN v_b := array_append(v_b, 'Custody partner authorization has expired'); END IF;
      IF v_p.custody_location_id IS NULL OR NOT (v_cap.approved_premises @> to_jsonb(v_p.custody_location_id::text)) THEN
        v_b := array_append(v_b, 'Custody location is not an approved premises of the partner');
      END IF;
      IF NOT kayad_psap_partner_in_good_standing(v_cap.provider_id, v_cap.provider_kind) THEN v_b := array_append(v_b, 'Custody partner is not in good standing'); END IF;
    END IF;
  END IF;

  -- disputes
  IF v_p.appeal_status IN ('submitted','under_review') THEN v_b := array_append(v_b, 'Verification appeal is unresolved'); END IF;

  RETURN jsonb_build_object(
    'eligible', cardinality(v_b) = 0,
    'scope', 'private_seller',
    'code', CASE WHEN cardinality(v_b) = 0 THEN 'ELIGIBLE' ELSE 'PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE' END,
    'blockers', to_jsonb(v_b),
    'proposal_id', v_p.id, 'proposal_version', v_p.proposal_version, 'evidence_version', v_p.evidence_version);
END; $$;
REVOKE ALL ON FUNCTION kayad_private_seller_gate(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_private_seller_gate(uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION kayad_private_seller_assert_eligible(p_car_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_g jsonb;
BEGIN
  v_g := kayad_private_seller_gate(p_car_id, true);
  IF NOT (v_g->>'eligible')::boolean THEN
    RAISE EXCEPTION 'PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE' USING DETAIL = v_g->>'blockers', ERRCODE = 'P0001';
  END IF;
  RETURN v_g;
END; $$;
REVOKE ALL ON FUNCTION kayad_private_seller_assert_eligible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_private_seller_assert_eligible(uuid) TO service_role;

-- Non-locking batch projection for public reads (list / detail / room). The projection can only HIDE; it never grants.
CREATE OR REPLACE FUNCTION kayad_private_seller_gate_batch(p_car_ids uuid[]) RETURNS TABLE(car_id uuid, eligible boolean, scope text, blockers jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_g jsonb;
BEGIN
  FOREACH v_id IN ARRAY COALESCE(p_car_ids, '{}'::uuid[]) LOOP
    v_g := kayad_private_seller_gate(v_id, false);
    car_id := v_id; eligible := (v_g->>'eligible')::boolean; scope := v_g->>'scope'; blockers := v_g->'blockers';
    RETURN NEXT;
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION kayad_private_seller_gate_batch(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_private_seller_gate_batch(uuid[]) TO service_role;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 5. Atomic RPCs: same bodies as the current canonical versions + the gate, evaluated after the car row lock
-- ---------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_place_bid_atomic(
  p_car_id UUID, p_user_id UUID, p_amount NUMERIC, p_bidder_tag TEXT, p_phone TEXT, p_max_bid NUMERIC, p_status TEXT, p_checkout_request_id TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_car cars%ROWTYPE;
  v_setup JSONB := '{}'::jsonb;
  v_current NUMERIC;
  v_increment NUMERIC;
  v_snipe_window_seconds INTEGER := 120;
  v_snipe_extension_seconds INTEGER := 120;
  v_max_extensions INTEGER := 3;
  v_bid_id UUID;
  v_bids_count INTEGER;
  v_previous UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid bid amount'; END IF;

  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;

  -- Stage 5F.10: private-seller verification + custody gate, inside this transaction, after the car lock.
  PERFORM kayad_private_seller_assert_eligible(p_car_id);

  SELECT COALESCE(config, '{}'::jsonb) INTO v_setup FROM auction_setups WHERE car_id = p_car_id AND publication_status = 'published' LIMIT 1;

  IF v_car.dealer_id = p_user_id THEN RAISE EXCEPTION 'You cannot bid on your own car'; END IF;
  IF v_car.auction_status <> 'live' THEN RAISE EXCEPTION 'Auction not live'; END IF;
  IF v_car.auction_end IS NOT NULL AND v_car.auction_end <= now() THEN RAISE EXCEPTION 'Auction has ended'; END IF;
  IF v_car.highest_bidder_id = p_user_id THEN RAISE EXCEPTION 'You are already the highest bidder'; END IF;

  v_current := GREATEST(
    COALESCE((SELECT MAX(amount) FROM bids WHERE car_id = p_car_id AND status = 'paid'), 0),
    COALESCE(v_car.current_bid, 0),
    COALESCE(v_car.price, 0)
  );

  v_increment := CASE
    WHEN (v_setup->>'bidIncrement') ~ '^[0-9]+([.][0-9]+)?$' AND (v_setup->>'bidIncrement')::numeric > 0 THEN (v_setup->>'bidIncrement')::numeric
    WHEN v_current < 100000 THEN 1000
    WHEN v_current < 500000 THEN 5000
    WHEN v_current < 2000000 THEN 10000
    ELSE 25000
  END;

  IF p_amount < v_current + v_increment THEN
    RAISE EXCEPTION 'Minimum bid increment is KES %', (v_current + v_increment)::NUMERIC;
  END IF;

  IF COALESCE((v_setup->>'antiSnipe')::boolean, true) THEN
    v_snipe_window_seconds := GREATEST(10, LEAST(3600, COALESCE(NULLIF(v_setup->>'antiSnipeWindowSeconds','')::integer, 120)));
    v_snipe_extension_seconds := GREATEST(10, LEAST(3600, COALESCE(NULLIF(v_setup->>'antiSnipeExtensionSeconds','')::integer, 120)));
    v_max_extensions := GREATEST(0, LEAST(10, COALESCE(NULLIF(v_setup->>'maxExtensions','')::integer, 3)));
  END IF;

  v_previous := v_car.highest_bidder_id;

  INSERT INTO bids (car_id, user_id, amount, max_bid, is_auto, bidder_tag, phone, status, checkout_request_id)
  VALUES (p_car_id, p_user_id, p_amount, p_max_bid, false, p_bidder_tag, p_phone, p_status, p_checkout_request_id)
  RETURNING id INTO v_bid_id;

  v_bids_count := COALESCE(v_car.bids_count, 0) + CASE WHEN p_status = 'paid' THEN 1 ELSE 0 END;

  IF p_status = 'paid' THEN
    UPDATE cars
       SET current_bid = p_amount,
           highest_bidder_id = p_user_id,
           bids_count = v_bids_count,
           extension_count = CASE
             WHEN COALESCE((v_setup->>'antiSnipe')::boolean, true) AND auction_end IS NOT NULL AND auction_end > now()
              AND auction_end - now() < make_interval(secs => v_snipe_window_seconds) AND extension_count < v_max_extensions
             THEN extension_count + 1 ELSE extension_count END,
           auction_end = CASE
             WHEN COALESCE((v_setup->>'antiSnipe')::boolean, true) AND auction_end IS NOT NULL AND auction_end > now()
              AND auction_end - now() < make_interval(secs => v_snipe_window_seconds) AND extension_count < v_max_extensions
             THEN auction_end + make_interval(secs => v_snipe_extension_seconds) ELSE auction_end END,
           updated_at = now()
     WHERE id = p_car_id;
  END IF;

  RETURN jsonb_build_object(
    'bid_id', v_bid_id, 'previous_highest_bidder', v_previous,
    'current_bid', CASE WHEN p_status = 'paid' THEN p_amount ELSE v_car.current_bid END,
    'auction_end', (SELECT auction_end FROM cars WHERE id = p_car_id),
    'bids_count', v_bids_count, 'status', p_status, 'bid_increment', v_increment
  );
END;
$$;
REVOKE ALL ON FUNCTION kayad_place_bid_atomic(UUID,UUID,NUMERIC,TEXT,TEXT,NUMERIC,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_place_bid_atomic(UUID,UUID,NUMERIC,TEXT,TEXT,NUMERIC,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION kayad_auto_bid_atomic(p_car_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_car cars%ROWTYPE;
  v_setup JSONB := '{}'::jsonb;
  v_top_user UUID; v_top_max NUMERIC; v_second_max NUMERIC; v_phone TEXT; v_amount NUMERIC; v_increment NUMERIC;
  v_snipe_window_seconds INTEGER := 120; v_snipe_extension_seconds INTEGER := 120; v_max_extensions INTEGER := 3;
  v_bid_id UUID; v_gate JSONB;
BEGIN
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;
  IF v_car.auction_status <> 'live' OR (v_car.auction_end IS NOT NULL AND v_car.auction_end <= now()) THEN RETURN jsonb_build_object('created', false, 'reason', 'auction_not_live'); END IF;

  -- Stage 5F.10: an automatic proxy bid must never be created for an ineligible private-seller auction.
  v_gate := kayad_private_seller_gate(p_car_id, true);
  IF NOT (v_gate->>'eligible')::boolean THEN
    RETURN jsonb_build_object('created', false, 'reason', 'private_seller_not_eligible', 'blockers', v_gate->'blockers');
  END IF;

  SELECT COALESCE(config, '{}'::jsonb) INTO v_setup FROM auction_setups WHERE car_id = p_car_id AND publication_status = 'published' LIMIT 1;
  IF COALESCE((v_setup->>'antiSnipe')::boolean, true) THEN
    v_snipe_window_seconds := GREATEST(10, LEAST(3600, COALESCE(NULLIF(v_setup->>'antiSnipeWindowSeconds','')::integer, 120)));
    v_snipe_extension_seconds := GREATEST(10, LEAST(3600, COALESCE(NULLIF(v_setup->>'antiSnipeExtensionSeconds','')::integer, 120)));
    v_max_extensions := GREATEST(0, LEAST(10, COALESCE(NULLIF(v_setup->>'maxExtensions','')::integer, 3)));
  END IF;

  SELECT user_id, max_bid, phone INTO v_top_user, v_top_max, v_phone
  FROM (SELECT user_id, MAX(max_bid) AS max_bid, MAX(phone) AS phone FROM bids WHERE car_id = p_car_id AND status = 'paid' AND max_bid IS NOT NULL AND max_bid > 0 AND user_id IS NOT NULL GROUP BY user_id ORDER BY MAX(max_bid) DESC LIMIT 2) ranked
  ORDER BY max_bid DESC LIMIT 1;

  SELECT max_bid INTO v_second_max
  FROM (SELECT user_id, MAX(max_bid) AS max_bid FROM bids WHERE car_id = p_car_id AND status = 'paid' AND max_bid IS NOT NULL AND max_bid > 0 AND user_id IS NOT NULL GROUP BY user_id ORDER BY MAX(max_bid) DESC OFFSET 1 LIMIT 1) second_rank;

  IF v_top_user IS NULL OR v_second_max IS NULL THEN RETURN jsonb_build_object('created', false, 'reason', 'insufficient_auto_bidders'); END IF;
  IF v_car.highest_bidder_id = v_top_user THEN RETURN jsonb_build_object('created', false, 'reason', 'already_highest'); END IF;

  v_increment := CASE
    WHEN (v_setup->>'bidIncrement') ~ '^[0-9]+([.][0-9]+)?$' AND (v_setup->>'bidIncrement')::numeric > 0 THEN (v_setup->>'bidIncrement')::numeric
    WHEN GREATEST(COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0)) < 100000 THEN 1000
    WHEN GREATEST(COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0)) < 500000 THEN 5000
    WHEN GREATEST(COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0)) < 2000000 THEN 10000
    ELSE 25000 END;
  v_amount := LEAST(v_top_max, v_second_max + v_increment);
  IF v_amount <= GREATEST(COALESCE(v_car.current_bid, 0), COALESCE(v_car.price, 0)) OR v_amount <= v_second_max THEN RETURN jsonb_build_object('created', false, 'reason', 'max_bid_exhausted'); END IF;
  IF EXISTS (SELECT 1 FROM bids WHERE car_id = p_car_id AND user_id = v_top_user AND amount = v_amount AND is_auto = true) THEN RETURN jsonb_build_object('created', false, 'reason', 'duplicate_auto_bid'); END IF;

  INSERT INTO bids (car_id, user_id, amount, max_bid, is_auto, bidder_tag, phone, status) VALUES (p_car_id, v_top_user, v_amount, v_top_max, true, 'Bidder', v_phone, 'paid') RETURNING id INTO v_bid_id;

  UPDATE cars
     SET current_bid = v_amount, highest_bidder_id = v_top_user, bids_count = COALESCE(bids_count, 0) + 1,
         extension_count = CASE
           WHEN COALESCE((v_setup->>'antiSnipe')::boolean, true) AND auction_end IS NOT NULL AND auction_end > now()
            AND auction_end - now() < make_interval(secs => v_snipe_window_seconds) AND extension_count < v_max_extensions
           THEN extension_count + 1 ELSE extension_count END,
         auction_end = CASE
           WHEN COALESCE((v_setup->>'antiSnipe')::boolean, true) AND auction_end IS NOT NULL AND auction_end > now()
            AND auction_end - now() < make_interval(secs => v_snipe_window_seconds) AND extension_count < v_max_extensions
           THEN auction_end + make_interval(secs => v_snipe_extension_seconds) ELSE auction_end END,
         updated_at = now()
   WHERE id = p_car_id;

  RETURN jsonb_build_object('created', true, 'bid_id', v_bid_id, 'user_id', v_top_user, 'amount', v_amount, 'max_bid', v_top_max, 'current_bid', v_amount, 'auction_end', (SELECT auction_end FROM cars WHERE id = p_car_id));
END;
$$;
REVOKE ALL ON FUNCTION kayad_auto_bid_atomic(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_auto_bid_atomic(UUID) TO service_role;

CREATE OR REPLACE FUNCTION kayad_start_auction_atomic(
  p_car_id UUID, p_duration_ms BIGINT, p_starting_bid NUMERIC, p_reserve_price NUMERIC DEFAULT NULL, p_reserve_mode TEXT DEFAULT 'none'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_car cars%ROWTYPE;
  v_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;

  -- Stage 5F.10: no start path (admin, dealer, canonical service) can bypass the private-seller gate.
  PERFORM kayad_private_seller_assert_eligible(p_car_id);

  IF v_car.auction_status = 'live' THEN RAISE EXCEPTION 'Auction already live'; END IF;
  IF v_car.auction_status = 'ended' THEN RAISE EXCEPTION 'Ended auctions cannot be restarted'; END IF;
  IF p_duration_ms IS NULL OR p_duration_ms < 86400000 THEN RAISE EXCEPTION 'Minimum auction duration is 24 hours'; END IF;
  IF p_starting_bid IS NULL OR p_starting_bid < 1000 THEN RAISE EXCEPTION 'Starting bid must be at least KES 1,000'; END IF;
  IF p_reserve_price IS NOT NULL AND p_reserve_price < p_starting_bid THEN RAISE EXCEPTION 'Reserve price must be >= starting bid'; END IF;
  IF p_reserve_mode NOT IN ('none','soft','hard') THEN RAISE EXCEPTION 'Invalid reserve mode'; END IF;

  v_end := now() + (p_duration_ms::double precision * interval '1 millisecond');

  UPDATE cars
     SET auction_status = 'live', allow_bid = true, starting_bid = p_starting_bid, current_bid = p_starting_bid, highest_bidder_id = NULL,
         auction_start_time = now(), auction_end = v_end, reserve_price = p_reserve_price, reserve_mode = p_reserve_mode,
         extension_count = 0, winner = NULL, sold = false, updated_at = now()
   WHERE id = p_car_id;

  RETURN jsonb_build_object('car_id', p_car_id, 'starting_bid', p_starting_bid, 'reserve_price', p_reserve_price, 'reserve_mode', p_reserve_mode,
    'auction_start_time', (SELECT auction_start_time FROM cars WHERE id = p_car_id), 'auction_end', v_end, 'extension_count', 0);
END;
$$;
REVOKE ALL ON FUNCTION kayad_start_auction_atomic(UUID,BIGINT,NUMERIC,NUMERIC,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_start_auction_atomic(UUID,BIGINT,NUMERIC,NUMERIC,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION kayad_start_scheduled_auction_atomic(
  p_car_id UUID, p_scheduled_end_at TIMESTAMPTZ, p_starting_bid NUMERIC, p_reserve_price NUMERIC DEFAULT NULL, p_reserve_mode TEXT DEFAULT 'none'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_car cars%ROWTYPE;
BEGIN
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;

  -- Stage 5F.10: eligibility is re-evaluated at activation time, not trusted from the moment the job was scheduled.
  PERFORM kayad_private_seller_assert_eligible(p_car_id);

  IF v_car.auction_status = 'live' THEN RAISE EXCEPTION 'Auction already live'; END IF;
  IF v_car.auction_status = 'ended' THEN RAISE EXCEPTION 'Ended auctions cannot be restarted'; END IF;
  IF p_scheduled_end_at IS NULL OR p_scheduled_end_at <= now() THEN RAISE EXCEPTION 'Published auction schedule has expired'; END IF;
  IF p_starting_bid IS NULL OR p_starting_bid < 1000 THEN RAISE EXCEPTION 'Starting bid must be at least KES 1,000'; END IF;
  IF p_reserve_price IS NOT NULL AND p_reserve_price < p_starting_bid THEN RAISE EXCEPTION 'Reserve price must be >= starting bid'; END IF;
  IF p_reserve_mode NOT IN ('none','soft','hard') THEN RAISE EXCEPTION 'Invalid reserve mode'; END IF;

  UPDATE cars
     SET auction_status = 'live', allow_bid = true, starting_bid = p_starting_bid, current_bid = p_starting_bid, highest_bidder_id = NULL,
         auction_start_time = now(), auction_end = p_scheduled_end_at, reserve_price = p_reserve_price, reserve_mode = p_reserve_mode,
         extension_count = 0, winner = NULL, sold = false, updated_at = now()
   WHERE id = p_car_id;

  RETURN jsonb_build_object('car_id', p_car_id, 'starting_bid', p_starting_bid, 'reserve_price', p_reserve_price, 'reserve_mode', p_reserve_mode,
    'auction_start_time', (SELECT auction_start_time FROM cars WHERE id = p_car_id), 'auction_end', p_scheduled_end_at, 'extension_count', 0, 'scheduled_start', true);
END;
$$;
REVOKE ALL ON FUNCTION kayad_start_scheduled_auction_atomic(UUID,TIMESTAMPTZ,NUMERIC,NUMERIC,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_start_scheduled_auction_atomic(UUID,TIMESTAMPTZ,NUMERIC,NUMERIC,TEXT) TO service_role;

-- A paid KES-1 bid confirmation is a REAL payment and is always recorded (financial integrity); it is applied to the live market only
-- while the auction is eligible. When the gate fails, applied_to_market = false (the existing "not applied" path), the ledger is unchanged.
CREATE OR REPLACE FUNCTION kayad_settle_bid_payment_atomic(p_payment_id UUID, p_receipt TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_bid bids%ROWTYPE;
  v_car cars%ROWTYPE;
  v_setup JSONB := '{}'::jsonb;
  v_fee NUMERIC := 1;
  v_applied BOOLEAN := false;
  v_ledger JSONB;
  v_gate JSONB;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.type <> 'bid' THEN RAISE EXCEPTION 'Payment is not a bid payment'; END IF;

  SELECT COALESCE(config, '{}'::jsonb) INTO v_setup FROM auction_setups WHERE car_id = v_payment.car_id AND publication_status = 'published' LIMIT 1;
  SELECT COALESCE((SELECT config->>'bidConfirmationFeeKes' FROM auction_platform_policies WHERE id = 1)::numeric, 1) INTO v_fee;
  IF v_fee <= 0 THEN v_fee := 1; END IF;
  IF ROUND(v_payment.amount, 2) <> ROUND(v_fee, 2) THEN
    RAISE EXCEPTION 'Invalid auction bid confirmation fee: expected %, received %', v_fee, v_payment.amount;
  END IF;

  SELECT * INTO v_bid FROM bids
   WHERE checkout_request_id = v_payment.checkout_request_id AND car_id = v_payment.car_id AND user_id = v_payment.user_id
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bid not found for payment'; END IF;

  SELECT * INTO v_car FROM cars WHERE id = v_bid.car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found for bid'; END IF;

  UPDATE payments SET status = 'success', mpesa_receipt = p_receipt, paid_at = COALESCE(paid_at, now()), processed = true, updated_at = now() WHERE id = v_payment.id;

  IF v_bid.status <> 'paid' THEN UPDATE bids SET status = 'paid' WHERE id = v_bid.id; END IF;

  v_gate := kayad_private_seller_gate(v_car.id, true);

  IF v_car.auction_status = 'live'
     AND (v_car.auction_end IS NULL OR v_car.auction_end > now())
     AND v_bid.amount > COALESCE(v_car.current_bid, 0)
     AND (v_gate->>'eligible')::boolean THEN
    UPDATE cars SET current_bid = v_bid.amount, highest_bidder_id = v_bid.user_id, bids_count = COALESCE(v_car.bids_count, 0) + 1, updated_at = now() WHERE id = v_car.id;
    v_applied := true;
  END IF;

  SELECT kayad_post_ledger_entry_atomic(
    'auction-bid-confirmation:' || v_payment.id::text, v_payment.user_id, v_payment.amount, 'KES', 'auction_bid_confirmation', 'platform',
    'Nominal KES auction bid-confirmation charge',
    jsonb_build_object('payment_id', v_payment.id, 'bid_id', v_bid.id, 'auction_id', v_bid.car_id, 'receipt', p_receipt),
    '1000', '4400'
  ) INTO v_ledger;

  RETURN jsonb_build_object('payment_id', v_payment.id, 'bid_id', v_bid.id, 'car_id', v_bid.car_id, 'user_id', v_bid.user_id, 'amount', v_bid.amount,
    'confirmation_fee', v_payment.amount, 'applied_to_market', v_applied, 'ledger', v_ledger,
    'not_applied_reason', CASE WHEN v_applied THEN NULL WHEN NOT (v_gate->>'eligible')::boolean THEN 'private_seller_not_eligible' ELSE 'not_live_or_not_highest' END);
END;
$$;
REVOKE ALL ON FUNCTION kayad_settle_bid_payment_atomic(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_settle_bid_payment_atomic(UUID, TEXT) TO service_role;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 6. Backstops: any other writer (direct service-key update, future code path, SMS path) hits the same gate
-- ---------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_cars_private_seller_backstop() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_g jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.dealer_id IS DISTINCT FROM OLD.dealer_id
     AND (OLD.auction_status = 'live' OR EXISTS (SELECT 1 FROM private_seller_auction_proposals p WHERE p.car_id = OLD.id AND p.proposal_status NOT IN ('rejected','withdrawn'))) THEN
    RAISE EXCEPTION 'Vehicle ownership cannot change while it is in a live auction or has an open verification proposal' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.auction_status = 'live' AND (
        TG_OP = 'INSERT'
        OR OLD.auction_status IS DISTINCT FROM 'live'
        OR NEW.current_bid IS DISTINCT FROM OLD.current_bid
        OR NEW.highest_bidder_id IS DISTINCT FROM OLD.highest_bidder_id
        OR NEW.bids_count IS DISTINCT FROM OLD.bids_count) THEN
    v_g := kayad_private_seller_gate(NEW.id, true);
    IF NOT (v_g->>'eligible')::boolean THEN
      RAISE EXCEPTION 'PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE' USING DETAIL = v_g->>'blockers', ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_cars_private_seller_backstop ON cars;
CREATE TRIGGER trg_cars_private_seller_backstop BEFORE INSERT OR UPDATE ON cars FOR EACH ROW EXECUTE FUNCTION kayad_cars_private_seller_backstop();

CREATE OR REPLACE FUNCTION kayad_auction_setups_private_seller_backstop() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_g jsonb;
BEGIN
  IF NEW.publication_status = 'published' AND (TG_OP = 'INSERT' OR OLD.publication_status IS DISTINCT FROM 'published') THEN
    v_g := kayad_private_seller_gate(NEW.car_id, true);
    IF NOT (v_g->>'eligible')::boolean THEN
      RAISE EXCEPTION 'PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE' USING DETAIL = v_g->>'blockers', ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auction_setups_private_seller_backstop ON auction_setups;
CREATE TRIGGER trg_auction_setups_private_seller_backstop BEFORE INSERT OR UPDATE ON auction_setups FOR EACH ROW EXECUTE FUNCTION kayad_auction_setups_private_seller_backstop();

-- ---------------------------------------------------------------------------------------------------------------------------
-- 7. Transition functions (the ONLY writers of proposal / custody state). Atomic update + audit event, idempotent by key.
-- ---------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_psap_event(p_p private_seller_auction_proposals, p_type text, p_actor uuid, p_role text, p_payload jsonb, p_idem text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO private_seller_auction_evidence_events(proposal_id, proposal_version, evidence_version, event_type, actor_user_id, actor_role, payload, idempotency_key)
  VALUES (p_p.id, p_p.proposal_version, p_p.evidence_version, p_type, p_actor, p_role, COALESCE(p_payload, '{}'::jsonb), p_idem)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION kayad_psap_event(private_seller_auction_proposals, text, uuid, text, jsonb, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION kayad_psap_create(p_car_id uuid, p_seller_user_id uuid, p_idem text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_car cars%ROWTYPE; v_owner users%ROWTYPE; v_p private_seller_auction_proposals%ROWTYPE; v_ver int;
BEGIN
  PERFORM set_config('kayad.psap_fn', 'on', true);
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'VEHICLE_NOT_FOUND'; END IF;
  IF v_car.dealer_id IS DISTINCT FROM p_seller_user_id THEN RAISE EXCEPTION 'NOT_VEHICLE_OWNER' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_owner FROM users WHERE id = p_seller_user_id;
  IF NOT FOUND OR v_owner.role IN ('dealer','broker') THEN RAISE EXCEPTION 'NOT_A_PRIVATE_SELLER'; END IF;
  IF COALESCE(v_owner.is_banned,false) OR v_owner.deactivated_at IS NOT NULL THEN RAISE EXCEPTION 'SELLER_SUSPENDED' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_p FROM private_seller_auction_proposals WHERE car_id = p_car_id AND proposal_status NOT IN ('rejected','withdrawn') ORDER BY proposal_version DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN RETURN jsonb_build_object('proposal_id', v_p.id, 'created', false, 'proposal_version', v_p.proposal_version); END IF;
  SELECT COALESCE(MAX(proposal_version), 0) + 1 INTO v_ver FROM private_seller_auction_proposals WHERE car_id = p_car_id;
  INSERT INTO private_seller_auction_proposals(car_id, seller_user_id, proposal_version) VALUES (p_car_id, p_seller_user_id, v_ver) RETURNING * INTO v_p;
  PERFORM kayad_psap_event(v_p, 'proposal_created', p_seller_user_id, 'seller', '{}'::jsonb, p_idem);
  RETURN jsonb_build_object('proposal_id', v_p.id, 'created', true, 'proposal_version', v_p.proposal_version);
END; $$;
REVOKE ALL ON FUNCTION kayad_psap_create(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_psap_create(uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION kayad_psap_apply_event(p_proposal_id uuid, p_event text, p_actor_user_id uuid, p_actor_role text, p_payload jsonb DEFAULT '{}'::jsonb, p_idem text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_p private_seller_auction_proposals%ROWTYPE;
  v_car cars%ROWTYPE;
  v_actor users%ROWTYPE;
  v_booking inspection_bookings%ROWTYPE;
  v_cap vehicle_custody_capabilities%ROWTYPE;
  v_ids uuid[];
  v_existing uuid;
  v_outcome text;
  v_reason text;
  v_loc uuid;
  v_vin text;
  v_reg text;
  v_report uuid;
  v_event uuid;
  v_decision text;
BEGIN
  PERFORM set_config('kayad.psap_fn', 'on', true);
  p_payload := COALESCE(p_payload, '{}'::jsonb);

  SELECT * INTO v_p FROM private_seller_auction_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROPOSAL_NOT_FOUND'; END IF;

  -- idempotent retry: same key => same outcome, no second transition, no second audit row
  IF p_idem IS NOT NULL THEN
    SELECT id INTO v_existing FROM private_seller_auction_evidence_events WHERE proposal_id = p_proposal_id AND idempotency_key = p_idem;
    IF FOUND THEN RETURN jsonb_build_object('proposal_id', v_p.id, 'idempotent', true, 'event_id', v_existing, 'proposal_status', v_p.proposal_status, 'verification_status', v_p.verification_status, 'custody_status', v_p.custody_status); END IF;
  END IF;

  SELECT * INTO v_car FROM cars WHERE id = v_p.car_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'VEHICLE_NOT_FOUND'; END IF;
  SELECT * INTO v_actor FROM users WHERE id = p_actor_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACTOR_NOT_FOUND' USING ERRCODE = '42501'; END IF;
  IF COALESCE(v_actor.is_banned,false) OR v_actor.deactivated_at IS NOT NULL THEN RAISE EXCEPTION 'ACTOR_SUSPENDED' USING ERRCODE = '42501'; END IF;

  -- actor-capacity verification: the claimed role is checked against the database, never trusted
  IF p_actor_role = 'seller' THEN
    IF p_actor_user_id IS DISTINCT FROM v_p.seller_user_id THEN RAISE EXCEPTION 'NOT_PROPOSAL_SELLER' USING ERRCODE = '42501'; END IF;
  ELSIF p_actor_role = 'admin' THEN
    IF v_actor.role NOT IN ('admin','superadmin') THEN RAISE EXCEPTION 'NOT_AN_ADMIN' USING ERRCODE = '42501'; END IF;
    IF p_actor_user_id = v_p.seller_user_id THEN RAISE EXCEPTION 'SELF_REVIEW_FORBIDDEN' USING ERRCODE = '42501'; END IF;
  ELSIF p_actor_role = 'provider' THEN
    v_ids := kayad_psap_provider_ids(p_actor_user_id);
    IF p_actor_user_id = v_p.seller_user_id THEN RAISE EXCEPTION 'SELF_REVIEW_FORBIDDEN' USING ERRCODE = '42501'; END IF;
  ELSE
    RAISE EXCEPTION 'UNKNOWN_ACTOR_ROLE' USING ERRCODE = '42501';
  END IF;

  IF v_p.proposal_status IN ('rejected','withdrawn') AND p_event NOT IN ('appeal_submitted','appeal_decision') THEN
    RAISE EXCEPTION 'PROPOSAL_CLOSED' USING ERRCODE = 'P0001';
  END IF;

  -- ===================================================================== transitions
  IF p_event = 'evidence_submitted' THEN
    IF p_actor_role <> 'seller' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_car.auction_status = 'live' THEN RAISE EXCEPTION 'AUCTION_LIVE_EVIDENCE_LOCKED' USING ERRCODE = 'P0001'; END IF;
    IF jsonb_typeof(p_payload->'documents') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'documents') = 0 THEN RAISE EXCEPTION 'EVIDENCE_REQUIRED'; END IF;
    -- A new evidence version invalidates any approval tied to the previous version (gate compares versions) and returns the case to review.
    UPDATE private_seller_auction_proposals
       SET evidence_version = evidence_version + 1,
           proposal_status = CASE WHEN proposal_status IN ('approved','under_review','submitted') THEN 'submitted' ELSE proposal_status END
     WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'proposal_submitted' THEN
    IF p_actor_role <> 'seller' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_p.proposal_status NOT IN ('draft','changes_requested') THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
    IF NOT EXISTS (SELECT 1 FROM private_seller_auction_evidence_events e WHERE e.proposal_id = v_p.id AND e.event_type = 'evidence_submitted') THEN RAISE EXCEPTION 'EVIDENCE_REQUIRED'; END IF;
    UPDATE private_seller_auction_proposals
       SET proposal_status = 'submitted',
           verification_status = CASE WHEN verification_status = 'not_started' THEN 'awaiting_payment' ELSE verification_status END
     WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'proposal_withdrawn' THEN
    IF p_actor_role <> 'seller' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_car.auction_status = 'live' THEN RAISE EXCEPTION 'AUCTION_LIVE_WITHDRAWAL_REQUIRES_ADMIN' USING ERRCODE = 'P0001'; END IF;
    IF v_p.custody_status IN ('in_custody','received','release_authorized') THEN RAISE EXCEPTION 'CUSTODY_ACTIVE_RELEASE_REQUIRED' USING ERRCODE = 'P0001'; END IF;
    UPDATE private_seller_auction_proposals SET proposal_status = 'withdrawn' WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'inspection_assigned' THEN
    -- Links a booking ONLY after the canonical payment record is fully paid. A browser redirect or client payload cannot satisfy this.
    IF p_actor_role NOT IN ('seller','admin') THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_p.proposal_status NOT IN ('submitted','under_review','changes_requested') OR v_p.verification_status NOT IN ('awaiting_payment','failed','inconclusive','expired') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001';
    END IF;
    SELECT * INTO v_booking FROM inspection_bookings WHERE id = NULLIF(p_payload->>'booking_id','')::uuid FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
    IF v_booking.payment_status IS DISTINCT FROM 'fully_paid' OR v_booking.paid_at IS NULL THEN RAISE EXCEPTION 'PAYMENT_NOT_CONFIRMED' USING ERRCODE = 'P0001'; END IF;
    IF v_booking.vehicle_id IS DISTINCT FROM v_p.car_id THEN RAISE EXCEPTION 'BOOKING_VEHICLE_MISMATCH' USING ERRCODE = 'P0001'; END IF;
    IF v_booking.customer_id IS DISTINCT FROM v_p.seller_user_id THEN RAISE EXCEPTION 'BOOKING_NOT_PAID_BY_SELLER' USING ERRCODE = 'P0001'; END IF;
    IF v_booking.status IN ('cancelled','refunded') THEN RAISE EXCEPTION 'BOOKING_CANCELLED' USING ERRCODE = 'P0001'; END IF;
    IF v_p.inspection_booking_id IS NOT NULL AND v_p.inspection_booking_id = v_booking.id THEN RAISE EXCEPTION 'BOOKING_ALREADY_LINKED' USING ERRCODE = 'P0001'; END IF;
    IF EXISTS (SELECT 1 FROM private_seller_auction_proposals x WHERE x.inspection_booking_id = v_booking.id AND x.id <> v_p.id) THEN RAISE EXCEPTION 'BOOKING_ALREADY_USED' USING ERRCODE = 'P0001'; END IF;
    -- A booking is single-use: one that already produced a report, or was linked to this proposal before, is consumed. Re-linking a failed
    -- inspection's booking would bypass the required reinspection.
    IF EXISTS (SELECT 1 FROM inspection_reports r WHERE r.booking_id = v_booking.id)
       OR EXISTS (SELECT 1 FROM private_seller_auction_evidence_events e WHERE e.proposal_id = v_p.id AND e.event_type = 'payment_confirmed' AND e.payload->>'booking_id' = v_booking.id::text) THEN
      RAISE EXCEPTION 'BOOKING_ALREADY_USED' USING ERRCODE = 'P0001';
    END IF;
    UPDATE private_seller_auction_proposals
       SET inspection_booking_id = v_booking.id, inspection_provider_id = v_booking.provider_id,
           inspection_payment_confirmed_at = v_booking.paid_at,
           verification_status = 'assigned', inspection_report_id = NULL, inspection_passed_at = NULL, inspection_valid_until = NULL,
           evidence_version = evidence_version + CASE WHEN v_p.verification_status IN ('failed','inconclusive','expired') THEN 1 ELSE 0 END,
           proposal_status = CASE WHEN proposal_status = 'changes_requested' THEN 'submitted' ELSE proposal_status END
     WHERE id = v_p.id RETURNING * INTO v_p;
    PERFORM kayad_psap_event(v_p, 'payment_confirmed', p_actor_user_id, p_actor_role, jsonb_build_object('booking_id', v_booking.id, 'paid_at', v_booking.paid_at), NULL);

  ELSIF p_event = 'inspection_result' THEN
    IF p_actor_role <> 'provider' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_p.inspection_provider_id IS NULL OR NOT (v_p.inspection_provider_id = ANY (v_ids)) THEN RAISE EXCEPTION 'NOT_ASSIGNED_INSPECTION_PROVIDER' USING ERRCODE = '42501'; END IF;
    IF v_p.verification_status NOT IN ('assigned','in_progress') THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
    v_outcome := p_payload->>'outcome';
    IF v_outcome NOT IN ('passed','failed','inconclusive') THEN RAISE EXCEPTION 'INVALID_OUTCOME'; END IF;
    v_report := NULLIF(p_payload->>'report_id','')::uuid;
    IF v_report IS NULL OR NOT EXISTS (SELECT 1 FROM inspection_reports r WHERE r.id = v_report AND r.booking_id = v_p.inspection_booking_id) THEN RAISE EXCEPTION 'REPORT_BOOKING_MISMATCH' USING ERRCODE = 'P0001'; END IF;
    UPDATE private_seller_auction_proposals
       SET verification_status = v_outcome, inspection_report_id = v_report,
           inspection_passed_at = CASE WHEN v_outcome = 'passed' THEN now() ELSE NULL END,
           inspection_valid_until = CASE WHEN v_outcome = 'passed' THEN NULLIF(p_payload->>'valid_until','')::timestamptz ELSE NULL END,
           proposal_status = CASE WHEN v_outcome = 'passed' THEN 'under_review' ELSE 'changes_requested' END
     WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'reinspection_requested' THEN
    IF p_actor_role <> 'seller' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_p.verification_status NOT IN ('failed','inconclusive','expired') THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
    IF v_p.appeal_status IN ('submitted','under_review') THEN RAISE EXCEPTION 'APPEAL_PENDING' USING ERRCODE = 'P0001'; END IF;
    UPDATE private_seller_auction_proposals
       SET verification_status = 'awaiting_payment', inspection_booking_id = NULL, inspection_report_id = NULL, inspection_passed_at = NULL,
           inspection_valid_until = NULL, inspection_payment_confirmed_at = NULL, evidence_version = evidence_version + 1,
           proposal_status = 'submitted'
     WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'authority_verified' THEN
    IF p_actor_role <> 'admin' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    UPDATE private_seller_auction_proposals SET authority_verified_at = now(), authority_verified_by = p_actor_user_id WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'custody_assigned' THEN
    IF p_actor_role <> 'admin' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_p.proposal_status NOT IN ('submitted','under_review','changes_requested','approved') OR v_p.custody_status NOT IN ('awaiting_partner','handover_scheduled','refused') THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
    v_loc := NULLIF(p_payload->>'location_id','')::uuid;
    SELECT * INTO v_cap FROM vehicle_custody_capabilities WHERE provider_id = NULLIF(p_payload->>'partner_id','')::uuid FOR SHARE;
    IF NOT FOUND OR v_cap.capability_status <> 'active' THEN RAISE EXCEPTION 'PARTNER_LACKS_ACTIVE_CUSTODY_CAPABILITY' USING ERRCODE = 'P0001'; END IF;
    IF v_loc IS NULL OR NOT (v_cap.approved_premises @> to_jsonb(v_loc::text)) THEN RAISE EXCEPTION 'LOCATION_NOT_APPROVED_PREMISES' USING ERRCODE = 'P0001'; END IF;
    IF NOT kayad_psap_partner_in_good_standing(v_cap.provider_id, v_cap.provider_kind) THEN RAISE EXCEPTION 'PARTNER_NOT_IN_GOOD_STANDING' USING ERRCODE = 'P0001'; END IF;
    IF v_cap.provider_id = v_p.seller_user_id THEN RAISE EXCEPTION 'SELLER_CANNOT_BE_CUSTODIAN' USING ERRCODE = '42501'; END IF;
    UPDATE private_seller_auction_proposals
       SET assigned_provider_id = v_cap.provider_id, custody_location_id = v_loc, custody_status = 'handover_scheduled',
           custody_received_at = NULL, custody_received_by = NULL, custody_vin_confirmed = false, custody_intake_evidence = '{}'::jsonb
     WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'custody_received' THEN
    IF p_actor_role <> 'provider' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_p.assigned_provider_id IS NULL OR NOT (v_p.assigned_provider_id = ANY (v_ids)) THEN RAISE EXCEPTION 'NOT_ASSIGNED_CUSTODY_PARTNER' USING ERRCODE = '42501'; END IF;
    IF v_p.custody_status <> 'handover_scheduled' THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
    SELECT * INTO v_cap FROM vehicle_custody_capabilities WHERE provider_id = v_p.assigned_provider_id FOR SHARE;
    IF NOT FOUND OR v_cap.capability_status <> 'active' THEN RAISE EXCEPTION 'PARTNER_LACKS_ACTIVE_CUSTODY_CAPABILITY' USING ERRCODE = 'P0001'; END IF;
    v_loc := NULLIF(p_payload->>'location_id','')::uuid;
    IF v_loc IS DISTINCT FROM v_p.custody_location_id OR NOT (v_cap.approved_premises @> to_jsonb(v_loc::text)) THEN RAISE EXCEPTION 'LOCATION_NOT_APPROVED_PREMISES' USING ERRCODE = 'P0001'; END IF;
    IF jsonb_typeof(p_payload->'condition_evidence') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'condition_evidence') = 0 THEN RAISE EXCEPTION 'CONDITION_EVIDENCE_REQUIRED'; END IF;
    v_vin := upper(btrim(COALESCE(p_payload->>'vin','')));
    v_reg := upper(regexp_replace(COALESCE(p_payload->>'registration',''), '\s+', '', 'g'));
    IF v_vin = '' OR v_reg = '' THEN RAISE EXCEPTION 'VIN_AND_REGISTRATION_REQUIRED'; END IF;
    IF v_car.vin IS NULL OR upper(btrim(v_car.vin)) <> v_vin
       OR v_car.registration_number IS NULL OR upper(regexp_replace(v_car.registration_number, '\s+', '', 'g')) <> v_reg THEN
      -- discrepancy: the vehicle presented is not the vehicle on record. Never accepted; recorded as an incident and held.
      UPDATE private_seller_auction_proposals
         SET custody_status = 'incident_hold', custody_status_before_hold = v_p.custody_status, custody_hold_reason = 'VIN/registration discrepancy at intake'
       WHERE id = v_p.id RETURNING * INTO v_p;
      v_event := kayad_psap_event(v_p, 'custody_incident', p_actor_user_id, p_actor_role,
                   jsonb_build_object('reason', 'VIN/registration discrepancy at intake', 'location_id', v_loc), p_idem);
      RETURN jsonb_build_object('proposal_id', v_p.id, 'accepted', false, 'outcome', 'discrepancy_hold', 'event_id', v_event, 'custody_status', v_p.custody_status);
    END IF;
    UPDATE private_seller_auction_proposals
       SET custody_status = 'in_custody', custody_received_at = now(), custody_received_by = p_actor_user_id, custody_vin_confirmed = true,
           custody_intake_evidence = jsonb_build_object('vin_confirmed', true, 'registration_confirmed', true, 'location_id', v_loc,
                                                        'condition_evidence', p_payload->'condition_evidence', 'notes', p_payload->>'notes')
     WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'custody_refused' THEN
    IF p_actor_role <> 'provider' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_p.assigned_provider_id IS NULL OR NOT (v_p.assigned_provider_id = ANY (v_ids)) THEN RAISE EXCEPTION 'NOT_ASSIGNED_CUSTODY_PARTNER' USING ERRCODE = '42501'; END IF;
    IF v_p.custody_status NOT IN ('handover_scheduled','received') THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
    v_reason := NULLIF(btrim(COALESCE(p_payload->>'reason','')), '');
    IF v_reason IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
    UPDATE private_seller_auction_proposals SET custody_status = 'refused', custody_hold_reason = v_reason WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'custody_incident' THEN
    IF p_actor_role = 'provider' THEN
      IF v_p.assigned_provider_id IS NULL OR NOT (v_p.assigned_provider_id = ANY (v_ids)) THEN RAISE EXCEPTION 'NOT_ASSIGNED_CUSTODY_PARTNER' USING ERRCODE = '42501'; END IF;
    ELSIF p_actor_role <> 'admin' THEN
      RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501';
    END IF;
    IF v_p.custody_status IN ('released','incident_hold') THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
    v_reason := NULLIF(btrim(COALESCE(p_payload->>'reason','')), '');
    IF v_reason IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
    UPDATE private_seller_auction_proposals SET custody_status = 'incident_hold', custody_status_before_hold = v_p.custody_status, custody_hold_reason = v_reason WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'custody_hold_released' THEN
    IF p_actor_role <> 'admin' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_p.custody_status <> 'incident_hold' THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
    v_reason := NULLIF(btrim(COALESCE(p_payload->>'reason','')), '');
    IF v_reason IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
    -- lifting a hold never restores an approval: the case returns to review
    UPDATE private_seller_auction_proposals
       SET custody_status = CASE WHEN custody_status_before_hold = 'in_custody' THEN 'in_custody' ELSE 'handover_scheduled' END,
           custody_hold_reason = NULL, proposal_status = CASE WHEN proposal_status = 'approved' THEN 'under_review' ELSE proposal_status END,
           evidence_version = evidence_version + 1
     WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'admin_decision' THEN
    IF p_actor_role <> 'admin' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    v_decision := p_payload->>'decision';
    IF v_decision NOT IN ('approve','reject','request_changes') THEN RAISE EXCEPTION 'INVALID_DECISION'; END IF;
    IF v_p.proposal_status NOT IN ('submitted','under_review') THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
    v_reason := NULLIF(btrim(COALESCE(p_payload->>'reason','')), '');
    IF v_decision <> 'approve' AND v_reason IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
    IF v_decision = 'approve' THEN
      IF v_p.verification_status <> 'passed' THEN RAISE EXCEPTION 'VERIFICATION_NOT_PASSED' USING ERRCODE = 'P0001'; END IF;
      IF v_p.custody_status <> 'in_custody' THEN RAISE EXCEPTION 'CUSTODY_NOT_CONFIRMED' USING ERRCODE = 'P0001'; END IF;
      IF v_p.authority_verified_at IS NULL THEN RAISE EXCEPTION 'SELLER_AUTHORITY_NOT_VERIFIED' USING ERRCODE = 'P0001'; END IF;
      IF v_p.appeal_status IN ('submitted','under_review') THEN RAISE EXCEPTION 'APPEAL_PENDING' USING ERRCODE = 'P0001'; END IF;
      UPDATE private_seller_auction_proposals
         SET proposal_status = 'approved', admin_decision_by = p_actor_user_id, admin_decision_at = now(), admin_decision_reason = v_reason,
             approved_proposal_version = proposal_version, approved_evidence_version = evidence_version
       WHERE id = v_p.id RETURNING * INTO v_p;
    ELSE
      UPDATE private_seller_auction_proposals
         SET proposal_status = CASE WHEN v_decision = 'reject' THEN 'rejected' ELSE 'changes_requested' END,
             admin_decision_by = p_actor_user_id, admin_decision_at = now(), admin_decision_reason = v_reason,
             approved_proposal_version = NULL, approved_evidence_version = NULL
       WHERE id = v_p.id RETURNING * INTO v_p;
    END IF;

  ELSIF p_event = 'appeal_submitted' THEN
    IF p_actor_role <> 'seller' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF NOT (v_p.proposal_status = 'rejected' OR v_p.verification_status IN ('failed','inconclusive')) THEN RAISE EXCEPTION 'NOTHING_TO_APPEAL' USING ERRCODE = 'P0001'; END IF;
    IF v_p.appeal_status IN ('submitted','under_review') THEN RAISE EXCEPTION 'APPEAL_PENDING' USING ERRCODE = 'P0001'; END IF;
    UPDATE private_seller_auction_proposals SET appeal_status = 'submitted' WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'appeal_decision' THEN
    IF p_actor_role <> 'admin' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_p.appeal_status NOT IN ('submitted','under_review') THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
    v_decision := p_payload->>'decision';
    IF v_decision NOT IN ('upheld','overturned') THEN RAISE EXCEPTION 'INVALID_DECISION'; END IF;
    IF NULLIF(btrim(COALESCE(p_payload->>'reason','')), '') IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
    -- Overturning an appeal NEVER restores eligibility: it re-opens the case for a (fee-treatment TBD by the owner) reinspection + re-review.
    UPDATE private_seller_auction_proposals
       SET appeal_status = v_decision,
           proposal_status = CASE WHEN v_decision = 'overturned' THEN 'changes_requested' ELSE proposal_status END
     WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'release_authorized' THEN
    IF p_actor_role <> 'admin' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_p.custody_status NOT IN ('in_custody','incident_hold','received') THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
    IF v_car.auction_status = 'live' THEN RAISE EXCEPTION 'AUCTION_LIVE_RELEASE_FORBIDDEN' USING ERRCODE = 'P0001'; END IF;
    IF NULLIF(btrim(COALESCE(p_payload->>'reason','')), '') IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
    UPDATE private_seller_auction_proposals SET custody_status = 'release_authorized' WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'vehicle_released' THEN
    IF p_actor_role <> 'provider' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_p.assigned_provider_id IS NULL OR NOT (v_p.assigned_provider_id = ANY (v_ids)) THEN RAISE EXCEPTION 'NOT_ASSIGNED_CUSTODY_PARTNER' USING ERRCODE = '42501'; END IF;
    IF v_p.custody_status <> 'release_authorized' THEN RAISE EXCEPTION 'RELEASE_NOT_AUTHORIZED' USING ERRCODE = 'P0001'; END IF;
    IF NULLIF(btrim(COALESCE(p_payload->>'released_to','')), '') IS NULL THEN RAISE EXCEPTION 'RELEASE_RECIPIENT_REQUIRED'; END IF;
    UPDATE private_seller_auction_proposals SET custody_status = 'released', custody_released_at = now(), custody_released_by = p_actor_user_id WHERE id = v_p.id RETURNING * INTO v_p;

  ELSIF p_event = 'inspection_expired' THEN
    IF p_actor_role <> 'admin' THEN RAISE EXCEPTION 'FORBIDDEN_EVENT_FOR_ROLE' USING ERRCODE = '42501'; END IF;
    IF v_p.verification_status <> 'passed' THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
    UPDATE private_seller_auction_proposals SET verification_status = 'expired', proposal_status = CASE WHEN proposal_status = 'approved' THEN 'under_review' ELSE proposal_status END WHERE id = v_p.id RETURNING * INTO v_p;

  ELSE
    RAISE EXCEPTION 'UNKNOWN_EVENT %', p_event;
  END IF;

  v_event := kayad_psap_event(v_p, p_event, p_actor_user_id, p_actor_role, p_payload, p_idem);
  RETURN jsonb_build_object('proposal_id', v_p.id, 'event_id', v_event, 'accepted', true, 'proposal_status', v_p.proposal_status, 'verification_status', v_p.verification_status,
    'custody_status', v_p.custody_status, 'appeal_status', v_p.appeal_status, 'proposal_version', v_p.proposal_version, 'evidence_version', v_p.evidence_version);
END; $$;
REVOKE ALL ON FUNCTION kayad_psap_apply_event(uuid, text, uuid, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_psap_apply_event(uuid, text, uuid, text, jsonb, text) TO service_role;

-- custody capability lifecycle -------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_vcc_apply(p_provider_id uuid, p_provider_kind text, p_action text, p_actor_user_id uuid, p_actor_role text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cap vehicle_custody_capabilities%ROWTYPE;
  v_actor users%ROWTYPE;
  v_event text;
  v_ins timestamptz;
  v_prem jsonb;
BEGIN
  PERFORM set_config('kayad.psap_fn', 'on', true);
  p_payload := COALESCE(p_payload, '{}'::jsonb);
  SELECT * INTO v_actor FROM users WHERE id = p_actor_user_id;
  IF NOT FOUND OR COALESCE(v_actor.is_banned,false) OR v_actor.deactivated_at IS NOT NULL THEN RAISE EXCEPTION 'ACTOR_INVALID' USING ERRCODE = '42501'; END IF;
  IF p_provider_kind NOT IN ('garage','dealer') THEN RAISE EXCEPTION 'INVALID_PROVIDER_KIND'; END IF;

  SELECT * INTO v_cap FROM vehicle_custody_capabilities WHERE provider_id = p_provider_id FOR UPDATE;

  IF p_action = 'request' THEN
    -- the provider applies for itself; a request can never create an active capability
    IF p_actor_role <> 'provider' OR NOT (p_provider_id = ANY (kayad_psap_provider_ids(p_actor_user_id))) THEN RAISE EXCEPTION 'NOT_PROVIDER_REPRESENTATIVE' USING ERRCODE = '42501'; END IF;
    IF NOT kayad_psap_partner_in_good_standing(p_provider_id, p_provider_kind) THEN RAISE EXCEPTION 'PROVIDER_NOT_IN_GOOD_STANDING' USING ERRCODE = 'P0001'; END IF;
    IF FOUND THEN
      IF v_cap.capability_status IN ('active','pending') THEN RETURN jsonb_build_object('capability_id', v_cap.id, 'capability_status', v_cap.capability_status, 'created', false); END IF;
      IF v_cap.capability_status = 'revoked' THEN RAISE EXCEPTION 'CAPABILITY_REVOKED_ADMIN_REVIEW_REQUIRED' USING ERRCODE = 'P0001'; END IF;
      RAISE EXCEPTION 'CAPABILITY_SUSPENDED_ADMIN_REVIEW_REQUIRED' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO vehicle_custody_capabilities(provider_id, provider_kind, capability_status, requested_by) VALUES (p_provider_id, p_provider_kind, 'pending', p_actor_user_id) RETURNING * INTO v_cap;
    v_event := 'requested';
  ELSE
    IF p_actor_role <> 'admin' OR v_actor.role NOT IN ('admin','superadmin') THEN RAISE EXCEPTION 'NOT_AN_ADMIN' USING ERRCODE = '42501'; END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'CAPABILITY_NOT_FOUND'; END IF;
    IF p_actor_user_id = p_provider_id OR p_actor_user_id = ANY (SELECT user_id FROM inspection_providers WHERE id = p_provider_id) THEN RAISE EXCEPTION 'SELF_APPROVAL_FORBIDDEN' USING ERRCODE = '42501'; END IF;
    IF p_action = 'approve' THEN
      IF v_cap.capability_status NOT IN ('pending','suspended') THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
      v_prem := p_payload->'approved_premises';
      IF jsonb_typeof(v_prem) IS DISTINCT FROM 'array' OR jsonb_array_length(v_prem) = 0 THEN RAISE EXCEPTION 'APPROVED_PREMISES_REQUIRED'; END IF;
      IF NULLIF(btrim(COALESCE(p_payload->>'agreement_version','')), '') IS NULL THEN RAISE EXCEPTION 'AGREEMENT_VERSION_REQUIRED'; END IF;
      v_ins := NULLIF(p_payload->>'insurance_expires_at','')::timestamptz;
      IF v_ins IS NULL OR v_ins <= now() THEN RAISE EXCEPTION 'CURRENT_INSURANCE_REQUIRED'; END IF;
      IF NOT kayad_psap_partner_in_good_standing(p_provider_id, v_cap.provider_kind) THEN RAISE EXCEPTION 'PROVIDER_NOT_IN_GOOD_STANDING' USING ERRCODE = 'P0001'; END IF;
      UPDATE vehicle_custody_capabilities SET capability_status = 'active', approved_by = p_actor_user_id, approved_at = now(), approved_premises = v_prem,
             agreement_version = p_payload->>'agreement_version', insurance_expires_at = v_ins, status_reason = NULL WHERE id = v_cap.id RETURNING * INTO v_cap;
      v_event := CASE WHEN p_payload->>'reinstate' = 'true' THEN 'reinstated' ELSE 'approved' END;
    ELSIF p_action IN ('suspend','revoke') THEN
      IF v_cap.capability_status IN ('revoked') OR (p_action = 'suspend' AND v_cap.capability_status = 'suspended') THEN RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = 'P0001'; END IF;
      IF NULLIF(btrim(COALESCE(p_payload->>'reason','')), '') IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
      UPDATE vehicle_custody_capabilities SET capability_status = CASE WHEN p_action = 'suspend' THEN 'suspended' ELSE 'revoked' END, status_reason = p_payload->>'reason' WHERE id = v_cap.id RETURNING * INTO v_cap;
      v_event := CASE WHEN p_action = 'suspend' THEN 'suspended' ELSE 'revoked' END;
    ELSE
      RAISE EXCEPTION 'UNKNOWN_ACTION %', p_action;
    END IF;
  END IF;

  INSERT INTO vehicle_custody_capability_events(capability_id, event_type, actor_user_id, actor_role, payload) VALUES (v_cap.id, v_event, p_actor_user_id, p_actor_role, p_payload);
  RETURN jsonb_build_object('capability_id', v_cap.id, 'capability_status', v_cap.capability_status, 'event', v_event, 'created', v_event = 'requested');
END; $$;
REVOKE ALL ON FUNCTION kayad_vcc_apply(uuid, text, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_vcc_apply(uuid, text, text, uuid, text, jsonb) TO service_role;

-- ---------------------------------------------------------------------------------------------------------------------------
-- 8. RLS: least privilege. All writes go through the service-role-only functions above.
--    Sellers read their own proposals/events; providers read ONLY proposals assigned to them (inspection or custody) and their own
--    capability row; nobody but service_role writes. Admin access is via the backend (service role) with permission checks.
-- ---------------------------------------------------------------------------------------------------------------------------
ALTER TABLE private_seller_auction_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_seller_auction_evidence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_custody_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_custody_capability_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON private_seller_auction_proposals FROM PUBLIC, anon, authenticated;
REVOKE ALL ON private_seller_auction_evidence_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON vehicle_custody_capabilities FROM PUBLIC, anon, authenticated;
REVOKE ALL ON vehicle_custody_capability_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON private_seller_auction_proposals TO service_role;
GRANT ALL ON private_seller_auction_evidence_events TO service_role;
GRANT ALL ON vehicle_custody_capabilities TO service_role;
GRANT ALL ON vehicle_custody_capability_events TO service_role;
GRANT SELECT ON private_seller_auction_proposals TO authenticated;
GRANT SELECT ON private_seller_auction_evidence_events TO authenticated;
GRANT SELECT ON vehicle_custody_capabilities TO authenticated;

DROP POLICY IF EXISTS psap_seller_select ON private_seller_auction_proposals;
CREATE POLICY psap_seller_select ON private_seller_auction_proposals FOR SELECT TO authenticated USING (seller_user_id = auth.uid());
DROP POLICY IF EXISTS psap_provider_select ON private_seller_auction_proposals;
CREATE POLICY psap_provider_select ON private_seller_auction_proposals FOR SELECT TO authenticated
  USING (assigned_provider_id = ANY (kayad_psap_provider_ids(auth.uid())) OR inspection_provider_id = ANY (kayad_psap_provider_ids(auth.uid())));
DROP POLICY IF EXISTS psap_events_seller_select ON private_seller_auction_evidence_events;
CREATE POLICY psap_events_seller_select ON private_seller_auction_evidence_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM private_seller_auction_proposals p WHERE p.id = proposal_id AND p.seller_user_id = auth.uid()));
DROP POLICY IF EXISTS psap_events_provider_select ON private_seller_auction_evidence_events;
CREATE POLICY psap_events_provider_select ON private_seller_auction_evidence_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM private_seller_auction_proposals p WHERE p.id = proposal_id
                  AND (p.assigned_provider_id = ANY (kayad_psap_provider_ids(auth.uid())) OR p.inspection_provider_id = ANY (kayad_psap_provider_ids(auth.uid())))));
DROP POLICY IF EXISTS vcc_provider_select ON vehicle_custody_capabilities;
CREATE POLICY vcc_provider_select ON vehicle_custody_capabilities FOR SELECT TO authenticated USING (provider_id = ANY (kayad_psap_provider_ids(auth.uid())));

GRANT EXECUTE ON FUNCTION kayad_psap_provider_ids(uuid) TO authenticated;

COMMENT ON FUNCTION kayad_private_seller_gate(uuid, boolean) IS 'Stage 5F.10 single eligibility definition for private-seller auctions; called inside every start/bid mutation. Fail-closed.';
COMMENT ON FUNCTION kayad_psap_apply_event(uuid, text, uuid, text, jsonb, text) IS 'Only writer of proposal state; verifies actor capacity in the database; idempotent by key; appends the audit event atomically.';
