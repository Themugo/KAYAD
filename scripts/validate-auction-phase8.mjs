import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['dealer setup defaults to direct settlement', read('backend/services/auctionSetup.contract.js').includes("mode: input.settlement?.mode || (input.escrowEnabled ? 'escrow' : 'direct')")],
  ['platform policy service exists', read('backend/services/auctionPlatformPolicy.service.js').includes('DEFAULT_AUCTION_PLATFORM_POLICY')],
  ['platform policy constrains settlement modes', read('backend/services/auctionPlatformPolicy.service.js').includes('allowedSettlementModes')],
  ['auction close creates canonical outcome', read('backend/services/auctionClose.service.js').includes('ensureAuctionOutcome')],
  ['auction outcome stores direct vs escrow mode', read('backend/services/auctionSettlement.service.js').includes('settlementMode')],
  ['escrow creation is optional and explicit', read('backend/services/auctionSettlement.service.js').includes('Escrow is not selected for this auction')],
  ['winner payment updates outcome', read('backend/services/paymentCallback.service.js').includes('markAuctionPaymentReceived')],
  ['auction winner payment type is supported', read('backend/services/paymentCallback.service.js').includes('payment.type === "auction_win"')],
  ['legacy payment no longer silently forces escrow', !read('backend/controllers/paymentController.js').includes('All purchases go through escrow by default')],
  ['winner direct payment endpoint exists', read('backend/routes/auctionSettlementRoutes.js').includes('/outcome/payment')],
  ['admin platform policy endpoint exists', read('backend/routes/auctionSettlementRoutes.js').includes('/platform/policy')],
  ['outcome migration exists', read('supabase/migrations/20261002220000_auction_settlement_platform_policy.sql').includes('CREATE TABLE IF NOT EXISTS auction_outcomes')],
  ['outcome is unique per auction', read('supabase/migrations/20261002220000_auction_settlement_platform_policy.sql').includes('car_id UUID NOT NULL UNIQUE')],
  ['escrow is created only for escrow-selected auctions', read('backend/services/auctionSettlement.service.js').includes('settlementMode === "escrow"')],
];
let failed=0;
for (const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed)process.exit(1);console.log(`PHASE8_PASS=${checks.length}`);
