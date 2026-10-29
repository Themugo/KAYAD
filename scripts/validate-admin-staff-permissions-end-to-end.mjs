import fs from 'node:fs';
import assert from 'node:assert/strict';
const page = fs.readFileSync('src/pages/admin/AdminStaffPermissions.jsx', 'utf8');
const routes = fs.readFileSync('backend/routes/adminRoutes.js', 'utf8');
const policy = fs.readFileSync('backend/config/maintenancePolicy.js', 'utf8');
const api = fs.readFileSync('src/api/api.exports.ts', 'utf8');
const checks = [
  ['page remains owner-only', page.includes("me?.isOwner !== true")],
  ['staff list uses canonical API', api.includes("getStaff:        ()            => api.get('/admin/staff')")],
  ['permission catalog uses canonical API', api.includes("getPermCatalog:  ()            => api.get('/admin/staff/permissions/catalog')")],
  ['permission update uses canonical API', api.includes('setStaffPerms:   (id: string, body: any)')],
  ['API response staff envelope validated', page.includes('!Array.isArray(s?.staff)')],
  ['API response permission catalog validated', page.includes('!Array.isArray(c?.catalog)')],
  ['malformed response does not become empty success', page.includes('unexpected staff or permission-catalog response')],
  ['maintenance code detected', page.includes("code === 'SYSTEM_MAINTENANCE'")],
  ['maintenance response has explicit state', page.includes('setMaintenanceBlocked(isMaintenance)')],
  ['maintenance message explains policy boundary', page.includes('This page cannot override that policy')],
  ['maintenance recovery link points to existing route', page.includes('href="/admin/platform-recovery"')],
  ['retry disabled while request is active', page.includes('disabled={loading}')],
  ['stale async requests ignored', page.includes('request !== requestId.current')],
  ['unmount invalidates in-flight request', page.includes('requestId.current += 1')],
  ['permission catalog empty state is explicit', page.includes('permission catalog is empty')],
  ['editor disabled without verified catalog', page.includes('disabled={!catalog.length || loading}')],
  ['change reason remains required', page.includes('A reason is required; no permissions were changed.')],
  ['change confirmation retained', page.includes('Confirm permission change for')],
  ['update response contract validated', page.includes('!Array.isArray(res?.permissions?.effectivePermissions)')],
  ['backend owner guard remains on catalog route', routes.includes('"/staff/permissions/catalog"') && routes.includes('systemOwnerOnly')],
  ['backend rejects unknown permission keys', routes.includes('Unsupported permission key(s)')],
  ['backend restricts permission targets to staff roles', routes.includes('STAFF_ACCOUNT_REQUIRED')],
  ['backend protects owner and superadmin identities', routes.includes('Cannot modify a protected System Owner / superadmin identity')],
  ['maintenance global shutdown remains fail-closed', policy.includes('return { allow: false, reason: "GLOBAL_SHUTDOWN" }')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
