import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const ui = read('src/pages/admin/AdminFeedback.jsx');
const controller = read('backend/controllers/feedbackController.js');
const routes = read('backend/routes/feedbackRoutes.js');
const api = read('src/api/api.exports.ts');
const checks = [
  ['feedback admin list API is retained', api.includes("adminAll:") && api.includes("/feedback/admin/all")],
  ['feedback status update API is retained', api.includes("adminUpdate:") && api.includes("/feedback/admin/${id}/status")],
  ['admin endpoints remain role-protected', routes.includes('protect') && routes.includes('allowRoles("admin", "superadmin")')],
  ['frontend validates response envelope', ui.includes("response.success === false")],
  ['frontend validates list shape', ui.includes('Array.isArray(response.feedback)') && ui.includes('Array.isArray(response.data)')],
  ['frontend does not turn failed request into empty queue', ui.includes('Feedback could not be loaded') && ui.includes('loadError')],
  ['frontend offers retry', ui.includes('Retry') && ui.includes('onClick={load}')],
  ['frontend protects against stale responses', ui.includes('requestSeq.current')],
  ['frontend has explicit loading state', ui.includes('loading && items.length === 0')],
  ['frontend has genuine empty state only after successful load', ui.includes('!loadError && items.length === 0')],
  ['frontend handles canonical and legacy identifiers', ui.includes('item?.id ?? item?._id')],
  ['frontend renders missing fields safely', ui.includes("'—'") && ui.includes('No message provided.')],
  ['frontend protects overlapping decisions', ui.includes('if (!id || actionId) return')],
  ['frontend refreshes server-owned counts after update', ui.includes('await load()')],
  ['frontend has pagination controls', ui.includes('setPage((value) => value - 1)') && ui.includes('setPage((value) => value + 1)')],
  ['frontend exposes accessible status selection', ui.includes('aria-pressed={statusFilter === tab.key}')],
  ['frontend detail dialog has accessible role', ui.includes('role="dialog"') && ui.includes('aria-modal="true"')],
  ['backend validates feedback type on submission', controller.includes('FEEDBACK_TYPES.has(type)')],
  ['backend validates subject and message lengths', controller.includes('subject.length > 200') && controller.includes('message.length > 5000')],
  ['backend validates email format', controller.includes('Enter a valid email address')],
  ['backend validates page and limit', controller.includes('positiveInteger(req.query.page') && controller.includes('positiveInteger(req.query.limit')],
  ['backend caps page size', controller.includes('positiveInteger(req.query.limit, 20, 100)')],
  ['backend validates status filter', controller.includes('FEEDBACK_STATUSES.has(String(status))')],
  ['backend validates type filter', controller.includes('FEEDBACK_TYPES.has(String(type))')],
  ['backend returns authoritative status counts', controller.includes('allCount') && controller.includes('newCount') && controller.includes('addressedCount')],
  ['backend disables caching for admin feedback', controller.includes('Cache-Control", "no-store"')],
  ['backend rejects unsupported status updates', controller.includes('Status must be new, read, or addressed')],
  ['backend prevents addressed feedback downgrade', controller.includes('Addressed feedback cannot be moved back')],
  ['backend handles not-found updates', controller.includes('Feedback not found')],
  ['no new feedback API route or duplicate model introduced', (routes.match(/router\.get\(\s*"\/admin\/all"/g) || []).length === 1 && !fs.existsSync('backend/models/FeedbackAdmin.js')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`\nResult: ${checks.length - failed}/${checks.length} checks passed.`);
if (failed) process.exit(1);
