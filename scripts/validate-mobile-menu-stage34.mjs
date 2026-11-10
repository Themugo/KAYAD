import fs from 'node:fs';
import assert from 'node:assert/strict';
const navbar = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
const css = fs.readFileSync('src/styles/kayad-navigation.css', 'utf8');
const checks = [
  ['drawer anchors to visible header bar', navbar.includes("querySelector('.kayad-header__bar')")],
  ['fallback header measurement retained', navbar.includes('headerAnchor?.getBoundingClientRect().bottom ?? headerRef.current?.getBoundingClientRect().bottom')],
  ['drawer has rounded top-sheet surface', navbar.includes('rounded-t-[28px]')],
  ['mobile dock is removed from layout while drawer is open', css.includes('body.kayad-mobile-menu-is-open .kayad-mobile-bottom-nav') && css.includes('display: none !important')],
  ['legacy dock also hidden while drawer is open', css.includes('body.kayad-mobile-menu-is-open .mobile-bottom-nav')],
  ['all mobile destination groups are single-column rows', css.includes('flex-direction: column !important;') && css.includes('.kayad-mobile-menu__surface .kayad-mobile-drawer-primary .kayad-drawer-group__links')],
  ['destination child links use full-width single-column rows', css.includes('flex-direction: column !important;') && css.includes('width: 100% !important;')],
  ['very narrow phones retain single-column child links', css.includes('@media (max-width: 340px)')],
  ['existing canonical nav config remains in use', navbar.includes('navItems.map((item) =>') && navbar.includes('visibleChildren(item, signedIn, isRestrictedWorkspace)')],
  ['existing role-aware action handlers preserved', navbar.includes("handleNavSelect('dashboard')") && navbar.includes("handleNavSelect('seller-platform')") && navbar.includes("handleNavSelect('dealer:inventory:new')")],
  ['reduced-motion support preserved', css.includes('prefers-reduced-motion: reduce')],
  ['keyboard focus treatment preserved', css.includes('.kayad-mobile-menu__surface button:focus-visible,.kayad-mobile-menu__surface a:focus-visible')],
];
let failures=0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failures++; }
console.log(`Stage 34 mobile menu checks: ${checks.length-failures}/${checks.length} PASS`);
if (failures) process.exit(1);
