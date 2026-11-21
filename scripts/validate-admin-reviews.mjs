import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui = fs.readFileSync('src/pages/admin/AdminReviews.jsx', 'utf8');
const service = fs.readFileSync('backend/services/review.service.js', 'utf8');
const routes = fs.readFileSync('backend/routes/adminRoutes.js', 'utf8');
const query = fs.readFileSync('backend/validation/query.schema.js', 'utf8');
const api = fs.readFileSync('src/api/api.exports.ts', 'utf8');
const checks = [
  ['Admin review page uses canonical admin API', ui.includes('adminAPI.reviews')],
  ['Page requires the expected list response shape', ui.includes('Array.isArray(data.reviews)') && ui.includes('data.pagination')],
  ['Load failures are distinct from empty queue', ui.includes('Review records could not be loaded.') && ui.includes('This is a loading failure')],
  ['Retry action is available', ui.includes('Retry loading reviews')],
  ['Manual refresh action is available', ui.includes('aria-label="Refresh reviews"')],
  ['Request sequence guard prevents stale responses', ui.includes('requestSequence.current')],
  ['Loading state is accessible', ui.includes('aria-live="polite"')],
  ['Status filter supports all records', ui.includes("{ value: 'all', label: 'All statuses' }")],
  ['Status filter supports pending', ui.includes("{ value: 'pending', label: 'Pending' }")],
  ['Status filter supports approved', ui.includes("{ value: 'approved', label: 'Approved' }")],
  ['Status filter supports rejected', ui.includes("{ value: 'rejected', label: 'Rejected' }")],
  ['Pagination has previous and next controls', ui.includes('Previous') && ui.includes('Next')],
  ['Search scope is disclosed as current page', ui.includes('Search is limited to the currently loaded page.')],
  ['Review IDs tolerate id and legacy _id', ui.includes('review?.id || review?._id')],
  ['Rating display is bounded', ui.includes('Math.min(5, Math.max(0, rating))')],
  ['Delete requires explicit confirmation', ui.includes('window.confirm(\'Delete this review permanently? This cannot be undone.\')')],
  ['Moderation buttons lock while any action is active', ui.includes('disabled={busy || Boolean(actionId)}')],
  ['Admin list returns status counts', routes.includes('statusCounts: result.statusCounts')],
  ['Admin list validates query parameters', routes.includes('validateQuery(reviewListQuerySchema)')],
  ['Review status query is constrained to supported states', query.includes('status: z.enum(["pending", "approved", "rejected"]).optional()')],
  ['Admin service clamps page size to 50', service.includes('Math.min(Math.max(Number(limit) || 20, 1), 50)')],
  ['Admin service filters supported status', service.includes('if (status && ADMIN_STATUSES.includes(status)) filters.status = status')],
  ['Admin service computes counts across all statuses', service.includes('total: Number(allResult.count)') && service.includes("status: 'pending'") && service.includes("status: 'approved'") && service.includes("status: 'rejected'")],
  ['Admin service honors supported sort field', service.includes("sortBy === 'rating' ? 'rating' : 'createdAt'")],
  ['Moderation validates lifecycle state', service.includes("if (!ADMIN_STATUSES.includes(status))")],
  ['Moderation recalculates dealer rating after status change', service.includes('await recalculateDealerRating(updated.dealerId)')],
  ['Existing admin API paths are preserved', api.includes("api.get('/admin/reviews'") && api.includes('/admin/reviews/${id}/status') && api.includes('/admin/reviews/${id}')],
];
let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failed += 1;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
