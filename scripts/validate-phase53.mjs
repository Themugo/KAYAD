import fs from 'node:fs';
const checks = [
  ['shared recent-search hook exists', fs.existsSync('src/hooks/useRecentSearches.ts')],
  ['shared hook uses preferences API', /preferencesAPI\.get\(\)/.test(fs.readFileSync('src/hooks/useRecentSearches.ts','utf8'))],
  ['shared hook persists authenticated searches', /preferencesAPI\.addRecentSearch/.test(fs.readFileSync('src/hooks/useRecentSearches.ts','utf8'))],
  ['shared hook clears authenticated searches', /preferencesAPI\.clearRecentSearches/.test(fs.readFileSync('src/hooks/useRecentSearches.ts','utf8'))],
  ['desktop feature search bar uses shared hook', /useRecentSearches/.test(fs.readFileSync('src/components/features/common/SearchBar.tsx','utf8'))],
  ['desktop search bar uses shared hook', /useRecentSearches/.test(fs.readFileSync('src/components/SearchBar.tsx','utf8'))],
  ['mobile search bar uses shared hook', /useRecentSearches/.test(fs.readFileSync('src/components/mobile/MobileSearchBar.jsx','utf8'))],
  ['desktop feature search bar has no direct recent-search storage', !/localStorage\.(getItem|setItem|removeItem)\(['"]kayad_recent_searches/.test(fs.readFileSync('src/components/features/common/SearchBar.tsx','utf8'))],
  ['desktop search bar has no direct recent-search storage', !/localStorage\.(getItem|setItem|removeItem)\(['"]kayad_recent_searches/.test(fs.readFileSync('src/components/SearchBar.tsx','utf8'))],
  ['mobile search bar has no direct recent-search storage', !/localStorage\.(getItem|setItem|removeItem)\(['"]kayad_recent_searches/.test(fs.readFileSync('src/components/mobile/MobileSearchBar.jsx','utf8'))],
];
let pass=0; for (const [name, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok) pass++; }
console.log(`Phase 53 validation: ${pass}/${checks.length} PASS`);
if(pass!==checks.length) process.exit(1);
