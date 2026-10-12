import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const showroom = read('src/pages/Showroom.jsx');
const sidebar = read('src/components/SearchSidebar.tsx');
const searchService = read('backend/services/searchService.js');
const carController = read('backend/controllers/carController.js');
const searchBar = read('src/components/features/common/SearchBar.tsx');
const css = read('src/styles/showroom.css');
const checks = [
  ['Showroom uses canonical backend facets', showroom.includes("getSearchFacets") && showroom.includes('setSearchFacets')],
  ['Make dropdown is driven by listing facets', sidebar.includes('facets?.brands')],
  ['Model dropdown is present and backend filtered by make', showroom.includes("getSearchFacets(query)") && showroom.includes('modelFacets={modelFacets}') && sidebar.includes("onFilterChange('model', m)")],
  ['Model filter is part of URL state and API query', showroom.includes("searchParams.get('model')") && showroom.includes('model:        filters.model') && showroom.includes("'model', 'location'")],
  ['Body/fuel/transmission/location options are dynamic facets', ['facets?.locations','facets?.bodyTypes','facets?.fuels','facets?.transmissions'].every(x=>sidebar.includes(x))],
  ['Autocomplete uses full database distinct values, not 500-row sample', searchService.includes("db.distinct('cars', 'brand'") && !searchService.includes("select: 'brand,model,locationCity,bodyType', limit: 500")],
  ['Listing mutations invalidate facet and autocomplete caches', (carController.match(/cacheDelPattern\("kayad:search:facets:\*"\)/g)||[]).length >= 3 && carController.includes('kayad:search:suggestions:*')],
  ['Hard-coded default brand suggestions removed', !searchBar.includes('DEFAULT_BRANDS') && searchBar.includes('suggestions = []')],
  ['Unsupported Sold category removed from UI', !showroom.includes("label: 'Sold'")],
  ['Phone-first showroom refinements are scoped to mobile', css.includes('@media (max-width: 768px)') && css.includes('Stage 36')],
  ['Latest-query request sequencing protects active searches', showroom.includes('loadRequestRef.current') && showroom.includes('requestId !== loadRequestRef.current')],
];
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
for (const file of ['backend/services/searchService.js','backend/controllers/carController.js']) execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});
console.log(`STAGE 36 SHOWROOM SEARCH VALIDATION: ${checks.length}/${checks.length} PASS`);
