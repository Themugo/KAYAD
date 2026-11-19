import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/20261116120000_personal_listing_lifecycle_atomic.sql');
const routes = read('backend/routes/carRoutes.js');
const leadRoutes = read('backend/routes/leadRoutes.js');
const insights = read('backend/services/personalSellerInsights.service.js');
const dashboard = read('src/components/DashboardHub.tsx');
const selling = read('src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx');
const tests = read('backend/tests/regression/personalListingLifecycleAtomic.test.js');
const adminRoutes = read('backend/routes/adminRoutes.js');
const checks = [
  ['atomic owner-bound lifecycle RPC', /FOR UPDATE/.test(migration) && /dealer_id IS DISTINCT FROM p_owner_id/.test(migration)],
  ['only supported listing states are written', /v_next_status := 'hidden'/.test(migration) && /v_next_status := 'available'/.test(migration) && /v_next_status := 'sold'/.test(migration)],
  ['bid and auction locks', /bids_count/.test(migration) && /highest_bidder_id/.test(migration) && /auction_status/.test(migration) && /FROM public\.bids/.test(migration)],
  ['escrow and purchase locks', /FROM public\.escrows/.test(migration) && /FROM public\.purchase_outcomes/.test(migration)],
  ['policy-managed visibility history is preserved', /private_seller_listing_visibility_events/.test(migration) && /restored_at IS NULL/.test(migration)],
  ['seller and moderator lifecycle actions are separately audited', /personal_listing_lifecycle_events/.test(migration) && /seller_hide/.test(migration) && /moderation_hide/.test(migration) && /recordModerationListingLifecycle/.test(adminRoutes)],
  ['republish and hidden mark-sold require a seller-originated hide, not a moderation hide', (migration.match(/v_last_lifecycle_action IS DISTINCT FROM 'seller_hide'/g) || []).length >= 2 && /LISTING_NOT_SELLER_HIDDEN/.test(migration)],
  ['dedicated personal lifecycle route', /\/:id\/lifecycle/.test(routes) && /transitionPersonalListing/.test(routes)],
  ['seller enquiry query is owner and vehicle scoped', /\.eq\("dealer", ownerId\)/.test(insights) && /\.in\("vehicle", ids\)/.test(insights)],
  ['seller enquiry route is separate from dealer CRM', /mine\/seller-enquiries/.test(leadRoutes)],
  ['listing views use first-party analytics events', /analytics_events/.test(insights) && /listing_view/.test(insights)],
  ['clicks and enquiries are labelled lifetime metrics', /clicksLifetime/.test(insights) && /enquiriesLifetime/.test(insights)],
  ['conversion is explicitly not inferred', /no verified attribution/.test(insights)],
  ['personal dashboard exposes seller enquiry and performance pages', /personalSection==='seller-enquiries'/.test(dashboard) && /personalSection==='performance'/.test(dashboard)],
  ['seller UI exposes hide, republish and mark sold', /canHide &&/.test(selling) && /canRepublish &&/.test(selling) && /canMarkSold &&/.test(selling) && /transitionMyListing/.test(selling) && /Republish/.test(selling) && /Mark as sold/.test(selling)],
  ['regression test covers critical lifecycle locks', /AUCTION_OR_BID_LOCK/.test(tests) && /TRANSACTION_LOCK/.test(tests) && /LISTING_POLICY_HIDDEN/.test(tests)],
];
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); assert.ok(ok, name); }
console.log(`\n${checks.length}/${checks.length} personal seller lifecycle/enquiry/performance checks passed.`);
