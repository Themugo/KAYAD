-- Canonical buyer/seller offer workflow. Offers attach to the existing lead and vehicle;
-- every mutation is serialized per lead and written with its immutable event in one transaction.
CREATE TABLE IF NOT EXISTS public.marketplace_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  parent_offer_id UUID REFERENCES public.marketplace_offers(id) ON DELETE RESTRICT,
  vehicle_id UUID REFERENCES public.cars(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn','countered','expired')),
  message TEXT CHECK (message IS NULL OR char_length(message) <= 2000),
  idempotency_key TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_id, idempotency_key),
  CHECK (sender_id <> recipient_id),
  CHECK ((sender_id = buyer_id AND recipient_id = seller_id) OR (sender_id = seller_id AND recipient_id = buyer_id))
);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_lead_created ON public.marketplace_offers(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_participants ON public.marketplace_offers(buyer_id, seller_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_offers_one_pending_per_lead ON public.marketplace_offers(lead_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.marketplace_offer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.marketplace_offers(id) ON DELETE RESTRICT,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('submitted','countered','accepted','rejected','withdrawn','expired')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  message TEXT CHECK (message IS NULL OR char_length(message) <= 2000),
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (offer_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_marketplace_offer_events_lead_created ON public.marketplace_offer_events(lead_id, created_at);

ALTER TABLE public.marketplace_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_offer_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketplace_offers_participant_read ON public.marketplace_offers;
CREATE POLICY marketplace_offers_participant_read ON public.marketplace_offers FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
DROP POLICY IF EXISTS marketplace_offer_events_participant_read ON public.marketplace_offer_events;
CREATE POLICY marketplace_offer_events_participant_read ON public.marketplace_offer_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketplace_offers o WHERE o.id = offer_id AND (auth.uid() = o.buyer_id OR auth.uid() = o.seller_id)));
REVOKE ALL ON public.marketplace_offers, public.marketplace_offer_events FROM anon, authenticated;
GRANT SELECT ON public.marketplace_offers, public.marketplace_offer_events TO authenticated;
GRANT ALL ON public.marketplace_offers, public.marketplace_offer_events TO service_role;

CREATE OR REPLACE FUNCTION public.kayad_offer_action(
  p_lead_id UUID, p_actor_id UUID, p_action TEXT, p_amount NUMERIC DEFAULT NULL,
  p_message TEXT DEFAULT NULL, p_offer_id UUID DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead public.leads%ROWTYPE; v_offer public.marketplace_offers%ROWTYPE;
  v_vehicle public.cars%ROWTYPE; v_buyer UUID; v_seller UUID; v_sender UUID; v_recipient UUID;
  v_new public.marketplace_offers%ROWTYPE; v_event public.marketplace_offer_events%ROWTYPE; v_key TEXT;
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
  SELECT * INTO v_offer FROM public.marketplace_offers WHERE lead_id=p_lead_id AND idempotency_key=p_idempotency_key AND actor_id=p_actor_id;
  IF FOUND THEN RETURN jsonb_build_object('offer',to_jsonb(v_offer),'replayed',true); END IF;

  IF p_action='submit' THEN
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'A positive offer amount is required' USING ERRCODE='22023'; END IF;
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
  RETURN jsonb_build_object('offer',to_jsonb(v_new),'replayed',false);
END; $$;
REVOKE ALL ON FUNCTION public.kayad_offer_action(UUID,UUID,TEXT,NUMERIC,TEXT,UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_offer_action(UUID,UUID,TEXT,NUMERIC,TEXT,UUID,TEXT) TO service_role;
COMMENT ON FUNCTION public.kayad_offer_action IS 'Serializes canonical buyer/seller offers on the existing lead, enforces participant permissions and writes immutable offer events atomically.';
