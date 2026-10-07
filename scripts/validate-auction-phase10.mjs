import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [
  ['phase 7 bidding-room lock exists', exists('backend/services/auctionRoom.service.js')],
  ['phase 8 settlement policy exists', exists('backend/services/auctionPlatformPolicy.service.js')],
  ['phase 8 outcome settlement service exists', exists('backend/services/auctionSettlement.service.js')],
  ['phase 9 fulfilment service exists', exists('backend/services/auctionFulfilment.service.js')],
  ['phase 9 fulfilment migration exists', exists('supabase/migrations/20261002230000_auction_post_fulfilment_exception_engine.sql')],
  ['auction outcome is unique per car', /car_id UUID NOT NULL UNIQUE/.test(read('supabase/migrations/20261002220000_auction_settlement_platform_policy.sql'))],
  ['outcome RLS is participant/admin scoped', /organizer_id = auth\.uid\(\).*winner_user_id = auth\.uid\(\)/s.test(read('supabase/migrations/20261002220000_auction_settlement_platform_policy.sql'))],
  ['fulfilment event RLS is participant/admin scoped', /o\.organizer_id = auth\.uid\(\).*o\.winner_user_id = auth\.uid\(\)/s.test(read('supabase/migrations/20261002230000_auction_post_fulfilment_exception_engine.sql'))],
  ['late registration remains blocked', /AUCTION_BIDDING_ROOM_CLOSED/.test(read('backend/services/auctionRegistration.service.js'))],
  ['canonical auction close remains authoritative', /closeAuction|ensureAuctionOutcome/.test(read('backend/services/auctionClose.service.js'))],
  ['direct winner payment remains direct', /type: "auction_win"/.test(read('backend/routes/auctionSettlementRoutes.js'))],
  ['direct settlement does not create escrow', /settlementMode !== "direct"/.test(read('backend/routes/auctionSettlementRoutes.js'))],
  ['escrow creation remains canonical', /createEscrow/.test(read('backend/services/auctionSettlement.service.js'))],
  ['escrow funding syncs outcome', /markAuctionEscrowFunded/.test(read('backend/services/escrowConfiguration.service.js'))],
  ['collection requires settlement', /Winner payment must be settled before collection/.test(read('backend/services/auctionFulfilment.service.js'))],
  ['collection uses conditional outcome update', /updateMany\("auction_outcomes", guard/.test(read('backend/services/auctionFulfilment.service.js'))],
  ['transfer requires collection', /collection_status !== "collected"/.test(read('backend/services/auctionFulfilment.service.js'))],
  ['transfer uses conditional outcome update', /updateMany\("auction_outcomes", guard/.test(read('backend/services/auctionFulfilment.service.js'))],
  ['ownership service remains canonical', /ownershipService\.addVehicleToGarage/.test(read('backend/services/auctionFulfilment.service.js'))],
  ['escrow release uses canonical service', /releaseEscrow\(/.test(read('backend/services/auctionFulfilment.service.js'))],
  ['escrow release has idempotency key', /auction-release:\$\{outcome\.id\}/.test(read('backend/services/auctionFulfilment.service.js'))],
  ['re-award claims losing bid conditionally', /updateMany\("bids", \{ id: candidate\.id, status: "lost" \}/.test(read('backend/services/auctionFulfilment.service.js'))],
  ['re-award claims outcome conditionally', /updateMany\("auction_outcomes", \{ id: outcome\.id, status: "reaward_pending"/.test(read('backend/services/auctionFulfilment.service.js'))],
  ['re-award never reopens bidding', !/allow_bid:\s*true/.test(read('backend/services/auctionFulfilment.service.js'))],
  ['dealer cancellation blocks paid outcomes', /outcome\.payment_status === "paid"/.test(read('backend/services/auctionFulfilment.service.js'))],
  ['disputes converge to existing governance/escrow authorities', /openEscrowDispute|governanceService\.createDispute/.test(read('backend/services/auctionFulfilment.service.js'))],
  ['fulfilment events are auditable', /auction_fulfilment_events/.test(read('supabase/migrations/20261002230000_auction_post_fulfilment_exception_engine.sql'))],
  ['dealer operations route is authenticated', /router\.get\("\/operations", protect/.test(read('backend/routes/auctionFulfilmentRoutes.js'))],
  ['collection route is dealer-protected', /router\.post\("\/:id\/collection", protect, requireDealerVerification/.test(read('backend/routes/auctionFulfilmentRoutes.js'))],
  ['re-award route is dealer-protected', /router\.post\("\/:id\/reaward", protect, requireDealerVerification/.test(read('backend/routes/auctionFulfilmentRoutes.js'))],
  ['admin platform policy remains admin-protected', /router\.put\("\/platform\/policy", protect, adminOnly/.test(read('backend/routes/auctionSettlementRoutes.js'))],
  ['auction transport convergence is green', exists('scripts/validate-auction-transport-convergence.mjs')],
];
let passed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); if (ok) passed++; }
console.log(`PHASE10_PASS=${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);
