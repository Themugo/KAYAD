-- Probes of the UNHARDENED Phase 13E schema (kayad_13e database). Each line prints the observed value.
BEGIN;
CREATE FUNCTION pg_temp.mku(r text) RETURNS uuid LANGUAGE plpgsql AS $$ DECLARE v uuid := gen_random_uuid(); BEGIN INSERT INTO public.users(id,name,email,role,status,email_verified) VALUES (v,'t',v||'@x.test',r,'approved',true); RETURN v; END $$;
CREATE FUNCTION pg_temp.mkc(o uuid, s text DEFAULT 'available') RETURNS uuid LANGUAGE plpgsql AS $$ DECLARE v uuid := gen_random_uuid(); BEGIN INSERT INTO public.cars(id,dealer_id,title,brand,model,year,price,status,approved) VALUES (v,o,'c','B','M',2020,1,s,true); RETURN v; END $$;
DO $$
DECLARE d uuid := pg_temp.mku('dealer'); dc uuid; u uuid := pg_temp.mku('user'); p uuid; n uuid; del uuid;
BEGIN
  dc := pg_temp.mkc(d); INSERT INTO private_seller_capabilities(user_id,status) VALUES (d,'approved');
  UPDATE private_seller_capabilities SET status='suspended' WHERE user_id=d;
  RAISE NOTICE 'PROBE dealer-owned listing status after capability suspension (expected available): %', (SELECT status FROM cars WHERE id=dc);
  p := pg_temp.mkc(u,'pending'); INSERT INTO private_seller_capabilities(user_id,status) VALUES (u,'approved');
  UPDATE private_seller_capabilities SET status='suspended' WHERE user_id=u;
  UPDATE cars SET status='available' WHERE id=p; n := pg_temp.mkc(u);
  RAISE NOTICE 'PROBE listing published while seller suspended (expected hidden): pending->% , new insert->%', (SELECT status FROM cars WHERE id=p), (SELECT status FROM cars WHERE id=n);
END $$;
DO $$
DECLARE u uuid := pg_temp.mku('user'); a uuid;
BEGIN
  a := pg_temp.mkc(u); INSERT INTO private_seller_capabilities(user_id,status) VALUES (u,'approved');
  UPDATE private_seller_capabilities SET status='suspended' WHERE user_id=u;
  UPDATE cars SET deleted_at=now() WHERE id=a;
  UPDATE private_seller_capabilities SET status='approved' WHERE user_id=u;
  RAISE NOTICE 'PROBE soft-deleted hidden listing after reinstatement (expected hidden): status=%, deleted_at set=%', (SELECT status FROM cars WHERE id=a), (SELECT deleted_at IS NOT NULL FROM cars WHERE id=a);
END $$;
ROLLBACK;
