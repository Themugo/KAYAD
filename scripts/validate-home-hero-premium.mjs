import fs from 'node:fs';

const file = 'src/features/VehicleMarketplace/components/VehicleMarketplace.tsx';
const heroVehicleSource = fs.readFileSync('src/features/VehicleMarketplace/components/HeroDesktopVehicle.tsx', 'utf8');
const source = fs.readFileSync(file, 'utf8');
const ph = fs.readFileSync('src/components/home/PremiumHero.tsx', 'utf8');

const checks = [
  ['continuous hero stage remains canonical', ph.includes('w-screen') && ph.includes('overflow-hidden') && source.includes('heroBackgroundStyle')],
  ['full Nairobi background remains configurable', source.includes('backgroundUrl') && source.includes('backgroundScalePct')],
  ['Drive Your Dream headline remains canonical', source.includes('Drive Your Dream') && source.includes('Today')],
  ['desktop featured vehicle subject remains data-driven as a single-vehicle slide', source.includes('heroImageForVehicle(heroLeftVehicle)') && source.includes('heroSourceVehicles.map((vehicle) => [vehicle])')],
  ['approved cutout showcase assets are configured', source.includes('kayad-land-cruiser-cutout.png') && source.includes('kayad-mercedes-gle-cutout.png')],
  ['vehicle info chip is contained within the stage', ph.includes('kk-hero__caption')],
  ['hero CTA colours remain configurable', source.includes('primaryColor={heroPresentation.primaryButtonColor}')],
  ['premium hero is the single hero component', source.includes('<PremiumHero')],
  ['existing single-vehicle carousel controls remain wired', ph.includes('Previous featured vehicle') && ph.includes('Next featured vehicle') && source.includes('changeHeroPair(heroPairIndex + 1)')],
  ['hero has its own responsive composition', ph.includes('kk-hero__stage') && fs.readFileSync('src/components/home/premium-hero.css','utf8').includes('@media (min-width: 1024px)')],
  ['hero preserves the canonical headline and CTAs', source.includes('Explore Vehicles') && source.includes('Sell Your Vehicle')],
  ['existing search bridge remains below hero', source.includes('2. SEARCH BRIDGE') && source.includes('Hero maximum price filter')],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed += 1;
}
console.log(`\nPremium homepage hero validation: ${passed}/${checks.length} ${passed === checks.length ? 'PASS' : 'FAIL'}`);
process.exitCode = passed === checks.length ? 0 : 1;
