\set ON_ERROR_STOP off
BEGIN;
INSERT INTO users(id,name,email,role) VALUES ('11111111-1111-1111-1111-111111111111','B','b@x.test','user'),('22222222-2222-2222-2222-222222222222','S','s@x.test','individual_seller');
INSERT INTO escrow_accounts(id,account_name,bank_name,account_number,is_primary) VALUES ('99999999-9999-9999-9999-999999999999','KAYAD Escrow','Bank','0001',true);
INSERT INTO escrows(id,buyer,seller,amount,status) VALUES ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',500000,'pending');
SELECT 'verify' AS step, kayad_verify_escrow_funding_atomic('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','REF-1')->>'status' AS result;
SELECT 'bound' AS step, status, custodian_account::text, funding_method, funding_reference FROM escrows WHERE id='33333333-3333-3333-3333-333333333333';
-- second escrow, same reference must be refused
INSERT INTO escrows(id,buyer,seller,amount,status) VALUES ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',100,'pending');
SELECT kayad_verify_escrow_funding_atomic('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','REF-1');
ROLLBACK;
