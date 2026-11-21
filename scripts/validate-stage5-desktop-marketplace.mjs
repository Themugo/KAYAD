import fs from 'node:fs';
const component = fs.readFileSync('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx', 'utf8');
const css = fs.readFileSync('src/features/VehicleMarketplace/components/homepage-redesign.css', 'utf8');
const panel = fs.readFileSync('src/features/VehicleMarketplace/components/InventoryFilterPanel.tsx', 'utf8');
const checks = [
  ['canonical single-vehicle hero retained', component.includes('data-hero-composition="single"') || component.includes('heroComp')],
  ['existing category shortcut strip retained', component.includes('aria-label="Vehicle categories"') && component.includes("setSelectedBodyStyle('SUV')")],
  ['category shortcuts use existing filter state', component.includes("setSelectedFuel('Electric')") && component.includes("setSelectedFuel('Hybrid')")],
  ['inventory toolbar remains inside the results column', component.indexOf('/* RESULTS */') < component.indexOf('aria-busy={refreshing || undefined}') && component.indexOf('aria-busy={refreshing || undefined}') < component.indexOf('/* 5. MARKET HEAD */')],
  ['existing sorting options retained', ['price-asc', 'price-desc', 'mileage', 'auction-ending'].every(x => component.includes(`value="${x}"`))],
  ['existing grid and list controls retained', component.includes("setViewMode('grid')") && component.includes("setViewMode('list')")],
  ['existing live inventory renderer retained', component.includes('getCars') && component.includes('kayad-inventory-results')],
  ['left filter rail remains the canonical shared panel', component.includes('<InventoryFilterPanel idPrefix="sidebar"') && component.includes('<InventoryFilterPanel idPrefix="mobile"')],
  ['filter rail has a persistent header and independently scrolling body', component.includes('kayad-filter-panel__header') && component.includes('kayad-filter-panel__body') && /\.kayad-filter-panel__body\s*\{[^}]*overflow-y:\s*auto/s.test(css)],
  ['filter rail is aligned to the content edge without an empty ad-rail spacer', component.includes('<FloatingAdRail placement="left_rail" />') && !component.includes('<div className="hidden 2xl:block shrink-0 w-16"><FloatingAdRail placement="left_rail"')],
  ['sidebar and inventory tracks share the refined desktop widths', /grid-template-columns:\s*276px minmax\(0, 1fr\)/.test(css) && /grid-template-columns:\s*252px minmax\(0, 1fr\)/.test(css)],
  ['desktop sidebar has one reset action while mobile sheet retains its reset', panel.includes("variant === 'sheet' && <button") && component.includes('>Reset all</button>')],
  ['desktop layout is breakpoint-scoped', /@media\s*\(min-width:\s*1024px\)[\s\S]*?Implementation 05B/.test(css)],
  ['mobile filter drawer and shared filter state retained', component.includes('setShowMobileFilterDrawer(true)') && component.includes('idPrefix="mobile"') && component.includes('values={filterValues}')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exit(1);
