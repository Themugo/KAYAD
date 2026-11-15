import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync('src/features/VehicleMarketplace/components/homepage-redesign.css', 'utf8');
const navCss = fs.readFileSync('src/styles/kayad-navigation.css', 'utf8');
const component = fs.readFileSync('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx', 'utf8');
const checks = [
  ['compact mobile override targets the full 320–639px range', /@media\s*\(max-width:\s*639\.98px\)[\s\S]*?2026-11-14 — design-direction implementation/s.test(css)],
  ['small-phone 320–379px has dedicated hero sizing', /@media\s*\(max-width:\s*379px\)[\s\S]*?kayad-public-hero__mobile-card h1[\s\S]*?font-size/s.test(css)],
  ['380–430px has a dedicated vehicle-stage sizing rule', /@media\s*\(min-width:\s*380px\)\s*and\s*\(max-width:\s*430px\)/.test(css)],
  ['hero vehicles remain contained and undistorted', /\.kayad-public-hero__mobile-stage picture img\s*\{[^}]*object-fit:\s*contain/s.test(css)],
  ['search controls retain a 39px minimum touch height', /mobile-search-row[\s\S]*?height:\s*39px\s*!important/s.test(css)],
  ['inventory toolbar collapses on narrow phones', /@media\s*\(max-width:\s*379px\)[\s\S]*?kayad-market-toolbar-controls[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/s.test(css)],
  ['inventory has scroll margin above fixed dock', /kayad-inventory-results\s*\{[^}]*scroll-margin-bottom:\s*calc\(104px/s.test(css)],
  ['homepage reserves space for fixed dock and safe area', /kayad-homepage\s*\{[^}]*padding-bottom:\s*calc\(96px \+ env\(safe-area-inset-bottom\)\)/s.test(css)],
  ['bottom dock uses safe-area positioning and five columns', /kayad-mobile-bottom-nav\s*\{[^}]*bottom:\s*max\(10px,\s*env\(safe-area-inset-bottom\)\)[^}]*grid-template-columns:\s*repeat\(5/s.test(navCss)],
  ['all hero actions remain wired to real navigation/scroll actions', /onNavigate\(activeHeroSlide\.ctaPrimaryLink\)/.test(component) && /onNavigate\('discovery'\)|onNavigate\('seller-platform'\)/.test(component)],
];
let failures = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures++;
}
console.log(`\n${checks.length - failures}/${checks.length} design-direction implementation checks passed`);
if (failures) process.exit(1);
