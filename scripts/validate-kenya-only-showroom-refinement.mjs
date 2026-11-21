import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['App defaults to Kenya-wide inventory', read('src/App.tsx').includes("useState<string>('All Kenya')")],
  ['Marketplace default region uses All Kenya', read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes("return ['All Kenya',")],
  ['County filter sends a city only for a selected Kenyan location', read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes("if (selectedCounty !== 'All Kenya') query.city = selectedCounty;")],
  ['Clearing location filter resets to All Kenya', read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes("onCountyChange('All Kenya')")],
  ['Public source copy no longer advertises East Africa coverage', !['src/App.tsx','src/components/TopNoticeStrip.tsx','src/components/navigation/navConfig.ts','src/features/VehicleMarketplace/components/VehicleMarketplace.tsx','src/features/HeroEditor/HeroEditorPanel.tsx','src/components/CompareModal.tsx','src/components/VehicleDetailModal.tsx'].some(p => /across East Africa|All East Africa|East African roads|East Africa certified inventory/i.test(read(p)))],
  ['Hero identity says Kenya', read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes(`"KENYA'S VEHICLE MARKETPLACE"`)], // the old coverage stat tile was retired with the approved hero composition
  ['Ticker fallback is Kenya-specific', read('src/components/TopNoticeStrip.tsx').includes('Vehicle listings across Kenya') && read('src/components/TopNoticeStrip.tsx').includes('kenyaOnlyTickerCopy')],
  ['Saved ticker config is localized to Kenya at display time', read('src/components/TopNoticeStrip.tsx').includes('kenyaOnlyTickerCopy(slot.title)') && read('src/components/TopNoticeStrip.tsx').includes('kenyaOnlyTickerCopy(slot.tagline)')],
  ['Hero editor fallback is Kenya-specific', read('src/features/HeroEditor/HeroEditorPanel.tsx').includes('quality vehicles across Kenya')],
  ['Saved hero subheadline is localized to Kenya at display time', read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes('const kenyaOnlyCopy =') && read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes('const heroSubheadline = kenyaOnlyCopy(')],
  ['Navigation description is Kenya-specific', read('src/components/navigation/navConfig.ts').includes('Search listed vehicles across Kenya')],
  ['Compare copy is Kenya marketplace-specific', read('src/components/CompareModal.tsx').includes("across Kenya's marketplace")],
  ['Mobile inventory toolbar has a scoped layout class', read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes('kayad-market-toolbar-controls')],
  ['Sort select has an accessible label', read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes('aria-label="Sort inventory"')],
  ['Filter drawer button has an accessible label', read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes("'Open inventory filters'") && read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes('Open inventory filters, ${activeSidebarFilters} active')],
  ['Vehicle search has an accessible label', read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes('aria-label="Search vehicles by make, model or keyword"')],
  ['Mobile toolbar uses a two-column responsive grid', read('src/styles/kayad-theme-convergence.css').includes('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)')],
  ['Mobile search bridge pairs the search field with the filter button', read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes('data-testid="mobile-search-row"') && read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes('kayad-inventory-search-filter lg:hidden')],
  ['Bottom navigation has additional mobile content clearance', read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes('pb-32 sm:pb-20')],
  ['Search bridge filter control is a real button that opens the filter drawer', read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes('onClick={() => setShowMobileFilterDrawer(true)}') && read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes('className="kayad-inventory-search-filter lg:hidden"')],
  ['Responsive reduced-motion styles exist', read('src/styles/kayad-theme-convergence.css').includes('@media (prefers-reduced-motion: reduce)')],
  ['Showroom regression tests assert Kenya-only scope', read('src/__tests__/components/VehicleMarketplace.test.tsx').includes("expect(screen.getByText('All Kenya'))")],
];
let failed = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
  if (!pass) failed += 1;
}
console.log(`\\nKenya-only showroom refinement: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exitCode = 1;
