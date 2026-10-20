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
  ['pending dealer queue opens existing users workflow', /Pending dealers'[\s\S]{0,100}destination: 'users'/.test(adminView)],
  ['pending vehicle queue opens existing cars workflow', /Pending vehicles'[\s\S]{0,100}destination: 'cars'/.test(adminView)],
  ['support queue opens existing support workflow', /Support queue'[\s\S]{0,100}destination: 'support'/.test(adminView)],
  ['queue workflow buttons have accessible labels and keyboard focus styling', adminView.includes('aria-label={`Open ${item.label.toLowerCase()} workflow`}') && adminView.includes('focus-visible:ring-2')],
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
