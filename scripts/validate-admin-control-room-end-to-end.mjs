import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const page = read('src/pages/admin/OperationsControlRoom.jsx');
const tests = read('src/__tests__/pages/admin/OperationsControlRoom.test.jsx');
const adminRoutes = read('backend/routes/adminRoutes.js');
const ecpRoutes = read('backend/routes/ecpRoutes.js');
const api = read('src/api/api.exports.ts');
const checks = [
  ['existing Control Room page is retained', page.includes('Operations Control Room')],
  ['metrics still use canonical admin stats API', api.includes("api.get('/admin/stats')")],
  ['alerts still use canonical admin alerts API', api.includes("api.get('/admin/alerts'")],
  ['audit activity still uses canonical admin audit endpoint', api.includes("api.get('/admin/audit-log'")],
  ['health still uses authenticated ECP health endpoint', api.includes("api.get('/ecp/health')") && ecpRoutes.includes('router.use(protect, allowRoles(')],
  ['admin route is protected by authentication and admin role', adminRoutes.includes('router.use(protect, adminOnly)')],
  ['response-envelope normalization is present', page.includes('const unwrapPayload') && page.includes('normalizeHealth')],
  ['metrics remain unavailable when response is not verifiable', page.includes('did not return a verified metrics object')],
  ['failed data remains explicitly unknown', page.includes('The current service state is unknown')],
  ['health refresh has an independent callback', page.includes('const refreshHealth = useCallback')],
  ['health refresh does not call the full dashboard refresh', page.includes('onClick={() => void refreshHealth()}')],
  ['health results preserve stale-state disclosure', page.includes('Showing the last successful check')],
  ['metrics retain partial-source unavailable handling', page.includes('metrics?.unavailable')],
  ['alert empty state is distinct from failed request', page.includes('No alert records were returned by the alert service.')],
  ['audit empty state is distinct from failed request', page.includes('No recent audit activity was returned.')],
  ['new envelope regression test exists', tests.includes('accepts the standard nested API data envelope')],
  ['independent health-refresh regression test exists', tests.includes('refreshes system health independently')],
  ['30-second refresh polling remains in place', page.includes('setInterval(() => { void loadMetrics(); }, 30000)')],
];
let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
