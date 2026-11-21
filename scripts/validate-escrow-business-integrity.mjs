import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const checks = [
  ['atomic escrow transition migration exists', fs.existsSync(path.join(root,'supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['ledger chart seeds escrow accounts', /INSERT INTO public\.ledger_accounts[\s\S]*'2000','Escrow Payable'[\s\S]*'5000','B2C Disbursement Payable'/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['escrow release consumes escrow payable', /'escrow_release'[\s\S]*'2000','5000'/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['escrow refund reclassifies to buyer payable', /'refund'[\s\S]*'2000','2100'/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['bank funding posts custody ledger entry', /'escrow-funding:'[\s\S]*'1200','2000'/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['dispute release uses escrow payable', /'dispute-release-seller:'[\s\S]*'2000','5000'/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['dispute refund reclassifies to buyer payable', /'dispute-refund:'[\s\S]*'2000','2100'/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['dealer payout has ledger adapter', /recordDealerPayout/.test(read('backend/services/ledgerService.js'))],
  ['B2C paid callback posts dealer payout ledger', /recordDealerPayout\([\s\S]*paidPayout/.test(read('backend/controllers/paymentController.js'))],
  ['B2C processing does not misuse transaction_id as idempotency key', !/p_transaction_id:\s*idempotencyKey/.test(read('backend/services/mpesaB2C.service.js'))],
  ['payout state machine rejects paid downgrade', /Paid payout is terminal/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['funding reference is unique', /uq_escrows_funding_reference/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['refund is reclassified, not falsely settled as cash', /'escrow-refund:'[\s\S]*'2000','2100'/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['refund settlement has separate cash-side ledger adapter', /recordRefundSettlement/.test(read('backend/services/ledgerService.js'))],
  ['release/refund financial writes occur inside atomic transition SQL', /PERFORM public\.kayad_post_ledger_entry_atomic/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['bank custody funding has release eligibility window', /autoReleaseEligibleAt.*make_interval/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['payout callback records actual provider transaction id', /p_transaction_id: result\.transactionId/.test(read('backend/controllers/paymentController.js'))],
  ['refund completion RPC exists', /kayad_complete_escrow_refund_atomic/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
  ['refund completion route is admin/idempotent protected', /\/\:id\/refund\/\:refundId\/complete[\s\S]*escrowAdminOnly[\s\S]*idempotencyCheck/.test(read('backend/routes/escrowRoutes.js'))],
  ['refund provider references are unique', /uq_refunds_provider_reference/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql'))],
];
let passed=0;
for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok) passed++; }
console.log(`Escrow business integrity: ${passed}/${checks.length} PASS`);
if(passed!==checks.length) process.exit(1);
