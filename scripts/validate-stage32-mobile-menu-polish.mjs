import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const bottom = read('src/components/MobileBottomNav.tsx');
const tests = read('src/__tests__/components/MobileBottomNav.test.tsx');
const css = read('src/styles/kayad-navigation.css');
const navbar = read('src/components/Navbar.tsx');
const checks = [
  // Superseded architecture (2026-11-16 directive): the dock is the five-item PERSONAL navigation Home, Search, Sell, Messages, Account.
  // Saved vehicles live inside the unified personal dashboard (Buying), so the old "Saved" tab assertions are retired, not weakened:
  // the menu-duplicate guard, canonical destinations and protected routing are asserted against the new dock instead.
  ['dock has no duplicate Menu tab and exactly the five personal destinations', !bottom.includes("key: 'menu'") && ['home','search','sell','messages','account'].every((k) => bottom.includes(`key: '${k}'`)) && !bottom.includes("key: 'saved'")],
  ['Sell opens the unified create-listing section, not a separate seller shell', bottom.includes("onNavigate('dashboard:create-listing')")],
  ['Messages and Account use the canonical destinations', bottom.includes("onNavigate('chat')") && bottom.includes("onNavigate('dashboard:account')")],
  ['dock icons are semantic (house, search, plus, message, user)', ['House','Search','PlusCircle','MessageCircle','UserRound'].every((i) => bottom.includes(`icon: ${i}`))],
  ['dealer organisations keep their own navigation (dock hidden for dealers)', bottom.includes("=== 'dealer') return null")],
  ['unit test covers the five dock labels in order', tests.includes("['Home', 'Search', 'Sell', 'Messages', 'Account']")],
  ['existing header hamburger remains the menu opener', navbar.includes('Toggle navigation menu') && navbar.includes('openMobileMenu()')],
  ['existing single accessible drawer is retained', navbar.includes('id="kayad-mobile-drawer"') && navbar.includes('role="dialog" aria-modal="true"')],
  ['drawer destination cards no longer stretch vertically', css.includes('align-items: start;') && css.includes('align-self: start;') && css.includes('height: auto;')],
  ['drawer now uses one continuous single-column menu flow', css.includes('flex-direction: column !important;') && css.includes('min-height: 58px')],
  ['menu still hides the dock while open', css.includes('body.kayad-mobile-menu-is-open .kayad-mobile-bottom-nav') && css.includes('visibility:hidden!important')],
  ['reduced-motion preference remains respected', css.includes('@media(prefers-reduced-motion:reduce)')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`\nStage 32 menu polish: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exitCode = 1;
