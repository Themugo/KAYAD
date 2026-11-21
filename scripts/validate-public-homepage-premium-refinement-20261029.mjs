import fs from 'node:fs';
const heroPath = 'src/features/VehicleMarketplace/components/VehicleMarketplace.tsx';
const cssPath = 'src/index.css';
const hero = fs.readFileSync(heroPath, 'utf8');
// The hero is rendered by the shared PremiumHero component (kk-hero) since the 2026-11-19 approved composition.
const premiumHero = fs.readFileSync('src/components/home/PremiumHero.tsx', 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const checks = [
  ['canonical VehicleMarketplace hero remains in place', hero.includes('<PremiumHero') && hero.includes('heroSourceVehicles') && premiumHero.includes('kayad-public-hero')],
  ['real featured inventory remains the hero source', hero.includes('const heroSourceVehicles = heroSelection.vehicles') && hero.includes("getCars({ page: 1, limit: 24, featured: true")],
  ['hero copy remains admin-configurable', hero.includes('{heroHeadlineNode}') && hero.includes('{heroEyebrowDisplay}') && hero.includes('{heroSupportCopy}')],
  ['hero shortcuts are real buttons with accessible names (the two CTAs were replaced by the four-shortcut rail)', premiumHero.includes('<button key={item.label} type="button" onClick={item.onClick} aria-label={item.ariaLabel} className="kk-hero__shortcut"') && (hero.match(/ariaLabel: '/g) || []).length >= 4],
  ['legacy hero CTAs (non-shortcut consumers) keep accessible names', premiumHero.includes('aria-label={p.primaryAria}') && premiumHero.includes('aria-label={p.secondaryAria}') && hero.includes('primaryAria={`${heroPrimaryLabel} — browse KAYARD KE inventory`}')],
  ['hero carousel respects reduced-motion preference', hero.includes('usePrefersReducedMotion') && hero.includes('!prefersReducedMotion && heroRotationMs > 0') && hero.includes('if (prefersReducedMotion || heroSlides.length < 2')],
  ['featured vehicle controls retain accessible names', premiumHero.includes('Previous featured vehicle') && premiumHero.includes('Next featured vehicle')],
  ['image failures have an explicit fallback', hero.includes('brokenHeroImages[v.id]') && premiumHero.includes('Photo of ${v.title} is unavailable')],
  ['inventory retry remains wired to existing retry operation', hero.includes('onClick={retryInventory}') && hero.includes('setServerRetryKey')],
  ['search and filter controls remain in the existing search row', hero.includes('data-testid="mobile-search-row"') && hero.includes('onSearchChange(event.target.value)')],
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
