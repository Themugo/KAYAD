import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const adminView = read('src/features/AdminView.tsx');
const api = read('src/api/api.exports.ts');
const routes = read('backend/routes/adminRoutes.js');
const tests = read('src/__tests__/features/adminCommandCentre.test.tsx');
const ledger = read('docs/super-admin/PHASE7-DATA-SOURCE-LEDGER.md');
const checks = [
  ['canonical /admin route remains routed through AdminRouteSurface', /path === '\/admin' \|\| path\.startsWith\('\/admin\/'\)\) return <AdminRouteSurface \/>/.test(app)],
  ['six existing KPI labels and destinations remain in the current command centre', ['Total Users', 'Active Staff', 'Verified Dealers', 'Vehicles', 'Live Auctions', 'Open Escrows'].every((label) => adminView.includes(`label: '${label}'`))],
  ['dashboard uses the existing stats API adapter', /stats:\s*\(\)\s*=>\s*api\.get\('\/admin\/stats'\)/.test(api)],
  ['backend distinguishes unavailable stats from valid zero', /const unavailable = metricNames\.filter/.test(routes) && /r\.status === "fulfilled" \? r\.value : null/.test(routes)],
  ['dealer preview calls existing server-side pending-dealer filter', /limit: 4, role: 'dealer', pendingApproval: true/.test(adminView)],
  ['backend applies pending status on server for pendingApproval', /if \(req\.query\.pendingApproval === "true"\)[\s\S]*?filter\.status = "pending"/.test(routes)],
  ['preview uses server-filtered pending-dealer records', /pendingDealerUsers\.map\(u =>/.test(adminView)],
  ['count formatter rejects non-safe, negative and fractional numbers', /!Number\.isSafeInteger\(value\) \|\| value < 0/.test(adminView)],
  ['malformed-count regression test exists', /malformed negative or fractional count values are unavailable/.test(tests)],
  ['source ledger documents all six card labels', ['Total Users', 'Active Staff', 'Verified Dealers', 'Vehicles', 'Live Auctions', 'Open Escrows'].every((label) => ledger.includes(label))],
];
let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failures += 1;
}
console.log(`Super Admin Phase 7 static contract: ${checks.length - failures}/${checks.length} checks passed.`);
if (failures) process.exitCode = 1;
