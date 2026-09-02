import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const failures = [];
const pass = (label) => console.log(`PASS: ${label}`);
const fail = (label) => failures.push(label);

const removed = [
  'backend/controllers/biddingSecurityController.js',
  'backend/routes/biddingSecurityRoutes.js',
  'backend/models/BidderDeposit.js',
  'src/components/features/auction/BiddingSecurityGateway.tsx',
  'src/components/home/TrustVerificationSection.tsx',
  'src/components/home/WhyKayadSection.tsx',
];
for (const f of removed) exists(f) ? fail(`retired file still exists: ${f}`) : pass(`retired surface removed: ${f}`);

const sourceDirs = ['src', 'backend'];
const needles = [
  'bidding-security', 'BiddingSecurityGateway', 'BidderDeposit', 'bidder_deposits',
  'simulation/bid', 'simulation/time-warning', 'simulateBid', 'simulateTimeWarning',
  'TrustVerificationSection', 'WhyKayadSection'
];
for (const dir of sourceDirs) {
  const stack = [path.join(root, dir)];
  while (stack.length) {
    const cur = stack.pop();
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.endsWith('.map')) continue;
      const p = path.join(cur, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (/\.(js|jsx|ts|tsx|mjs|yaml|yml|md|sql)$/.test(entry.name)) {
        const text = fs.readFileSync(p, 'utf8');
        for (const needle of needles) if (text.includes(needle)) fail(`stale reference '${needle}' in ${path.relative(root,p)}`);
      }
    }
  }
}

const mediaRoutes = read('backend/routes/mediaEventRoutes.js');
if (mediaRoutes.includes('/simulation/')) fail('media event simulation route remains'); else pass('media event simulation routes removed');
const mediaController = read('backend/controllers/mediaEventController.js');
if (/simulateBid|simulateTimeWarning/.test(mediaController)) fail('media event simulation controller remains'); else pass('media event simulation handlers removed');

const v1 = read('backend/routes/v1.js');
if (v1.includes('biddingSecurityRoutes') || v1.includes('/bidding-security')) fail('bidding security router remains mounted'); else pass('bidding security router unmounted');

const fieldMap = read('backend/utils/fieldMap.js');
if (fieldMap.includes('bidder_deposits')) fail('legacy bidder_deposits field map remains'); else pass('legacy bidder_deposits field map removed');

const schema = read('backend/db/schema_clean.sql');
if (/CREATE TABLE IF NOT EXISTS bidder_deposits/i.test(schema)) fail('legacy bidder_deposits schema remains'); else pass('legacy bidder_deposits schema removed');

const api = read('src/api/api.exports.ts');
if (api.includes('biddingSecurityAPI')) fail('biddingSecurityAPI remains'); else pass('bidding security API facade removed');

if (failures.length) {
  console.error(`PHASE 22 SECURITY SURFACE VALIDATION: FAIL (${failures.length})`);
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('PHASE 22 SECURITY SURFACE VALIDATION: PASS');
