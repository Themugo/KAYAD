import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');
const app = read('src/App.tsx');
const marketplace = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const hero = read('src/components/home/PremiumHero.tsx');
const heroCss = read('src/components/home/premium-hero.css');
const indexCss = read('src/index.css');

const checks = [
  ['Page journey navigation is suppressed only on the public marketplace home surface',
    app.includes("{activeNav !== 'marketplace' && <PageJourneyNavigation />}")],
  ['Internal dashboard and other routes retain PageJourneyNavigation',
    app.includes("{activeNav !== 'marketplace' && <PageJourneyNavigation />}") && app.includes('<PageJourneyNavigation fallbackHref=')],
  ['Marketplace context row retains live inventory and retry states',
    marketplace.includes('inventoryStatusText') && marketplace.includes('retryInventory') && marketplace.includes('savedVehicles.length')],
  ['Marketplace context row uses compact vertical spacing',
    marketplace.includes('gap-x-3 gap-y-1 px-4 py-1')],
  ['Inventory context strip no longer enforces a 48px minimum height',
    indexCss.includes('.kayad-homepage #market-journey { min-height: 0;')],
  ['Mobile hero uses compact padding, type, actions and vehicle stage',
    heroCss.includes('@media (max-width: 767.98px)') && heroCss.includes('height: 164px;') && heroCss.includes('padding: 15px 16px 12px;')],
  ['Tablet hero uses a compact two-column composition',
    heroCss.includes('@media (min-width: 768px) and (max-width: 1023.98px)') && heroCss.includes('grid-template-columns: minmax(0, 47%) minmax(0, 53%)')],
  ['Desktop hero height is capped to a more compact composition',
    heroCss.includes('min-height: 392px;') && heroCss.includes('height: 344px;')],
  ['Hero carousel and CTA interactions remain wired to the existing parent-owned state',
    hero.includes('onClick={p.onPrimary}') && hero.includes('onClick={p.onSecondary}') && hero.includes('onClick={p.onPrev}') && hero.includes('onClick={p.onNext}') && hero.includes('onTogglePause')],
  ['Hero continues to use one admin-configured featured vehicle source',
    marketplace.includes('heroLeftVehicle') && marketplace.includes('changeHeroPair(heroPairIndex + 1)')],
];

let failed = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
  if (!pass) failed += 1;
}
console.log(`\n${checks.length - failed}/${checks.length} homepage compact-layout checks passed.`);
if (failed) process.exit(1);
