import fs from 'node:fs';
import assert from 'node:assert/strict';

const page = fs.readFileSync(new URL('../src/pages/admin/AdminUsers.jsx', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../src/styles/kayad-admin-legacy-surface.css', import.meta.url), 'utf8');
const route = fs.readFileSync(new URL('../backend/routes/adminRoutes.js', import.meta.url), 'utf8');
const tests = fs.readFileSync(new URL('../src/__tests__/pages/admin/adminTables.test.jsx', import.meta.url), 'utf8');

const checks = [
  ['existing AdminUsers page retained', page.includes('export default function AdminUsers()')],
  ['real existing admin API retained', page.includes('adminAPI.users(params)')],
  ['server-backed summary displayed', page.includes('summary?.totalUsers') && page.includes('summary?.pendingApproval')],
  ['unknown summary values are not coerced to zero', page.includes("? Number(s.value).toLocaleString() : '—'")],
  ['API failure has a retry state', page.includes('role="alert"') && page.includes('onClick={load}')],
  ['empty state is only shown after a successful response', page.includes("!loading && !loadError && users.length === 0")],
  ['role filter includes existing seller and admin roles', page.includes('individual_seller') && page.includes('superadmin')],
  ['server response includes authoritative summary counts', route.includes('summaryTotal') && route.includes('pendingApproval: summaryPending')],
  ['responsive styles are scoped to admin content', styles.includes('.kayad-admin-shell__content .kayad-users-stat-grid') && styles.includes('@media (max-width:767px)')],
  ['failure and summary regression tests exist', tests.includes('failed request is not presented as an empty user list') && tests.includes('authoritative global summary')],
];
let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
