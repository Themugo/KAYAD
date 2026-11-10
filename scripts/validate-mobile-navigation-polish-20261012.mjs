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
  ['drawer primary destinations use one continuous vertical list', navbar.includes('kayad-mobile-drawer-primary') && navCss.includes('flex-direction: column !important;')],
  ['drawer category icons remain sourced from canonical nav config', navbar.includes('<Icon className="h-[18px] w-[18px]"')],
  ['drawer child destinations show canonical icons', navbar.includes('const ChildIcon = child.icon') && navbar.includes('kayad-drawer-chip__icon')],
  ['drawer child active state is exposed', navbar.includes('aria-current={activeNav === child.navId')],
  ['support remains a direct item in the same primary list', navbar.includes('Support & Disputes')],
  ['narrow phone uses single-column destination groups', navCss.includes('@media(max-width:340px)') && navCss.includes('grid-template-columns:minmax(0,1fr)')],
  ['small tablet drawer keeps the same single-page list hierarchy', navCss.includes('KAYAD unified mobile menu') && navCss.includes('flex-direction: column !important;')],
  ['menu overlay hides canonical mobile dock', navCss.includes('body.kayad-mobile-menu-is-open .kayad-mobile-bottom-nav')],
  ['menu overlay hides legacy mobile dock', navCss.includes('body.kayad-mobile-menu-is-open .mobile-bottom-nav')],
  ['menu overlay prevents dock hit-testing', navCss.includes('pointer-events:none!important')],
  ['drawer links have high-visibility keyboard focus', navCss.includes('.kayad-mobile-menu__surface button:focus-visible')],
  ['drawer respects reduced motion', navCss.includes('@media(prefers-reduced-motion:reduce)')],
  ['drawer has an in-panel close control and unified title bar', navbar.includes('kayad-mobile-menu__topbar') && navbar.includes('aria-label="Close navigation menu"')],
  ['drawer child and workspace actions are full-width single-column rows', navCss.includes('flex-direction: column !important;') && navCss.includes('.kayad-drawer-list')],
  ['bottom dock retains five canonical actions', bottom.includes("key: 'home'") && bottom.includes("key: 'showroom'") && bottom.includes("key: 'auction'") && bottom.includes("key: 'services'") && bottom.includes("key: 'saved'")],
  ['bottom dock labels retain explicit text', bottom.includes('<span>{label}</span>')],
  ['bottom dock no longer duplicates the header menu', !bottom.includes("key: 'menu'") && bottom.includes("key: 'saved'") && bottom.includes("onNavigate('saved')")],
  ['saved dock item uses the real Heart icon and active state', bottom.includes('icon: Heart') && bottom.includes("return key === 'saved' && activeNav === 'saved'")],
  ['mobile menu destination cards remain compact instead of stretching', navCss.includes('.kayad-mobile-drawer-primary .kayad-drawer-group {') && navCss.includes('height: auto;') && navCss.includes('align-self: start;')],
  ['bottom dock uses touch-sized targets', indexCss.includes('.kayad-mobile-bottom-nav__item { min-height:48px')],
  ['bottom dock icon sizing is normalized', bottom.includes('<Icon size={23}') && indexCss.includes('.kayad-mobile-bottom-nav__icon svg')],
  ['bottom dock uses KAYAD palette', indexCss.includes('#E6F7F3') && indexCss.includes('#0B716F')],
  ['bottom dock uses semantic color-coded real icons', bottom.includes("tone: 'auction'") && indexCss.includes('.kayad-mobile-bottom-nav__item--auction') && indexCss.includes('.kayad-mobile-bottom-nav__item--services')],
  ['phone header reserves readable brand descriptor beside logo', indexCss.includes('.kayad-brand__tag--reserved { display:block!important;') && indexCss.includes('.kayad-brand > img { width:clamp(64px,19vw,92px);')],
  ['narrow header actions are compacted', navCss.includes('@media(max-width:380px)') && navCss.includes('.kayad-cta { min-height:44px')],
  ['focus ring uses theme mint', navCss.includes('outline:2px solid #8DE4DB')],
  ['navigation still derives child destinations from role-aware visibleChildren', navbar.includes('visibleChildren(item, signedIn, isRestrictedWorkspace)')],
  ['navigation configuration remains admin-controlled', navbar.includes('applyNavigationConfig(navigation)')],
  ['seller CTA remains existing authenticated navigation action', navbar.includes("handleNavSelect('seller-platform')") && navbar.includes('id="cta-sell-car"')],
  ['saved vehicles remain in canonical Marketplace list and messages remain in workspace list', navbar.includes('visibleChildren(item, signedIn, isRestrictedWorkspace)') && navbar.includes("handleNavSelect('chat')") && !/Saved Vehicles<\/button>/.test(navbar)],
  ['notifications remain reachable in the drawer', navbar.includes("navigate('/notifications')")],
  ['role-specific dealer workspace remains role-gated and unified', navbar.includes("user?.role === 'dealer'") && navbar.includes('Dealer workspace')],
  ['role-specific staff workspace remains role-gated and unified', navbar.includes('isStaffAccount &&') && navbar.includes('Admin Console')],
  ['source still contains escape and viewport cleanup hooks', navbar.includes('window.removeEventListener(\'resize\', syncDrawerViewport)')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`\nMobile navigation polish: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exitCode = 1;
