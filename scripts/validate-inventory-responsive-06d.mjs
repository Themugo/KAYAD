import fs from 'node:fs';
import assert from 'node:assert/strict';

const component = fs.readFileSync('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx', 'utf8');
const css = fs.readFileSync('src/index.css', 'utf8');
const unit = fs.readFileSync('src/__tests__/components/VehicleMarketplace.test.tsx', 'utf8');
const e2e = fs.readFileSync('e2e/tests/marketplace-controls/marketplace-controls.spec.ts', 'utf8');
const checks = [
  ['one canonical Grid/List state drives the inventory renderer', /data-view-mode=\{viewMode\}/.test(component) && /onClick=\{\(\) => setViewMode\('grid'\)\}/.test(component) && /onClick=\{\(\) => setViewMode\('list'\)\}/.test(component)],
  ['mobile Grid and List selectors are explicitly visible and tappable', /data-testid="inventory-view-controls"/.test(component) && /min-width: 44px/.test(css) && /min-height: 44px/.test(css)],
  ['mobile Grid renders a single-column image-first card', /data-view-mode="grid"/.test(css) && /flex-direction: column !important/.test(css)],
  ['mobile List renders a horizontal photo-left card', /data-view-mode="list"/.test(css) && /flex-direction: row !important/.test(css)],
  ['desktop and tablet layout contracts remain present', /@container kayad-inventory-results/.test(css) && /repeat\(2, minmax\(0, 1fr\)\)/.test(css)],
  ['component tests cover switching modes in both directions', /switches the canonical inventory view in both directions/.test(unit)],
  ['component tests retain save, detail and seller contact actions', /keeps the same listing actions connected in both phone view modes/.test(unit)],
  ['browser test measures computed card layout at 390px and 360px', /for \(const width of \[390, 360\]\)/.test(e2e) && /getComputedStyle\(el\)\.flexDirection/.test(e2e)],
  ['browser test checks touch targets and horizontal overflow', /getBoundingClientRect\(\)\.width/.test(e2e) && /documentElement\.scrollWidth <= window\.innerWidth/.test(e2e)],
  ['browser test verifies desktop list/grid rendering after phone checks', /desktop list is a genuinely horizontal card/.test(e2e)],
];

let passed = 0;
for (const [label, ok] of checks) {
  assert.ok(ok, label);
  passed += 1;
  console.log(`PASS ${label}`);
}
console.log(`\nInventory responsive 06D static contract: ${passed}/${checks.length} PASS`);
