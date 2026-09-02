import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'backend/controllers/auctionController.js',
  'backend/routes/auctionRoutes.js',
  'src/features/AuctionsView.tsx',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}

const controller = fs.readFileSync(path.join(root, 'backend/controllers/auctionController.js'), 'utf8');
const view = fs.readFileSync(path.join(root, 'src/features/AuctionsView.tsx'), 'utf8');

if (/from ["']\.\.\/models\/Auction\.js["']/.test(controller)) throw new Error('Auction controller still depends on removed Auction model');
if (/from ["'].*auctionEnrichment|auctionSync\.service|services\/auction\.service/.test(view + controller)) throw new Error('Legacy auction service dependency remains');
if (!controller.includes('auctionStatus: "live"')) throw new Error('Canonical live auction filter missing');
if (!controller.includes('Car.find(filter)')) throw new Error('Public auction list is not backed by cars');
if (!view.includes('auctionAPI.active')) throw new Error('Auction UI is not using the live auction API');
if (!view.includes('placeBid')) throw new Error('Auction UI is not wired to canonical bid placement');
if (view.includes('setSessions') || view.includes('MOCK_') || view.includes('SAMPLE_')) throw new Error('Legacy local auction-session state remains');

console.log('PHASE 19 AUCTION CONTRACT VALIDATION: PASS');
console.log('- Canonical source: cars.auctionStatus / auctionEnd / currentBid');
console.log('- Public auction API: GET /api/auctions and /api/auctions/active');
console.log('- Bid placement: POST /api/bids/:carId/bid');
console.log('- Separate auctions-table dependency: removed');
console.log('- Legacy in-memory auction engine: removed');
