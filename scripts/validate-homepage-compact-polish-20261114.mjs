import fs from 'node:fs';
import assert from 'node:assert/strict';
const css = fs.readFileSync('src/features/VehicleMarketplace/components/homepage-redesign.css', 'utf8');
const component = fs.readFileSync('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx', 'utf8');
const checks = [
  ['compact mobile hero typography and spacing', /\.kayad-public-hero__mobile-card h1\s*\{[^}]*font-size:\s*clamp\(1\.45rem/s.test(css) && /\.kayad-public-hero__mobile-card\s*\{[^}]*padding:\s*12px 11px/s.test(css)],
  ['featured vehicle stage is shorter while images remain contained', /\.kayad-public-hero__mobile-stage \[data-testid="hero-pair-image-stage"\]\s*\{[^}]*height:\s*clamp\(88px, 27vw, 116px\)/s.test(css) && /object-fit:\s*contain/.test(css)],
  ['category strip and search bridge have tighter mobile spacing', /\.kayad-home-category-strip > div\s*\{[^}]*padding-top:\s*12px/s.test(css) && /@media[^{]*max-width:\s*639\.98px[^{]*\{[\s\S]*?\.kayad-inventory-search-row\s*\{[^}]*gap:\s*7px;\s*margin-bottom:\s*12px/s.test(css)],
  ['inventory toolbar and results use compact mobile spacing', /#market-results\s*\{[^}]*padding-top:\s*10px/s.test(css) && /\.kayad-market-toolbar > div\s*\{[^}]*padding:\s*10px/s.test(css)],
  ['inventory timeout state keeps retry action and message available', /Inventory took too long to respond|retryInventory/.test(component) && /\.kayad-inventory-results \[role="status"\] button\s*\{[^}]*min-height:\s*44px/s.test(css)],
  ['live hero, inventory filters and route actions remain wired', /heroSourceVehicles/.test(component) && /setShowMobileFilterDrawer\(true\)/.test(component) && /retryInventory/.test(component)],
  ['mobile filter sheet has compact controls while retaining scroll and apply action', /kayad-mobile-filter-sheet/.test(component) && /kayad-mobile-filter-sheet \[data-testid=\"mobile-filter-panel\"] input\s*\{[^}]*height:\s*39px/s.test(css) && /serverTotal\.toLocaleString\('en-KE'\)/.test(component)],
  ['small-phone and reduced-motion rules remain present', /@media\s*\(max-width:\s*379px\)/.test(css) && /prefers-reduced-motion:\s*reduce/.test(css)],
];
let failures=0;
for (const [label, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${label}`); if(!ok) failures++; }
console.log(`${checks.length-failures}/${checks.length} compact homepage checks passed`);
if(failures) process.exit(1);
