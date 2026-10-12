import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const bottom = read('src/components/MobileBottomNav.tsx');
const tests = read('src/__tests__/components/MobileBottomNav.test.tsx');
const css = read('src/styles/kayad-navigation.css');
const navbar = read('src/components/Navbar.tsx');
const checks = [
  ['bottom navigation uses Saved instead of a duplicate Menu tab', bottom.includes("key: 'saved'") && !bottom.includes("key: 'menu'")],
  ['Saved action targets existing canonical saved surface', bottom.includes("action: () => onNavigate('saved')")],
  ['Saved tab uses a real Heart icon', bottom.includes('Heart') && bottom.includes("tone: 'saved'")],
  ['Saved tab reflects existing saved navigation state', bottom.includes("if (key === 'saved') return activeNav === 'saved'")],
  ['unit test covers new bottom navigation labels', tests.includes("['Home', 'Search', 'Auction', 'Services', 'Saved']")],
  ['unit test verifies saved destination', tests.includes("toHaveBeenCalledWith('saved')")],
  ['existing header hamburger remains the menu opener', navbar.includes('Toggle navigation menu') && navbar.includes('openMobileMenu()')],
  ['existing single accessible drawer is retained', navbar.includes('id="kayad-mobile-drawer"') && navbar.includes('role="dialog" aria-modal="true"')],
  ['drawer destination cards no longer stretch vertically', css.includes('align-items: start;') && css.includes('align-self: start;') && css.includes('height: auto;')],
  ['drawer maintains compact, responsive two-column layout', css.includes('grid-template-columns:repeat(2,minmax(0,1fr))') && css.includes('min-height: 58px')],
  ['menu still hides the dock while open', css.includes('body.kayad-mobile-menu-is-open .kayad-mobile-bottom-nav') && css.includes('visibility:hidden!important')],
  ['reduced-motion preference remains respected', css.includes('@media(prefers-reduced-motion:reduce)')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`\nStage 32 menu polish: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exitCode = 1;
