import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const layout = read('../src/components/admin/AdminLayout.tsx');
const sidebar = read('../src/components/admin/AdminSidebar.tsx');
const shellCss = read('../src/styles/kayad-admin-shell.css');
const dashboardCss = read('../src/features/admin-command-centre.css');

const checks = [
  ['document is the single vertical scroll owner', layout.includes('scrollPositions.current.set(activeKey.current, window.scrollY)') && !layout.includes('contentRef.current.scrollTop') && shellCss.includes('.kayad-admin-shell__content {') && shellCss.includes('overflow: visible;')],
  ['scroll restoration preserves per-history-entry positions', layout.includes("navigationType === 'POP'") && layout.includes('window.scrollTo({ top: target')],
  ['drawer navigation has bounded flex sizing', shellCss.includes('min-height: 0;') && shellCss.includes('flex: 1 1 0%;') && shellCss.includes('overflow-y: auto;')],
  ['drawer supports touch and contained overscroll', shellCss.includes('-webkit-overflow-scrolling: touch;') && shellCss.includes('overscroll-behavior-y: contain;') && shellCss.includes('touch-action: pan-y;')],
  ['footer remains pinned and safe-area aware', shellCss.includes('.admin-sidebar__footer') && shellCss.includes('flex: 0 0 auto;') && shellCss.includes('env(safe-area-inset-bottom)')],
  ['body scroll lock restores previous inline value', layout.includes('previousBodyOverflow') && layout.includes('document.body.style.overflow = previousBodyOverflow')],
  ['background is inert while drawer is open', layout.includes("main.setAttribute('inert', '')")],
  ['drawer traps keyboard focus and supports Escape', layout.includes("event.key === 'Escape'") && layout.includes("event.key !== 'Tab'") && layout.includes('last.focus()') && layout.includes('first.focus()') && layout.includes('sidebarToggleRef.current?.focus({ preventScroll: true })')],
  ['drawer exposes modal semantics when open', sidebar.includes("role={mobileOpen ? 'dialog' : undefined}") && sidebar.includes('aria-modal={mobileOpen ? true : undefined}')],
  ['mobile dashboard hero is compact', dashboardCss.includes('Mobile command-centre refinement') && dashboardCss.includes('min-height: 0;') && dashboardCss.includes('padding: 15px;')],
  ['mobile quick actions remain two-column and KPI spacing tightens', dashboardCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr))') && dashboardCss.includes('min-height: 72px;')],
  ['existing route and permission calculation is preserved', sidebar.includes('roleLinks(user)') && sidebar.includes('PAGE_PERMISSIONS') && sidebar.includes('SUPERADMIN_ONLY') && sidebar.includes('NAVIGATION_GROUPS')],
];

let passed = 0;
for (const [label, ok] of checks) {
  assert.ok(ok, label);
  passed += 1;
  console.log(`PASS ${label}`);
}
console.log(`\n${passed}/${checks.length} admin mobile shell checks passed.`);
