import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const calendar = read('src/pages/admin/cms/components/PublishingCalendar.jsx');
const cmsApi = read('src/services/cmsApi.js');
const staff = read('src/pages/admin/AdminStaff.jsx');
const createModal = read('src/pages/admin/components/AdminStaffCreateModal.jsx');
const permissions = read('src/pages/admin/AdminStaffPermissions.jsx');
const routes = read('backend/routes/adminRoutes.js');
const cmsRoutes = read('backend/routes/cmsRoutes.js');
const staffTests = read('backend/tests/regression/stage5f5StaffGovernance.test.js');

const checks = [
  ['existing Publishing Calendar uses the established getPublishingCalendar API', /import \{ getPublishingCalendar \} from/.test(calendar) && /getPublishingCalendar\(startDate, endDate\)/.test(calendar) && /api\.get\('\/cms\/calendar'/.test(cmsApi)],
  ['calendar maps only existing CMS response collections', ['pages', 'content', 'campaigns', 'banners'].every((key) => calendar.includes(`payload?.${key}`))],
  ['calendar endpoint restricts scheduled-content metadata to existing CMS authoring roles', /router\.get\(\"\/calendar\", allowRoles\(\"admin\", \"superadmin\", \"editor\", \"publisher\"\), asyncHandler\(getPublishingCalendar\)\)/.test(cmsRoutes)],
  ['hard-coded empty scheduledContent mock is removed', !/const scheduledContent\s*=\s*\[\s*\]/.test(calendar)],
  ['calendar has explicit loading, error, retry and legitimate empty states', calendar.includes('Loading scheduled content') && calendar.includes('Calendar data unavailable') && calendar.includes('Try again') && calendar.includes('No scheduled CMS content was returned')],
  ['malformed calendar responses are not treated as valid empty data', calendar.includes('returned an invalid response') && calendar.includes("!['pages', 'content', 'campaigns', 'banners'].some")],
  ['calendar date keys use local calendar dates rather than UTC ISO slicing', calendar.includes('const localDateKey = (date)') && !calendar.includes("toISOString().split('T')[0]")],
  ['calendar does not expose an inert event-creation modal', !calendar.includes('showEventModal') && !calendar.includes('Schedule New Content')],
  ['staff creation options align with the existing create endpoint', staff.includes("CREATABLE_STAFF_ROLES = STAFF_ROLES.filter(role => role !== 'ghost_checker')") && createModal.includes("role !== 'ghost_checker'") && /if \(!staffRoles\.includes\(role\)\)/.test(routes)],
  ['ghost_checker remains available for existing role catalog and role updates', routes.includes('ROLE_PERMISSIONS[role] || []') && routes.slice(routes.indexOf('UPDATE STAFF ROLE')).includes('"ghost_checker"')],
  ['permission API failure is shown separately from an empty staff result', permissions.includes("const [loadError, setLoadError] = useState('')") && permissions.includes('No matching staff records were returned') && permissions.includes('role="alert"')],
  ['staff governance regression covers create-vs-update ghost_checker contract', staffTests.includes('ghost_checker remains an existing assignable staff role but is not accepted by the create endpoint')],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failures += 1;
}
console.log(`Super Admin Phase 8 source contract: ${checks.length - failures}/${checks.length} checks passed.`);
if (failures) process.exitCode = 1;
