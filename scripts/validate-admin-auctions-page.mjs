import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const pagePath = path.join(root, 'src/pages/admin/AdminAuctions.jsx');
const source = fs.readFileSync(pagePath, 'utf8');
const checks = [
  ['Uses existing AdminAuctions page', source.includes('export default function AdminAuctions()')],
  ['Uses existing cars API', source.includes("carsAPI.list({ auctionStatus: 'live'") && source.includes("carsAPI.list({ auctionStatus: 'draft'") && source.includes("carsAPI.list({ auctionStatus: 'ended'")],
  ['Uses existing auction admin API', ['auctionAdminAPI.start', 'auctionAdminAPI.end', 'auctionAdminAPI.extend', 'auctionAdminAPI.bidHistory', 'auctionAdminAPI.setWinner'].every(x => source.includes(x))],
  ['Does not silently convert failed requests to empty queue', source.includes('setLoadError(message)') && source.includes('An error is not an empty auction queue')],
  ['Retains previous records when refresh fails', source.includes('setCars(all)') && source.includes('Existing results, if any, have been retained')],
  ['Rejects malformed auction response envelope', source.includes('Unexpected ${label} auctions response')],
  ['Guards against stale concurrent refresh responses', source.includes('requestSequence.current')],
  ['Includes manual refresh and retry controls', source.includes('Refresh auction records') && source.includes('>Retry</button>')],
  ['Shows last successful refresh time', source.includes('lastLoadedAt.toLocaleTimeString')],
  ['Start action reports success only after API resolves', source.indexOf('await auctionAdminAPI.start') < source.indexOf("toast('Auction is now LIVE!'") ],
  ['End action retains confirmation guard', source.includes("window.confirm('End this auction now?')")],
  ['Winner bid history validates response envelope', source.includes('Unexpected bid history response')],
  ['Lost or pending bids cannot be selected as confirmed winners', !source.includes("['paid', 'won', 'lost']") && source.includes("['paid', 'won'].includes")],
  ['Bid history failures are distinguishable from no eligible bids', source.includes('Bid eligibility could not be verified') && source.includes('Unable to verify eligible bids')],
  ['Winner bid sorting does not mutate cached state', source.includes('[...winnerModal.bids].sort')],
  ['Disables conflicting auction actions while one is pending', source.includes('disabled={Boolean(actionId)}')],
  ['Existing listing links are preserved', source.includes('to={`/cars/${car._id}`}')],
  ['Does not introduce mock inventory or alternate auction APIs', !/mockAuction|fakeAuction|demoAuction/i.test(source)],
];
let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
