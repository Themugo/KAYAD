import fs from 'node:fs';

const file = 'src/features/VehicleMarketplace/components/VehicleMarketplace.tsx';
const source = fs.readFileSync(file, 'utf8');

const checks = [
  ['continuous hero stage remains canonical', source.includes('w-screen overflow-hidden') && source.includes('heroBackgroundStyle')],
  ['full Nairobi background remains configurable', source.includes('backgroundUrl') && source.includes('backgroundScalePct')],
  ['Drive Your Dream headline remains canonical', source.includes('Drive Your Dream') && source.includes('Today')],
  ['desktop featured vehicle subjects remain data-driven', source.includes('heroImageForVehicle(heroLeftVehicle)') && source.includes('heroImageForVehicle(heroRightVehicle)')],
  ['high-resolution canonical showcase assets are configured', source.includes('kayad-land-cruiser-cutout.png') && source.includes('kayad-mercedes-gle-cutout.png')],
  ['vehicle info cards are contained within vehicle stages', source.includes('overflow-hidden') && source.includes('max-w-[calc(100%-2rem)]')],
  ['center card remains configurable', source.includes('cardScalePct') && source.includes('cardWidthPct')],
  ['admin-controlled vehicle positioning remains wired', source.includes('leftVehicleNudgePct') && source.includes('rightVehicleNudgePct')],
  ['existing carousel controls remain wired', source.includes('Previous featured vehicles') && source.includes('Next featured vehicles')],
  ['mobile hero has its own responsive composition', source.includes('KAYAD mobile hero') && source.includes('relative pb-4 pt-4 lg:hidden') && !source.includes('min-h-[620px]')],
  ['mobile hero preserves the canonical headline and CTAs', source.includes('Explore Vehicles') && source.includes('How It Works')],
  ['existing search bridge remains below hero', source.includes('2. SEARCH BRIDGE') && source.includes('Hero maximum price filter')],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed += 1;
}
console.log(`\nPremium homepage hero validation: ${passed}/${checks.length} ${passed === checks.length ? 'PASS' : 'FAIL'}`);
process.exitCode = passed === checks.length ? 0 : 1;
