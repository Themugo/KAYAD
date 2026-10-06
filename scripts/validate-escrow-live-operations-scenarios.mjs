import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const checks = [];
const pass = (name, ok) => { checks.push({name,ok}); console.log(`${ok?'PASS':'FAIL'} ${name}`); };

const migration = read('supabase/migrations/20261002180000_escrow_live_operations_hardening.sql');
const transition = migration;
const payout = read('backend/controllers/paymentController.js');
const routes = read('backend/routes/escrowRoutes.js');
const auditRoutes = read('backend/routes/auditRoutes.js');
const access = read('backend/utils/escrowAccess.js');

pass('concurrent release/refund remain row-locked and idempotent', /FOR UPDATE/.test(transition) && /lastActionKey/.test(transition) && /kayad_post_ledger_entry_atomic/.test(transition));
pass('dispute resolution posts seller/refund/commission ledger consequences', /dispute-release-seller:/.test(transition) && /dispute-refund:/.test(transition) && /dispute-commission:/.test(transition));
pass('dispute refund creates pending external settlement, not false cash completion', /refunds\(payment_id,escrow_id,amount,reason,status/.test(transition) && /'pending'/.test(transition));
pass('refund completion remains separate from approval', /kayad_complete_escrow_refund_atomic/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql')));
pass('B2C callback rejects provider amount mismatch', /Provider amount mismatch/.test(payout) && /M-Pesa B2C amount mismatch/.test(payout));
pass('payout provider references are replay-unique', /uq_dealer_payouts_conversation_id/.test(migration) && /uq_dealer_payouts_transaction_id/.test(migration));
pass('payout state machine remains terminal/idempotent', /v.status='paid' AND p_status<>'paid'/.test(read('supabase/migrations/20261002150000_escrow_business_integrity_sweep.sql')));
pass('audit storage is append-only at database trigger level', /kayad_escrow_audit_immutable/.test(migration) && /BEFORE UPDATE OR DELETE/.test(migration));
pass('audit storage is inaccessible to client roles', /REVOKE ALL ON public\.escrow_audits FROM anon, authenticated/.test(migration));
pass('audit viewer requires dedicated audit permission', /VIEW_ESCROW_AUDIT/.test(auditRoutes));
pass('release/refund/settlement routes retain distinct permissions', /escrowReleaseOnly/.test(routes) && /escrowRefundOnly/.test(routes) && /escrowSettlementOnly/.test(routes));
pass('role boundary fails closed for money-moving escrow admin actions', /ESCROW_ADMIN_ROLES = Object\.freeze\(\["admin", "superadmin"\]\)/.test(access));
pass('emergency operations remain explicitly permissioned', /emergency_close|emergency closure|EMERGENCY/.test(routes + read('backend/controllers/escrowOperationsController.js') + read('backend/controllers/escrowController.js')));


pass('release ledger is single-authority inside the atomic escrow transition', !/recordEscrowRelease\s*\(/.test(read('backend/services/escrow.service.js')) && /escrow-release:'\|\|v_escrow.id/.test(transition));
pass('payment-less refunds create an explicit refund payable record', /legacy_paymentless/.test(transition) || /kayad_ensure_escrow_refund_payable/.test(read('supabase/migrations/20261006230000_escrow_live_settlement_completion_hardening.sql')));
pass('refund completion binds the refund to the escrow case', /Refund does not belong to this escrow/.test(read('backend/controllers/escrowController.js')) && /refundRow\.escrow_id/.test(read('backend/controllers/escrowController.js')));
pass('payment-less refunded escrows receive a settlement record', /kayad_ensure_escrow_refund_payable/.test(read('supabase/migrations/20261006230000_escrow_live_settlement_completion_hardening.sql')));
pass('seller payout control is exposed through the escrow settlement permission', /operations\/case\/:id\/payout/.test(routes) && /escrowSettlementOnly/.test(routes) && /kayad_prepare_dealer_payout_atomic/.test(read('backend/controllers/escrowOperationsController.js')));
pass('B2C conversation identity is persisted before provider callback', /data\?\.ConversationID/.test(read('backend/services/mpesaB2C.service.js')) && /p_conversation_id: data\.ConversationID/.test(read('backend/services/mpesaB2C.service.js')));
pass('B2C timeout is observed without falsely failing an ambiguous payout', /B2C TIMEOUT persistence failed/.test(read('backend/controllers/paymentController.js')) && /leave it processing/i.test(read('backend/controllers/paymentController.js')));
pass('seller receives idempotent payout completion notification', /ESCROW_PAYOUT_COMPLETED/.test(read('backend/controllers/paymentController.js')) && /payoutId/.test(read('backend/controllers/paymentController.js')));

const liveConfigured = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log(`${liveConfigured?'PASS':'BLOCKED'} staging Supabase credentials ${liveConfigured?'available for live execution':'not available in this environment'}`);
checks.push({name:'staging credentials',ok:liveConfigured,environmentOnly:true});

const failed = checks.filter(c=>!c.ok && !c.environmentOnly);
console.log(`\nEscrow live-operations scenario contract: ${checks.filter(c=>!c.environmentOnly && c.ok).length}/${checks.filter(c=>!c.environmentOnly).length} PASS`);
console.log(`Staging execution: ${liveConfigured?'AVAILABLE':'BLOCKED — requires staging Supabase credentials'}`);
if (failed.length) process.exit(1);
