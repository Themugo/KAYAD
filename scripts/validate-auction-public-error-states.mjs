import fs from 'node:fs';
import process from 'node:process';

const read = (path) => fs.readFileSync(path, 'utf8');
const discovery = read('src/features/AuctionsView.tsx');
const detail = read('src/pages/AuctionLivePage.jsx');
const service = read('src/services/auctionService.ts');
const controller = read('backend/controllers/auctionController.js');
const discoveryTests = read('src/__tests__/features/auctionsViewLoadFailure.test.tsx');
const backendVisibilityTests = read('backend/tests/auction/auctionListSoftDelete.test.js');
const detailTests = read('src/__tests__/pages/AuctionLivePage.test.jsx');
const checks = [
  ['discovery does not expose raw server exception text', !discovery.includes('reason?.response?.data?.message') && !discovery.includes('Internal server error')],
  ['a failed refresh preserves the last successful list snapshot', discovery.includes('applyIfFulfilled(results[0], setLive)') && discovery.includes('applyIfFulfilled(results[1], setScheduled)') && discovery.includes('applyIfFulfilled(results[2], setEnded)')],
  ['headline state follows the selected auction tab and avoids a false empty flash during load', discovery.includes('The headline describes the selected tab only') && !discovery.includes('if (failed.scheduled && live.length === 0)') && discovery.includes('Loading auction activity…')],
  ['auction tabs are connected to an accessible results panel', discovery.includes('aria-controls="auction-results-panel"') && discovery.includes('role="tabpanel"') && discovery.includes('aria-labelledby={`auction-tab-${tab}`}')],
  ['signed-out saved tab does not show a false zero count', discovery.includes("{user ? favorites.size : '—'}") && discovery.includes('Sign in to view your saved auctions')],
  ['detail page distinguishes HTTP 404 from service/network failure', detail.includes("status === 404 ? 'not-found' : 'unavailable'")],
  ['detail page offers retry and a route back to auction discovery', detail.includes('Try again') && detail.includes('Back to auctions') && detail.includes('setLoadAttempt((attempt) => attempt + 1)')],
  ['initial detail load uses the canonical sanitized bid list once', detail.includes('Array.isArray(auctionData.bids)') && !detail.includes('fetchAuctionBids(id)') && controller.includes('bids: bids.map((b) =>') && service.includes('/api/auctions/${encodeURIComponent(carId)}/bids')],
  ['discovery regression tests cover sanitized failures and refresh preservation', discoveryTests.includes('queryByText(/Internal server error/)') && discoveryTests.includes('keeps the last successful rows visible')],
  ['canonical public live list excludes rejected listings and expired/not-yet-started auctions', controller.includes('status: { $ne: "rejected" }') && controller.includes('filter.auctionStartTime = { $lte: now }') && controller.includes('filter.auctionEnd = { $gt: now }')],
  ['scheduled listing, detail and public bid history hide rejected or deleted vehicles', controller.includes('status: { $ne: "rejected" }, id: { $in: ids }') && controller.includes('car.deletedAt || car.status === "rejected"')],
  ['published future setup remains openable before car lifecycle mirroring', controller.includes('const scheduled = (car.auctionStatus === "draft" || !car.auctionStatus) && hasFuturePublishedStart') && controller.includes('&& !scheduled') && backendVisibilityTests.includes('published upcoming setup is openable before the car lifecycle row is mirrored')],
  ['backend regression tests cover rejected/deleted visibility, live time boundaries and scheduled detail parity', backendVisibilityTests.includes('excludes rejected listings and enforces the live time window') && backendVisibilityTests.includes('public bid history hides a') && backendVisibilityTests.includes('public bid history route accepts a published upcoming setup')],
  ['detail regression tests cover 404, outage and retry recovery', detailTests.includes('does not label a server failure as an auction that does not exist') && detailTests.includes('offers a retry that recovers') && detailTests.includes('uses a distinct unavailable state for a real 404')],
];
let passed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (ok) passed++; }
console.log(`Auction public error-state validation: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
