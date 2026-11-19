import fs from 'node:fs';
import assert from 'node:assert/strict';

const component = fs.readFileSync('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx', 'utf8');
const css = fs.readFileSync('src/features/VehicleMarketplace/components/homepage-redesign.css', 'utf8');
const checks = [
  ['mobile featured vehicle is rendered at phone widths (single responsive stage, no hidden breakpoint)', /<PremiumHero/.test(component) && !/kk-hero__stage[^\n]*hidden/.test(fs.readFileSync('src/components/home/PremiumHero.tsx','utf8'))],
  ['mobile hero support copy remains visible', /\.kayad-public-hero__mobile-card p\s*\{[^}]*display:\s*block\s*!important/s.test(css)],
  ['mobile hero pair uses contained images', /\.kayad-public-hero__mobile-stage picture img\s*\{[^}]*object-fit:\s*contain/s.test(css)],
  ['category strip does not stick over the global header', /\.kayad-home-category-strip\s*\{[^}]*position:\s*relative\s*!important/s.test(css)],
  ['mobile inventory toolbar has responsive control layout', /\.kayad-market-toolbar-controls\s*\{[^}]*display:\s*grid/s.test(css)],
  ['small-screen layout has a dedicated breakpoint', /@media\s*\(max-width:\s*379px\)/.test(css)],
  ['reduced-motion preference is respected', /@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)],
  ['original marketplace routes and actions remain wired', /onNavigate\?\.\('dashboard:create-listing'\)/.test(component) && /onNavigate\?\.\('discovery'\)/.test(component) && /onNavigate\?\.\('inspections'\)/.test(component)],
  ['hero remains driven by configured/live vehicle data', /heroSourceVehicles/.test(component) && /heroPresentation/.test(component)],
];
let failures = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures++;
}
console.log(`\n${checks.length - failures}/${checks.length} homepage responsive polish checks passed`);
if (failures) process.exit(1);
