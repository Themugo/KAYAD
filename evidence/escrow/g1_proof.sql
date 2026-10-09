\set ON_ERROR_STOP off
BEGIN;
INSERT INTO users(id,name,email,role) VALUES ('11111111-1111-1111-1111-111111111111','B','b@x.test','user'),('22222222-2222-2222-2222-222222222222','S','s@x.test','individual_seller');
INSERT INTO escrow_accounts(account_name,bank_name,account_number,is_primary) VALUES ('KAYAD Escrow','Bank','0001',true);
-- exactly the columns createOptionalEscrowForOutcome / createEscrow write:
INSERT INTO escrows(id,buyer,seller,amount,status) VALUES ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',500000,'pending');
SAVEPOINT s1;
SELECT kayad_verify_escrow_funding_atomic('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','REF-1');
ROLLBACK TO s1;
SELECT status, custodian_account IS NULL AS no_custodian FROM escrows WHERE id='33333333-3333-3333-3333-333333333333';
ROLLBACK;
