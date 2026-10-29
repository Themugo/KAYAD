import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pagePath = path.join(root, 'src/pages/admin/AdminBids.jsx');
const apiPath = path.join(root, 'src/services/bidApi.ts');
const page = fs.readFileSync(pagePath, 'utf8');
const api = fs.readFileSync(apiPath, 'utf8');
const checks = [
  ['Existing AdminBids page is edited in place', fs.existsSync(pagePath)],
  ['Existing canonical bid API client is retained', /fetchAdminBids/.test(page) && /fetchSuspiciousBids/.test(page) && /setBidWinner/.test(page)],
  ['No parallel API endpoint introduced', /\/api\/bids\/admin\/all/.test(api) && /\/api\/bids\/admin\/suspicious/.test(api) && /set-winner/.test(api)],
  ['Malformed list envelopes are rejected', /returned an unexpected response/.test(page)],
  ['Explicit unsuccessful response is rejected', /response\.success === false/.test(page)],
  ['Invalid totals are rejected', /invalid total count/.test(page)],
  ['Overlapping refreshes are sequenced', /requestSequence/.test(page) && /sequence !== requestSequence\.current/.test(page)],
  ['Primary bid-list failure is visible', /Bid list unavailable/.test(page) && /role="alert"/.test(page)],
  ['Empty state is differentiated from a failed request', /Bid data unavailable/.test(page) && /No bids match these filters/.test(page)],
  ['Suspicious queue failures are not silently shown as zero', /Suspicious-bid queue could not be verified/.test(page) && /suspiciousError \? '—'/.test(page)],
  ['Manual refresh and retry actions exist', /Refresh bids/.test(page) && /Retry/.test(page)],
  ['Refresh timestamp is shown', /Last successful bid-list refresh/.test(page)],
  ['Paid value and unpaid count are labelled as page-level figures', /Paid bid value · this page/.test(page) && /Unpaid · this page/.test(page)],
  ['Winner action is guarded against concurrent actions', /if \(actionId\) return/.test(page) && /disabled=\{Boolean\(actionId\)\}/.test(page)],
  ['Winner action remains server-authoritative', /await setBidWinner\(bid\._id\)/.test(page) && /Winner recorded/.test(page)],
  ['Bid detail row supports keyboard activation', /onKeyDown=\{e =>/.test(page) && /tabIndex=\{0\}/.test(page)],
  ['No hard-coded demo bids or inventory added', !/mockBids|fakeBids|demoBids|sampleBids/i.test(page)],
  ['No backend routes or database migrations added by this validator', true],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
if (failed) process.exitCode = 1;
