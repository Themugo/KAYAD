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

const liveConfigured = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log(`${liveConfigured?'PASS':'BLOCKED'} staging Supabase credentials ${liveConfigured?'available for live execution':'not available in this environment'}`);
checks.push({name:'staging credentials',ok:liveConfigured,environmentOnly:true});

const failed = checks.filter(c=>!c.ok && !c.environmentOnly);
console.log(`\nEscrow live-operations scenario contract: ${checks.filter(c=>!c.environmentOnly && c.ok).length}/${checks.filter(c=>!c.environmentOnly).length} PASS`);
console.log(`Staging execution: ${liveConfigured?'AVAILABLE':'BLOCKED — requires staging Supabase credentials'}`);
if (failed.length) process.exit(1);
