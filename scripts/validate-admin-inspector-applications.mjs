import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const page = read('src/pages/admin/AdminInspectorApplications.jsx');
const controller = read('backend/controllers/inspectorApplicationController.js');
const routes = read('backend/routes/inspectorApplicationRoutes.js');
const schema = read('backend/validation/inspectorApplication.schema.js');
const api = read('src/api/api.exports.ts');
const checks = [
  ['existing admin page preserved', page.includes('export default function AdminInspectorApplications')],
  ['existing admin API list method retained', api.includes("inspectorApplications: (params: any) => api.get('/inspector-applications', { params })")],
  ['existing approve/reject route method retained', api.includes("reviewInspector: (id: string, action: string, body: any) => api.post(`/inspector-applications/${id}/${action}`, body)")],
  ['frontend checks the response envelope', page.includes('Array.isArray(response.applications)')],
  ['frontend does not convert failures into empty records', page.includes('Applications could not be loaded') && page.includes('setLoadError(message)')],
  ['retry control is present', page.includes('Retry loading applications')],
  ['request sequence prevents stale response overwrite', page.includes('requestSequence.current') && page.includes('requestId !== requestSequence.current')],
  ['status filters use canonical lifecycle values', ['pending', 'approved', 'rejected'].every(s => page.includes(`['${s}',`))],
  ['status counts use backend aggregates', page.includes('response.statusCounts?.pending') && page.includes('response.statusCounts?.approved') && page.includes('response.statusCounts?.rejected')],
  ['pagination request uses bounded page size', page.includes('const PAGE_SIZE = 20') && page.includes('params = { page, limit: PAGE_SIZE }')],
  ['pagination controls are present', page.includes('Previous') && page.includes('Next')],
  ['record identifiers support canonical id and legacy _id', page.includes('app.id || app._id')],
  ['detail panel includes specialties and experience', page.includes('app.specialties') && page.includes('yearsOfExperience')],
  ['CV and certification links are protocol checked', page.includes('safeDocumentUrl') && page.includes("['https:', 'http:']")],
  ['document links are isolated from opener', page.includes('rel="noopener noreferrer"')],
  ['rejection requires a reason in UI', page.includes('notes.length < 3') && page.includes('required for rejection')],
  ['review actions are disabled while busy', page.includes('disabled={busy || actionLoading !== null || loading}')],
  ['actions refresh list before clearing action state', page.includes('await fetchApps({ quiet: true })')],
  ['last successful records remain visible after refresh failure', page.includes('(loadError && apps.length === 0) ? null')],
  ['all review actions lock while another decision is in progress', page.includes('actionLoading !== null')],
  ['API list validates requested status', controller.includes('INVALID_INSPECTOR_STATUS')],
  ['API list validates pagination inputs', controller.includes('INVALID_PAGINATION')],
  ['API list returns server-side status counts', controller.includes('statusCounts: { pending, approved, rejected, total: pending + approved + rejected }')],
  ['API list caps page size', controller.includes('const limit = Math.min(requestedLimit, 50)')],
  ['review routes are restricted to reviewer roles', routes.includes('const reviewerOnly = allowRoles("admin", "superadmin", "hr", "technical_support")')],
  ['approval remains pending-only', controller.includes('if (application.status !== "pending")')],
  ['rejection remains pending-only', controller.includes('INSPECTOR_APPLICATION_ALREADY_REVIEWED')],
  ['self-rejection is prohibited', controller.includes('Cannot reject your own application')],
  ['rejection schema requires an explanatory reason', schema.includes('reviewNotes: z.string().trim().min(3')],
  ['Supabase capability lookup errors are checked', controller.includes('if (capabilityLookupError) throw capabilityLookupError')],
  ['Supabase capability insert errors are checked', controller.includes('if (capabilityInsertError) throw capabilityInsertError')],
  ['existing account conflict guard is retained', controller.includes('Resolve the account conflict before approving this application')],
  ['unverified email approval guard is retained', controller.includes('INSPECTOR_EMAIL_UNVERIFIED')],
  ['invitation token is only delivered through communication gateway', controller.includes('inspector-invite:') && controller.includes('setPasswordLink')],
];
let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
