import fs from 'node:fs';

const navbar = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
const css = fs.readFileSync('src/index.css', 'utf8');
const checks = [
  ['drawer measures the sticky header bottom', /headerRef\.current\?\.getBoundingClientRect\(\)\.bottom/.test(navbar)],
  ['drawer is viewport-fixed and anchored below the header', /kayad-mobile-menu fixed inset-x-0 bottom-0/.test(navbar) && /top:\s*`\$\{mobileDrawerTop\}px`/.test(navbar)],
  ['drawer surface fills the available viewport height', /flex h-full w-full max-w-\[760px\]/.test(navbar)],
  ['drawer content has a constrained scroll region', /min-h-0 flex-1 overflow-y-auto overscroll-contain/.test(navbar)],
  ['safe-area bottom padding is preserved', /pb-\[max\(1\.5rem,env\(safe-area-inset-bottom\)\)\]/.test(navbar)],
  ['body scroll is locked while the menu is open', /kayad-mobile-menu-is-open \{ overflow: hidden !important; \}/.test(css)],
  ['existing shared drawer and focus-dialog semantics remain', /role="dialog" aria-modal="true" aria-label="KAYAD mobile navigation"/.test(navbar) && /drawer\?\.focus\(\)/.test(navbar)],
  ['orientation and resize keep the drawer aligned', /addEventListener\('orientationchange', syncDrawerViewport\)/.test(navbar) && /addEventListener\('resize', syncDrawerViewport\)/.test(navbar)],
  ['Android/iOS visual viewport height and browser-chrome changes are tracked', /window\.visualViewport/.test(navbar) && /viewport\.offsetTop \+ viewport\.height/.test(navbar) && /setMobileDrawerHeight/.test(navbar)],
  ['drawer height is explicitly constrained to the visible viewport', /height: `\$\{mobileDrawerHeight\}px`/.test(navbar)],
];
let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log(`Mobile menu viewport validation: ${checks.length}/${checks.length} PASS`);
