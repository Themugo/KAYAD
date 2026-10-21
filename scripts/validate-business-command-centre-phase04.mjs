import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const admin = read('src/features/AdminView.tsx');
const routes = read('src/components/admin/AdminRouteSurface.tsx');
const inspectorUi = read('src/pages/admin/AdminInspectorApplications.jsx');
const inspectorRoutes = read('backend/routes/inspectorApplicationRoutes.js');
const inspectorController = read('backend/controllers/inspectorApplicationController.js');
const adminRoutes = read('backend/routes/adminRoutes.js');
const tests = read('src/__tests__/features/adminCommandCentre.test.tsx');
const checks = [
  ['approval workbench links dealer verification to canonical route', admin.includes("href: '/admin/dealer-verifications'") && routes.includes("'/admin/dealer-verifications': { component: AdminDealerVerifications }")],
  ['seller account workflow retains canonical route', admin.includes("href: '/admin/sellers'") && routes.includes("'/admin/sellers': { component: AdminSellers }")],
  ['inspector application workflow retains canonical route', admin.includes("href: '/admin/inspector-applications'") && routes.includes("'/admin/inspector-applications': { component: AdminInspectorApplications }")],
  ['vehicle moderation retains canonical route', admin.includes("href: '/admin/moderation'") && routes.includes("'/admin/moderation': { component: AdminCarModeration }")],
  ['document verification and inspection routes are distinct', admin.includes("href: '/admin/ntsa-queue'") && admin.includes("href: '/admin/inspections'") && routes.includes("'/admin/ntsa-queue': { component: AdminNtsaQueue }")],
  ['inspector review endpoints require protected reviewer role', inspectorRoutes.includes('protect, reviewerOnly') && inspectorRoutes.includes('router.post("/:id/approve"') && inspectorRoutes.includes('router.post("/:id/reject"')],
  ['inspector approval rejects non-pending or self-review', inspectorController.includes('application.status !== "pending"') && inspectorController.includes('Cannot approve your own application')],
  ['dealer decisions use decision-authority guard and atomic RPC', adminRoutes.includes('requireDecisionAuthority("dealer")') && adminRoutes.includes('kayad_apply_dealer_verification_atomic')],
  ['vehicle listing decisions use decision-authority guard', adminRoutes.includes('requireDecisionAuthority("listing")') && adminRoutes.includes('LISTING_MODERATION_BLOCKED')],
  ['inspector page has visible error and retry state', inspectorUi.includes('role="alert"') && inspectorUi.includes('Retry loading applications')],
  ['inspector refresh protects against stale response races', inspectorUi.includes('requestSequence.current') && inspectorUi.includes('requestId !== requestSequence.current')],
  ['tests assert canonical workflow route destinations', tests.includes('Command centre — canonical approval workbench') && tests.includes("'/admin/inspector-applications'")],
  ['no new approval API endpoints added by this phase', !admin.includes('/api/v4/') && !admin.includes('fetch("/api/approval-workbench')],
];
let failed = 0;
for (const [label, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); if (!pass) failed++; }
console.log(`Phase 04 source-contract validation: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
