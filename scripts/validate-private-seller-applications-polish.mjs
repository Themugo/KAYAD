import fs from 'node:fs';

const page = fs.readFileSync('src/pages/admin/AdminPrivateSellerApplications.tsx', 'utf8');
const api = fs.readFileSync('src/services/privateSellerCapabilityApi.ts', 'utf8');
const pageTests = fs.readFileSync('src/__tests__/pages/AdminPrivateSellerApplications.test.tsx', 'utf8');
const apiTests = fs.readFileSync('src/__tests__/services/privateSellerCapabilityApi.test.ts', 'utf8');
const backendRoutes = fs.readFileSync('backend/routes/privateSellerCapabilityRoutes.js', 'utf8');
const backendService = fs.readFileSync('backend/services/privateSellerCapability.service.js', 'utf8');
const checks = [
  ['uses the existing private-seller admin route', page.includes("/admin/private-seller-applications") || fs.readFileSync('src/components/admin/AdminRouteSurface.tsx', 'utf8').includes("'/admin/private-seller-applications'")],
  ['recognizes maintenance only from the structured maintenance contract', page.includes("code === 'SYSTEM_MAINTENANCE'") && page.includes('response?.maintenance === true')],
  ['distinguishes auth, forbidden, service and server failures', ['status === 401', 'status === 403', 'status === 503', 'status >= 500'].every((token) => page.includes(token))],
  ['preserves successful data on a failed refresh', page.includes('Keep the last successful data in memory') && !page.includes('setApplications([])')],
  ['guards stale requests with a sequence token', page.includes('requestSequence.current') && page.includes('sequence !== requestSequence.current')],
  ['keeps results scoped to the active filter', page.includes('loadedFilter === filter') && page.includes('visibleApplications')],
  ['validates the API success envelope and row schema', api.includes('envelope?.success !== true || !Array.isArray(envelope.data)') && api.includes('if (!validRows)')],
  ['preserves existing permission-protected admin API route', backendRoutes.includes('requirePermission(PERMISSIONS.MANAGE_USERS)') && backendRoutes.includes('router.get("/admin/applications"')],
  ['preserves conditional status transitions and required reasons', backendService.includes('if (!rule.from.includes(row.status))') && backendService.includes('REASON_REQUIRED')],
  ['preserves database-owned listing lifecycle handling', backendService.includes('database visibility trigger hides/restores eligible public listings atomically')],
  ['has maintenance/error/refresh/race regression coverage', pageTests.includes('identifies maintenance only when the server explicitly returns') && pageTests.includes('older filter response')],
  ['has API envelope and malformed-row regression coverage', apiTests.includes('malformed success envelope') && apiTests.includes('malformed rows')],
  ['retains lifecycle and account-permission warning', page.includes('Listing records and ownership are retained') && page.includes('does not create a dealer account, remove buyer access')],
];
let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
