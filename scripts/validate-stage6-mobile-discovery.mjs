import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const component = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const nav = read('src/components/MobileBottomNav.tsx');
const css = read('src/features/VehicleMarketplace/components/homepage-redesign.css');
const results = [];
const check = (label, condition) => results.push({ label, pass: Boolean(condition) });

check('Canonical mobile search row remains present', component.includes('data-testid="mobile-search-row"'));
check('Search row uses existing searchQuery state', component.includes('value={searchQuery}') && component.includes('onSearchChange(event.target.value)'));
check('Mobile filter entry opens canonical filter drawer', component.includes('onClick={() => setShowMobileFilterDrawer(true)}') && component.includes('aria-label={activeSidebarFilters > 0 ? `Open inventory filters'));
check('Mobile drawer reuses InventoryFilterPanel and shared values', component.includes('idPrefix="mobile" variant="sheet" values={filterValues}'));
check('Category shortcuts remain bound to existing body/fuel filter state', component.includes("setSelectedBodyStyle('SUV')") && component.includes("setSelectedFuel('Electric')"));
check('Inventory count remains server-backed', component.includes('serverTotal.toLocaleString()') && component.includes('inventoryStatusText'));
check('Sort control remains bound to sortBy', component.includes('value={sortBy}') && component.includes('setSortBy(e.target.value as typeof sortBy)'));
check('Grid/list controls remain bound to viewMode', component.includes("setViewMode('grid')") && component.includes("setViewMode('list')"));
check('Inventory grid still renders paginated server vehicles', component.includes('gridItemsWithSponsors.map(') && component.includes('const v = item.vehicle;'));
check('Buyer dock matches five approved destinations: Home, Search, Sell, Messages, Account', (nav.match(/key: '(home|search|sell|messages|account)'/g) || []).length === 5);
check('Buyer nav retains five-column layout', read('src/index.css').includes('grid-template-columns: repeat(5, minmax(0, 1fr))'));
check('Mobile dock reserves safe-area-aware content space', nav.includes('calc(104px + env(safe-area-inset-bottom))'));
check('Mobile discovery spacing targets 320–639px', css.includes('@media (max-width: 639px)') && css.includes('#market-results'));
check('Mobile toolbar adapts controls to a two-column layout', css.includes('grid-template-columns: minmax(0,1fr) minmax(0,1fr)') && css.includes('.kayad-market-toolbar-controls'));
check('KAYAD navy/teal identity remains explicit', read('src/index.css').includes('#0A3340') && read('src/index.css').includes('#13B8A6') && css.includes('#0A3340'));
check('Reduced-motion behaviour remains present for hero', css.includes('@media (prefers-reduced-motion: reduce)'));

for (const item of results) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.label}`);
console.log(`\n${results.filter(x => x.pass).length}/${results.length} checks passed`);
if (results.some(x => !x.pass)) process.exit(1);
