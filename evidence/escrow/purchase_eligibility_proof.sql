\set ON_ERROR_STOP off
BEGIN;
INSERT INTO users(id,name,email,role) VALUES ('11111111-1111-1111-1111-111111111111','B','b@x.test','user'),('22222222-2222-2222-2222-222222222222','S','s@x.test','individual_seller');
-- three identical escrow-flagged cars
INSERT INTO cars(id,title,brand,model,year,price,dealer_id,escrow_enabled,status) VALUES
 ('a0000000-0000-0000-0000-00000000000a','A','T','M',2020,1000,'22222222-2222-2222-2222-222222222222',true,'available'),
 ('b0000000-0000-0000-0000-00000000000b','B','T','M',2020,1000,'22222222-2222-2222-2222-222222222222',true,'available'),
 ('c0000000-0000-0000-0000-00000000000c','C','T','M',2020,1000,'22222222-2222-2222-2222-222222222222',true,'available');
-- A: decision frozen false at initiation (platform paused / seller revoked) ; B: frozen true ; C: legacy payment with no key
INSERT INTO payments(id,user_id,car_id,amount,type,status,metadata) VALUES
 ('a1000000-0000-0000-0000-0000000000a1','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-00000000000a',1000,'purchase','pending','{"escrowEligible":false}'),
 ('b1000000-0000-0000-0000-0000000000b1','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-00000000000b',1000,'purchase','pending','{"escrowEligible":true}'),
 ('c1000000-0000-0000-0000-0000000000c1','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-00000000000c',1000,'purchase','pending','{}');
SELECT 'frozen=false' AS case, kayad_settle_purchase_payment_atomic('a1000000-0000-0000-0000-0000000000a1','R1')->>'settlement_mode' AS mode;
SELECT 'frozen=true ' AS case, kayad_settle_purchase_payment_atomic('b1000000-0000-0000-0000-0000000000b1','R2')->>'settlement_mode' AS mode;
SELECT 'legacy(no key)' AS case, kayad_settle_purchase_payment_atomic('c1000000-0000-0000-0000-0000000000c1','R3')->>'settlement_mode' AS mode;
ROLLBACK;
