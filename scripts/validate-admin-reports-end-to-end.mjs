import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui = fs.readFileSync('src/pages/admin/AdminReports.jsx', 'utf8');
const controller = fs.readFileSync('backend/controllers/reportController.js', 'utf8');
const routes = fs.readFileSync('backend/routes/reportRoutes.js', 'utf8');
const validation = fs.readFileSync('backend/middleware/validate.js', 'utf8');
const test = fs.readFileSync('src/__tests__/pages/admin/AdminReports.test.jsx', 'utf8');
const checks = [
  ['API failure is explicit', ui.includes('Reports could not be loaded.')],
  ['Retry control exists', ui.includes('Retry loading reports')],
  ['Empty state only after successful load', ui.includes("!error ? <div className=\"empty-state\"")],
  ['Malformed response envelopes rejected', ui.includes('unexpected response')],
  ['Stale request sequence guard', ui.includes('requestSequence.current')],
  ['Status filtering', ui.includes('STATUS_OPTIONS') && ui.includes('params.status = status')],
  ['Search submitted explicitly', ui.includes('onSubmit={applySearch}')],
  ['Pagination controls', ui.includes('Previous') && ui.includes('Next')],
  ['Review detail panel', ui.includes('Report details')],
  ['Action confirmation', ui.includes('window.confirm')],
  ['Action concurrency lock', ui.includes('if (!id || actionId) return')],
  ['Canonical and legacy IDs supported', ui.includes('row?.id || row?._id')],
  ['Backend search fields are bounded and escaped', controller.includes('search.trim().slice(0, 100)') && controller.includes('escapeRegex(search.trim().slice(0, 100))') && controller.includes('targetId: search.trim().slice(0, 100)')],
  ['Backend response disables caching', controller.includes('Cache-Control", "no-store')],
  ['Backend computes status counts', controller.includes('Report.countDocuments({ status: value })')],
  ['Backend validates update status', controller.includes('INVALID_REPORT_STATUS')],
  ['Backend validates moderation action', controller.includes('INVALID_REPORT_ACTION')],
  ['Backend rejects empty update', controller.includes('EMPTY_REPORT_UPDATE')],
  ['Enforcement actions must match target type', controller.includes('REPORT_ACTION_TARGET_MISMATCH')],
  ['Enforcement actions require existing targets', controller.includes('REPORT_TARGET_NOT_FOUND')],
  ['Admin route validates list query', routes.includes('validateQuery(reportListQuerySchema)')],
  ['Query schema limits page size', validation.includes('reportListQuerySchema') && validation.includes('max(50)')],
  ['Regression test covers API failure', test.includes('instead of claiming the queue is empty')],
  ['Regression test covers genuine empty state', test.includes('genuine empty state')],
  ['Regression test covers malformed envelope', test.includes('malformed response envelopes')],
];
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
const failed = checks.filter(([, ok]) => !ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) process.exit(1);
