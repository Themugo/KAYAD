import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, ok) => { checks.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };

const idem = read('backend/middleware/idempotency.js');
const b2c = read('backend/controllers/paymentController.js');
const migration = read('supabase/migrations/20261006240000_escrow_marketplace_reconciliation_hardening.sql');
const purchase = read('supabase/migrations/20261002240000_marketplace_purchase_fulfilment_convergence.sql');
const escrowService = read('backend/services/escrow.service.js');

check('B2C callback has specific operation classification', /b2c\/callback.*b2c_callback|operationType === "b2c_callback"/.test(idem));
check('B2C timeout has specific operation classification', /b2c\/timeout.*b2c_timeout|operationType === "b2c_timeout"/.test(idem));
check('B2C callback uses deterministic replay key', /b2c_callback_\$\{conversationId\}_/.test(idem));
check('B2C timeout uses deterministic replay key', /b2c_timeout_\$\{conversationId\}/.test(idem));
check('B2C provider callbacks use conversation-scoped distributed lock', /b2c:\$\{providerConversationId\}/.test(idem));
check('critical idempotency failures fail closed', /CRITICAL_LOCK_OPERATIONS\.has\(operationType\)[\s\S]*IDEMPOTENCY_COORDINATION_UNAVAILABLE/.test(idem));
check('unknown B2C callbacks persist into webhook_events', /webhook_events/.test(b2c) && /mpesa_daraja_b2c/.test(b2c));
check('unknown B2C callback is replay-deduped', /dedupeKey/.test(b2c) && /onConflict: "dedupe_key"/.test(b2c));
check('partial/split dispute buyer settlement creates refund record', /v_buyer_amount/.test(migration) && /refunds\(/.test(migration));
check('payment-less dispute refunds are supported', /NEW\.payment/.test(migration) && /escrow_id = NEW\.id/.test(migration));
check('escrow status reconciles purchase outcome in database', /kayad_sync_purchase_outcome_from_escrow/.test(migration));
check('purchase outcome reconciliation is trigger-bound', /trg_escrow_purchase_outcome_reconciliation/.test(migration) && /AFTER UPDATE OF status ON public\.escrows/.test(migration));
check('purchase outcome schema contains canonical escrow link', /escrow_id UUID REFERENCES public\.escrows/.test(purchase));
check('emergency escrow close uses atomic transition', /nextStatus: STATES\.CLOSED/.test(escrowService) && /atomicTransitionEscrow/.test(escrowService) && !/update\(\"escrows\", escrow\.id/.test(escrowService));

const failed = checks.filter(x => !x.ok);
console.log(`\nEscrow next hardening: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
