import fs from 'node:fs';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const hub = read('src/components/DashboardHub.tsx');
const seller = read('src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx');
const buyer = read('src/features/OwnershipPlatform/pages/PersonalBuyingModule.tsx');
const css = read('src/index.css');
const checks = [
  ['DashboardHub suppresses the public navbar and footer for the account workspace', app.includes('{!privateWorkspaceNavs.has(activeNav) && <Navbar') && app.includes('{!privateWorkspaceNavs.has(activeNav) && <footer')],
  ['Private seller dashboard shell and account chooser are removed', !/seller-dashboard-title|kayad-sell-entry|seller-mobile-navigation|SellerHomeSection/.test(seller)],
  ['Personal selling functions are rendered as a dashboard content module', /data-kayad-personal-selling-module/.test(seller) && /PersonalSellingTools/.test(hub)],
  ['Personal buying functions are rendered as a dashboard content module', /data-kayad-personal-buying-module/.test(buyer) && /PersonalBuyingTools/.test(hub)],
  ['Account profile is supplied by the canonical Profile component', /profileContent=\{<Profile/.test(app) && /personalSection==='account'/.test(hub)],
  ['Single personal mobile dock has the five approved destinations', /label: 'Home'/.test(read('src/components/MobileBottomNav.tsx')) && /label: 'Search'/.test(read('src/components/MobileBottomNav.tsx')) && /label: 'Sell'/.test(read('src/components/MobileBottomNav.tsx')) && /label: 'Messages'/.test(read('src/components/MobileBottomNav.tsx')) && /label: 'Account'/.test(read('src/components/MobileBottomNav.tsx'))],
  ['Sell opens Create Listing inside the unified dashboard', /dashboard:create-listing/.test(read('src/components/MobileBottomNav.tsx')) && app.includes("if (path === '/sell' || path === '/sell-car' || path === '/sell-vehicle') return <Navigate to=\"/?nav=dashboard&section=create-listing\"")],
  ['Listing wizard keeps canonical vehicle create API and draft state', /createCar\(/.test(seller) && /kayad\.privateSeller\.listingDraft\.v1/.test(seller)],
  ['Participant escrow is the single personal deals surface', /ParticipantEscrowDesk/.test(buyer) && !/EscrowCenterSection|getMyEscrows/.test(seller)],
  ['Responsive dock safe-area spacing remains enabled', /safe-area-inset-bottom/.test(read('src/components/MobileBottomNav.tsx')) && css.includes('kayad-mobile-bottom-nav')],
  ['Dealer business navigation remains independent', /DealerDashboard/.test(app) && /dealership-workspace/.test(hub)],
];
let failed = 0;
for (const [label, passed] of checks) { console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`); if (!passed) failed++; }
console.log(`\nUnified account shell checks: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
