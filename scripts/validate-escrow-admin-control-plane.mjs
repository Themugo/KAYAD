import fs from 'node:fs';

const roles = fs.readFileSync('backend/config/roles.js','utf8');
const access = fs.readFileSync('backend/utils/escrowAccess.js','utf8');
const routes = fs.readFileSync('backend/routes/escrowRoutes.js','utf8');
const adminRoutes = fs.readFileSync('backend/routes/adminRoutes.js','utf8');
const controller = fs.readFileSync('backend/controllers/escrowController.js','utf8');
const frontend = fs.readFileSync('src/pages/admin/AdminEscrows.jsx','utf8');
const custody = fs.readFileSync('src/pages/admin/AdminEscrowCustody.jsx','utf8');

const checks = [
  ['granular escrow permissions exist', ['VIEW_ESCROW','OPERATE_ESCROW','APPROVE_ESCROW_RELEASE','APPROVE_ESCROW_REFUND','SETTLE_ESCROW_PAYOUT','RECONCILE_ESCROW','CONFIGURE_ESCROW','VIEW_ESCROW_AUDIT','EMERGENCY_ESCROW_CONTROL'].every(x=>roles.includes(x))],
  ['escrow officer is not a default money-moving release/refund role', !/escrow_officer:\s*\[[^\]]*APPROVE_ESCROW_RELEASE|escrow_officer:\s*\[[^\]]*APPROVE_ESCROW_REFUND/.test(roles)],
  ['escrow view middleware exists', access.includes('escrowViewOnly')],
  ['release has dedicated permission gate', routes.includes('escrowReleaseOnly')],
  ['refund has dedicated permission gate', routes.includes('escrowRefundOnly')],
  ['refund completion has settlement permission gate', routes.includes('escrowSettlementOnly')],
  ['admin escrow listing is not global adminOnly', !routes.includes('router.get("/", protect, adminOnly')],
  ['admin router escrow paths use escrow permission class', adminRoutes.includes('permission = PERMISSIONS.MANAGE_ESCROWS')],
  ['admin path regex boundaries are real regex word boundaries', !adminRoutes.includes('/\\\\b(')],
  ['admin escrow account numbers are masked', adminRoutes.includes('maskAccountNumber') && adminRoutes.includes('accountNumber: maskAccountNumber')],
  ['admin escrow list excludes phone/email/payment population', (()=>{ const x=controller.slice(controller.indexOf('export const getAllEscrows'), controller.indexOf('// =============================\n// 📄 GET USER ESCROWS')); return x.includes('populate("buyer", "name")') && x.includes('populate("seller", "name")') && !x.includes('.populate("car buyer seller payment")'); })()],
  ['portal gates release by permission', frontend.includes('canRelease')],
  ['portal gates refund by permission', frontend.includes('canRefund')],
  ['portal exposes control rights', frontend.includes('Escrow control plane')],
  ['custody portal gates configuration', custody.includes('canConfigure')],
];

let passed=0;
for (const [name, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok) passed++; }
console.log(`Escrow admin control-plane validation: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
