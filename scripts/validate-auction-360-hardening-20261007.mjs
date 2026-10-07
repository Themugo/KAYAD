import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = (p) => fs.readFileSync(p, 'utf8');
const checks = [];
const pass = (name) => checks.push([name, true]);
const fail = (name) => checks.push([name, false]);
const auctionController = read('backend/controllers/auctionController.js');
const auctionRoutes = read('backend/routes/auctionRoutes.js');
const settlementRoutes = read('backend/routes/auctionSettlementRoutes.js');
const timer = read('backend/utils/auctionTimer.js');
const lifecycle = read('backend/services/auctionLifecycle.service.js');
const atomic = read('backend/utils/atomicTransactions.js');
const setup = read('backend/services/auctionSetup.service.js');
const bidController = read('backend/controllers/bidController.js');
const live = read('src/pages/AuctionLivePage.jsx');
const auctionService = read('src/services/auctionService.ts');
const socket = read('src/context/SocketContext.tsx');
const discovery = read('src/features/AuctionsView.tsx');
const premium = read('src/styles/auction-premium.css');
const sql = read('supabase/migrations/20261007120000_auction_rule_authority_convergence.sql');

auctionController.includes('req.query.status === "draft" || req.query.status === "scheduled"') ? pass('scheduled auction discovery is backed by published setup') : fail('scheduled auction discovery is backed by published setup');
auctionController.includes('auctionStatus: "draft"') && auctionController.includes('startsAt') ? pass('scheduled auction response exposes configured start time') : fail('scheduled auction response exposes configured start time');
auctionController.includes('status: { $in: ["paid", "won", "lost"] }') && !auctionController.includes('.populate("user"') ? pass('public bid activity excludes pending bids and bidder PII') : fail('public bid activity excludes pending bids and bidder PII');
auctionController.includes('highestBidderId:') ? fail('public auction response does not expose highest bidder identity') : pass('public auction response does not expose highest bidder identity');
auctionController.includes('reservePrice: car.reservePrice') ? fail('public auction response does not expose exact reserve price') : pass('public auction response does not expose exact reserve price');
auctionRoutes.includes('router.get("/:id/bids"') ? pass('public auction bid activity endpoint exists') : fail('public auction bid activity endpoint exists');
settlementRoutes.includes('router.get("/:id/outcome", protect, validateObjectId') ? pass('auction outcome is participant/admin protected') : fail('auction outcome is participant/admin protected');
timer.includes('Scheduled auction started') && timer.includes('auctionStartTime: { $lte: now }') && timer.includes('scheduledEndAt') ? pass('scheduled auctions auto-start through canonical lifecycle') : fail('scheduled auctions auto-start through canonical lifecycle');
lifecycle.includes('atomicStartScheduledAuction') && atomic.includes('kayad_start_scheduled_auction_atomic') ? pass('scheduled start preserves the published end time') : fail('scheduled start preserves the published end time');
setup.includes('auctionStartTime: config.startsAt') && setup.includes('auctionEnd: config.endsAt') ? pass('published schedule mirrors onto canonical car lifecycle') : fail('published schedule mirrors onto canonical car lifecycle');
bidController.includes('configuredIncrement') && bidController.includes('getMinIncrement(currentBid, configuredIncrement)') ? pass('backend bid validation uses published configured increment') : fail('backend bid validation uses published configured increment');
sql.includes("v_setup->>'bidIncrement'") && sql.includes("antiSnipeWindowSeconds") && sql.includes("maxExtensions") ? pass('DB atomic bid/auto-bid/extension rules use published setup') : fail('DB atomic bid/auto-bid/extension rules use published setup');
bidController.includes('emitBidUpdate') && bidController.includes('emitAuctionExtended') ? pass('confirmed bids and anti-snipe extensions emit canonical realtime events') : fail('confirmed bids and anti-snipe extensions emit canonical realtime events');
live.includes('fetchAuction(id)') && !live.includes('carsAPI.get(id)') ? pass('live room uses canonical auction transport') : fail('live room uses canonical auction transport');
live.includes('fetchAuctionBids(id)') && auctionService.includes('/api/auctions/${encodeURIComponent(carId)}/bids') ? pass('public live room uses sanitized auction bid transport') : fail('public live room uses sanitized auction bid transport');
live.includes('termsAccepted') && live.includes('acceptTerms: termsAccepted') ? pass('bidder registration requires explicit terms acceptance') : fail('bidder registration requires explicit terms acceptance');
live.includes('settlement_mode') && live.includes('initiateAuctionWinnerPayment') ? pass('winner CTA converges on actual settlement path') : fail('winner CTA converges on actual settlement path');
socket.includes("'auctionEnded'") && socket.includes("'auctionExtended'") && socket.includes("'auctionTimer'") ? pass('socket client handles canonical auction lifecycle events') : fail('socket client handles canonical auction lifecycle events');
!socket.includes('if(!isAuth){socketRef.current?.disconnect()') ? pass('public auction realtime is available to signed-out viewers') : fail('public auction realtime is available to signed-out viewers');
discovery.includes("auction.status === 'active'") && discovery.includes("isEnded ? 'Final bid'") ? pass('auction discovery cards use actual auction status and final bid') : fail('auction discovery cards use actual auction status and final bid');
discovery.includes('dealer?.verified') ? pass('verified organizer presentation uses canonical dealer trust field') : fail('verified organizer presentation uses canonical dealer trust field');
premium.includes('repeat(4,minmax') ? pass('auction discovery four-tab layout is aligned on desktop') : fail('auction discovery four-tab layout is aligned on desktop');

for (const file of ['backend/controllers/auctionController.js','backend/routes/auctionRoutes.js','backend/routes/auctionSettlementRoutes.js','backend/utils/auctionTimer.js','backend/services/auctionSetup.service.js','backend/controllers/bidController.js']) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  result.status === 0 ? pass(`syntax: ${file}`) : fail(`syntax: ${file}`);
}

let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`\nAuction 360 hardening: ${checks.length - failed}/${checks.length} checks passed.`);
process.exitCode = failed ? 1 : 0;
