-- Phase 13F: real-database certification of the private-seller capability + listing visibility lifecycle.
-- Run ONLY against a disposable local PostgreSQL built from supabase/migrations (see scripts/validate-phase13f-db.sh).
-- Everything runs inside one transaction that is rolled back; any failed assertion aborts with a clear message.
\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'ASSERTION FAILED: %', msg; END IF; RAISE NOTICE 'PASS: %', msg; END $$;

CREATE OR REPLACE FUNCTION pg_temp.mkuser(p_role text DEFAULT 'user', p_status text DEFAULT 'approved') RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid := gen_random_uuid();
BEGIN INSERT INTO public.users (id, name, email, role, status, email_verified) VALUES (v, 't', v || '@example.test', p_role, p_status, true); RETURN v; END $$;

CREATE OR REPLACE FUNCTION pg_temp.mkcar(p_owner uuid, p_status text DEFAULT 'available', p_approved boolean DEFAULT true, p_deleted boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid := gen_random_uuid();
BEGIN INSERT INTO public.cars (id, dealer_id, title, brand, model, year, price, status, approved, deleted_at)
  VALUES (v, p_owner, 'car', 'B', 'M', 2020, 1000, p_status, p_approved, CASE WHEN p_deleted THEN now() END); RETURN v; END $$;

CREATE OR REPLACE FUNCTION pg_temp.cs(p_car uuid) RETURNS text LANGUAGE sql AS $$ SELECT status FROM public.cars WHERE id = p_car $$;
CREATE OR REPLACE FUNCTION pg_temp.cap(p_user uuid, p_to text) RETURNS void LANGUAGE sql AS $$
  UPDATE public.private_seller_capabilities SET status = p_to, updated_at = now() WHERE user_id = p_user $$;
CREATE OR REPLACE FUNCTION pg_temp.open_events(p_user uuid) RETURNS int LANGUAGE sql AS $$
  SELECT count(*)::int FROM public.private_seller_listing_visibility_events WHERE seller_user_id = p_user AND restored_at IS NULL $$;

-- ---------------------------------------------------------------- T1 suspension hides only eligible public listings
DO $$
DECLARE u uuid := pg_temp.mkuser(); other uuid := pg_temp.mkuser(); d uuid := pg_temp.mkuser('dealer');
  a uuid; sold uuid; res uuid; pend uuid; dr uuid; mh uuid; unappr uuid; del uuid; oc uuid; dc uuid;
BEGIN
  a := pg_temp.mkcar(u); sold := pg_temp.mkcar(u,'sold'); res := pg_temp.mkcar(u,'reserved'); pend := pg_temp.mkcar(u,'pending');
  dr := pg_temp.mkcar(u,'draft'); mh := pg_temp.mkcar(u,'hidden'); unappr := pg_temp.mkcar(u,'available',false); del := pg_temp.mkcar(u,'available',true,true);
  oc := pg_temp.mkcar(other); dc := pg_temp.mkcar(d);
  INSERT INTO public.private_seller_capabilities (user_id, status) VALUES (u, 'approved');
  PERFORM pg_temp.ok(pg_temp.cs(a) = 'available', 'T1 approved seller listing stays public');
  PERFORM pg_temp.cap(u, 'suspended');
  PERFORM pg_temp.ok(pg_temp.cs(a) = 'hidden', 'T1 suspension hides the published listing');
  PERFORM pg_temp.ok(pg_temp.cs(sold)='sold' AND pg_temp.cs(res)='reserved' AND pg_temp.cs(pend)='pending' AND pg_temp.cs(dr)='draft' AND pg_temp.cs(mh)='hidden', 'T1 sold/reserved/pending/draft/manual-hidden untouched');
  PERFORM pg_temp.ok(pg_temp.cs(unappr)='available' AND pg_temp.cs(del)='available', 'T1 unapproved and soft-deleted rows untouched (not selected)');
  PERFORM pg_temp.ok(pg_temp.cs(oc)='available' AND pg_temp.cs(dc)='available', 'T1 other users and dealer inventory untouched');
  PERFORM pg_temp.ok((SELECT dealer_id FROM public.cars WHERE id=a) = u, 'T1 ownership preserved');
  PERFORM pg_temp.ok(pg_temp.open_events(u) = 1, 'T1 exactly one tracked event (only the listing hidden by policy)');
  PERFORM pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.private_seller_listing_visibility_events WHERE car_id = mh), 'T1 manually hidden listing is NOT tracked');
  -- T2 retry / escalate
  PERFORM pg_temp.cap(u, 'suspended');
  PERFORM pg_temp.ok(pg_temp.open_events(u) = 1, 'T2 repeating the same decision creates no duplicate event');
  PERFORM pg_temp.cap(u, 'revoked');
  PERFORM pg_temp.ok(pg_temp.open_events(u) = 1 AND pg_temp.cs(a)='hidden', 'T2 suspended->revoked keeps one event, listing stays hidden');
  -- T3 reinstatement
  PERFORM pg_temp.cap(u, 'approved');
  PERFORM pg_temp.ok(pg_temp.cs(a)='available', 'T3 reinstatement restores the policy-hidden listing');
  PERFORM pg_temp.ok(pg_temp.cs(mh)='hidden' AND pg_temp.cs(sold)='sold' AND pg_temp.cs(pend)='pending' AND pg_temp.cs(dr)='draft', 'T3 manual-hidden and non-public states are NOT published');
  PERFORM pg_temp.ok(pg_temp.open_events(u) = 0 AND (SELECT restore_outcome FROM public.private_seller_listing_visibility_events WHERE car_id=a) = 'restored', 'T3 event closed with outcome restored');
  PERFORM pg_temp.cap(u, 'approved');
  PERFORM pg_temp.ok(pg_temp.cs(a)='available' AND pg_temp.cs(mh)='hidden', 'T3 repeated approval is a no-op');
  -- second cycle works
  PERFORM pg_temp.cap(u, 'suspended'); PERFORM pg_temp.cap(u, 'approved');
  PERFORM pg_temp.ok(pg_temp.cs(a)='available' AND (SELECT count(*) FROM public.private_seller_listing_visibility_events WHERE car_id=a) = 2, 'T3 a second suspend/restore cycle records a second event');
END $$;

-- ---------------------------------------------------------------- T4/T5/T6 restoration eligibility
DO $$
DECLARE u uuid := pg_temp.mkuser(); u2 uuid := pg_temp.mkuser(); a uuid; b uuid; c uuid;
BEGIN
  a := pg_temp.mkcar(u); b := pg_temp.mkcar(u); c := pg_temp.mkcar(u);
  INSERT INTO public.private_seller_capabilities (user_id, status) VALUES (u, 'approved');
  PERFORM pg_temp.cap(u, 'suspended');
  UPDATE public.cars SET status = 'sold' WHERE id = a;                       -- admin marks sold while hidden
  UPDATE public.cars SET deleted_at = now() WHERE id = b;                    -- deleted while hidden
  UPDATE public.cars SET dealer_id = u2 WHERE id = c;                        -- transferred while hidden
  PERFORM pg_temp.cap(u, 'approved');
  PERFORM pg_temp.ok(pg_temp.cs(a) = 'sold', 'T4 listing whose state changed while suspended keeps its current state');
  PERFORM pg_temp.ok(pg_temp.cs(b) = 'hidden', 'T5 soft-deleted listing is not restored');
  PERFORM pg_temp.ok(pg_temp.cs(c) = 'hidden' AND (SELECT dealer_id FROM public.cars WHERE id=c) = u2, 'T6 transferred listing is not restored and not re-owned');
  PERFORM pg_temp.ok(pg_temp.open_events(u) = 0, 'T4-6 every event closed after reinstatement');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.private_seller_listing_visibility_events WHERE seller_user_id=u AND restore_outcome='skipped_ineligible') = 3, 'T4-6 ineligible listings are recorded as skipped_ineligible');
END $$;

-- ---------------------------------------------------------------- T7 dealer isolation
DO $$
DECLARE d uuid := pg_temp.mkuser('dealer'); dc uuid;
BEGIN
  dc := pg_temp.mkcar(d);
  INSERT INTO public.private_seller_capabilities (user_id, status) VALUES (d, 'approved');   -- stray row on a dealer account
  PERFORM pg_temp.cap(d, 'suspended');
  PERFORM pg_temp.ok(pg_temp.cs(dc) = 'available' AND pg_temp.open_events(d) = 0, 'T7 a capability row can never hide dealer-owned inventory');
END $$;

-- ---------------------------------------------------------------- T8 backstop (publish while suspended)
DO $$
DECLARE u uuid := pg_temp.mkuser(); p uuid; n uuid; free uuid := pg_temp.mkuser(); fc uuid; ap uuid := pg_temp.mkuser(); ac uuid;
BEGIN
  INSERT INTO public.private_seller_capabilities (user_id, status) VALUES (u, 'approved'), (ap, 'approved');
  p := pg_temp.mkcar(u, 'pending');
  PERFORM pg_temp.cap(u, 'suspended');
  UPDATE public.cars SET status = 'available' WHERE id = p;                  -- e.g. admin approves a pending listing
  PERFORM pg_temp.ok(pg_temp.cs(p) = 'hidden' AND pg_temp.open_events(u) = 1, 'T8 listing published while suspended is hidden immediately and tracked');
  n := pg_temp.mkcar(u);                                                       -- insert racing / bypassing the API
  PERFORM pg_temp.ok(pg_temp.cs(n) = 'hidden', 'T8 a new public listing for a suspended seller is hidden');
  PERFORM pg_temp.cap(u, 'approved');
  PERFORM pg_temp.ok(pg_temp.cs(p) = 'available' AND pg_temp.cs(n) = 'available', 'T8 reinstatement restores backstop-tracked listings');
  fc := pg_temp.mkcar(free); ac := pg_temp.mkcar(ap);
  UPDATE public.cars SET price = price + 1 WHERE id IN (fc, ac);
  PERFORM pg_temp.ok(pg_temp.cs(fc) = 'available' AND pg_temp.cs(ac) = 'available', 'T8 users without a capability row and approved sellers are unaffected');
END $$;

-- ---------------------------------------------------------------- T9 legacy backfill is deterministic and idempotent
DO $$
DECLARE l1 uuid := pg_temp.mkuser('individual_seller','approved'); l2 uuid := pg_temp.mkuser('individual_seller','pending');
  l3 uuid := pg_temp.mkuser('individual_seller','suspended'); l4 uuid := pg_temp.mkuser('individual_seller','rejected'); b uuid := pg_temp.mkuser('user','approved'); before_n int; after_n int;
BEGIN
  INSERT INTO public.private_seller_capabilities (user_id, status, source)
  SELECT u.id, CASE u.status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' WHEN 'suspended' THEN 'suspended' ELSE 'pending' END, 'legacy_backfill'
  FROM public.users u WHERE u.role = 'individual_seller' ON CONFLICT (user_id) DO NOTHING;
  SELECT count(*) INTO before_n FROM public.private_seller_capabilities;
  INSERT INTO public.private_seller_capabilities (user_id, status, source)
  SELECT u.id, 'pending', 'legacy_backfill' FROM public.users u WHERE u.role = 'individual_seller' ON CONFLICT (user_id) DO NOTHING;
  SELECT count(*) INTO after_n FROM public.private_seller_capabilities;
  PERFORM pg_temp.ok(before_n = after_n, 'T9 backfill re-run changes nothing');
  PERFORM pg_temp.ok((SELECT status FROM public.private_seller_capabilities WHERE user_id=l1)='approved' AND (SELECT status FROM public.private_seller_capabilities WHERE user_id=l2)='pending'
     AND (SELECT status FROM public.private_seller_capabilities WHERE user_id=l3)='suspended' AND (SELECT status FROM public.private_seller_capabilities WHERE user_id=l4)='rejected', 'T9 backfill copies users.status deterministically');
  PERFORM pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.private_seller_capabilities WHERE user_id=b), 'T9 buyers are never backfilled');
  PERFORM pg_temp.ok((SELECT role FROM public.users WHERE id=l1)='individual_seller', 'T9 no role conversion');
END $$;

-- ---------------------------------------------------------------- T10 constraints
DO $$
DECLARE u uuid := pg_temp.mkuser(); failed boolean;
BEGIN
  INSERT INTO public.private_seller_capabilities (user_id, status) VALUES (u, 'pending');
  failed := false; BEGIN INSERT INTO public.private_seller_capabilities (user_id, status) VALUES (u, 'pending'); EXCEPTION WHEN unique_violation THEN failed := true; END;
  PERFORM pg_temp.ok(failed, 'T10 one capability row per users.id (duplicate application rejected)');
  failed := false; BEGIN UPDATE public.private_seller_capabilities SET status = 'god' WHERE user_id = u; EXCEPTION WHEN check_violation THEN failed := true; END;
  PERFORM pg_temp.ok(failed, 'T10 invalid status rejected');
  failed := false; BEGIN INSERT INTO public.private_seller_capabilities (user_id, status, source) VALUES (pg_temp.mkuser(), 'pending', 'hack'); EXCEPTION WHEN check_violation THEN failed := true; END;
  PERFORM pg_temp.ok(failed, 'T10 invalid source rejected');
  failed := false; BEGIN INSERT INTO public.private_seller_capabilities (user_id, status) VALUES (gen_random_uuid(), 'pending'); EXCEPTION WHEN foreign_key_violation THEN failed := true; END;
  PERFORM pg_temp.ok(failed, 'T10 capability must reference an existing users.id');
END $$;

-- ---------------------------------------------------------------- T11 RLS: no client role can read or change approval state
DO $$
DECLARE u uuid := pg_temp.mkuser(); denied boolean; r text;
BEGIN
  INSERT INTO public.private_seller_capabilities (user_id, status) VALUES (u, 'pending');
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    EXECUTE format('SET LOCAL ROLE %I', r);
    denied := false; BEGIN PERFORM 1 FROM public.private_seller_capabilities LIMIT 1; EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
    RESET ROLE; PERFORM pg_temp.ok(denied, format('T11 %s cannot read private_seller_capabilities', r));
    EXECUTE format('SET LOCAL ROLE %I', r);
    denied := false; BEGIN UPDATE public.private_seller_capabilities SET status = 'approved' WHERE user_id = u; EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
    RESET ROLE; PERFORM pg_temp.ok(denied, format('T11 %s cannot self-approve', r));
    EXECUTE format('SET LOCAL ROLE %I', r);
    denied := false; BEGIN PERFORM 1 FROM public.private_seller_listing_visibility_events LIMIT 1; EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
    RESET ROLE; PERFORM pg_temp.ok(denied, format('T11 %s cannot read visibility events', r));
  END LOOP;
  PERFORM pg_temp.ok((SELECT status FROM public.private_seller_capabilities WHERE user_id = u) = 'pending', 'T11 state unchanged after denied writes');
  PERFORM pg_temp.ok(NOT has_function_privilege('anon', 'public.apply_private_seller_listing_visibility()', 'EXECUTE') AND NOT has_function_privilege('authenticated', 'public.enforce_private_seller_listing_visibility()', 'EXECUTE'), 'T11 trigger functions are not executable by client roles');
END $$;

-- ---------------------------------------------------------------- T12 buyer account state is independent
DO $$
DECLARE u uuid := pg_temp.mkuser('user','approved');
BEGIN
  INSERT INTO public.private_seller_capabilities (user_id, status) VALUES (u, 'pending');
  PERFORM pg_temp.cap(u, 'approved'); PERFORM pg_temp.cap(u, 'suspended'); PERFORM pg_temp.cap(u, 'revoked');
  PERFORM pg_temp.ok((SELECT role FROM public.users WHERE id=u)='user' AND (SELECT status FROM public.users WHERE id=u)='approved', 'T12 users.role/status (buyer identity) untouched through the whole lifecycle');
  PERFORM pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.dealers WHERE "user" = u), 'T12 no dealer record created or approved by seller lifecycle');
END $$;

ROLLBACK;
\echo PHASE13F DB LIFECYCLE SUITE COMPLETE
