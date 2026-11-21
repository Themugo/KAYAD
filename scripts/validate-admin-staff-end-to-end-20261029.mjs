import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const page = read('src/pages/admin/AdminStaff.jsx');
const list = read('src/pages/admin/components/AdminStaffList.jsx');
const matrix = read('src/pages/admin/components/AdminStaffPermMatrix.jsx');
const api = read('src/api/api.exports.ts');
const routes = read('backend/routes/adminRoutes.js');
const tests = read('backend/tests/regression/stage5f5StaffGovernance.test.js');
const checks = [
  ['failed initial load does not masquerade as an empty staff directory', /error && staff\.length === 0/.test(page) && /Directory unavailable/.test(page) && /Retry loading staff/.test(page)],
  ['staff list remains searchable by name, email and role', /matchesQuery/.test(page) && /member\.name, member\.email, member\.role/.test(page)],
  ['role and suspension filters remain wired', /matchesRole/.test(page) && /matchesStatus/.test(page)],
  ['staff creation uses backend catalog and strong initial password', /getStaffRoleCatalog/.test(page) && /form\.password\.length < 12/.test(page)],
  ['staff creation rolls back identity if credential persistence fails', /UserAuth\.create/.test(routes) && /Staff account creation rollback failed/.test(routes) && /User\.softDelete\(user\.id/.test(routes)],
  ['staff mutations require canonical owner guard', /systemOwnerOnly/.test(routes.slice(routes.indexOf('GET ALL STAFF'), routes.indexOf('SEED STAFF ACCOUNTS')))],
  ['update endpoint refuses non-staff targets', /STAFF_ACCOUNT_REQUIRED/.test(routes.slice(routes.indexOf('UPDATE STAFF ROLE'), routes.indexOf('DELETE STAFF ACCOUNT')))],
  ['permission endpoint refuses non-staff targets and protected owners', /STAFF_ACCOUNT_REQUIRED/.test(routes.slice(routes.indexOf('UPDATE A STAFF MEMBER'), routes.indexOf('CREATE STAFF ACCOUNT'))) && /isOwnerUser\(user\)/.test(routes)],
  ['permission endpoint validates array payloads and rejects unknown keys', /grantedPermissions and revokedPermissions must be arrays/.test(routes) && /Unsupported permission key/.test(routes)],
  ['delete endpoint is soft-delete only and protects owner, superadmin and self', /User\.softDelete\(req\.params\.id/.test(routes) && /PROTECTED_STAFF_IDENTITY/.test(routes) && /account_deletion/.test(routes)],
  ['delete action includes reason prompt, confirmation and audit payload', /Reason for removing staff access/.test(page) && /Remove staff account/.test(page) && /deleteStaff\(member\._id, \{ reason:/.test(page) && /details: \{ targetUserId: String\(req\.params\.id\), role: user\.role, reason:/.test(routes)],
  ['staff list hides mutations for owner and superadmin identities', /m\.isOwner !== true/.test(list) && /m\.role !== 'superadmin'/.test(list)],
  ['permission matrix reads canonical backend role and permission catalogs', /roles = \[\]/.test(matrix) && /catalog = \[\]/.test(matrix) && /role\.permissions\.includes\(permission\.key\)/.test(matrix)],
  ['matrix does not present hard-coded permission mappings as authority', !/const PERMISSIONS = \{/.test(matrix)],
  ['role overview includes the existing ghost_checker role', /role: 'ghost_checker'/.test(read('src/pages/admin/components/AdminStaffOrgChart.jsx'))],
  ['permission changes continue to require a reason and confirmation', /Reason for changing permissions/.test(read('src/pages/admin/AdminStaffPermissions.jsx')) && /window\.confirm/.test(read('src/pages/admin/AdminStaffPermissions.jsx'))],
  ['delete API sends audit reason in request body', /deleteStaff:\s*\(id: string, body: any = \{\}\) => api\.delete\(`\/admin\/staff\/\$\{id\}`, \{ data: body \}\)/.test(api)],
  ['regression tests cover invalid permission keys, non-staff targets and rollback', /reject unknown or privileged keys/.test(tests) && /non-staff user cannot be promoted/.test(tests) && /failed credential creation soft-deletes/.test(tests)],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Staff end-to-end source contract: ${checks.length - failed}/${checks.length} ${failed ? 'FAILED' : 'PASS'}`);
if (failed) process.exitCode = 1;
