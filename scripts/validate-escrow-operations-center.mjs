import fs from 'fs';
import path from 'path';
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const checks = [
  ['operations controller exists', fs.existsSync(path.join(root,'backend/controllers/escrowOperationsController.js'))],
  ['operations dashboard route', read('backend/routes/escrowRoutes.js').includes('router.get("/operations/dashboard", protect, escrowViewOnly')],
  ['operations case route', read('backend/routes/escrowRoutes.js').includes('router.get("/operations/case/:id", protect, escrowViewOnly')],
  ['reconciliation permission', read('backend/routes/escrowRoutes.js').includes('router.post("/operations/reconcile", protect, escrowReconcileOnly')],
  ['anomaly scan permission', read('backend/routes/escrowRoutes.js').includes('router.post("/operations/anomaly-scan", protect, escrowOperateOnly')],
  ['funding verification is reconciliation-controlled', read('backend/routes/escrowRoutes.js').includes('router.post("/:id/verify-funding", protect, escrowReconcileOnly')],
  ['forced close is emergency-controlled', read('backend/routes/escrowRoutes.js').includes('requireEscrowPermission("emergency_escrow_control")')],
  ['emergency close requires reason', read('backend/controllers/escrowController.js').includes('reason.length < 10')],
  ['emergency close audited', read('backend/controllers/escrowController.js').includes('logEscrowAction(escrow._id, "emergency_close"')],
  ['refund model maps to canonical refunds table', read('backend/models/_base.js').includes('Refund: "refunds"')],
  ['admin portal uses operations center', read('src/pages/admin/AdminEscrows.jsx').includes('Escrow Operations Center')],
  ['admin portal exposes case timeline', read('src/pages/admin/AdminEscrows.jsx').includes('Operational Timeline')],
  ['admin portal exposes reconciliation', read('src/pages/admin/AdminEscrows.jsx').includes('Reconcile')],
  ['admin portal exposes anomaly scan', read('src/pages/admin/AdminEscrows.jsx').includes('Scan Anomalies')],
  ['admin portal exposes emergency control only by permission', read('src/pages/admin/AdminEscrows.jsx').includes('canEmergency && selectedEscrow?.status === \'released\'')],
  ['escrow page unlocked by view permission', read('src/utils/permissions.ts').includes('"/admin/escrows":       PERM.VIEW_ESCROW')],
];
const failed = checks.filter(([,ok])=>!ok);
console.log(`Escrow Operations Center: ${checks.length-failed.length}/${checks.length} PASS`);
if (failed.length) { for (const [name] of failed) console.error(`FAIL: ${name}`); process.exit(1); }
