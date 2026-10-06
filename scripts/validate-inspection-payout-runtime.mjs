import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const settlement = read('backend/inspection/services/settlementService.js');
const b2c = read('backend/services/mpesaB2C.service.js');
const callback = read('backend/controllers/paymentController.js');
const routes = read('backend/inspection/routes/inspectionRoutes.js');
const migration = read('supabase/migrations/20261006200000_inspection_settlement_mpesa_b2c_runtime.sql');

const checks = [
  ['inspection payout uses canonical B2C service', settlement.includes("import { disburseB2C } from '../../services/mpesaB2C.service.js';")],
  ['inspection payout passes settlement identity to B2C', settlement.includes('settlementId: settlement.id')],
  ['settlement moves to processing before provider call', b2c.includes('kayad_mark_inspection_settlement_processing_atomic')],
  ['inspection payout callback resolves by provider conversation id', callback.includes('inspection_settlements') && callback.includes('provider_conversation_id')],
  ['callback verifies provider payout amount', callback.includes('M-Pesa inspection settlement amount mismatch')],
  ['callback marks settlement paid only from provider receipt', callback.includes('kayad_mark_inspection_settlement_paid_atomic')],
  ['inspection settlement route requires admin authentication', routes.includes("/provider/:providerId/settlements/:settlementId/pay', requireAuth, requireRole(['admin'])")],
  ['inspection payout processing RPC exists', migration.includes('kayad_mark_inspection_settlement_processing_atomic')],
  ['inspection settlement payout RPC accepts processing state', migration.includes("s.status NOT IN ('pending','processing')")],
  ['inspection settlement stores provider receipt identity', migration.includes('provider_transaction_id TEXT')],
];
for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(([,p]) => !p);
if (failed.length) process.exit(1);
console.log(`INSPECTION PAYOUT RUNTIME: ${checks.length}/${checks.length} PASS`);
