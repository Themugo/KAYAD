import fs from 'node:fs';
const read = (file) => fs.readFileSync(file, 'utf8');
const app = read('src/App.tsx');
const marketplace = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const hero = read('src/components/home/PremiumHero.tsx');
const heroCss = read('src/components/home/premium-hero.css');
const checks = [
  ['Page journey navigation is suppressed only on public marketplace home', app.includes("{activeNav !== 'marketplace' && <PageJourneyNavigation />}")],
  ['Internal routes retain PageJourneyNavigation', app.includes('<PageJourneyNavigation fallbackHref=')],
  ['Approved functional shortcut rail is wired from existing marketplace callbacks', marketplace.includes('shortcuts={[') && hero.includes('onClick={item.onClick}')],
  ['Duplicate standalone quick-action panel is removed', !marketplace.includes('kayad-home-quick-actions')],
  ['Unrepresented marketplace context strip above hero is removed', !marketplace.includes('id="market-journey"')],
  ['Phone shortcut rail uses four compact touch-friendly columns', heroCss.includes('grid-template-columns: repeat(4, minmax(0, 1fr))') && heroCss.includes('min-height: 58px;')],
  ['Tablet hero remains compact and responsive', heroCss.includes('@media (max-width: 1023.98px)') && heroCss.includes('grid-template-columns: 1fr;')],
  ['Desktop hero is compact and preserves vehicle stage', heroCss.includes('min-height: 336px;') && heroCss.includes('height: 300px;')],
  ['Carousel controls and parent-owned state remain wired', hero.includes('onClick={p.onPrev}') && hero.includes('onClick={p.onNext}') && hero.includes('onTogglePause')],
  ['Single admin-configured featured vehicle source remains canonical', marketplace.includes('heroLeftVehicle') && marketplace.includes('changeHeroPair(heroPairIndex + 1)')],
];
let failed = 0;
for (const [label, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); if (!pass) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} homepage compact-layout checks passed.`);
if (failed) process.exit(1);
