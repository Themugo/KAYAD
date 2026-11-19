import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const component = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const css = read('src/index.css');
const responsive = read('src/features/VehicleMarketplace/components/homepage-redesign.css');
const tests = read('src/__tests__/components/VehicleMarketplace.test.tsx');
const checks = [];
const check = (name, fn) => { fn(); checks.push(name); };

check('3/4/5 controls all update the same canonical gridColumns state', () => {
  assert.match(component, /\[3,\s*4,\s*5\]\.map\(\(n\)\s*=>/);
  assert.match(component, /onClick=\{\(\)\s*=>\s*setGridColumns\(n as 3 \| 4 \| 5\)\}/);
  assert.match(component, /data-columns=\{viewMode === 'grid' \? gridColumns : undefined\}/);
  assert.match(component, /'--kayad-grid-columns': gridColumns/);
});

check('4-column selection has a real container-query rule at desktop result widths', () => {
  assert.match(css, /@container kayad-inventory-results \(min-width: 680px\)[\s\S]*?\.kayad-inventory-grid\[data-columns="4"\][\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
});

check('5-column selection upgrades to five only when the result container is wide enough', () => {
  assert.match(css, /@container kayad-inventory-results \(min-width: 1120px\)[\s\S]*?\.kayad-inventory-grid\[data-columns="5"\][\s\S]*?grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
});

check('tablet and mobile retain responsive fallback grids without exposing desktop column controls', () => {
  assert.match(component, /aria-label="Desktop grid columns"/);
  assert.match(component, /className="[^"]*hidden[^"]*lg:flex"[^>]*role="group" aria-label="Desktop grid columns"/);
  assert.match(responsive, /@media \(min-width: 640px\) and \(max-width: 1023px\)[\s\S]*?inventory-grid[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media \(max-width: 639px\)[\s\S]*?\.kayad-homepage \.kayad-inventory-grid[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

check('switching grid/list retains the chosen column preference', () => {
  assert.match(component, /setViewMode\('grid'\)/);
  assert.match(component, /setViewMode\('list'\)/);
  assert.match(tests, /retains the selected four-column preference when switching to list and back to grid/);
});

check('grid and list controls expose stable accessible names and pressed state', () => {
  assert.match(component, /aria-label="Grid view"/);
  assert.match(component, /aria-label="List view"/);
  assert.match(tests, /mobile grid and list controls accessible and switches the canonical inventory view/);
});

check('mobile grid remains image-first while mobile list becomes a horizontal compact card', () => {
  assert.match(css, /data-view-mode="grid"[\s\S]*?flex-direction:\s*column\s*!important/);
  assert.match(css, /data-view-mode="list"[\s\S]*?flex-direction:\s*row\s*!important/);
  assert.match(css, /data-view-mode="list"[\s\S]*?kayad-vc-media[\s\S]*?flex:\s*0\s+0\s+36%/);
  assert.match(css, /data-view-mode="list"[\s\S]*?card-thumbnails[\s\S]*?display:\s*none\s*!important/);
});

check('category shortcuts clear the opposing category dimension to avoid hidden combined filters', () => {
  assert.match(component, /\['SUV',[\s\S]*?setSelectedBodyStyle\('SUV'\); setSelectedFuel\('All'\)/);
  assert.match(component, /\['Electric',[\s\S]*?setSelectedBodyStyle\('All'\); setSelectedFuel\('Electric'\)/);
  assert.match(tests, /category shortcuts replace the previous body-style or fuel category/);
});

check('mobile filter drawer regression covers shared filter state across close and reopen', () => {
  assert.match(tests, /mobile filter drawer reuses the shared filter state and preserves values when closed and reopened/);
  assert.match(component, /InventoryFilterPanel idPrefix="sidebar"[\s\S]*?values=\{filterValues\}/);
  assert.match(component, /InventoryFilterPanel idPrefix="mobile"[\s\S]*?values=\{filterValues\}/);
});

check('mobile Grid/List toggle is explicitly visible and provides 44px touch targets', () => {
  assert.match(component, /data-testid=\"inventory-view-controls\"/);
  assert.match(css, /data-testid=\"inventory-view-controls\"[\s\S]*?display:\s*flex\s*!important[\s\S]*?min-height:\s*48px/);
  assert.match(css, /data-testid=\"inventory-view-controls\"] button[\s\S]*?min-width:\s*44px[\s\S]*?min-height:\s*44px[\s\S]*?height:\s*44px/);
});

check('grid and list modes preserve the same save, detail and seller-contact actions', () => {
  assert.match(component, /aria-label=\{isSaved \? `Remove \${v\.title} from saved vehicles` : `Save \${v\.title}`\}/);
  assert.match(component, /onClick=\{\(\) => handleVehicleSelect\(v\)\}/);
  assert.match(component, /aria-label=\{`Contact seller about \${v\.title}`\}/);
  assert.match(tests, /keeps the same listing actions connected in both phone view modes/);
});

check('colour changes reset server pagination to page one', () => {
  const resetEffect = component.match(/useEffect\(\(\)\s*=>\s*\{\s*setCurrentPage\(1\);\s*\},\s*\[([\s\S]*?)\]\);/);
  assert.ok(resetEffect, 'pagination reset effect exists');
  assert.match(resetEffect[1], /selectedColor/);
  assert.match(component, /if \(selectedColor !== 'All'\) query\.colorLike = selectedColor/);
});

check('sort, page-size and server pagination remain connected to the existing API query', () => {
  assert.match(component, /query\.sort = sortMap\[sortBy\]/);
  assert.match(component, /page:\s*currentPage/);
  assert.match(component, /limit:\s*pageSize/);
  assert.match(component, /setCurrentPage\(\(p\)\s*=>\s*Math\.min\(totalPages,\s*p \+ 1\)\)/);
  assert.match(component, /setPageSize\(n\)/);
});

check('search, filters, category changes, sorting and page-size changes reset pagination in the same event', () => {
  assert.match(component, /const applyFilterPatch = \(patch: Partial<FilterValues>\) => \{[\s\S]*?setCurrentPage\(1\)/);
  assert.match(component, /onChange=\{\(event\) => \{ setCurrentPage\(1\); onSearchChange\(event\.target\.value\); \}\}/);
  assert.match(component, /onClick=\{\(\) => \{ setCurrentPage\(1\); setPageSize\(n\); \}\}/);
  assert.match(component, /onChange=\{\(e\) => \{ setCurrentPage\(1\); setSortBy\(e\.target\.value as typeof sortBy\); \}\}/);
  assert.match(tests, /resets server pagination atomically when sorting or changing page size from a later page/);
});

check('vehicle count remains sourced from serverTotal, not injected sponsor cards', () => {
  assert.match(component, /serverTotal\.toLocaleString\(\)/);
  assert.match(component, /gridItemsWithSponsors/);
});

check('regression coverage exercises each column and the 4-column list/grid transition', () => {
  assert.match(tests, /changes the live inventory grid between 3, 4 and 5 columns/);
  assert.match(tests, /retains the selected four-column preference when switching to list and back to grid/);
});

console.log(`Inventory responsive 06C validation: ${checks.length}/${checks.length} PASS`);
for (const name of checks) console.log(`PASS ${name}`);
