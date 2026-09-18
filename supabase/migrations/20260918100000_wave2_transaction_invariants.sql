-- KAYAD Wave 2: cross-domain atomicity and financial invariants.
--
-- This migration does not introduce a second business ledger. ledger_entries
-- remains the canonical financial journal. The tables/functions below provide
-- atomic workflow boundaries, durable retry state, and invariant checks around
-- the existing canonical domains.

-- -------------------------------------------------------------------------
-- 8. LISTING / ENTITLEMENT ATOMICITY
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_entitlement_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL UNIQUE REFERENCES public.cars(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_entitlement_reservations_dealer
  ON public.listing_entitlement_reservations(dealer_id, created_at DESC);

ALTER TABLE public.listing_entitlement_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.listing_entitlement_reservations FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.kayad_create_dealer_listing_atomic(
  p_dealer_id UUID,
  p_listing JSONB,
  p_idempotency_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_sub public.dealer_subscriptions%ROWTYPE;
  v_existing public.listing_entitlement_reservations%ROWTYPE;
  v_used INTEGER;
  v_limit INTEGER;
  v_car public.cars%ROWTYPE;
BEGIN
  IF p_dealer_id IS NULL OR NULLIF(trim(p_idempotency_key), '') IS NULL THEN
    RAISE EXCEPTION 'Dealer listing identity is incomplete';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('dealer-listing:' || p_dealer_id::TEXT, 0));

  SELECT * INTO v_existing
  FROM public.listing_entitlement_reservations
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;
  IF FOUND THEN
    SELECT * INTO v_car FROM public.cars WHERE id = v_existing.listing_id;
    RETURN jsonb_build_object('listing', to_jsonb(v_car), 'idempotent', true);
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = p_dealer_id FOR UPDATE;
  IF NOT FOUND OR v_user.role <> 'dealer' THEN
    RAISE EXCEPTION 'Dealer not found';
  END IF;
  IF COALESCE(v_user.listings_locked, false) THEN
    RAISE EXCEPTION 'Dealer listings are currently locked';
  END IF;

  SELECT * INTO v_sub
  FROM public.dealer_subscriptions
  WHERE dealer = p_dealer_id
    AND status IN ('active','cancelled')
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'An active dealer subscription is required to list vehicles';
  END IF;

  v_limit := COALESCE(v_sub.listing_max, 0);
  SELECT count(*)::INTEGER INTO v_used
  FROM public.cars
  WHERE dealer_id = p_dealer_id
    AND deleted_at IS NULL
    AND status IN ('available','pending');

  IF v_limit > 0 AND v_used >= v_limit THEN
    RAISE EXCEPTION 'Dealer listing entitlement exhausted';
  END IF;

  INSERT INTO public.cars (
    dealer_id, title, slug, brand, model, year, price, mileage, fuel,
    transmission, body_type, color, engine, drive_type, condition,
    description, features, images, location_city, vin, chassis_number,
    registration_number, status, views, approved, inspection_status,
    is_verified_dealer, is_promoted, auction_status, auction_end,
    current_bid, bids_count, highest_bidder_id, allow_bid, allow_buy,
    created_at, updated_at, deleted_at, cover_image, trust_score,
    escrow_enabled, price_history, starting_bid, reserve_price,
    reserve_mode, promotion_expires_at, dealer_phone, ntsa_verified,
    duty_status, logbook_verified, sold, "isPaid"
  ) VALUES (
    p_dealer_id,
    NULLIF(p_listing->>'title',''), p_listing->>'slug',
    NULLIF(p_listing->>'brand',''), NULLIF(p_listing->>'model',''),
    NULLIF(p_listing->>'year','')::INTEGER, NULLIF(p_listing->>'price','')::NUMERIC,
    NULLIF(p_listing->>'mileage','')::INTEGER, p_listing->>'fuel',
    p_listing->>'transmission', p_listing->>'body_type', p_listing->>'color',
    p_listing->>'engine', p_listing->>'drive_type', p_listing->>'condition',
    p_listing->>'description',
    CASE WHEN jsonb_typeof(COALESCE(p_listing->'features','[]'::jsonb))='array' THEN ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_listing->'features','[]'::jsonb))) ELSE '{}'::text[] END,
    COALESCE(p_listing->'images','[]'::jsonb), p_listing->>'location_city',
    p_listing->>'vin', p_listing->>'chassis_number', p_listing->>'registration_number',
    COALESCE(NULLIF(p_listing->>'status',''),'pending'),
    COALESCE(NULLIF(p_listing->>'views','')::INTEGER,0),
    COALESCE((p_listing->>'approved')::BOOLEAN,true),
    COALESCE(NULLIF(p_listing->>'inspection_status',''),'pending'),
    COALESCE((p_listing->>'is_verified_dealer')::BOOLEAN,true),
    COALESCE((p_listing->>'is_promoted')::BOOLEAN,false),
    COALESCE(NULLIF(p_listing->>'auction_status',''),'none'),
    NULLIF(p_listing->>'auction_end','')::TIMESTAMPTZ,
    COALESCE(NULLIF(p_listing->>'current_bid','')::NUMERIC,0),
    COALESCE(NULLIF(p_listing->>'bids_count','')::INTEGER,0),
    NULLIF(p_listing->>'highest_bidder_id','')::UUID,
    COALESCE((p_listing->>'allow_bid')::BOOLEAN,false),
    COALESCE((p_listing->>'allow_buy')::BOOLEAN,true),
    now(), now(), NULL,
    COALESCE(NULLIF(p_listing->>'cover_image','')::INTEGER,0),
    COALESCE(NULLIF(p_listing->>'trust_score','')::NUMERIC,0),
    COALESCE((p_listing->>'escrow_enabled')::BOOLEAN,false),
    COALESCE(p_listing->'price_history','[]'::jsonb),
    NULLIF(p_listing->>'starting_bid','')::NUMERIC,
    NULLIF(p_listing->>'reserve_price','')::NUMERIC,
    p_listing->>'reserve_mode',
    NULLIF(p_listing->>'promotion_expires_at','')::TIMESTAMPTZ,
    p_listing->>'dealer_phone',
    COALESCE((p_listing->>'ntsa_verified')::BOOLEAN,false),
    p_listing->>'duty_status',
    COALESCE((p_listing->>'logbook_verified')::BOOLEAN,false),
    false, false
  ) RETURNING * INTO v_car;

  INSERT INTO public.listing_entitlement_reservations(dealer_id, listing_id, idempotency_key)
  VALUES (p_dealer_id, v_car.id, p_idempotency_key);

  UPDATE public.users
     SET listing_count = COALESCE(listing_count,0) + 1,
         first_vehicle_used = true,
         updated_at = now()
   WHERE id = p_dealer_id;

  RETURN jsonb_build_object('listing', to_jsonb(v_car), 'idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_create_dealer_listing_atomic(UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_create_dealer_listing_atomic(UUID, JSONB, TEXT) TO service_role;

-- -------------------------------------------------------------------------
-- 9. MEDIA FAILURE RECOVERY
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  storage_provider TEXT NOT NULL DEFAULT 'cloudinary',
  source_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','uploading','completed','failed','dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  retry_at TIMESTAMPTZ,
  public_id TEXT,
  remote_url TEXT,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_media_upload_jobs_retry
  ON public.media_upload_jobs(status, retry_at)
  WHERE status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS idx_media_upload_jobs_listing
  ON public.media_upload_jobs(listing_id, created_at DESC);

ALTER TABLE public.media_upload_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_upload_jobs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.kayad_register_media_upload_job_atomic(
  p_listing_id UUID, p_owner_id UUID, p_source_path TEXT, p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_job public.media_upload_jobs%ROWTYPE;
BEGIN
  IF p_listing_id IS NULL OR NULLIF(trim(p_source_path),'') IS NULL THEN RAISE EXCEPTION 'Media job identity is incomplete'; END IF;
  SELECT * INTO v_job FROM public.media_upload_jobs WHERE listing_id=p_listing_id AND source_path=p_source_path ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN RETURN to_jsonb(v_job) || jsonb_build_object('idempotent',true); END IF;
  INSERT INTO public.media_upload_jobs(listing_id,owner_id,source_path,status,attempts,retry_at,metadata)
  VALUES(p_listing_id,p_owner_id,p_source_path,'pending',0,now(),COALESCE(p_metadata,'{}'::jsonb)) RETURNING * INTO v_job;
  RETURN to_jsonb(v_job) || jsonb_build_object('idempotent',false);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_register_media_upload_job_atomic(UUID,UUID,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_register_media_upload_job_atomic(UUID,UUID,TEXT,JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.kayad_register_media_upload_failure_atomic(
  p_listing_id UUID,
  p_owner_id UUID,
  p_source_path TEXT,
  p_error TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_job public.media_upload_jobs%ROWTYPE; v_attempt INTEGER;
BEGIN
  IF p_listing_id IS NULL OR NULLIF(trim(p_source_path),'') IS NULL THEN
    RAISE EXCEPTION 'Media recovery identity is incomplete';
  END IF;
  SELECT * INTO v_job FROM public.media_upload_jobs
  WHERE listing_id = p_listing_id AND source_path = p_source_path AND status <> 'completed'
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    v_attempt := v_job.attempts + 1;
    UPDATE public.media_upload_jobs
       SET attempts=v_attempt,
           status=CASE WHEN v_attempt >= max_attempts THEN 'dead_letter' ELSE 'failed' END,
           retry_at=CASE WHEN v_attempt >= max_attempts THEN NULL ELSE now() + make_interval(secs => LEAST(300, 2 ^ LEAST(v_attempt, 8))) END,
           last_error=left(COALESCE(p_error,'unknown media upload failure'),2000),
           metadata=COALESCE(p_metadata,'{}'::jsonb), updated_at=now()
     WHERE id=v_job.id RETURNING * INTO v_job;
  ELSE
    INSERT INTO public.media_upload_jobs(listing_id,owner_id,source_path,status,attempts,retry_at,last_error,metadata)
    VALUES(p_listing_id,p_owner_id,p_source_path,'failed',1,now()+interval '2 seconds',left(COALESCE(p_error,'unknown media upload failure'),2000),COALESCE(p_metadata,'{}'::jsonb))
    RETURNING * INTO v_job;
  END IF;
  RETURN to_jsonb(v_job);
END;
$$;

CREATE OR REPLACE FUNCTION public.kayad_complete_media_upload_atomic(
  p_job_id UUID,
  p_public_id TEXT,
  p_remote_url TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_job public.media_upload_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_job FROM public.media_upload_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Media upload job not found'; END IF;
  UPDATE public.media_upload_jobs
     SET status='completed', public_id=p_public_id, remote_url=p_remote_url,
         metadata=COALESCE(p_metadata,'{}'::jsonb), updated_at=now(), completed_at=now(), retry_at=NULL, last_error=NULL
   WHERE id=v_job.id;
  RETURN (SELECT to_jsonb(m) FROM public.media_upload_jobs m WHERE m.id=v_job.id);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_register_media_upload_failure_atomic(UUID,UUID,TEXT,TEXT,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kayad_complete_media_upload_atomic(UUID,TEXT,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_register_media_upload_failure_atomic(UUID,UUID,TEXT,TEXT,JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.kayad_complete_media_upload_atomic(UUID,TEXT,TEXT,JSONB) TO service_role;

-- -------------------------------------------------------------------------
-- 10-12. CROSS-DOMAIN FINANCIAL WORKFLOW EVENTS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow TEXT NOT NULL CHECK (workflow IN ('auction','inspection','dispute')),
  aggregate_id UUID NOT NULL,
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  amount NUMERIC CHECK (amount IS NULL OR amount >= 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  ledger_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_workflow_events_aggregate
  ON public.financial_workflow_events(workflow, aggregate_id, created_at);

ALTER TABLE public.financial_workflow_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.financial_workflow_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.kayad_record_financial_workflow_event_atomic(
  p_workflow TEXT,
  p_aggregate_id UUID,
  p_event_key TEXT,
  p_event_type TEXT,
  p_amount NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT 'KES',
  p_ledger_reference TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_event public.financial_workflow_events%ROWTYPE; v_idempotent BOOLEAN := false;
BEGIN
  INSERT INTO public.financial_workflow_events(workflow,aggregate_id,event_key,event_type,amount,currency,ledger_reference,metadata)
  VALUES(p_workflow,p_aggregate_id,p_event_key,p_event_type,p_amount,COALESCE(NULLIF(p_currency,''),'KES'),p_ledger_reference,COALESCE(p_metadata,'{}'::jsonb))
  ON CONFLICT (event_key) DO UPDATE SET event_key=EXCLUDED.event_key
  RETURNING * INTO v_event;
  RETURN to_jsonb(v_event) || jsonb_build_object('idempotent', false);
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_record_financial_workflow_event_atomic(TEXT,UUID,TEXT,TEXT,NUMERIC,TEXT,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_record_financial_workflow_event_atomic(TEXT,UUID,TEXT,TEXT,NUMERIC,TEXT,TEXT,JSONB) TO service_role;

-- Structural financial invariants.
ALTER TABLE public.escrows
  DROP CONSTRAINT IF EXISTS escrows_amount_positive_wave2,
  ADD CONSTRAINT escrows_amount_positive_wave2 CHECK (amount > 0),
  DROP CONSTRAINT IF EXISTS escrows_allocation_wave2,
  ADD CONSTRAINT escrows_allocation_wave2 CHECK (
    COALESCE(commission,0) >= 0 AND
    COALESCE("sellerAmount",0) >= 0 AND
    COALESCE(commission,0) + COALESCE("sellerAmount",0) <= amount
  );

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_amount_positive_wave2,
  ADD CONSTRAINT payments_amount_positive_wave2 CHECK (amount > 0);

ALTER TABLE public.inspection_reports
  DROP CONSTRAINT IF EXISTS inspection_report_scores_wave2,
  ADD CONSTRAINT inspection_report_scores_wave2 CHECK (
    (overall_score IS NULL OR overall_score BETWEEN 0 AND 100) AND
    (quality_score IS NULL OR quality_score BETWEEN 0 AND 100)
  );

ALTER TABLE public.inspection_settlements
  DROP CONSTRAINT IF EXISTS inspection_settlement_amounts_wave2,
  ADD CONSTRAINT inspection_settlement_amounts_wave2 CHECK (
    gross_amount >= 0 AND commission_amount >= 0 AND tax_amount >= 0 AND net_amount >= 0 AND
    ROUND(gross_amount - commission_amount - tax_amount, 2) = ROUND(net_amount, 2)
  );

-- -------------------------------------------------------------------------
-- 10. Auction -> payment -> escrow -> ledger invariant boundary.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_settle_bid_payment_atomic(
  p_payment_id UUID,
  p_receipt TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_payment public.payments%ROWTYPE; v_bid public.bids%ROWTYPE; v_car public.cars%ROWTYPE; v_event JSONB;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id=p_payment_id FOR UPDATE;
  IF NOT FOUND OR v_payment.type <> 'bid' THEN RAISE EXCEPTION 'Bid payment not found'; END IF;
  SELECT * INTO v_bid FROM public.bids WHERE checkout_request_id=v_payment.checkout_request_id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bid not found for payment'; END IF;
  SELECT * INTO v_car FROM public.cars WHERE id=v_bid.car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found for bid'; END IF;

  UPDATE public.payments SET status='success', mpesa_receipt=p_receipt, paid_at=now(), processed=true, updated_at=now() WHERE id=v_payment.id;
  IF v_bid.status <> 'paid' THEN UPDATE public.bids SET status='paid' WHERE id=v_bid.id; END IF;

  PERFORM public.kayad_post_ledger_entry_atomic(
    'auction-payment:'||v_payment.id::TEXT, v_payment.user_id, v_payment.amount, 'KES',
    'auction_payment', 'escrow', 'Auction bid payment received',
    jsonb_build_object('payment_id',v_payment.id,'bid_id',v_bid.id,'car_id',v_car.id), '1000', '1100'
  );
  v_event := public.kayad_record_financial_workflow_event_atomic(
    'auction', v_car.id, 'auction-payment:'||v_payment.id::TEXT, 'payment_confirmed', v_payment.amount, 'KES',
    'auction-payment:'||v_payment.id::TEXT, jsonb_build_object('payment_id',v_payment.id,'bid_id',v_bid.id)
  );

  IF v_car.auction_status='live' AND (v_car.auction_end IS NULL OR v_car.auction_end > now()) AND v_bid.amount > COALESCE(v_car.current_bid,0) THEN
    UPDATE public.cars SET current_bid=v_bid.amount, highest_bidder_id=v_bid.user_id, bids_count=COALESCE(v_car.bids_count,0)+1, updated_at=now() WHERE id=v_car.id;
  END IF;

  RETURN jsonb_build_object('payment_id',v_payment.id,'bid_id',v_bid.id,'car_id',v_car.id,'amount',v_bid.amount,'ledger_recorded',true,'event',v_event);
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_settle_bid_payment_atomic(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_settle_bid_payment_atomic(UUID,TEXT) TO service_role;

-- -------------------------------------------------------------------------
-- 11. Inspection -> report -> payout invariant.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_mark_inspection_settlement_paid_atomic(
  p_settlement_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_settlement public.inspection_settlements%ROWTYPE; v_missing INTEGER; v_event JSONB;
BEGIN
  SELECT * INTO v_settlement FROM public.inspection_settlements WHERE id=p_settlement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Settlement not found'; END IF;
  IF v_settlement.status='paid' THEN RETURN jsonb_build_object('settlementId',p_settlement_id,'status','paid','idempotent',true); END IF;
  IF v_settlement.status <> 'pending' THEN RAISE EXCEPTION 'Settlement cannot be paid from %',v_settlement.status; END IF;

  SELECT count(*) INTO v_missing
  FROM (
    SELECT DISTINCT it.booking_id
    FROM public.inspection_transactions it
    WHERE it.settlement_id=p_settlement_id AND it.booking_id IS NOT NULL
  ) b
  LEFT JOIN public.inspection_reports r ON r.booking_id=b.booking_id
  WHERE r.id IS NULL;
  IF v_missing > 0 THEN RAISE EXCEPTION 'Inspection settlement is missing % report(s)', v_missing; END IF;

  PERFORM public.kayad_post_ledger_entry_atomic(
    'inspection-payout:'||p_settlement_id::TEXT, p_user_id, v_settlement.net_amount,
    COALESCE(v_settlement.currency,'KES'), 'inspection_payout', 'inspection_provider',
    'Inspection provider payout', jsonb_build_object('settlement_id',p_settlement_id,'provider_id',v_settlement.provider_id), '5100', '1200'
  );
  UPDATE public.inspection_settlements SET status='paid', payment_method=p_payment_method, payment_reference=p_payment_reference, paid_at=now(), processed_at=now(), updated_at=now() WHERE id=p_settlement_id;
  UPDATE public.inspection_transactions SET status='completed' WHERE settlement_id=p_settlement_id;
  INSERT INTO public.inspection_transactions(provider_id,settlement_id,transaction_type,amount,currency,status,description,reference,created_at)
  VALUES(v_settlement.provider_id,p_settlement_id,'payout',v_settlement.net_amount,COALESCE(v_settlement.currency,'KES'),'completed','Inspection provider payout',p_payment_reference,now());
  v_event := public.kayad_record_financial_workflow_event_atomic('inspection',p_settlement_id,'inspection-payout:'||p_settlement_id::TEXT,'payout_completed',v_settlement.net_amount,COALESCE(v_settlement.currency,'KES'),'inspection-payout:'||p_settlement_id::TEXT,jsonb_build_object('provider_id',v_settlement.provider_id));
  RETURN jsonb_build_object('settlementId',p_settlement_id,'status','paid','idempotent',false,'event',v_event);
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_mark_inspection_settlement_paid_atomic(UUID,TEXT,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_mark_inspection_settlement_paid_atomic(UUID,TEXT,TEXT,UUID) TO service_role;

-- -------------------------------------------------------------------------
-- 12. Dispute -> financial consequence invariant.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_resolve_dispute_atomic(
  p_escrow_id UUID, p_actor_id UUID, p_decision TEXT, p_amount NUMERIC DEFAULT NULL,
  p_seller_amount NUMERIC DEFAULT NULL, p_buyer_amount NUMERIC DEFAULT NULL,
  p_reason TEXT DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_escrow public.escrows%ROWTYPE; v_commission NUMERIC:=0; v_refund NUMERIC:=0; v_seller NUMERIC:=0; v_buyer NUMERIC:=0; v_status TEXT; v_event JSONB;
BEGIN
  SELECT * INTO v_escrow FROM public.escrows WHERE id=p_escrow_id FOR UPDATE;
  IF NOT FOUND OR v_escrow.status <> 'disputed' THEN RAISE EXCEPTION 'Escrow is not in disputed state'; END IF;
  IF p_idempotency_key IS NOT NULL AND v_escrow."disputeLastActionKey"=p_idempotency_key AND v_escrow."disputeResolution" IS NOT NULL THEN
    RETURN jsonb_build_object('id',v_escrow.id,'status',v_escrow.status,'resolution',v_escrow."disputeResolution",'idempotent',true);
  END IF;
  IF p_decision NOT IN ('full_refund','partial_refund','release_funds','split_settlement','dismissed') THEN RAISE EXCEPTION 'Unsupported dispute decision: %',p_decision; END IF;

  CASE p_decision
    WHEN 'full_refund' THEN v_refund=v_escrow.amount; v_buyer=v_refund; v_status='refunded';
    WHEN 'partial_refund' THEN
      v_refund=COALESCE(p_amount,-1); IF v_refund<=0 OR v_refund>=v_escrow.amount THEN RAISE EXCEPTION 'Invalid partial refund'; END IF;
      v_buyer=v_refund; v_seller=v_escrow.amount-v_refund; v_status='released';
    WHEN 'release_funds','dismissed' THEN
      v_commission=ROUND(v_escrow.commission,2); v_seller=ROUND(v_escrow.amount-v_commission,2); v_status='released';
    WHEN 'split_settlement' THEN
      v_seller=COALESCE(p_seller_amount,-1); v_buyer=COALESCE(p_buyer_amount,-1); v_commission=ROUND(v_escrow.amount-v_seller-v_buyer,2);
      IF v_seller<0 OR v_buyer<0 OR v_commission<0 OR ROUND(v_seller+v_buyer+v_commission,2)<>ROUND(v_escrow.amount,2) THEN RAISE EXCEPTION 'Invalid split settlement'; END IF;
      v_status='released';
  END CASE;

  IF v_status='refunded' THEN
    PERFORM public.kayad_post_ledger_entry_atomic('dispute-refund:'||v_escrow.id::TEXT,v_escrow.buyer,v_buyer, 'KES','dispute_refund','customer','Dispute full refund',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision),'2100','1100');
  ELSE
    IF v_seller>0 THEN PERFORM public.kayad_post_ledger_entry_atomic('dispute-release-seller:'||v_escrow.id::TEXT,v_escrow.seller,v_seller,'KES','dispute_release','seller','Dispute seller settlement',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision),'1100','5000'); END IF;
    IF v_buyer>0 THEN PERFORM public.kayad_post_ledger_entry_atomic('dispute-release-buyer:'||v_escrow.id::TEXT,v_escrow.buyer,v_buyer,'KES','dispute_refund','customer','Dispute buyer settlement',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision),'2100','1100'); END IF;
    IF v_commission>0 THEN PERFORM public.kayad_post_ledger_entry_atomic('dispute-commission:'||v_escrow.id::TEXT,v_escrow.seller,v_commission,'KES','dispute_commission','platform','Dispute platform commission',jsonb_build_object('escrow_id',v_escrow.id,'decision',p_decision),'1100','4000'); END IF;
  END IF;

  UPDATE public.escrows SET status=v_status, commission=v_commission, "sellerAmount"=v_seller,
    "disputeLastActionKey"=COALESCE(p_idempotency_key,"disputeLastActionKey"), "disputeWorkflowStatus"='resolved',
    "disputeResolution"=jsonb_build_object('decision',p_decision,'amount',CASE WHEN p_decision IN ('partial_refund','full_refund') THEN v_buyer ELSE v_escrow.amount END,'sellerAmount',v_seller,'buyerAmount',v_buyer,'platformFee',v_commission,'reason',COALESCE(p_reason,''),'decidedBy',p_actor_id,'decidedAt',now(),'implemented',true),
    "updatedAt"=now(), "releasedAt"=CASE WHEN v_status='released' THEN now() ELSE "releasedAt" END,
    "releasedBy"=CASE WHEN v_status='released' THEN p_actor_id ELSE "releasedBy" END,
    "refundedAt"=CASE WHEN v_status='refunded' THEN now() ELSE "refundedAt" END,
    "refundedBy"=CASE WHEN v_status='refunded' THEN p_actor_id ELSE "refundedBy" END
  WHERE id=v_escrow.id;

  IF v_escrow.payment IS NOT NULL THEN
    UPDATE public.payments SET status=CASE WHEN v_status='refunded' THEN 'refunded' ELSE 'released' END, platform_fee=v_commission, dealer_amount=v_seller, updated_at=now() WHERE id=v_escrow.payment;
  END IF;

  v_event := public.kayad_record_financial_workflow_event_atomic('dispute',v_escrow.id,'dispute-resolution:'||v_escrow.id::TEXT,'financial_consequence',v_escrow.amount,'KES',NULL,jsonb_build_object('decision',p_decision,'buyerAmount',v_buyer,'sellerAmount',v_seller,'platformFee',v_commission));
  RETURN jsonb_build_object('id',v_escrow.id,'status',v_status,'buyerAmount',v_buyer,'sellerAmount',v_seller,'platformFee',v_commission,'event',v_event,'idempotent',false);
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_resolve_dispute_atomic(UUID,UUID,TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_resolve_dispute_atomic(UUID,UUID,TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT,TEXT) TO service_role;

-- -------------------------------------------------------------------------
-- Wave 2 certification query: returns violations rather than hiding them.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_validate_wave2_invariants()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_listing INTEGER; v_escrow INTEGER; v_settlement INTEGER; v_dispute INTEGER; v_media INTEGER;
BEGIN
  SELECT count(*) INTO v_listing FROM public.listing_entitlement_reservations r
  LEFT JOIN public.cars c ON c.id=r.listing_id
  WHERE c.id IS NULL;
  SELECT count(*) INTO v_escrow FROM public.escrows WHERE amount <= 0 OR COALESCE(commission,0)<0 OR COALESCE("sellerAmount",0)<0 OR COALESCE(commission,0)+COALESCE("sellerAmount",0)>amount;
  SELECT count(*) INTO v_settlement FROM public.inspection_settlements WHERE gross_amount < 0 OR commission_amount < 0 OR tax_amount < 0 OR net_amount < 0 OR ROUND(gross_amount-commission_amount-tax_amount,2)<>ROUND(net_amount,2);
  SELECT count(*) INTO v_dispute FROM public.escrows WHERE status IN ('released','refunded') AND "disputeWorkflowStatus"='resolved' AND "disputeResolution" IS NULL;
  SELECT count(*) INTO v_media FROM public.media_upload_jobs WHERE status='failed' AND attempts>=max_attempts;
  RETURN jsonb_build_object('listingOrphans',v_listing,'escrowViolations',v_escrow,'settlementViolations',v_settlement,'disputeResolutionViolations',v_dispute,'mediaDeadLetterCount',v_media,'pass',v_listing=0 AND v_escrow=0 AND v_settlement=0 AND v_dispute=0);
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_validate_wave2_invariants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_validate_wave2_invariants() TO service_role;
