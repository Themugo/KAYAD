import fs from 'node:fs';
const heroPath = 'src/features/VehicleMarketplace/components/VehicleMarketplace.tsx';
const cssPath = 'src/index.css';
const hero = fs.readFileSync(heroPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const checks = [
  ['canonical VehicleMarketplace hero remains in place', hero.includes('kayad-public-hero') && hero.includes('heroSourceVehicles')],
  ['real featured inventory remains the hero source', hero.includes('const heroSourceVehicles = useMemo(') && hero.includes('getCars({ page: 1, limit: 100, featured: true')],
  ['hero copy remains admin-configurable', hero.includes('{heroHeadlineNode}') && hero.includes('{heroEyebrowDisplay}') && hero.includes('{heroSupportCopy}')],
  ['desktop and mobile primary CTAs are real buttons', (hero.match(/aria-label=\{`\$\{heroPrimaryLabel\} — browse KAYAD inventory`\}/g) || []).length === 2],
  ['desktop and mobile secondary CTAs use accessible play icon', (hero.match(/aria-label=\{`\$\{heroSecondaryLabel\} — learn about KAYAD`\}/g) || []).length === 2 && (hero.match(/<PlayCircle/g) || []).length >= 2],
  ['hero carousel respects reduced-motion preference', hero.includes('usePrefersReducedMotion') && (hero.match(/if \(prefersReducedMotion \|\|/g) || []).length >= 2],
  ['vehicle pair controls retain accessible names', hero.includes('Previous featured vehicles') && hero.includes('Next featured vehicles')],
  ['mobile image failures have an explicit fallback', hero.includes('brokenHeroImages[vehicle.id]') && hero.includes('Photo of ${vehicle.make} ${vehicle.model} is unavailable')],
  ['inventory retry remains wired to existing retry operation', hero.includes('onClick={retryInventory}') && hero.includes('setServerRetryKey')],
  ['search and filter controls remain in the existing search bridge', hero.includes('2. SEARCH BRIDGE') && hero.includes('onSearchChange(e.target.value)')],
  ['premium mobile hero styles are scoped to the homepage', css.includes('.kayad-homepage .kayad-public-hero__mobile-card') && css.includes('.kayad-homepage .kayad-public-hero__vehicle-card')],
  ['search controls have accessible focus treatment', css.includes('.kayad-homepage .kayad-search-bridge input:focus-visible')],
  ['narrow phone typography is handled', css.includes('@media (max-width: 389px)') && css.includes('.kayad-public-hero__mobile-card h1')],
  ['reduced-motion CSS avoids nonessential control transitions', css.includes('@media (prefers-reduced-motion: reduce)') && css.includes('.kayad-public-hero__primary-cta')],
  ['no duplicate homepage implementation introduced', !hero.includes('NewPublicHomepage')],
];
let passed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (ok) passed++; }
console.log(`\nPublic homepage premium refinement: ${passed}/${checks.length} ${passed === checks.length ? 'PASS' : 'FAIL'}`);
if (passed !== checks.length) process.exit(1);
