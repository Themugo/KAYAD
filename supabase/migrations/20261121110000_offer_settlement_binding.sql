-- 20261121110000_offer_settlement_binding.sql  (LOCAL-ONLY / UNRELEASED: never applied to hosted; amended in place 2026-11-21 per decisions 1-7)
-- GAP-OFFER-TXN (P2, 2026-11-21): bind an ACCEPTED offer to the purchase payment and escrow.
-- Design: docs/handover/NEXT-PHASE-20261121/P2-ACCEPTED-OFFER-TO-PAYMENT-DESIGN.md
-- Additive and forward-only. Adds two tables, three functions, three triggers and re-declares kayad_offer_action
-- (identical to 20261121090000 except the accept branch opens a settlement).
-- Agreed amounts are whole Kenyan shillings because payments.amount is bigint and M-Pesa takes whole shillings.
-- ROLLBACK (in order): DROP TRIGGER trg_offer_settlement_payment_guard ON public.payments; DROP TRIGGER trg_offer_settlement_payment_status ON public.payments;
--   DROP TRIGGER trg_offer_settlement_outcome ON public.purchase_outcomes; re-apply the kayad_offer_action definition from 20261121090000;
--   DROP FUNCTION public.kayad_offer_settlement_open(public.marketplace_offers,uuid), public.kayad_offer_settlement_begin_payment(uuid,uuid),
--   public.kayad_offer_settlement_cancel(uuid,uuid,text), trigger functions; DROP TABLE public.marketplace_offer_settlement_events, public.marketplace_offer_settlements.
--   Dropping loses settlement history; take a backup of both tables first.

CREATE TABLE IF NOT EXISTS public.marketplace_offer_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL UNIQUE REFERENCES public.marketplace_offers(id) ON DELETE RESTRICT,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  agreed_amount BIGINT NOT NULL CHECK (agreed_amount > 0),
  currency TEXT NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
  status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN ('awaiting_payment','paid','cancelled','lapsed')),
  payment_id UUID REFERENCES public.payments(id) ON DELETE RESTRICT,
  escrow_id UUID REFERENCES public.escrows(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (buyer_id <> seller_id)
);
-- One active settlement per vehicle: this is what makes concurrent/competing acceptances safe.
CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_settlement_active_vehicle ON public.marketplace_offer_settlements(vehicle_id) WHERE status IN ('awaiting_payment','paid');
CREATE INDEX IF NOT EXISTS idx_offer_settlements_buyer ON public.marketplace_offer_settlements(buyer_id, status);

CREATE TABLE IF NOT EXISTS public.marketplace_offer_settlement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.marketplace_offer_settlements(id) ON DELETE RESTRICT,
  offer_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','payment_started','payment_failed','paid','cancelled','lapsed','refund_required')),
  actor_id UUID,
  from_status TEXT,
  to_status TEXT,
  amount BIGINT,
  payment_id UUID,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  actor_role TEXT CHECK (actor_role IN ('buyer','seller','system','other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offer_settlement_events_settlement ON public.marketplace_offer_settlement_events(settlement_id, created_at);

ALTER TABLE public.marketplace_offer_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_offer_settlement_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketplace_offer_settlements, public.marketplace_offer_settlement_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_offer_settlements TO service_role;
GRANT SELECT, INSERT ON public.marketplace_offer_settlement_events TO service_role;

-- Key fields are immutable; the event log is append-only.
CREATE OR REPLACE FUNCTION public.kayad_offer_settlement_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'marketplace_offer_settlement_events' THEN RAISE EXCEPTION 'Settlement events are append-only' USING ERRCODE='42501'; END IF;
  IF NEW.offer_id IS DISTINCT FROM OLD.offer_id OR NEW.lead_id IS DISTINCT FROM OLD.lead_id OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id OR NEW.agreed_amount IS DISTINCT FROM OLD.agreed_amount THEN
    RAISE EXCEPTION 'Agreed price and parties of a settlement are immutable' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_offer_settlement_immutable ON public.marketplace_offer_settlements;
CREATE TRIGGER trg_offer_settlement_immutable BEFORE UPDATE ON public.marketplace_offer_settlements FOR EACH ROW EXECUTE FUNCTION public.kayad_offer_settlement_immutable();
DROP TRIGGER IF EXISTS trg_offer_settlement_events_append_only ON public.marketplace_offer_settlement_events;
CREATE TRIGGER trg_offer_settlement_events_append_only BEFORE UPDATE OR DELETE ON public.marketplace_offer_settlement_events FOR EACH ROW EXECUTE FUNCTION public.kayad_offer_settlement_immutable();

CREATE OR REPLACE FUNCTION public.kayad_offer_settlement_log(p_s public.marketplace_offer_settlements, p_type TEXT, p_actor UUID, p_from TEXT, p_detail JSONB DEFAULT '{}'::jsonb, p_reason TEXT DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.marketplace_offer_settlement_events(settlement_id,offer_id,event_type,actor_id,actor_role,from_status,to_status,amount,payment_id,detail,reason)
  VALUES (p_s.id,p_s.offer_id,p_type,p_actor,
    CASE WHEN p_actor IS NULL THEN 'system' WHEN p_actor=p_s.buyer_id THEN 'buyer' WHEN p_actor=p_s.seller_id THEN 'seller' ELSE 'other' END,
    p_from,p_s.status,p_s.agreed_amount,p_s.payment_id,COALESCE(p_detail,'{}'::jsonb),p_reason);
$$;

-- Lapse windows that ended with no payment in flight (called lazily before every decision on a vehicle).
CREATE OR REPLACE FUNCTION public.kayad_offer_settlement_sweep(p_vehicle UUID) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.marketplace_offer_settlements%ROWTYPE;
BEGIN
  FOR r IN SELECT * FROM public.marketplace_offer_settlements WHERE vehicle_id=p_vehicle AND status='awaiting_payment' AND expires_at <= now()
           AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.car_id=p_vehicle AND p.type='purchase' AND p.status='pending') FOR UPDATE LOOP
    UPDATE public.marketplace_offer_settlements SET status='lapsed',cancel_reason='Payment window elapsed',updated_at=now() WHERE id=r.id RETURNING * INTO r;
    PERFORM public.kayad_offer_settlement_log(r,'lapsed',NULL,'awaiting_payment','{}'::jsonb,'Payment window elapsed');
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.kayad_offer_settlement_open(p_offer public.marketplace_offers, p_actor UUID)
RETURNS public.marketplace_offer_settlements LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_car public.cars%ROWTYPE; v_row public.marketplace_offer_settlements%ROWTYPE;
BEGIN
  IF p_offer.vehicle_id IS NULL THEN RAISE EXCEPTION 'An offer without a vehicle cannot be accepted for purchase' USING ERRCODE='23514'; END IF;
  IF p_offer.amount <> trunc(p_offer.amount) THEN RAISE EXCEPTION 'An accepted price must be a whole number of shillings' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_car FROM public.cars WHERE id=p_offer.vehicle_id FOR UPDATE;
  IF NOT FOUND OR v_car.deleted_at IS NOT NULL OR COALESCE(v_car.sold,false) OR COALESCE(v_car.status,'') NOT IN ('available','reserved') THEN
    RAISE EXCEPTION 'Vehicle is not available for purchase' USING ERRCODE='23514'; END IF;
  IF v_car.dealer_id IS DISTINCT FROM p_offer.seller_id THEN RAISE EXCEPTION 'Offer seller does not own the vehicle' USING ERRCODE='23514'; END IF;
  PERFORM public.kayad_offer_settlement_sweep(p_offer.vehicle_id);
  BEGIN
    INSERT INTO public.marketplace_offer_settlements(offer_id,lead_id,vehicle_id,buyer_id,seller_id,agreed_amount,expires_at)
    VALUES (p_offer.id,p_offer.lead_id,p_offer.vehicle_id,p_offer.buyer_id,p_offer.seller_id,p_offer.amount::bigint,now()+interval '48 hours') RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'This vehicle already has an accepted offer awaiting payment' USING ERRCODE='23505';
  END;
  PERFORM public.kayad_offer_settlement_log(v_row,'created',p_actor,NULL,jsonb_build_object('lead_id',p_offer.lead_id),'Offer accepted');
  RETURN v_row;
END; $$;

-- Server-side retrieval of the agreed amount for payment initiation. Business refusals are RETURNED (not raised) so a lapse persists.
CREATE OR REPLACE FUNCTION public.kayad_offer_settlement_begin_payment(p_offer_id UUID, p_buyer_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.marketplace_offer_settlements%ROWTYPE; v_car public.cars%ROWTYPE;
BEGIN
  -- Lock order is ALWAYS car -> settlement (the purchase-settlement function locks the car first), so concurrent callbacks cannot deadlock with this.
  SELECT * INTO s FROM public.marketplace_offer_settlements WHERE offer_id=p_offer_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','OFFER_NOT_ACCEPTED'); END IF;
  PERFORM 1 FROM public.cars WHERE id=s.vehicle_id FOR UPDATE;
  SELECT * INTO s FROM public.marketplace_offer_settlements WHERE id=s.id FOR UPDATE;
  IF s.buyer_id <> p_buyer_id THEN RETURN jsonb_build_object('ok',false,'code','NOT_BUYER'); END IF;
  IF s.status = 'paid' THEN RETURN jsonb_build_object('ok',false,'code','ALREADY_PAID'); END IF;
  IF s.status IN ('cancelled','lapsed') THEN RETURN jsonb_build_object('ok',false,'code','SETTLEMENT_'||upper(s.status)); END IF;
  IF s.expires_at <= now() AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.car_id=s.vehicle_id AND p.type='purchase' AND p.status='pending') THEN
    UPDATE public.marketplace_offer_settlements SET status='lapsed',cancel_reason='Payment window elapsed',updated_at=now() WHERE id=s.id RETURNING * INTO s;
    PERFORM public.kayad_offer_settlement_log(s,'lapsed',NULL,'awaiting_payment','{}'::jsonb,'Payment window elapsed');
    RETURN jsonb_build_object('ok',false,'code','SETTLEMENT_EXPIRED');
  END IF;
  SELECT * INTO v_car FROM public.cars WHERE id=s.vehicle_id FOR UPDATE;
  IF NOT FOUND OR v_car.deleted_at IS NOT NULL OR COALESCE(v_car.sold,false) OR COALESCE(v_car.status,'') NOT IN ('available','reserved') OR v_car.dealer_id IS DISTINCT FROM s.seller_id THEN
    UPDATE public.marketplace_offer_settlements SET status='cancelled',cancel_reason='Vehicle no longer available from the agreed seller',updated_at=now() WHERE id=s.id RETURNING * INTO s;
    PERFORM public.kayad_offer_settlement_log(s,'cancelled',NULL,'awaiting_payment','{}'::jsonb,'Vehicle no longer available from the agreed seller');
    RETURN jsonb_build_object('ok',false,'code','VEHICLE_UNAVAILABLE');
  END IF;
  RETURN jsonb_build_object('ok',true,'settlementId',s.id,'offerId',s.offer_id,'vehicleId',s.vehicle_id,'sellerId',s.seller_id,'agreedAmount',s.agreed_amount,'expiresAt',s.expires_at);
END; $$;

CREATE OR REPLACE FUNCTION public.kayad_offer_settlement_cancel(p_settlement_id UUID, p_actor_id UUID, p_reason TEXT DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.marketplace_offer_settlements%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.marketplace_offer_settlements WHERE id=p_settlement_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','NOT_FOUND'); END IF;
  IF p_actor_id NOT IN (s.buyer_id,s.seller_id) THEN RETURN jsonb_build_object('ok',false,'code','NOT_PARTICIPANT'); END IF;
  IF s.status <> 'awaiting_payment' THEN RETURN jsonb_build_object('ok',false,'code','NOT_CANCELLABLE','status',s.status); END IF;
  IF EXISTS (SELECT 1 FROM public.payments p WHERE p.car_id=s.vehicle_id AND p.type='purchase' AND p.status='pending') THEN RETURN jsonb_build_object('ok',false,'code','PAYMENT_IN_PROGRESS'); END IF;
  UPDATE public.marketplace_offer_settlements SET status='cancelled',cancel_reason=COALESCE(NULLIF(trim(p_reason),''),'Cancelled by participant'),updated_at=now() WHERE id=s.id RETURNING * INTO s;
  PERFORM public.kayad_offer_settlement_log(s,'cancelled',p_actor_id,'awaiting_payment','{}'::jsonb,s.cancel_reason);
  RETURN jsonb_build_object('ok',true,'settlementId',s.id,'status',s.status);
END; $$;

-- DB backstop: every purchase payment for a vehicle with an active settlement must be the bound buyer paying the agreed amount.
CREATE OR REPLACE FUNCTION public.kayad_offer_settlement_payment_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.marketplace_offer_settlements%ROWTYPE;
BEGIN
  IF NEW.type <> 'purchase' OR NEW.car_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO s FROM public.marketplace_offer_settlements WHERE vehicle_id=NEW.car_id AND (status='paid' OR (status='awaiting_payment' AND (expires_at > now() OR EXISTS (SELECT 1 FROM public.payments p WHERE p.car_id=NEW.car_id AND p.type='purchase' AND p.status='pending')))) LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF s.status = 'paid' THEN RAISE EXCEPTION 'OFFER_SETTLEMENT_ALREADY_PAID'; END IF;
  IF NEW.user_id IS DISTINCT FROM s.buyer_id THEN RAISE EXCEPTION 'OFFER_SETTLEMENT_WRONG_BUYER'; END IF;
  IF NEW.amount IS DISTINCT FROM s.agreed_amount THEN RAISE EXCEPTION 'OFFER_SETTLEMENT_AMOUNT_MISMATCH'; END IF;
  NEW.metadata := COALESCE(NEW.metadata,'{}'::jsonb) || jsonb_build_object('settlementId',s.id,'offerId',s.offer_id,'agreedAmount',s.agreed_amount);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_offer_settlement_payment_guard ON public.payments;
CREATE TRIGGER trg_offer_settlement_payment_guard BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.kayad_offer_settlement_payment_guard();

CREATE OR REPLACE FUNCTION public.kayad_offer_settlement_payment_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.marketplace_offer_settlements%ROWTYPE; v_sid UUID;
BEGIN
  v_sid := NULLIF(NEW.metadata->>'settlementId','')::uuid;
  IF v_sid IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO s FROM public.marketplace_offer_settlements WHERE id=v_sid FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    UPDATE public.marketplace_offer_settlements SET payment_id=NEW.id,updated_at=now() WHERE id=s.id RETURNING * INTO s;
    PERFORM public.kayad_offer_settlement_log(s,'payment_started',NEW.user_id,s.status);
  ELSIF NEW.status IN ('failed','cancelled') AND OLD.status IS DISTINCT FROM NEW.status AND s.status='awaiting_payment' THEN
    PERFORM public.kayad_offer_settlement_log(s,'payment_failed',NEW.user_id,s.status,jsonb_build_object('payment_status',NEW.status));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_offer_settlement_payment_status ON public.payments;
CREATE TRIGGER trg_offer_settlement_payment_status AFTER INSERT OR UPDATE OF status ON public.payments FOR EACH ROW EXECUTE FUNCTION public.kayad_offer_settlement_payment_status();

-- Settlement of the purchase links the escrow/outcome and marks the settlement paid (or cancelled when the outcome is a refund).
CREATE OR REPLACE FUNCTION public.kayad_offer_settlement_outcome() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.marketplace_offer_settlements%ROWTYPE; v_sid UUID; v_meta JSONB; v_prev TEXT;
BEGIN
  SELECT metadata INTO v_meta FROM public.payments WHERE id=NEW.payment_id;
  v_sid := NULLIF(v_meta->>'settlementId','')::uuid;
  IF v_sid IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO s FROM public.marketplace_offer_settlements WHERE id=v_sid FOR UPDATE;
  IF NOT FOUND OR s.status = 'paid' THEN RETURN NEW; END IF;
  v_prev := s.status;
  IF s.status IN ('cancelled','lapsed') THEN
    -- A payment that was already in flight succeeded after the reservation ended. If nobody else holds the vehicle the sale is committed to
    -- this buyer (money was received at the agreed amount); otherwise it is flagged for refund. Never silently ignored.
    IF NEW.status <> 'refund_pending' AND NEW.amount IS NOT DISTINCT FROM s.agreed_amount::numeric
       AND NOT EXISTS (SELECT 1 FROM public.marketplace_offer_settlements o WHERE o.vehicle_id=s.vehicle_id AND o.id<>s.id AND o.status IN ('awaiting_payment','paid')) THEN
      UPDATE public.marketplace_offer_settlements SET status='paid',payment_id=NEW.payment_id,escrow_id=NEW.escrow_id,paid_at=now(),cancel_reason=NULL,updated_at=now() WHERE id=s.id RETURNING * INTO s;
      PERFORM public.kayad_offer_settlement_log(s,'paid',NULL,v_prev,jsonb_build_object('late_payment',true,'settlement_mode',NEW.settlement_mode,'escrow_id',NEW.escrow_id),'Payment completed after the reservation ended; sale committed');
    ELSE
      PERFORM public.kayad_offer_settlement_log(s,'refund_required',NULL,s.status,jsonb_build_object('late_payment',true,'outcome_amount',NEW.amount),'Payment completed after the reservation ended and the sale cannot be committed');
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status = 'refund_pending' THEN
    UPDATE public.marketplace_offer_settlements SET status='cancelled',cancel_reason=COALESCE(NEW.failure_reason,'Refund required'),updated_at=now() WHERE id=s.id RETURNING * INTO s;
    PERFORM public.kayad_offer_settlement_log(s,'refund_required',NULL,'awaiting_payment','{}'::jsonb,COALESCE(NEW.failure_reason,'Refund required'));
  ELSIF NEW.amount IS DISTINCT FROM s.agreed_amount::numeric THEN
    PERFORM public.kayad_offer_settlement_log(s,'refund_required',NULL,s.status,jsonb_build_object('outcome_amount',NEW.amount),'Outcome amount differs from agreed amount');
  ELSE
    UPDATE public.marketplace_offer_settlements SET status='paid',payment_id=NEW.payment_id,escrow_id=NEW.escrow_id,paid_at=now(),updated_at=now() WHERE id=s.id RETURNING * INTO s;
    PERFORM public.kayad_offer_settlement_log(s,'paid',NULL,'awaiting_payment',jsonb_build_object('settlement_mode',NEW.settlement_mode,'escrow_id',NEW.escrow_id));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_offer_settlement_outcome ON public.purchase_outcomes;
CREATE TRIGGER trg_offer_settlement_outcome AFTER INSERT OR UPDATE OF status,escrow_id ON public.purchase_outcomes FOR EACH ROW EXECUTE FUNCTION public.kayad_offer_settlement_outcome();

REVOKE ALL ON FUNCTION public.kayad_offer_settlement_log(public.marketplace_offer_settlements,TEXT,UUID,TEXT,JSONB,TEXT), public.kayad_offer_settlement_sweep(UUID),
  public.kayad_offer_settlement_open(public.marketplace_offers,UUID), public.kayad_offer_settlement_begin_payment(UUID,UUID),
  public.kayad_offer_settlement_cancel(UUID,UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_offer_settlement_sweep(UUID), public.kayad_offer_settlement_begin_payment(UUID,UUID), public.kayad_offer_settlement_cancel(UUID,UUID,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.kayad_offer_action(
  p_lead_id UUID, p_actor_id UUID, p_action TEXT, p_amount NUMERIC DEFAULT NULL,
  p_message TEXT DEFAULT NULL, p_offer_id UUID DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead public.leads%ROWTYPE; v_offer public.marketplace_offers%ROWTYPE;
  v_vehicle public.cars%ROWTYPE; v_buyer UUID; v_seller UUID; v_sender UUID; v_recipient UUID;
  v_new public.marketplace_offers%ROWTYPE; v_settlement public.marketplace_offer_settlements%ROWTYPE; v_event public.marketplace_offer_events%ROWTYPE; v_key TEXT;
BEGIN
  IF p_actor_id IS NULL OR p_lead_id IS NULL OR p_action NOT IN ('submit','counter','accept','reject','withdraw')
     OR NULLIF(trim(p_idempotency_key),'') IS NULL THEN RAISE EXCEPTION 'Invalid offer request' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_lead FROM public.leads WHERE id=p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found' USING ERRCODE='P0002'; END IF;
  v_buyer := v_lead.buyer; v_seller := v_lead.dealer;
  IF v_buyer IS NULL OR v_seller IS NULL OR v_buyer = v_seller THEN RAISE EXCEPTION 'Lead is not eligible for negotiation' USING ERRCODE='23514'; END IF;
  IF p_actor_id NOT IN (v_buyer,v_seller) THEN RAISE EXCEPTION 'Not a transaction participant' USING ERRCODE='42501'; END IF;
  IF v_lead.vehicle IS NOT NULL THEN
    SELECT * INTO v_vehicle FROM public.cars WHERE id=v_lead.vehicle FOR UPDATE;
    IF NOT FOUND OR COALESCE(v_vehicle.sold,false) OR COALESCE(v_vehicle.status,'') IN ('sold','deleted','removed') THEN
      RAISE EXCEPTION 'Vehicle is no longer available for offers' USING ERRCODE='23514';
    END IF;
  END IF;
  -- Idempotent replay returns the original offer (or counter-offer) before any new write.
  SELECT * INTO v_event FROM public.marketplace_offer_events WHERE lead_id=p_lead_id AND idempotency_key=p_idempotency_key AND actor_id=p_actor_id;
  IF FOUND THEN
    SELECT * INTO v_offer FROM public.marketplace_offers WHERE id=v_event.offer_id;
    IF v_event.event_type='countered' THEN SELECT * INTO v_offer FROM public.marketplace_offers WHERE parent_offer_id=v_event.offer_id ORDER BY created_at DESC LIMIT 1; END IF;
    RETURN jsonb_build_object('offer',to_jsonb(v_offer),'replayed',true);
  END IF;
  SELECT * INTO v_offer FROM public.marketplace_offers WHERE lead_id=p_lead_id AND idempotency_key=p_idempotency_key AND sender_id=p_actor_id;
  IF FOUND THEN RETURN jsonb_build_object('offer',to_jsonb(v_offer),'replayed',true); END IF;

  IF p_action='submit' THEN
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'A positive offer amount is required' USING ERRCODE='22023'; END IF;
    IF p_amount <> trunc(p_amount) THEN RAISE EXCEPTION 'Offers must be a whole number of Kenyan shillings' USING ERRCODE='22023'; END IF;
    UPDATE public.marketplace_offers SET status='expired',updated_at=now() WHERE lead_id=p_lead_id AND status='pending' AND expires_at IS NOT NULL AND expires_at <= now();
    INSERT INTO public.marketplace_offer_events(offer_id,lead_id,actor_id,event_type,amount,idempotency_key)
      SELECT id,lead_id,NULL,'expired',amount,'expiry:'||id::text FROM public.marketplace_offers WHERE lead_id=p_lead_id AND status='expired' AND expires_at <= now()
      ON CONFLICT (offer_id,idempotency_key) DO NOTHING;
    IF EXISTS (SELECT 1 FROM public.marketplace_offers WHERE lead_id=p_lead_id AND status='pending') THEN
      RAISE EXCEPTION 'A pending offer already exists for this lead' USING ERRCODE='23505';
    END IF;
    v_sender := p_actor_id; v_recipient := CASE WHEN p_actor_id=v_buyer THEN v_seller ELSE v_buyer END;
    INSERT INTO public.marketplace_offers(lead_id,vehicle_id,buyer_id,seller_id,sender_id,recipient_id,amount,message,idempotency_key,expires_at)
      VALUES(p_lead_id,v_lead.vehicle,v_buyer,v_seller,v_sender,v_recipient,p_amount,NULLIF(trim(p_message),''),p_idempotency_key,now()+interval '7 days') RETURNING * INTO v_new;
    INSERT INTO public.marketplace_offer_events(offer_id,lead_id,actor_id,event_type,amount,message,idempotency_key)
      VALUES(v_new.id,p_lead_id,p_actor_id,'submitted',p_amount,NULLIF(trim(p_message),''),p_idempotency_key);
    UPDATE public.leads SET stage='negotiating',last_activity_at=now(),updated_at=now() WHERE id=p_lead_id;
    RETURN jsonb_build_object('offer',to_jsonb(v_new),'replayed',false);
  END IF;

  SELECT * INTO v_offer FROM public.marketplace_offers WHERE id=p_offer_id AND lead_id=p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found' USING ERRCODE='P0002'; END IF;
  IF v_offer.status <> 'pending' THEN RAISE EXCEPTION 'Offer is no longer pending' USING ERRCODE='23514'; END IF;
  IF v_offer.expires_at IS NOT NULL AND v_offer.expires_at <= now() THEN
    UPDATE public.marketplace_offers SET status='expired',updated_at=now() WHERE id=v_offer.id RETURNING * INTO v_offer;
    INSERT INTO public.marketplace_offer_events(offer_id,lead_id,actor_id,event_type,amount,idempotency_key)
      VALUES(v_offer.id,p_lead_id,NULL,'expired',v_offer.amount,'expiry:'||v_offer.id::text) ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('offer',to_jsonb(v_offer),'expired',true,'replayed',false);
  END IF;
  IF p_action IN ('accept','reject','counter') AND p_actor_id <> v_offer.recipient_id THEN RAISE EXCEPTION 'Only the recipient can decide or counter this offer' USING ERRCODE='42501'; END IF;
  IF p_action='withdraw' AND p_actor_id <> v_offer.sender_id THEN RAISE EXCEPTION 'Only the sender can withdraw this offer' USING ERRCODE='42501'; END IF;

  IF p_action='counter' THEN
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'A positive counter-offer amount is required' USING ERRCODE='22023'; END IF;
    IF p_amount <> trunc(p_amount) THEN RAISE EXCEPTION 'Counter-offers must be a whole number of Kenyan shillings' USING ERRCODE='22023'; END IF;
    UPDATE public.marketplace_offers SET status='countered',updated_at=now() WHERE id=v_offer.id;
    INSERT INTO public.marketplace_offer_events(offer_id,lead_id,actor_id,event_type,amount,message,idempotency_key)
      VALUES(v_offer.id,p_lead_id,p_actor_id,'countered',v_offer.amount,NULLIF(trim(p_message),''),p_idempotency_key);
    INSERT INTO public.marketplace_offers(lead_id,parent_offer_id,vehicle_id,buyer_id,seller_id,sender_id,recipient_id,amount,message,idempotency_key,expires_at)
      VALUES(p_lead_id,v_offer.id,v_offer.vehicle_id,v_buyer,v_seller,p_actor_id,v_offer.sender_id,p_amount,NULLIF(trim(p_message),''),p_idempotency_key || ':counter-offer',now()+interval '7 days') RETURNING * INTO v_new;
    INSERT INTO public.marketplace_offer_events(offer_id,lead_id,actor_id,event_type,amount,message,idempotency_key)
      VALUES(v_new.id,p_lead_id,p_actor_id,'submitted',p_amount,NULLIF(trim(p_message),''),p_idempotency_key || ':counter-offer');
    RETURN jsonb_build_object('offer',to_jsonb(v_new),'previousOffer',v_offer,'replayed',false);
  END IF;

  UPDATE public.marketplace_offers SET status=CASE p_action WHEN 'accept' THEN 'accepted' WHEN 'reject' THEN 'rejected' WHEN 'withdraw' THEN 'withdrawn' END,updated_at=now() WHERE id=v_offer.id RETURNING * INTO v_new;
  INSERT INTO public.marketplace_offer_events(offer_id,lead_id,actor_id,event_type,amount,message,idempotency_key)
    VALUES(v_offer.id,p_lead_id,p_actor_id,CASE p_action WHEN 'accept' THEN 'accepted' WHEN 'reject' THEN 'rejected' WHEN 'withdraw' THEN 'withdrawn' END,v_offer.amount,NULLIF(trim(p_message),''),p_idempotency_key);
  UPDATE public.leads SET last_activity_at=now(),updated_at=now() WHERE id=p_lead_id;
  IF p_action='accept' THEN
    -- GAP-OFFER-TXN: an accepted offer becomes the authoritative agreed price. Any refusal rolls the acceptance back.
    v_settlement := public.kayad_offer_settlement_open(v_new, p_actor_id);
    RETURN jsonb_build_object('offer',to_jsonb(v_new),'settlement',to_jsonb(v_settlement),'replayed',false);
  END IF;
  RETURN jsonb_build_object('offer',to_jsonb(v_new),'replayed',false);
END; $$;

REVOKE ALL ON FUNCTION public.kayad_offer_action(UUID,UUID,TEXT,NUMERIC,TEXT,UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_offer_action(UUID,UUID,TEXT,NUMERIC,TEXT,UUID,TEXT) TO service_role;
