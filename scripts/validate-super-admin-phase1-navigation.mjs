import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const sidebar = read('src/components/admin/AdminSidebar.tsx');
const layout = read('src/components/admin/AdminLayout.tsx');
const styles = read('src/styles/kayad-admin-shell.css');
const permissions = read('src/utils/permissions.ts');
const compatibilityLayout = read('src/components/layout/AdminLayout.tsx');
const compatibilitySidebar = read('src/components/layout/AdminSidebar.tsx');
const packageJson = JSON.parse(read('package.json'));
const checks = [];
const add = (label, passed) => checks.push([label, Boolean(passed)]);

const expectedPaths = [
  '/admin', '/admin/users', '/admin/sellers', '/admin/cars', '/admin/moderation',
  '/admin/auctions', '/admin/bids', '/admin/escrows', '/admin/reviews', '/admin/referrals',
  '/admin/chats', '/admin/reports', '/admin/support-tickets', '/admin/feedback',
  '/admin/market-data', '/admin/transactions', '/admin/ntsa-queue', '/admin/inspections',
  '/admin/dealer-verifications', '/admin/inspector-applications', '/admin/security-log',
  '/admin/ads', '/admin/broadcast', '/admin/settings', '/admin/control-room',
  '/admin/staff', '/admin/staff-permissions', '/admin/panic-room', '/admin/webhoist',
];
const actualPaths = [...sidebar.matchAll(/\{ to: '(\/admin[^']*)'/g)].map(match => match[1]);
const routeSurface = read('src/components/admin/AdminRouteSurface.tsx');
const registeredPaths = new Set([...routeSurface.matchAll(/'((?:\/admin)[^']*)': \{ component:/g)].map(match => match[1]));
add('All 29 established sidebar destinations remain present exactly once', actualPaths.length === expectedPaths.length && new Set(actualPaths).size === expectedPaths.length && expectedPaths.every(path => actualPaths.includes(path)));
add('Every sidebar destination remains registered or resolves to the canonical command centre', actualPaths.every(path => path === '/admin' || registeredPaths.has(path)));
add('Four approved visual navigation groups are present', ['Command Centre', 'Business Operations', 'Business Management', 'System Administration'].every(label => sidebar.includes(`label: '${label}'`)));
add('Expandable groups expose aria-expanded and aria-controls', sidebar.includes('aria-expanded={isExpanded}') && sidebar.includes('aria-controls={`admin-nav-group-${group.id}`}'));
add('Current route group is expanded and nested routes are recognized', sidebar.includes('location.pathname.startsWith(`${link.to}/`)') && sidebar.includes('setExpandedGroups(current => ({ ...current, [activeGroup.id]: true }))'));
add('Existing role/permission filtering and super-admin-only protections remain wired', sidebar.includes('getEffectivePermissions') && sidebar.includes('PAGE_PERMISSIONS') && sidebar.includes('SUPERADMIN_ONLY.has(link.to)') && permissions.includes('export const PAGE_PERMISSIONS') && permissions.includes('export const SUPERADMIN_ONLY'));
add('Unread alert count remains sourced from the existing alerts API', sidebar.includes("adminAPI.alerts({ limit: 1, read: 'false' })") && sidebar.includes('data.unreadCount'));
add('Mobile drawer includes labelled backdrop and Escape/focus/body-scroll handling', sidebar.includes('className="admin-sidebar-backdrop"') && layout.includes("if (event.key !== 'Escape') return") && layout.includes("document.body.style.overflow = sidebarOpen ? 'hidden' : ''") && layout.includes('sidebarToggleRef.current?.focus()'));
add('Header identity and role are derived from authenticated user context', layout.includes('const { user, isAuth, loading, sessionStatus } = useAuth()') && layout.includes('user?.name?.trim()') && layout.includes('ROLE_LABELS[user?.role || \'\']'));
add('Responsive and reduced-motion styles remain defined', styles.includes('@media (max-width: 767px)') && styles.includes('@media (prefers-reduced-motion: reduce)'));
add('Compatibility layout/sidebar files remain re-exports of canonical components', compatibilityLayout.includes("from '../admin/AdminLayout'") && compatibilitySidebar.includes("from '../admin/AdminSidebar'"));
add('No new icon dependency was introduced', !packageJson.dependencies?.['@fortawesome/react-fontawesome'] && !packageJson.dependencies?.['@heroicons/react']);

let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${label}`);
  if (!passed) failed++;
}
console.log(`Super Admin Phase 1 navigation validation: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
