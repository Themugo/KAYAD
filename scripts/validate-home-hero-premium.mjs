import fs from 'node:fs';

const file = 'src/features/VehicleMarketplace/components/VehicleMarketplace.tsx';
const source = fs.readFileSync(file, 'utf8');

const checks = [
  ['hero preserves existing 390/420px footprint', source.includes('h-[390px]') && source.includes('sm:h-[420px]')],
  ['Kenyan road background is configured', source.includes('KENYA_ROAD_HERO_BACKGROUND') && source.includes('nairobi-traffic-kenya-cars.jpg')],
  ['real featured vehicle imagery remains data-driven', source.includes('heroImageForVehicle(heroLeftVehicle)') && source.includes('heroImageForVehicle(heroRightVehicle)')],
  ['primary vehicle card remains wired to vehicle details', source.includes('handleVehicleSelect(heroLeftVehicle)')],
  ['secondary vehicle card remains wired to vehicle details', source.includes('handleVehicleSelect(heroRightVehicle)')],
  ['existing browse CTA remains wired', source.includes('Browse Inventory') && source.includes('market-results')],
  ['existing how-it-works CTA remains wired', source.includes('How It Works') && source.includes('seller-platform')],
  ['existing carousel controls remain wired', source.includes('Previous featured vehicles') && source.includes('Next featured vehicles')],
  ['existing search bridge remains immediately below hero', source.includes('2. SEARCH BRIDGE') && source.includes('Hero maximum price filter')],
  ['Drive Your Dream headline remains canonical', source.includes('Drive Your Dream Today')],
  ['premium vehicle stage remains presentation-only', source.includes('Real featured inventory: presented as premium photography cards') && source.includes('backdrop-blur-md') && source.includes('shadow-[0_30px_85px_rgba(0,0,0,.48)]')],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed += 1;
}
console.log(`\nPremium homepage hero validation: ${passed}/${checks.length} ${passed === checks.length ? 'PASS' : 'FAIL'}`);
process.exitCode = passed === checks.length ? 0 : 1;
