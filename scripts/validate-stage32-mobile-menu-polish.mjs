import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const bottom = read('src/components/MobileBottomNav.tsx');
const tests = read('src/__tests__/components/MobileBottomNav.test.tsx');
const css = read('src/styles/kayad-navigation.css');
const navbar = read('src/components/Navbar.tsx');
const checks = [
  ['bottom navigation uses Saved instead of a duplicate Menu tab', bottom.includes("key: 'saved'") && !bottom.includes("key: 'menu'")],
  // Stage 36 (KAYAD_STAGE36_SHOWROOM_CANONICAL_SEARCH_MOBILE_POLISH_20261012.md)
  // gave the dock's local tab highlight its own tracked state for every item
  // (setSelectedTab(...) alongside onNavigate(...)), so the Saved action now
  // does both instead of only the one-line onNavigate call this check pinned
  // originally. onNavigate('saved') is still called either way - updated the
  // literal to match rather than reverting the (strictly additive) local-state
  // tracking.
  ['Saved action targets existing canonical saved surface', bottom.includes("action: () => { setSelectedTab('saved'); onNavigate('saved'); }")],
  ['Saved tab uses a real Heart icon', bottom.includes('Heart') && bottom.includes("tone: 'saved'")],
  // Same Stage 36 change: isActive() grew explicit branches for the other
  // tabs it now also locally tracks, so the Saved check moved from its own
  // "if" into the function's final fallback return - same semantics (key
  // === 'saved' still resolves to activeNav === 'saved'), different shape.
  ['Saved tab reflects existing saved navigation state', bottom.includes("return key === 'saved' && activeNav === 'saved'")],
  // Stage 36 renamed this tab's label from "Search" to "Showroom" (the stage's
  // own documented rename target - see KAYAD_STAGE36_SHOWROOM_CANONICAL_
  // SEARCH_MOBILE_POLISH_20261012.md), matching the "KAYAD mobile hero"/
  // Showroom.jsx naming used everywhere else. Updated the literal rather than
  // reverting the rename.
  ['unit test covers new bottom navigation labels', tests.includes("['Home', 'Showroom', 'Auction', 'Services', 'Saved']")],
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
