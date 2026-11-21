import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const marketplace = read('../src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const config = read('../src/features/VehicleMarketplace/hooks/useHomePageConfig.ts');
const admin = read('../src/features/VehicleMarketplace/components/HomePageAdminPanel.tsx');
const helper = read('../src/features/VehicleMarketplace/utils/inventoryPresentation.ts');
const css = read('../src/index.css');

assert.match(marketplace, /const activeSidebarFilters = activeFilters\.length;/);
assert.match(marketplace, /All vehicle categories \(does not clear other filters\)/);
assert.match(marketplace, /validateInventoryFilterRanges/);
assert.match(marketplace, /getEffectiveGridColumns\(gridColumns, inventoryResultsWidth\)/);
assert.match(marketplace, /new ResizeObserver/);
assert.match(marketplace, /homeConfig\.inventoryLayout\.showSidebar/);
assert.match(marketplace, /data-effective-columns=/);
assert.match(config, /showSidebar: parsed\.inventoryLayout\?\.showSidebar !== false/);
assert.match(admin, /Show desktop inventory filter sidebar/);
assert.match(admin, /searchTrustCard: 'Hero & Search Discovery'/);
assert.match(helper, /containerWidth < 520/);
assert.match(helper, /containerWidth < 760/);
assert.match(helper, /containerWidth < 1280/);
assert.match(css, /@container kayad-inventory-results \(min-width: 520px\)/);
assert.match(css, /@container kayad-inventory-results \(min-width: 760px\)/);
assert.match(css, /@container kayad-inventory-results \(min-width: 1280px\)/);
console.log('Homepage final enforcement: 15/15 contract checks passed.');
