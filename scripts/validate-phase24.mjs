import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const fail = (m) => { throw new Error(m); };
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

if (exists('backend/db/schema_clean.sql')) fail('stale schema_clean.sql still exists');
if (!exists('supabase/migrations')) fail('supabase/migrations is missing');
for (const p of [
  'src/features/VehicleIntelligence',
  'src/features/AIIntelligence',
  'src/features/PrePurchaseInspectionPortal.tsx',
  'src/components/auctions',
  'src/pages/Auction.tsx',
  'src/pages/AuctionCalendar.jsx',
]) if (exists(p)) fail(`retired surface still exists: ${p}`);

const scanDirs = ['src'];
const forbidden = [
  'VehicleIntelligence', 'AIIntelligence', 'PrePurchaseInspectionPortal',
  'AuctionsPageRefactored', 'AuctionCalendar', 'components/auctions/CountdownTimer',
];
const exts = new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs']);
function walk(dir) {
  let out=[];
  for (const ent of fs.readdirSync(path.join(root,dir), {withFileTypes:true})) {
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '__tests__') continue;
    const rel=path.join(dir,ent.name), abs=path.join(root,rel);
    if (ent.isDirectory()) out=out.concat(walk(rel));
    else if (exts.has(path.extname(ent.name))) out.push(rel);
  }
  return out;
}
for (const f of scanDirs.flatMap(walk)) {
  const s=read(f);
  for (const needle of forbidden) if (s.includes(needle)) fail(`retired reference '${needle}' remains in ${f}`);
}
const backendFiles=walk('backend').concat(walk('scripts')).filter(f=>/\.(js|mjs|cjs)$/.test(f));
for (const f of backendFiles) execFileSync(process.execPath, ['--check', path.join(root,f)], {stdio:'ignore'});
console.log('PHASE 24 LEGACY SURFACE VALIDATION: PASS');
console.log(`Backend/scripts syntax files checked: ${backendFiles.length}`);
console.log('Canonical schema source: supabase/migrations/');
console.log('Retired intelligence/inspection/duplicate auction surfaces: removed');
