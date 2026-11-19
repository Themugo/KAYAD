import fs from 'node:fs';

const file = 'src/features/VehicleMarketplace/components/VehicleMarketplace.tsx';
const source = fs.readFileSync(file, 'utf8');
const hero = fs.readFileSync('src/components/home/PremiumHero.tsx', 'utf8');
const css = fs.readFileSync('src/components/home/premium-hero.css', 'utf8');
const checks = [
  ['continuous hero stage remains canonical', hero.includes('w-screen') && hero.includes('overflow-hidden') && source.includes('heroBackgroundStyle')],
  ['full Nairobi background remains configurable', source.includes('backgroundUrl') && source.includes('backgroundScalePct')],
  ['Drive Your Dream headline remains canonical', source.includes('Drive Your Dream') && source.includes('Today')],
  ['desktop featured vehicle subject remains data-driven as a single-vehicle slide', source.includes('heroImageForVehicle(heroLeftVehicle)') && source.includes('heroSourceVehicles.map((vehicle) => [vehicle])')],
  ['approved cutout showcase assets are configured', source.includes('kayad-land-cruiser-cutout.png') && source.includes('kayad-mercedes-gle-cutout.png')],
  ['vehicle info chip is contained within the stage', hero.includes('kk-hero__caption')],
  ['hero CTA colours remain configurable for compatible hero usages', source.includes('primaryColor={heroPresentation.primaryButtonColor}')],
  ['premium hero is the single hero component', source.includes('<PremiumHero')],
  ['existing single-vehicle carousel controls remain wired', hero.includes('Previous featured vehicle') && hero.includes('Next featured vehicle') && source.includes('changeHeroPair(heroPairIndex + 1)')],
  ['hero has its own responsive composition', hero.includes('kk-hero__stage') && css.includes('@media (min-width: 1024px)')],
  ['approved four-action rail replaces oversized hero CTAs', ['Find a Car', 'Sell a Car', 'Auctions', 'Verified'].every(label => source.includes(`label: '${label}'`)) && hero.includes('kk-hero__shortcuts') && hero.includes('p.shortcuts?.length')],
  ['body-type category strip follows hero directly', source.includes('Marketplace categories: the visual bridge from hero to inventory') && source.includes('aria-label="Vehicle categories"') && source.indexOf('aria-label="Vehicle categories"') > source.indexOf('<PremiumHero')],
  ['approved hero composition does not render duplicate CTA/trust rows when shortcuts are active', hero.includes(') : (') && hero.includes('kk-hero__ctas') && hero.includes('kk-hero__trust') && hero.includes('kk-hero__shortcuts')],
];
let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed += 1;
}
console.log(`\nPremium homepage hero validation: ${passed}/${checks.length} ${passed === checks.length ? 'PASS' : 'FAIL'}`);
process.exitCode = passed === checks.length ? 0 : 1;
