import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const nav = read('src/components/MobileBottomNav.tsx');
const navCss = read('src/styles/kayad-navigation.css');
const css = read('src/features/VehicleMarketplace/components/homepage-redesign.css');
const page = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const card = read('src/components/VehicleCard.tsx');
const routes = read('src/components/navigation/navConfig.ts');
const brand = read('src/styles/kayad-navigation.css') + read('src/index.css');
const checks = [
  ['Unified personal-account dock exposes Home, Search, Sell, Messages and Account', ['home','search','sell','messages','account'].every(k => nav.includes(`key: '${k}'`))],
  ['Search shortcut reuses the canonical marketplace results surface', /onNavigate\('marketplace'\); scrollToResults\(\)/.test(nav)],
  ['Sell shortcut opens the unified create-listing section', /onNavigate\('dashboard:create-listing'\)/.test(nav)],
  ['Messages shortcut reuses the existing authenticated chat route', /onNavigate\('chat'\)/.test(nav)],
  ['Account shortcut opens the unified account section', /onNavigate\('dashboard:account'\)/.test(nav)],
  ['Personal account identity uses one shared dock regardless of account role', !nav.includes('DealerBottomNav') && !nav.includes('BuyerBottomNav') && !nav.includes("authUser?.role === 'dealer'")],
  ['Sell shortcut serves the same personal account (capability gate lives in the selling section; dealers keep their own navigation)', /onNavigate\('dashboard:create-listing'\)/.test(nav) && nav.includes('Dealer organizations retain their own')],
  ['Unified dock retains safe-area-aware content clearance', nav.includes('env(safe-area-inset-bottom)') && nav.includes('104px')],
  ['Desktop marketplace layout has a dedicated responsive shell', page.includes('kayad-market-layout') && css.includes('.kayad-homepage .kayad-market-layout')],
  ['Desktop hero uses the approved dark navy/teal treatment', css.includes('linear-gradient(112deg, rgba(4,31,43,.96), rgba(7,65,75,.91))')],
  ['Mobile hero uses matching dark brand treatment', css.includes('linear-gradient(125deg,#062E3A 0%,#084957 70%,#087A78 100%)')],
  ['Category shortcuts receive refined interactive card styling', css.includes('.kayad-home-category-strip button:hover')],
  ['Vehicle card images remain fully visible using contain', card.includes('object-contain p-2')],
  ['Mobile dock matches the light reference surface', navCss.includes('background: rgba(255,255,255,.97)')],
  ['Secondary auction, service and saved functionality remains in the canonical navigation drawer', routes.includes("navId: 'saved'") && routes.includes("navId: 'discovery'") && routes.includes("navId: 'inspections'")],
  ['KAYAD palette remains navy, teal and pale mint', brand.includes('#0A3340') && brand.includes('#13B8A6') && brand.includes('#DDF4F0')],
];
for (const [label, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
console.log(`\n${checks.filter(x => x[1]).length}/${checks.length} checks passed`);
if (checks.some(x => !x[1])) process.exit(1);
