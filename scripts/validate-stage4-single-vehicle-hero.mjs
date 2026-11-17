import fs from 'node:fs';
const file = 'src/features/VehicleMarketplace/components/VehicleMarketplace.tsx';
const cssFile = 'src/features/VehicleMarketplace/components/homepage-redesign.css';
const selection = 'src/features/VehicleMarketplace/utils/heroSelection.ts';
const source = fs.readFileSync(file, 'utf8');
const css = fs.readFileSync(cssFile, 'utf8');
const select = fs.readFileSync(selection, 'utf8');
const checks = [
  ['canonical campaign-first selection remains in place', source.includes('campaign: campaignVehicles') && source.includes('inventory: heroPresentation.vehicleSource') && source.includes('showcaseFallbackEnabled:')],
  ['each selected vehicle is now an individual hero slide', source.includes('heroSourceVehicles.map((vehicle) => [vehicle])')],
  ['single featured vehicle remains data-driven', source.includes('vehicle={heroLeftVehicle}') && source.includes('heroImageForVehicle(heroLeftVehicle)')],
  ['illustrative artwork remains truthfully labelled', source.includes('ILLUSTRATIVE') && source.includes('Artwork · not a listing')],
  ['desktop composition is compact and single-subject', source.includes('data-hero-composition={heroComp}') && css.includes('data-hero-composition="single"')],
  ['mobile composition remains single-column and responsive', source.includes('mx-auto max-w-[420px] grid-cols-1') && source.includes('KAYAD mobile hero')],
  ['desktop and mobile vehicle imagery remains object-contain', source.includes('object-contain object-bottom') && fs.readFileSync('src/features/VehicleMarketplace/components/HeroDesktopVehicle.tsx','utf8').includes('object-contain object-bottom')],
  ['existing hero CTA and admin slide content remain wired', source.includes('heroPrimaryLabelSafe') && source.includes('activeHeroSlide?.ctaPrimaryLink') && source.includes('activeHeroSlide?.ctaSecondaryLink')],
  ['rotation, pause and reduced-motion contracts remain wired', source.includes('heroAutoplayAllowed') && source.includes('heroUserPaused') && source.includes('prefersReducedMotion')],
  ['campaign and inventory ordering logic remains unchanged', select.includes('if (campaign.length > 0)') && select.includes('if (inventory.length > 0)')],
  ['hero admin editor remains mounted', source.includes('<HomePageAdminPanel')],
  ['existing campaign feed and featured inventory APIs remain wired', source.includes('getCurrentFeaturedCampaignCarIds()') && source.includes("featured: true")],
];
let passed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (ok) passed++; }
console.log(`\nStage 4 single-vehicle hero: ${passed}/${checks.length} ${passed === checks.length ? 'PASS' : 'FAIL'}`);
process.exitCode = passed === checks.length ? 0 : 1;
