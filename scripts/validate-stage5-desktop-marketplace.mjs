import fs from 'node:fs';
const component = fs.readFileSync('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx', 'utf8');
const css = fs.readFileSync('src/features/VehicleMarketplace/components/homepage-redesign.css', 'utf8');
const checks = [
  ['canonical single-vehicle hero retained', component.includes('data-hero-composition="single"') || component.includes('heroComp')],
  ['existing category shortcut strip retained', component.includes('aria-label="Vehicle categories"') && component.includes("setSelectedBodyStyle('SUV')")],
  ['category shortcuts use existing filter state', component.includes("setSelectedFuel('Electric')") && component.includes("setSelectedFuel('Hybrid')")],
  ['inventory toolbar is inside results column', component.indexOf('/* RESULTS */') < component.indexOf('/* 5. MARKET HEAD */') && component.indexOf('/* 5. MARKET HEAD */') < component.indexOf('aria-busy={refreshing || undefined}') + 200],
  ['existing sorting options retained', ['price-asc', 'price-desc', 'mileage', 'auction-ending'].every(x => component.includes(`value="${x}"`))],
  ['existing grid and list controls retained', component.includes("setViewMode('grid')") && component.includes("setViewMode('list')")],
  ['existing live inventory renderer retained', component.includes('getCars') && component.includes('kayad-inventory-results')],
  ['left filter rail remains canonical', component.includes('<InventoryFilterPanel idPrefix="sidebar"')],
  ['filter rail is full-height and sticky on desktop', /\.kayad-filter-panel\s*\{[^}]*position:\s*sticky/s.test(css) && /height:\s*calc\(100vh\s*-\s*108px\)/.test(css)],
  ['filter rail scrolls internally', /\.kayad-filter-panel\s*\{[^}]*overflow-y:\s*auto/s.test(css)],
  ['desktop layout is breakpoint-scoped', /@media\s*\(min-width:\s*1024px\)[\s\S]*?Stage 5 desktop marketplace discovery layout/.test(css)],
  ['mobile filter drawer retained', component.includes('setShowMobileFilterDrawer(true)') && component.includes('idPrefix="mobile"')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exit(1);
