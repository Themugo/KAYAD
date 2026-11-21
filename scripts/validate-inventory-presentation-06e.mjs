import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const component = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const css = read('src/features/VehicleMarketplace/components/homepage-redesign.css');
const gridCss = read('src/index.css');
const tests = read('src/__tests__/components/VehicleMarketplace.test.tsx');
const browserTests = read('e2e/tests/marketplace-controls/marketplace-controls.spec.ts');

const checks = [
  ['Pagination range is derived from server total, page and page size', /Showing\s*<strong[\s\S]*?\{Math\.min\(currentPage \* pageSize, serverTotal\)\}[\s\S]*?serverTotal\.toLocaleString\(\)/.test(component)],
  ['Pagination navigation exposes an accessible named landmark', /aria-label="Inventory pagination"[\s\S]*?data-testid="inventory-pagination"/.test(component)],
  ['Page-number controls use accessible labels and current-page semantics', /aria-label=\{`Go to page \$\{item\}`\}[\s\S]*?aria-current=\{currentPage === item \? 'page' : undefined\}/.test(component)],
  ['Page-number window is bounded and includes ellipses for long result sets', /const getInventoryPageItems[\s\S]*?currentPage <= 4[\s\S]*?currentPage >= totalPages - 3[\s\S]*?return \[1, 'ellipsis', currentPage - 1, currentPage, currentPage \+ 1, 'ellipsis', totalPages\]/.test(component)],
  ['Existing Previous and Next controls retain bounded server-page updates', /onClick=\{\(\) => setCurrentPage\(\(p\) => Math\.max\(1, p - 1\)\)\}[\s\S]*?aria-label="Previous page"[\s\S]*?onClick=\{\(\) => setCurrentPage\(\(p\) => Math\.min\(totalPages, p \+ 1\)\)\}[\s\S]*?aria-label="Next page"/.test(component)],
  ['Toolbar uses a distinct heading and controls row', /\.kayad-market-toolbar > div:first-child\s*\{\s*flex-direction:\s*column;[\s\S]*?\.kayad-market-toolbar-controls\s*\{[\s\S]*?border-top:\s*1px solid/.test(css)],
  ['Grid cards are styled only in grid mode so List remains horizontal', /\.kayad-inventory-grid > \.kayad-vehicle-card\s*\{[\s\S]*?flex-direction:\s*column/.test(css) && !/\.kayad-homepage \.kayad-vehicle-card\s*\{[^}]*flex-direction:\s*column/.test(css)],
  ['Grid and media retain fluid width and protected image ratio', /\.kayad-inventory-grid\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0/.test(css) && /\.kayad-inventory-grid > \.kayad-vehicle-card \.kayad-vc-media\s*\{[\s\S]*?aspect-ratio:\s*4\s*\/\s*3/.test(css)],
  ['Existing 3/4/5-column container-query contract is preserved', /data-columns="3"[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)[\s\S]*?data-columns="4"[\s\S]*?data-columns="5"[\s\S]*?repeat\(5, minmax\(0, 1fr\)\)/.test(gridCss)],
  ['Phone pagination collapses to current page while retaining previous/next', /\.kayad-pagination-page:not\(\[aria-current="page"\]\)\s*\{\s*display:\s*none/.test(css)],
  ['Regression test covers accurate range and direct page-number navigation', /shows an accurate result range and supports direct page-number navigation/.test(tests) && /Showing 49–72 of 240 vehicles/.test(tests)],
  ['Existing grid/list and page-reset regression coverage remains present', /changes the live inventory grid between 3, 4 and 5 columns/.test(tests) && /resets server pagination atomically/.test(tests)],
  ['Six-width real-browser regression remains included in the working baseline', /const widths = \[1440, 1280, 1024, 768, 390, 360\]/.test(browserTests) && /inventory Grid\/List renders correctly at all six supported viewport widths/.test(browserTests)],
  ['Browser regression covers server pagination, direct navigation, boundary states and page-size reset', /server pagination supports direct pages, previous\/next boundaries and page-size resets/.test(browserTests) && /data\.slice\(start, start \+ limit\)/.test(browserTests)],
];

let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed += 1;
}
console.log(`\nInventory presentation 06E static contract: ${checks.length - failed}/${checks.length} ${failed ? 'FAIL' : 'PASS'}`);
process.exitCode = failed ? 1 : 0;
