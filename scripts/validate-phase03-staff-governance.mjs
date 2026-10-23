import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const routes = read('backend/routes/adminRoutes.js');
const page = read('src/pages/admin/AdminStaff.jsx');
const list = read('src/pages/admin/components/AdminStaffList.jsx');
const create = read('src/pages/admin/components/AdminStaffCreateModal.jsx');
const perms = read('src/pages/admin/AdminStaffPermissions.jsx');
const api = read('src/api/api.exports.ts');
const tests = read('backend/tests/regression/stage5f5StaffGovernance.test.js');
const checks = [
  ['staff read endpoint remains System Owner-only', /"\/staff"[\s\S]{0,120}systemOwnerOnly/.test(routes)],
  ['permission read/write endpoints remain System Owner-only', /"\/staff\/:id\/permissions"[\s\S]{0,120}systemOwnerOnly/.test(routes) && /router\.put\([\s\S]*?"\/staff\/:id\/permissions"[\s\S]{0,120}systemOwnerOnly/.test(routes)],
  ['role catalog is generated from backend ROLE_PERMISSIONS', /"\/staff\/roles\/catalog"[\s\S]*?ROLE_PERMISSIONS\[role\]/.test(routes)],
  ['role catalog excludes privileged superadmin creation', /staffRoles\.map\(\(role\) => \(\{ role, permissions: ROLE_PERMISSIONS\[role\] \|\| \[\] \}\)\)/.test(routes)],
  ['staff list includes existing ghost_checker role', /"ghost_checker"/.test(routes.slice(routes.indexOf('GET ALL STAFF'), routes.indexOf('GET PERMISSION CATALOG')))],
  ['staff creation normalizes email and validates password length', /trim\(\)\.toLowerCase\(\)/.test(routes) && /password\.length < 12/.test(routes)],
  ['creation and updates record optional audit reason', /Staff governance: account created[\s\S]*?reason: typeof req\.body\.reason/.test(routes) && /Staff governance: staff record updated[\s\S]*?reason: typeof req\.body\.reason/.test(routes)],
  ['staff directory supports search, role and suspension filters', /const matchesQuery/.test(page) && /const matchesRole/.test(page) && /const matchesStatus/.test(page)],
  ['UI does not expose staff account deletion control', !/Trash2|onDelete\(m\._id/.test(list)],
  ['UI explicitly distinguishes password creation from email invitation', /not an email invitation/.test(page)],
  ['role selection uses backend role catalog API', /getStaffRoleCatalog/.test(page) && /getStaffRoleCatalog:/.test(api)],
  ['staff create UI excludes ghost_checker because the existing POST contract rejects it', page.includes("CREATABLE_STAFF_ROLES = STAFF_ROLES.filter(role => role !== 'ghost_checker')") && create.includes("role !== 'ghost_checker'") && /if \(!staffRoles\.includes\(role\)\)/.test(routes)],
  ['permission page distinguishes API failure from a legitimate empty result', perms.includes("const [loadError, setLoadError] = useState('')") && perms.includes('No matching staff records were returned') && perms.includes('role="alert"')],
  ['ghost_checker role remains supported by catalog and existing staff role updates', routes.includes('ROLE_PERMISSIONS[role] || []') && routes.slice(routes.indexOf('UPDATE STAFF ROLE')).includes('"ghost_checker"')],
  ['permission changes require a reason and confirmation', /Reason for changing permissions/.test(perms) && /window\.confirm/.test(perms)],
  ['governance regression covers catalog, invalid password and owner boundaries', /staff\/roles\/catalog/.test(tests) && /short initial passwords/.test(tests) && /owner role\/email are immutable/.test(tests)],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`Phase 03 staff governance source checks: ${checks.length - failed}/${checks.length} ${failed ? 'FAILED' : 'PASS'}`);
if (failed) process.exitCode = 1;
