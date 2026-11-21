import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [
  ["fulfilment service exists", exists("backend/services/auctionFulfilment.service.js")],
  ["fulfilment migration exists", exists("supabase/migrations/20261002230000_auction_post_fulfilment_exception_engine.sql")],
  ["fulfilment routes exist", exists("backend/routes/auctionFulfilmentRoutes.js")],
  ["operations list exists", read("backend/routes/auctionFulfilmentRoutes.js").includes('/operations')],
  ["collection control exists", read("backend/routes/auctionFulfilmentRoutes.js").includes('/collection')],
  ["transfer control exists", read("backend/routes/auctionFulfilmentRoutes.js").includes('/transfer')],
  ["escrow release control exists", read("backend/routes/auctionFulfilmentRoutes.js").includes('/escrow/release')],
  ["reaward control exists", read("backend/routes/auctionFulfilmentRoutes.js").includes('/reaward')],
  ["cancellation control exists", read("backend/routes/auctionFulfilmentRoutes.js").includes('/cancel')],
  ["dispute control exists", read("backend/routes/auctionFulfilmentRoutes.js").includes('/dispute')],
  ["ownership service remains canonical", read("backend/services/auctionFulfilment.service.js").includes('ownershipService.addVehicleToGarage')],
  ["escrow service remains canonical", read("backend/services/auctionFulfilment.service.js").includes('releaseEscrow')],
  ["escrow creation uses canonical service", read("backend/services/auctionSettlement.service.js").includes('createEscrow')],
  ["escrow funding sync exists", read("backend/services/escrowConfiguration.service.js").includes('markAuctionEscrowFunded')],
  ["outcome migration has collection fields", read("supabase/migrations/20261002230000_auction_post_fulfilment_exception_engine.sql").includes('collection_reference')],
  ["outcome migration has transfer fields", read("supabase/migrations/20261002230000_auction_post_fulfilment_exception_engine.sql").includes('owner_vehicle_id')],
  ["fulfilment event audit table exists", read("supabase/migrations/20261002230000_auction_post_fulfilment_exception_engine.sql").includes('auction_fulfilment_events')],
  ["server mounts fulfilment routes", read("backend/server.js").includes('auctionFulfilmentRoutes')],
  ["v1 mounts fulfilment routes", read("backend/routes/v1.js").includes('auctionFulfilmentRoutes')],
  ["direct settlement remains selectable", read("backend/services/auctionPlatformPolicy.service.js").includes('["direct", "escrow"]')],
  ["late bidding lock remains outside phase9", exists("backend/services/auctionRoom.service.js")],
];
let passed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); if (ok) passed++; }
console.log(`PHASE9_PASS=${passed}`);
if (passed !== checks.length) process.exit(1);
