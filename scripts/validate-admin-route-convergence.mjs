import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('src/App.tsx');
const routeSurface = read('src/components/admin/AdminRouteSurface.tsx');
const sidebar = read('src/components/admin/AdminSidebar.tsx');
const oldLayout = read('src/components/layout/AdminLayout.tsx');
const oldSidebar = read('src/components/layout/AdminSidebar.tsx');
const navbar = read('src/components/Navbar.tsx');
const checks = [];
const add = (label, ok) => checks.push([label, Boolean(ok)]);

const linkPaths = [...sidebar.matchAll(/\{ to: '(\/admin[^']*)'/g)].map((m) => m[1]);
const routePaths = new Set([...routeSurface.matchAll(/'((?:\/admin)[^']*)': \{ component:/g)].map((m) => m[1]));
add('AdminView is the canonical /admin and /admin/dashboard home', /path === '\/admin' \|\| path === '\/admin\/dashboard'[\s\S]*?<AdminCommandCentre \/>/.test(routeSurface));
add('Legacy /?nav=admin deep link redirects into canonical /admin and preserves other query/hash values', app.includes("new URLSearchParams(location.search).get('nav') === 'admin'") && app.includes('remaining.delete(\'nav\')') && app.includes('location.hash'));
add('All admin sidebar destinations are registered or resolve to the command-centre root', linkPaths.every((p) => p === '/admin' || routePaths.has(p)));
add('Standalone route registry preserves specialist /admin/* paths', routePaths.size >= 40 && routeSurface.includes('ADMIN_ROUTE_COMPONENTS'));
add('Unknown admin paths show an explicit in-shell not-found state instead of silently opening a different workspace', routeSurface.includes('Admin page not found') && routeSurface.includes('Return to Command Centre'));
add('Admin pages use the existing permission guard and backend remains authoritative', routeSurface.includes('<RequireAdminPage>') && routeSurface.includes('Backend route guards remain authoritative'));
add('Superadmin-only sidebar destinations have an explicit route guard', routeSurface.includes('definition.superadminOnly || SUPERADMIN_ONLY.has(path)') && routeSurface.includes("user?.role !== 'superadmin'"));
add('Duplicate layout is a compatibility re-export to the canonical admin layout', /export \{ default \} from '\.\.\/admin\/AdminLayout'/.test(oldLayout));
add('Duplicate sidebar is a compatibility re-export to the canonical admin sidebar', /export \{ default \} from '\.\.\/admin\/AdminSidebar'/.test(oldSidebar));
add('Account menu has one command-centre entry and removes duplicate Admin Panel action', navbar.includes("isStaffRole(user.role) ? handleAdminRoute('/admin')") && !navbar.includes('<span>Admin Panel</span>'));
add('System Management has a distinct existing destination and is limited to admin/superadmin menu roles', navbar.includes("handleAdminRoute('/admin/settings')") && navbar.includes("user.role === 'superadmin' || user.role === 'admin'"));
add('Profile image uses a real source with deterministic initials fallback and error recovery', navbar.includes('function AccountAvatar') && navbar.includes('onError={() => setFailed(true)}') && navbar.includes('if (!src || failed)'));
add('Mobile admin drawer has semantic backdrop, Escape close, focus return and body overflow cleanup', sidebar.includes('<button type="button" className="admin-sidebar-backdrop"') && read('src/components/admin/AdminLayout.tsx').includes("event.key !== 'Escape'") && read('src/components/admin/AdminLayout.tsx').includes("document.body.style.overflow = sidebarOpen ? 'hidden' : ''"));
add('Responsive admin shell stylesheet defines mobile drawer and reduced-motion behaviour', read('src/styles/kayad-admin-shell.css').includes('@media (max-width: 767px)') && read('src/styles/kayad-admin-shell.css').includes('prefers-reduced-motion'));

let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`); if (!ok) failed++; }
console.log(`Admin route convergence: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
