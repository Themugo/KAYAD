-- Personal listing lifecycle: real-database certification of kayad_personal_listing_lifecycle_atomic.
-- Run ONLY against a disposable local PostgreSQL built from supabase/migrations. One transaction, rolled back.
\set ON_ERROR_STOP on
BEGIN;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'ASSERTION FAILED: %', msg; END IF; RAISE NOTICE 'PASS: %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.mkuser(p_role text DEFAULT 'user') RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid := gen_random_uuid();
BEGIN INSERT INTO public.users (id, name, email, role, status, email_verified) VALUES (v, 't', v || '@example.test', p_role, 'approved', true); RETURN v; END $$;
CREATE OR REPLACE FUNCTION pg_temp.mkcar(p_owner uuid, p_status text DEFAULT 'available', p_approved boolean DEFAULT true) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid := gen_random_uuid();
BEGIN INSERT INTO public.cars (id, dealer_id, title, brand, model, year, price, status, approved, sold)
  VALUES (v, p_owner, 'car', 'B', 'M', 2020, 1000, p_status, p_approved, p_status = 'sold'); RETURN v; END $$;
-- returns the exception message (or 'OK:<status>') for an action
CREATE OR REPLACE FUNCTION pg_temp.act(p_car uuid, p_owner uuid, p_action text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r jsonb;
BEGIN
  BEGIN
    r := public.kayad_personal_listing_lifecycle_atomic(p_car, p_owner, p_action);
    RETURN 'OK:' || (r->>'status');
  EXCEPTION WHEN OTHERS THEN RETURN SQLERRM; END;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.st(p_car uuid) RETURNS text LANGUAGE sql AS $$ SELECT status FROM public.cars WHERE id = p_car $$;

-- T1 owner happy path: hide -> publish -> hide -> mark sold, with an audit row per committed change
DO $$ DECLARE u uuid := pg_temp.mkuser(); c uuid := pg_temp.mkcar(u); n int;
BEGIN
  PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'OK:hidden', 'owner can hide a published listing');
  PERFORM pg_temp.ok(pg_temp.st(c) = 'hidden', 'listing is hidden after hide');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'LISTING_NOT_PUBLISHED', 'hiding twice is rejected');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'publish') = 'OK:available', 'owner can republish a seller-hidden listing');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'publish') = 'LISTING_NOT_ELIGIBLE_TO_PUBLISH', 'republishing a published listing is rejected');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'mark_sold') = 'OK:sold', 'owner can mark an eligible listing sold');
  PERFORM pg_temp.ok((SELECT sold FROM public.cars WHERE id=c), 'sold flag set with status');
  SELECT count(*) INTO n FROM public.personal_listing_lifecycle_events WHERE car_id=c AND seller_user_id=u AND actor_user_id=u;
  PERFORM pg_temp.ok(n = 3, 'audit rows equal committed changes (hide, publish, mark_sold) and identify actor');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'publish') = 'LISTING_STATE_LOCKED', 'sold listing cannot be republished');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'LISTING_STATE_LOCKED', 'sold listing cannot be hidden');
  SELECT count(*) INTO n FROM public.personal_listing_lifecycle_events WHERE car_id=c;
  PERFORM pg_temp.ok(n = 3, 'rejected actions write no audit row');
END $$;

-- T2 ownership, identity and input validation
DO $$ DECLARE u uuid := pg_temp.mkuser(); o uuid := pg_temp.mkuser(); d uuid := pg_temp.mkuser('dealer'); a uuid := pg_temp.mkuser('admin');
  c uuid := pg_temp.mkcar(u); dc uuid := pg_temp.mkcar(d);
BEGIN
  PERFORM pg_temp.ok(pg_temp.act(c,o,'hide') = 'LISTING_NOT_FOUND', 'another personal account cannot act on the listing');
  PERFORM pg_temp.ok(pg_temp.act(c,gen_random_uuid(),'hide') = 'PERSONAL_ACCOUNT_REQUIRED', 'unknown owner identity is rejected');
  PERFORM pg_temp.ok(pg_temp.act(gen_random_uuid(),u,'hide') = 'LISTING_NOT_FOUND', 'unknown listing is not found');
  PERFORM pg_temp.ok(pg_temp.act(dc,d,'hide') = 'PERSONAL_ACCOUNT_REQUIRED', 'dealer cannot use the personal lifecycle on its own listing');
  PERFORM pg_temp.ok(pg_temp.st(dc) = 'available', 'dealer listing unchanged');
  PERFORM pg_temp.ok(pg_temp.act(c,a,'hide') = 'PERSONAL_ACCOUNT_REQUIRED', 'staff cannot use the personal lifecycle');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'delete') = 'INVALID_LISTING_ACTION', 'unsupported action rejected');
  PERFORM pg_temp.ok(pg_temp.st(c) = 'available', 'listing untouched by rejected calls');
END $$;

-- T3 auction, bid, escrow and purchase protections
DO $$ DECLARE u uuid := pg_temp.mkuser(); b uuid := pg_temp.mkuser(); c uuid; p uuid; e uuid; s text; n int := 0;
BEGIN
  c := pg_temp.mkcar(u);
  SET LOCAL session_replication_role = replica;  -- test setup only: the private-seller auction backstop trigger would otherwise (correctly) refuse this state
  UPDATE public.cars SET auction_status='live' WHERE id=c;
  SET LOCAL session_replication_role = origin;
  PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'AUCTION_OR_BID_LOCK', 'live auction blocks hide');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'mark_sold') = 'AUCTION_OR_BID_LOCK', 'live auction blocks mark sold');
  c := pg_temp.mkcar(u); INSERT INTO public.bids (car_id, amount, user_id) VALUES (c, 500, b);
  PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'AUCTION_OR_BID_LOCK', 'an existing bid row blocks hide');
  c := pg_temp.mkcar(u); UPDATE public.cars SET bids_count=2 WHERE id=c;
  PERFORM pg_temp.ok(pg_temp.act(c,u,'mark_sold') = 'AUCTION_OR_BID_LOCK', 'bid counter blocks mark sold');
  c := pg_temp.mkcar(u); UPDATE public.cars SET highest_bidder_id=b WHERE id=c;
  PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'AUCTION_OR_BID_LOCK', 'winning bidder blocks hide');
  FOREACH s IN ARRAY ARRAY['pending','funded','vehicle_confirmed','delivered','disputed'] LOOP
    c := pg_temp.mkcar(u); INSERT INTO public.escrows (car, buyer, seller, amount, status) VALUES (c, b, u, 1000, s);
    PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'TRANSACTION_LOCK', 'active escrow (' || s || ') blocks hide');
    PERFORM pg_temp.ok(pg_temp.act(c,u,'mark_sold') = 'TRANSACTION_LOCK', 'active escrow (' || s || ') blocks mark sold');
  END LOOP;
  c := pg_temp.mkcar(u); INSERT INTO public.escrows (car, buyer, seller, amount, status) VALUES (c, b, u, 1000, 'refunded');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'OK:hidden', 'a terminal (refunded) escrow does not block');
  FOREACH s IN ARRAY ARRAY['payment_received','refund_pending','ready_for_collection','collected','transfer_pending','disputed'] LOOP
    c := pg_temp.mkcar(u); INSERT INTO public.payments (user_id, car_id, amount) VALUES (b, c, 1000) RETURNING id INTO p;
    INSERT INTO public.purchase_outcomes (car_id, buyer_user_id, seller_user_id, payment_id, settlement_mode, status, amount) VALUES (c, b, u, p, 'direct', s, 1000);
    PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'TRANSACTION_LOCK', 'purchase outcome (' || s || ') blocks hide');
    PERFORM pg_temp.ok(pg_temp.act(c,u,'mark_sold') = 'TRANSACTION_LOCK', 'purchase outcome (' || s || ') blocks mark sold');
  END LOOP;
  c := pg_temp.mkcar(u,'reserved');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'LISTING_STATE_LOCKED', 'reserved listing is locked');
  c := pg_temp.mkcar(u); UPDATE public.cars SET deleted_at = now() WHERE id=c;
  PERFORM pg_temp.ok(pg_temp.act(c,u,'publish') = 'LISTING_REMOVED', 'soft-deleted listing cannot be restored through the lifecycle route');
END $$;

-- T4 moderation and policy hides can never be reversed by the seller
DO $$ DECLARE u uuid := pg_temp.mkuser(); m uuid := pg_temp.mkuser('admin'); c uuid;
BEGIN
  c := pg_temp.mkcar(u,'hidden');   -- hidden with no seller_hide event (moderator / legacy)
  PERFORM pg_temp.ok(pg_temp.act(c,u,'publish') = 'LISTING_NOT_SELLER_HIDDEN', 'a hide with no seller event cannot be republished');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'mark_sold') = 'LISTING_NOT_SELLER_HIDDEN', 'a non-seller hide cannot be marked sold');
  c := pg_temp.mkcar(u);
  PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'OK:hidden', 'seller hides');
  INSERT INTO public.personal_listing_lifecycle_events (car_id, seller_user_id, actor_user_id, actor_type, action, previous_status, next_status)
    VALUES (c, u, m, 'moderator', 'moderation_hide', 'hidden', 'hidden');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'publish') = 'LISTING_NOT_SELLER_HIDDEN', 'moderator hide after seller hide cannot be undone by seller');
  c := pg_temp.mkcar(u);
  PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'OK:hidden', 'seller hides (policy case)');
  INSERT INTO public.private_seller_listing_visibility_events (car_id, seller_user_id, previous_status, suspension_status) VALUES (c, u, 'available', 'suspended');
  PERFORM pg_temp.ok(pg_temp.act(c,u,'publish') = 'LISTING_POLICY_HIDDEN', 'account-level policy hide cannot be undone by seller');
  c := pg_temp.mkcar(u,'hidden',false);
  PERFORM pg_temp.ok(pg_temp.act(c,u,'publish') = 'LISTING_NOT_ELIGIBLE_TO_PUBLISH', 'unapproved listing cannot be published by seller');
  c := pg_temp.mkcar(u);
  PERFORM pg_temp.ok(pg_temp.act(c,u,'hide') = 'OK:hidden', 'seller hides (capability case)');
  INSERT INTO public.private_seller_capabilities (user_id, status) VALUES (u, 'suspended') ON CONFLICT (user_id) DO UPDATE SET status='suspended';
  PERFORM pg_temp.ok(pg_temp.act(c,u,'publish') = 'SELLER_CAPABILITY_BLOCKED', 'suspended seller capability blocks republish');
END $$;
ROLLBACK;
