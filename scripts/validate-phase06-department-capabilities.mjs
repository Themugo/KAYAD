import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const adminView = read('src/features/AdminView.tsx');
const matrix = read('src/features/AdminDepartmentCapabilities.tsx');
const routes = read('src/components/admin/AdminRouteSurface.tsx');
const server = read('backend/server.js');
const finance = read('backend/routes/financeRoutes.js');
const ledger = read('backend/routes/ledgerRoutes.js');
const tests = read('src/__tests__/features/adminCommandCentre.test.tsx');
const checks = [
  ['department matrix is mounted inside existing AdminView', adminView.includes("import AdminDepartmentCapabilities from './AdminDepartmentCapabilities'") && adminView.includes("module === 'departments' && isOwner && <AdminDepartmentCapabilities />")],
  ['department navigation requires strict owner marker', /\.\.\.\(isOwner \? \[\['owners', 'Owner management'\], \['departments', 'Departments'\]\] : \[\]\)/.test(adminView) && adminView.includes("?.isOwner === true")],
  ['all eight requested departments represented', ['Sales & Orders','Accounting & Finance','Technical Operations','Inspections','Support & Disputes','Marketing & Communications','Administration','Reporting & Analytics'].every((x) => matrix.includes(x))],
  ['all four required capability classifications defined', ['IMPLEMENTED AND VERIFIED','IMPLEMENTED BUT UNVERIFIED','PARTIAL','NOT IMPLEMENTED'].every((x) => matrix.includes(x))],
  ['capability catalog includes source evidence and canonical destinations', matrix.includes('evidence:') && matrix.includes('href:') && routes.includes("'/admin/transactions'") && routes.includes("'/admin/inspections'")],
  ['every linked department destination is registered in the canonical admin route map', [...matrix.matchAll(/href: '([^']+)'/g)].every(([, href]) => routes.includes(`'${href}'`))],
  ['no fabricated counts or live KPI requests in capability component', !/fetch\(|axios\.|adminAPI\.|totalRevenue|fake|mock data/i.test(matrix)],
  ['no new departmental API mounted in backend server', !/departmentCapabilities|department-capabilities|departmentalOperations/i.test(server)],
  ['existing finance endpoints remain the source of truth', server.includes('app.use("/api/finance", financeRoutes)') && server.includes('app.use("/api/ledger", ledgerRoutes)')],
  ['ledger write operations require MANAGE_FINANCE', ledger.includes('const financeWrite = requireAnyPermission(...STAFF_ACCESS_POLICY["ledger.write"])') && ledger.includes('router.post("/", protect, adminOnly, financeWrite') && /"ledger\.write": \[PERM\.MANAGE_FINANCE\]/.test(fs.readFileSync(new URL('../backend/config/staffAccessPolicy.js', import.meta.url), 'utf8'))],
  ['finance route scope and existing allowlist preserved', finance.includes('allowRoles("admin", "superadmin")') && finance.includes('router.post(')],
  ['test coverage checks owner gate, status honesty and canonical routes', tests.includes('departmental capability convergence') && tests.includes('No new records, database tables, financial totals')],
  ['owner matrix warns that UI visibility does not grant API access', matrix.includes('This inventory does not grant access') && matrix.includes('backend authorization')],
  ['financial separation-of-duties risk is explicit', matrix.includes('separation of duties') && matrix.includes('MANAGE_FINANCE')],
];
let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed += 1;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
