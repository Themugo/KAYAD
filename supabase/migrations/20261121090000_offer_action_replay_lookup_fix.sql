-- 20261121090000_offer_action_replay_lookup_fix.sql
-- DEFECT (found by the 2026-11-21 post-alignment journey verification on a migrated disposable database):
-- kayad_offer_action (20261110120000) looked up a replayed offer with `marketplace_offers.actor_id`, a column that
-- table does not have (marketplace_offer_events has actor_id; marketplace_offers has sender_id). PostgreSQL raised
-- 42703 on EVERY submit/counter/accept/reject/withdraw, so the canonical offer workflow could not complete.
-- FIX: forward-only. The function is re-declared byte-for-byte except the lookup now matches `sender_id = p_actor_id`.
-- Semantics unchanged: events-table replay lookup is untouched; privileges are re-asserted below.
-- ROLLBACK: re-apply the 20261110120000 definition (restores the broken lookup) - not recommended.
-- Safe to run on a database that has not yet applied 20261110120000 only AFTER it (ordering by version).
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
  SELECT * INTO v_offer FROM public.marketplace_offers WHERE lead_id=p_lead_id AND idempotency_key=p_idempotency_key AND sender_id=p_actor_id;
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
