import fs from 'node:fs';

const adminView = fs.readFileSync('src/features/AdminView.tsx', 'utf8');
const adminRoutes = fs.readFileSync('backend/routes/adminRoutes.js', 'utf8');
const heroController = fs.readFileSync('backend/controllers/heroSlideController.js', 'utf8');
const apiExports = fs.readFileSync('src/api/api.exports.ts', 'utf8');

const checks = [
  ['dashboard data sources use allSettled independently', adminView.includes('Promise.allSettled(')],
  ['dashboard no longer clears every source on one request failure', !/setStats\(\{\}\);\s*setUsers\(\[\]\);\s*setCars\(\[\]\);\s*setAuditLogs\(\[\]\);/.test(adminView)],
  ['stats have explicit loading/ready/stale/error states', /statsStatus, setStatsStatus/.test(adminView) && /'loading' \| 'ready' \| 'stale' \| 'error'/.test(adminView)],
  ['malformed/missing statistics remain unavailable rather than zero', /typeof value !== 'number' \|\| !Number\.isFinite\(value\)/.test(adminView) && adminView.includes("'Unavailable'")],
  ['dealer approval workflow opens the existing dealer verification route', /label: 'Dealers', href: '\/admin\/dealer-verifications'/.test(adminView)],
  ['vehicle listing approval workflow opens the existing moderation route', /label: 'Vehicle Listings', href: '\/admin\/moderation'/.test(adminView)],
  ['customer support queue opens the existing support workspace', /to="\/admin\/support" aria-label="Open support tickets queue"/.test(adminView)],
  ['workflow links and review actions have accessible names and keyboard focus styling', adminView.includes("aria-label={`Open ${item.label.toLowerCase()} approval workflow`}") && adminView.includes("aria-label={`Review dealer application for ${u.name || u.email || 'dealer'}`}") && fs.readFileSync('src/features/admin-command-centre.css', 'utf8').includes('.kayad-command-queue-tabs a:focus-visible')],
  ['admin stats endpoint uses real model counts', /User\.countDocuments\(\)[\s\S]*Car\.countDocuments\(\)/.test(adminRoutes)],
  ['hero endpoint returns an explicit error rather than fabricated slides', heroController.includes('res.status(500).json({ success: false, message: "Failed to load hero" })')],
  ['public config frontend client uses canonical API client path', apiExports.includes("api.get('/admin/public/config').then(unwrap)")],
];

let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed += 1;
}
console.log(`\nStage 5F.2 source-contract checks: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
