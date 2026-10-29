import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui = fs.readFileSync('src/pages/admin/AdminInspections.jsx', 'utf8');
const controller = fs.readFileSync('backend/inspection/controllers/legacyCompatibilityController.js', 'utf8');
const routes = fs.readFileSync('backend/inspection/routes/inspectionRoutes.js', 'utf8');
const api = fs.readFileSync('src/api/api.exports.ts', 'utf8');
const checks = [
  ['admin list handler exists', controller.includes('export const listAdmin = asyncHandler')],
  ['admin list is role restricted', controller.includes("if (!['admin', 'superadmin'].includes(req.user.role)) return res.status(403)")],
  ['admin queue uses canonical vehicle_inspections table', controller.includes("from('vehicle_inspections').select('*').order('created_at', { ascending: false }).limit(200)")],
  ['status filters are allow-listed', controller.includes("new Set(['requested', 'assigned', 'in_progress', 'completed', 'cancelled'])")],
  ['unsupported status filter is rejected', controller.includes('Unsupported inspection status filter')],
  ['admin queue includes vehicle/buyer/inspector lookups', controller.includes('const [carEntries, buyerEntries, inspectorEntries] = await Promise.all')],
  ['queue response declares count and truncation', controller.includes('count: orders.length, limit: 200, truncated: orders.length === 200')],
  ['route is registered at canonical inspection root', routes.includes("router.get('/', requireAuth, requireRole(['admin', 'superadmin']), legacy.listAdmin)")],
  ['existing API client path remains unchanged', api.includes("list:            (params: any)         => api.get('/inspections', { params }).then(unwrap)")],
  ['load rejects malformed success responses', ui.includes('!Array.isArray(data.value.orders)')],
  ['failed loads do not replace orders with empty list', !/catch\s*\([^)]*\)\s*\{\s*setOrders\(\[\]\)/.test(ui)],
  ['load sequence prevents stale request overwrites', ui.includes('requestSequence.current')],
  ['inspector list failure does not hide order queue', ui.includes('Promise.allSettled')],
  ['assignment uses actual requested state', ui.includes("order.status === 'requested'")],
  ['assignment error is surfaced to operator', ui.includes("setError(err?.message || 'Inspector assignment failed. Please retry.')")],
  ['refresh control is available', ui.includes('RefreshCw size={13}')],
  ['retry control is available on load error', ui.includes('Try again')],
  ['empty state only shown after successful load', ui.includes('orders.length === 0 && !error')],
  ['paid status is not fabricated in status filter', !ui.includes("{ value: 'paid', label: 'Paid' }")],
  ['unknown fees are not displayed as zero', ui.includes("return 'Fee unavailable'")],
  ['completed score zero remains displayable', ui.includes('score !== null && score !== undefined && Number.isFinite(Number(score))')],
  ['eligible inspector data uses real location field', ui.includes('candidate.location ? ` · ${candidate.location}`')],
  ['payment limitation is disclosed in UI', ui.includes('do not initiate payment')],
];
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  assert.ok(passed, name);
}
console.log(`\n${checks.length}/${checks.length} inspection admin static checks passed.`);
