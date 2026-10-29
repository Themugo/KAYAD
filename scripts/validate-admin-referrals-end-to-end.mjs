import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui = fs.readFileSync('src/pages/admin/AdminReferrals.jsx', 'utf8');
const routes = fs.readFileSync('backend/routes/adminRoutes.js', 'utf8');
const api = fs.readFileSync('src/api/api.exports.ts', 'utf8');
const guards = fs.readFileSync('backend/utils/referralGuards.js', 'utf8');
const checks = [
  ['existing admin referrals page preserved', ui.includes('export default function AdminReferrals')],
  ['existing API list method preserved', api.includes("api.get('/admin/referrals', { params })")],
  ['existing stats endpoint preserved', routes.includes('"/referrals/stats"')],
  ['existing user-tree endpoint preserved', routes.includes('"/users/:id/referrals"')],
  ['frontend validates list response envelope', ui.includes('Array.isArray(d.referrals)') && ui.includes('d.pagination')],
  ['frontend validates stats response envelope', ui.includes('!d.stats')],
  ['frontend validates user tree response envelope', ui.includes('!d.user || !Array.isArray(d.referred)')],
  ['API errors are visible and retryable', ui.includes('role="alert"') && ui.includes('Retry loading')],
  ['failed list request does not become empty state', ui.includes(': error ? null : referrals.length === 0')],
  ['stale requests are ignored', ui.includes('requestSequence.current')],
  ['user tree requires explicit submit', ui.includes('setSubmittedUserSearch(userSearch.trim())')],
  ['manual credit amount is editable and validated', ui.includes('setCreditAmount(e.target.value)') && ui.includes('Number.isFinite(amount) || amount <= 0')],
  ['credit confirmation explains financial side effects', ui.includes('creates a transaction record')],
  ['credit amount remains strict numeric JSON', guards.includes('typeof raw === "number" && Number.isFinite(raw) && raw > 0')],
  ['credit only claims pending referrals', routes.includes('{ _id: referral._id, status: "pending" }')],
  ['credit checks stable transaction reference', routes.includes('`REF-${referral._id}`') && routes.includes('Transaction.findOne({ reference })')],
  ['credit failure attempts compensation', routes.includes('REFERRAL_CREDIT_RECONCILIATION_REQUIRED') && routes.includes('transaction rollback') && routes.includes('balance rollback')],
  ['credit rollback failure is surfaced distinctly', routes.includes('REFERRAL_CREDIT_ROLLED_BACK')],
  ['expire uses conditional pending transition', routes.includes('const expired = await Referral.findOneAndUpdate(') && routes.includes('{ status: "expired" }')],
  ['list status query is allowlisted', routes.includes('allowedStatuses.has(status)')],
  ['pagination parameters are strictly validated', routes.includes('Page must be a positive integer') && routes.includes('Limit must be an integer between 1 and 50')],
  ['list and stats responses are non-cacheable', routes.includes('res.set("Cache-Control", "no-store")')],
  ['credit amount has no invented policy maximum', routes.includes('A maximum is a business-policy decision')],
  ['admin authorization remains on payout action', routes.includes('"/referrals/:id/credit",\n  adminOrSuper')],
  ['staff authorization remains on list action', routes.includes('"/referrals",\n  staffRole')],
  ['no new financial schema or route family introduced', !routes.includes('/referrals-v2') && !fs.existsSync('backend/models/ReferralPayout.js')],
];
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  assert.ok(ok, name);
}
console.log(`\n${checks.length}/${checks.length} static referral contract checks passed.`);
