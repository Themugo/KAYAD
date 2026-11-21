import fs from 'node:fs';
import assert from 'node:assert/strict';

const routes = fs.readFileSync('backend/routes/adminRoutes.js', 'utf8');
const staffUi = fs.readFileSync('src/pages/admin/AdminStaff.jsx', 'utf8');
const permissionsUi = fs.readFileSync('src/pages/admin/AdminStaffPermissions.jsx', 'utf8');
const start = routes.indexOf('// 👥 STAFF MANAGEMENT (superadmin only)');
const end = routes.indexOf('// 🌱 SEED STAFF ACCOUNTS', start);
assert(start >= 0 && end > start, 'staff governance route block must exist');
const block = routes.slice(start, end);
const endpoints = ['/staff"', '/staff/permissions/catalog', '/staff/:id/permissions', '/staff/:id/permissions"', '/staff/:id"'];
assert(/import \{[^}]*\bisOwnerUser\b[^}]*\} from \"\.\.\/config\/owners\.js\";/.test(routes), 'canonical owner identity helper must be imported');
assert(routes.includes('const systemOwnerOnly = (req, res, next) =>') && routes.includes('if (!isOwnerUser(req.user))'), 'owner middleware must check canonical owner registry');
for (const path of endpoints) {
  const i = block.indexOf(path);
  assert(i >= 0, `expected staff endpoint marker ${path}`);
  const nearby = block.slice(i, i + 180);
  assert(nearby.includes('systemOwnerOnly'), `staff endpoint ${path} must require system-owner authority`);
}
assert(routes.includes('"/seed-departments",\n  authorize("superadmin"),\n  systemOwnerOnly'), 'department seeding must require owner authority');
assert(staffUi.includes('me?.isOwner === true') && staffUi.includes('System Owner governance'), 'staff UI must disclose owner-only governance');
assert(permissionsUi.includes('me?.isOwner === true') && permissionsUi.includes('System Owner governance'), 'permission UI must disclose owner-only governance');
assert(!block.includes('"/staff",\n  authorize("superadmin"),\n  asyncHandler'), 'staff listing must not remain superadmin-only without owner guard');
console.log('PASS: canonical owner guard is present');
console.log('PASS: staff listing, permission catalog, permission read/write, create/update/delete, and department seeding require owner governance');
console.log('PASS: staff and permission UIs reflect the System Owner boundary');
console.log('PASS: no production accounts or role records were changed by this source-level validation');
