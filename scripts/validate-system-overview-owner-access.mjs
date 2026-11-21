import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/admin/WebhoistOverview.jsx'), 'utf8');
const sidebar = fs.readFileSync(path.join(root, 'src/components/admin/AdminSidebar.tsx'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'backend/routes/adminRoutes.js'), 'utf8');
const tests = fs.readFileSync(path.join(root, 'src/__tests__/pages/admin/adminLightSurfaces.test.jsx'), 'utf8');
const checks = [
  ['visible owner badge uses Platform Owner', page.includes('>Platform Owner</span>')],
  ['owner access section uses Platform Owner Access', page.includes('Platform Owner Access')],
  ['no claim of overriding permission checks', !/override any permission check/i.test(page)],
  ['sidebar uses System Overview label', sidebar.includes("label: 'System Overview'")],
  ['canonical admin route preserved', fs.readFileSync(path.join(root, 'src/components/admin/AdminRouteSurface.tsx'), 'utf8').includes("'/admin/webhoist'")],
  ['stats response unwraps nested stats object', page.includes('response?.stats || response?.data?.stats')],
  ['partial unavailable metric list preserved', page.includes('unavailableMetrics') && page.includes('response?.unavailable')],
  ['genuine zero preserved by numeric formatter', page.includes('Number.isFinite(v) ? v : null')],
  ['audit response supports canonical entries', page.includes('logResponse?.entries')],
  ['failed activity is not described as empty', page.includes('This is not a confirmation that nothing happened.')],
  ['refresh button disabled during refresh', page.includes('disabled={refreshing}')],
  ['request sequence prevents stale responses', page.includes('requestSequence.current')],
  ['revenue label clarifies commission basis', page.includes('Recorded Commission Revenue')],
  ['audit endpoint has explicit staff authorization', /router\.get\(\s*"\/audit-log",\s*staffRole,/.test(routes)],
  ['stats endpoint has explicit staff authorization', /router\.get\(\s*"\/stats",\s*staffRole,/.test(routes)],
  ['regression test covers partial stats and naming', tests.includes('uses clear platform-owner terminology and reports partial metric failures')],
];
let failed = 0;
for (const [name, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); if (!pass) failed++; }
console.log(`RESULT ${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
