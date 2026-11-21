import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui = fs.readFileSync('src/features/AdminSupportWorkspace.tsx', 'utf8');
const api = fs.readFileSync('src/services/supportApi.ts', 'utf8');
const controller = fs.readFileSync('backend/controllers/supportController.js', 'utf8');
const routes = fs.readFileSync('backend/routes/supportRoutes.js', 'utf8');
const adminRoutes = fs.readFileSync('backend/routes/supportTicketAdminRoutes.js', 'utf8');
const service = fs.readFileSync('backend/services/support/supportCase.service.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20261009150000_support_resolution_hardening.sql', 'utf8');
const tests = fs.readFileSync('src/__tests__/features/support/adminSupportWorkspace.test.tsx', 'utf8');
const checks = [
  ['Queue and metrics requests fail independently', ui.includes('Promise.allSettled')],
  ['Stale queue requests are guarded', ui.includes('queueRequestSeq.current')],
  ['Queue response shape is checked', ui.includes('Array.isArray(q.cases)') && ui.includes('Number.isFinite(q.total)')],
  ['Queue errors do not render the empty state', ui.includes('!error &&') && ui.includes('Queue unavailable')],
  ['Retry control is visible on queue errors', ui.includes("error ? 'Retry loading cases' : 'Refresh'")],
  ['Pagination uses server total and offset', ui.includes('offset: page * pageSize') && ui.includes('Showing ${page * pageSize + 1}')],
  ['Page size is bounded in service', service.includes('Math.min(Math.max(Number(query.limit) || 25, 1), 100)')],
  ['Status filter is validated', service.includes('SUPPORT_STATUS_INVALID')],
  ['Priority filter is validated', service.includes('SUPPORT_PRIORITY_INVALID')],
  ['Category filter is validated', service.includes('SUPPORT_CATEGORY_INVALID')],
  ['Assignee filter validates UUID', service.includes('SUPPORT_ASSIGNEE_INVALID')],
  ['Staff queue uses exact count', service.includes('select(STAFF_LIST_COLUMNS, { count: "exact" })')],
  ['Metrics errors do not break queue operations', ui.includes('Queue operations can still be used')],
  ['Unavailable metrics are not represented by loading ellipses', ui.includes("metricsError ? 'Unavailable' : '…'")],
  ['Team directory failure is surfaced', ui.includes('support team directory is unavailable')],
  ['Read-only oversight is explicit', ui.includes('Oversight access is read-only')],
  ['Oversight case view requires reason and fail-closed audit', service.includes('validateOversightReason(reason)') && service.includes('failClosed: true')],
  ['Support access is enforced on staff routes', routes.includes('requireSupportViewer') && routes.includes('requireSupportAgent')],
  ['Legacy admin aliases retain viewer and agent authorization', adminRoutes.includes('router.use(protect, requireSupportViewer)') && adminRoutes.includes('requireSupportAgent')],
  ['Staff metrics are exposed through the canonical controller', controller.includes('svc.supportMetrics')],
  ['Writes use atomic support RPCs', service.includes('kayad_support_append_message') && service.includes('kayad_support_update_case')],
  ['Migration defines support metrics RPC', migration.includes('CREATE OR REPLACE FUNCTION kayad_support_metrics')],
  ['Regression test covers metrics outage', tests.includes('keeps the case queue usable when metrics are unavailable')],
  ['Regression test covers queue outage and false empty state', tests.includes('does not show a false empty queue when queue loading fails')],
  ['Regression test covers malformed queue response', tests.includes('rejects malformed queue responses instead of presenting them as empty')],
  ['Search does not claim global full-text support', ui.includes('Case number') && service.includes('ticket_number')],
];
let failures = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures++;
}
console.log(`\n${checks.length - failures}/${checks.length} checks passed`);
if (failures) process.exitCode = 1;
