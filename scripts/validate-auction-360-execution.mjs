import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const view = read('src/features/AuctionsView.tsx');
const css = read('src/styles/auction-premium.css');
const tests = read('src/__tests__/features/auctionsViewLoadFailure.test.tsx');
const diag = read('scripts/diagnose-public-auction-api.mjs');
const checks = [
  ['runtime list envelope validation rejects malformed success payloads', view.includes('readAuctionRows(result.value)') && view.includes('Auction list response did not contain an auctions array.')],
  ['only validated list sections replace existing snapshots', view.includes('if (normalized[0].ok) setLive(normalized[0].rows)') && view.includes('if (normalized[1].ok) setScheduled(normalized[1].rows)') && view.includes('if (normalized[2].ok) setEnded(normalized[2].rows)')],
  ['out-of-order list refreshes are ignored', view.includes('requestSequence.current') && view.includes('sequence !== requestSequence.current')],
  ['last refresh metadata is shown', view.includes('Last refresh with available data')],
  ['saved list response is validated', view.includes('readFavoriteIds(result)') && view.includes('Saved-auction response did not contain a favorites array.')],
  ['watchlist failure is distinct from an empty watchlist', view.includes("setFavoritesStatus('error')") && view.includes('Your saved auctions could not be verified.')],
  ['watchlist retries use the sequenced loader', view.includes('onClick={() => void loadFavorites()}') && view.includes('favoritesRequestSequence.current')],
  ['mobile tabs use a complete two-column grid', css.includes('.auction-segment-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))')],
  ['mobile page reserves bottom safe-area clearance', css.includes('padding-bottom:calc(7.5rem + env(safe-area-inset-bottom, 0px))')],
  ['status indicator distinguishes loading, unavailable, live and idle', view.includes('is-unavailable') && view.includes('is-loading') && view.includes('is-live') && view.includes('is-idle')],
  ['search field has an accessible label and concise placeholder', view.includes('aria-label="Search auctions by vehicle, make, model or location"') && view.includes('Search make, model or location')],
  ['regression tests cover malformed list and saved-list failures', tests.includes('malformed fulfilled list envelope') && tests.includes('failed saved-auction request')],
  ['read-only endpoint diagnostic masks response payloads', diag.includes('auctionsCount') && diag.includes('No HTTP response was received') && !diag.includes('console.log(await response.text())')],
];
let pass=0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (ok) pass++; }
console.log(`Auction 360 execution source validation: ${pass}/${checks.length} PASS`);
if (pass !== checks.length) process.exit(1);
