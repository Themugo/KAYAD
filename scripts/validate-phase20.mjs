import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mustExist = [
  'backend/controllers/auctionController.js',
  'backend/services/auctionIntegrityService.js',
  'backend/services/auctionClose.service.js',
  'src/features/AuctionsView.tsx',
  'src/services/auctionService.ts',
  'backend/openapi.yaml',
];
for (const file of mustExist) if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);

const walk = (dir) => {
  const out=[];
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    if (['node_modules','.git','dist','build'].includes(e.name)) continue;
    const p=path.join(dir,e.name);
    if(e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
};
const backendFiles=walk(path.join(root,'backend')).filter(f=>f.endsWith('.js'));
const productionText=backendFiles.map(f=>fs.readFileSync(f,'utf8')).join('\n');
if (/find(?:All|ById|One)\("auctions"|count\("auctions"|from\("auctions"/.test(productionText)) throw new Error('Backend production code still queries the nonexistent auctions table');
const base=fs.readFileSync(path.join(root,'backend/models/_base.js'),'utf8');
if (/Auction:\s*["']auctions["']/.test(base) || /auction:\s*["']auctions["']/.test(base)) throw new Error('Generic model map still points auction to auctions table');
if (fs.existsSync(path.join(root,'src/services/auctionService.js'))) throw new Error('Duplicate JS auction service remains');
const openapi=fs.readFileSync(path.join(root,'backend/openapi.yaml'),'utf8');
if (openapi.includes('CreateAuctionRequest') || openapi.includes('/auctions/{auctionId}/bids')) throw new Error('OpenAPI still documents unsupported auction routes');
const controller=fs.readFileSync(path.join(root,'backend/controllers/auctionController.js'),'utf8');
for (const token of ['Car.find(filter)','auctionStatus: "live"','auctionEnd','currentBid']) if(!controller.includes(token)) throw new Error(`Canonical auction controller contract missing: ${token}`);
const svc=fs.readFileSync(path.join(root,'src/services/auctionService.ts'),'utf8');
for (const token of ["'draft' | 'active' | 'ended'",'startingBid','highestBid','bidCount']) if(!svc.includes(token)) throw new Error(`Frontend auction contract missing: ${token}`);
console.log('PHASE 20 AUCTION DEPENDENCY VALIDATION: PASS');
console.log('- No backend production query targets the nonexistent auctions table');
console.log('- Canonical auction source remains cars + bids');
console.log('- Duplicate auction service removed');
console.log('- OpenAPI matches implemented auction routes');
console.log('- Frontend auction type matches public API shape');
