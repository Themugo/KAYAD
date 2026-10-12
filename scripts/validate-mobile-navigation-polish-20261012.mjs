import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');
const navbar = read('src/components/Navbar.tsx');
const navCss = read('src/styles/kayad-navigation.css');
const indexCss = read('src/index.css');
const bottom = read('src/components/MobileBottomNav.tsx');
const checks = [
  ['mobile menu remains the canonical Navbar drawer', navbar.includes('id="kayad-mobile-drawer"') && navbar.includes("kayad:open-mobile-menu")],
  ['drawer is an accessible modal dialog', navbar.includes('role="dialog" aria-modal="true"')],
  ['drawer measures the visual viewport', navbar.includes('window.visualViewport') && navbar.includes('setMobileDrawerHeight')],
  ['drawer retains safe-area bottom padding', navbar.includes('env(safe-area-inset-bottom)')],
  ['drawer primary destinations use grouped grid', navbar.includes('kayad-mobile-drawer-primary') && navCss.includes('.kayad-mobile-drawer-primary { display:grid')],
  ['drawer category icons remain sourced from canonical nav config', navbar.includes('<Icon className="h-[18px] w-[18px]"')],
  ['drawer child destinations show canonical icons', navbar.includes('const ChildIcon = child.icon') && navbar.includes('kayad-drawer-chip__icon')],
  ['drawer child active state is exposed', navbar.includes('aria-current={activeNav === child.navId')],
  ['drawer support group spans the grid', navCss.includes('grid-column:1/-1')],
  ['narrow phone uses single-column destination groups', navCss.includes('@media(max-width:340px)') && navCss.includes('grid-template-columns:minmax(0,1fr)')],
  ['small tablet drawer uses three columns', navCss.includes('@media(min-width:640px) and (max-width:1023px)')],
  ['menu overlay hides canonical mobile dock', navCss.includes('body.kayad-mobile-menu-is-open .kayad-mobile-bottom-nav')],
  ['menu overlay hides legacy mobile dock', navCss.includes('body.kayad-mobile-menu-is-open .mobile-bottom-nav')],
  ['menu overlay prevents dock hit-testing', navCss.includes('pointer-events:none!important')],
  ['drawer links have high-visibility keyboard focus', navCss.includes('.kayad-mobile-menu__surface button:focus-visible')],
  ['drawer respects reduced motion', navCss.includes('@media(prefers-reduced-motion:reduce)')],
  ['bottom dock retains five canonical actions', bottom.includes("key: 'home'") && bottom.includes("key: 'search'") && bottom.includes("key: 'auction'") && bottom.includes("key: 'inspection'") && bottom.includes("key: 'menu'")],
  ['bottom dock labels retain explicit text', bottom.includes('<span>{label}</span>')],
  ['bottom dock uses touch-sized targets', indexCss.includes('.kayad-mobile-bottom-nav__item { min-height:48px')],
  ['bottom dock icon sizing is normalized', indexCss.includes('.kayad-mobile-bottom-nav__icon svg { width:21px;height:21px; }')],
  ['bottom dock uses KAYAD palette', indexCss.includes('#E6F7F3') && indexCss.includes('#0B716F')],
  ['phone header tagline no longer collides with actions', indexCss.includes('.kayad-brand__tag { display:none!important; }')],
  ['narrow header actions are compacted', navCss.includes('@media(max-width:380px)') && navCss.includes('.kayad-cta { min-height:38px')],
  ['focus ring uses theme mint', navCss.includes('outline:2px solid #8DE4DB')],
  ['navigation still derives child destinations from visibleChildren', navbar.includes('visibleChildren(item, signedIn)')],
  ['navigation configuration remains admin-controlled', navbar.includes('applyNavigationConfig(navigation)')],
  ['seller CTA remains existing authenticated navigation action', navbar.includes("handleNavSelect('seller-platform')") && navbar.includes('id="cta-sell-car"')],
  ['saved and messaging shortcuts remain in the same drawer', navbar.includes("handleNavSelect('saved')") && navbar.includes("handleNavSelect('chat')")],
  ['notifications remain reachable in the drawer', navbar.includes("navigate('/notifications')")],
  ['role-specific dealer tools remain role-gated', navbar.includes("user?.role === 'dealer'")],
  ['role-specific admin tools remain role-gated', navbar.includes("user?.role === 'admin'")],
  ['source still contains escape and viewport cleanup hooks', navbar.includes('window.removeEventListener(\'resize\', syncDrawerViewport)')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`\nMobile navigation polish: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exitCode = 1;
