import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => { console.error(`PHASE 21 VALIDATION: FAIL - ${message}`); process.exit(1); };
const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const removed = [
  'src/features/DataExchange',
  'src/features/DigitalInspection',
  'src/features/GovernanceCenter',
  'src/features/OperationsCenter',
  'src/features/Platform',
  'src/features/Quality',
  'src/features/PartnerPlatform',
  'src/features/CommunicationsHub',
  'src/features/InspectionBusinessCenter',
  'src/features/CMS',
  'src/features/IAMPlatform',
  'src/features/RevenuePlatform',
  'src/features/VehiclePassport',
  'src/features/OwnershipPlatform/pages/OwnerGarage.tsx',
  'src/features/AuctionsView/components',
  'src/features/AuctionsView/hooks',
  'src/components/CreateAuctionModal.tsx',
];
for (const rel of removed) if (exists(rel)) fail(`retired demo/dormant surface still exists: ${rel}`);

const sourceFiles = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (['node_modules', 'dist', '.git'].includes(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(name)) sourceFiles.push(full);
  }
}
walk(path.join(root, 'src'));

const forbiddenImports = /(AuctionsView\/components\/|useAuctionPageConfig|features\/(DataExchange|DigitalInspection|GovernanceCenter|OperationsCenter|Platform|Quality|PartnerPlatform|CommunicationsHub|InspectionBusinessCenter|CMS|IAMPlatform|RevenuePlatform|VehiclePassport))/;
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (forbiddenImports.test(text)) fail(`source references retired module: ${path.relative(root, file)}`);
}

const seller = read('src/features/PrivateSellerDashboardView/components/PrivateSellerDashboardView.tsx');
for (const token of ['SAMPLE_', 'KDG 492A', 'Jimmy Mugo', '7,300,000', 'setListings', 'buyerProgress', 'requiredAction']) {
  if (seller.includes(token)) fail(`active private seller dashboard contains stale/fabricated token: ${token}`);
}
if (!seller.includes('Private-seller listing creation is not exposed by the current backend contract.')) fail('private seller listing creation is not fail-closed');
if (!seller.includes('No seller offer feed is currently exposed by the backend.')) fail('private seller offer flow is not truthful');

const activeAuction = read('src/features/AuctionsView.tsx');
if (!activeAuction.includes('auctionAPI.active')) fail('active auction page is not backend-driven');
if (activeAuction.includes('SAMPLE_') || activeAuction.includes('MOCK_')) fail('active auction page contains local sample data');

const buyerIndex = read('src/features/OwnershipPlatform/index.ts');
if (!buyerIndex.includes("./pages/BuyerPlatform")) fail('active BuyerPlatform export was lost');
if (buyerIndex.includes('OwnerGarage')) fail('retired OwnerGarage remains exported');

console.log('PHASE 21 DORMANT DEMO SURFACE VALIDATION: PASS');
console.log(`Production source files scanned: ${sourceFiles.length}`);
console.log('Retired demo/dormant feature surfaces: removed');
console.log('Active private-seller mutations: fail-closed');
console.log('Active auction browser: backend-driven');
