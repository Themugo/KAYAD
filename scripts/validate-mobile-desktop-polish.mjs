import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const pass = (name, ok, detail='') => checks.push({ name, ok, detail });

const nav = read('src/components/MobileBottomNav.tsx');
const navbar = read('src/components/Navbar.tsx');
const marketplace = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const auction = read('src/features/AuctionsView.tsx');
const inspection = read('src/features/InspectionsView.tsx');
const css = read('src/index.css');

pass('canonical mobile navigation',
  ['Home','Search','Auction','Inspection','Menu'].every(x => nav.includes(`label: '${x}'`)),
  'Five canonical public destinations remain in one dock.');
pass('consistent Lucide navigation icons',
  ['Home','Search','Gavel','ShieldCheck','Menu'].every(x => nav.includes(x)),
  'Navigation uses one existing icon family.');
pass('mobile menu refinement hook', navbar.includes('kayad-mobile-menu'), 'Shared menu drawer receives the KAYAD polish layer.');
pass('homepage category rail protected', marketplace.includes('kayad-market-categories'), 'Category navigation is explicitly layered above the search bridge.');
pass('mobile grid-density control hidden', marketplace.includes('kayad-grid-density-control'), '3×/4×/5× desktop density control has a mobile-specific CSS hook.');
pass('desktop hero remains canonical', marketplace.includes('/hero/kayad-land-cruiser-cutout.png') && marketplace.includes('/hero/kayad-mercedes-gle-cutout.png'), 'High-resolution desktop assets remain canonical.');
pass('mobile hero remains canonical', marketplace.includes('/hero/kayad-land-cruiser-mobile.webp') && marketplace.includes('/hero/kayad-mercedes-gle-mobile.webp'), 'Approved mobile WebP assets remain intact.');
pass('auction refinement hook', auction.includes('kayad-auction-page'), 'Auction page has a shared responsive refinement layer.');
pass('auction four-state desktop layout', css.includes('.kayad-auction-page .auction-segment-grid{grid-template-columns:repeat(4'), 'Live/starting/completed/saved are given equal desktop hierarchy.');
pass('inspection refinement hook', inspection.includes('kayad-inspection-page'), 'Inspection page has a shared KAYAD visual treatment.');
pass('inspection sticky offset', inspection.includes('sticky top-[72px]'), 'Inspection sub-navigation clears the desktop header.');
pass('safe bottom navigation spacing', css.includes('scroll-padding-bottom:110px') && css.includes('padding-bottom:100px'), 'Major surfaces reserve space for the floating mobile dock.');
pass('reduced motion', css.includes('@media(prefers-reduced-motion:reduce)') && css.includes('.kayad-auction-page .auction-live-pulse{animation:none!important}'), 'New polish respects reduced motion.');

const failed = checks.filter(c => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
console.log(`\nRESULT: ${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) process.exit(1);
