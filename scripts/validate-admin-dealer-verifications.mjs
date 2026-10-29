import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui = fs.readFileSync('src/pages/admin/AdminDealerVerifications.jsx', 'utf8');
const controller = fs.readFileSync('backend/controllers/verificationController.js', 'utf8');
const service = fs.readFileSync('backend/services/dealerVerificationService.js', 'utf8');
const routes = fs.readFileSync('backend/routes/verificationRoutes.js', 'utf8');
const api = fs.readFileSync('src/api/api.exports.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20261012140100_dealer_verification_suspended_status_r14.sql', 'utf8');
const checks = [
  ['Admin list endpoint is role protected', routes.includes('router.get("/admin/all", allowRoles("admin", "superadmin")')],
  ['List response validates expected array before replacing records', ui.includes("if (!Array.isArray(data?.verifications)) throw new Error('Unexpected dealer verification response')")],
  ['Load errors are surfaced rather than treated as an empty queue', ui.includes('setLoadError(err?.response?.data?.message') && ui.includes('Records unavailable until the request succeeds.')],
  ['Retry and refresh controls exist', ui.includes('onClick={load}') && ui.includes('>Refresh</button>')],
  ['List response hydrates user and dealer relations', controller.includes('findById("users", verification.user)') && controller.includes('findById("dealers", verification.dealer)')],
  ['Server provides global status summary counts', controller.includes('summary.total = await count("dealer_verifications")') && controller.includes('statusCounts')],
  ['Pagination metadata is returned', controller.includes('pagination: result.pagination') && ui.includes('Page {pagination.page} of')],
  ['Only schema-supported statuses are accepted', service.includes('["pending", "approved", "rejected", "suspended"]') && !ui.includes('value="under_review"')],
  ['Unsupported status filters fail explicitly', service.includes('Unsupported dealer verification status filter')],
  ['Document JSON object is rendered by key', ui.includes('Object.entries(selected.documents).map')],
  ['Actions use canonical id with legacy fallback', ui.includes('v.id || v._id')],
  ['Approval wording does not promise listing publication', ui.includes('Listings remain subject to their own review workflow')],
  ['Approve and reject actions remain wired to API', ui.includes('adminVerificationAPI.approve') && ui.includes('adminVerificationAPI.reject')],
  ['Suspend and reinstate actions are wired to API', ui.includes('adminVerificationAPI.suspend') && ui.includes('adminVerificationAPI.reinstate')],
  ['Reject/suspend reasons are required in UI', ui.includes("['reject', 'suspend'].includes(actionModal.action)")],
  ['Backend compare-and-swap lifecycle is retained', service.includes('updateMany("dealer_verifications", { id: verificationId, verificationStatus: current.verificationStatus }')],
  ['Approval does not conflate dealer and listing approval', controller.includes('Dealer approval and listing approval are separate decisions')],
  ['Admin API includes all required decision endpoints', api.includes("/verification/admin/${id}/suspend") && api.includes("/verification/admin/${id}/reinstate")],
  ['Suspension status remains aligned with existing DB migration', migration.includes("'suspended'")],
  ['Stale list responses are guarded', ui.includes('requestSequence.current') && ui.includes('sequence !== requestSequence.current')],
  ['Empty state distinguishes no matches from load failure', ui.includes('No verification requests match this filter.')],
  ['Responsive horizontal table region remains accessible', ui.includes('role="region" aria-label="Dealer verification table (scrollable)"')],
];
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
}
const failed = checks.filter(([, passed]) => !passed);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
assert.equal(failed.length, 0, failed.map(([label]) => label).join('\n'));
