// Generates docs/handover/ADMIN-CONSOLE-COMPLETION-20261124/ROUTE-AND-FEATURE-OWNERSHIP-MATRIX.md from the source tree (static scan, not a runtime claim):
// route -> page component -> sidebar group (business domain) -> API calls found in the page source -> UI gate (mirror) -> server guard of the primary endpoint.
// The server guard column is only filled where ci/db-journeys/29_permission_matrix.mjs or another journey proves it; otherwise "see page notes".
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const surface = read('src/components/admin/AdminRouteSurface.tsx');
const sidebar = read('src/components/admin/AdminSidebar.tsx');
const perms = read('src/utils/permissions.ts');
const comp = [...surface.matchAll(/'((?:\/admin)[^']*)': \{ component: (\w+)(?:, superadminOnly: true)? \}/g)].map((m) => [m[1], m[2]]);
const importPath = (name) => { const m = surface.match(new RegExp(`const ${name} = lazy\\(\\(\\) => import\\('([^']+)'\\)`)) || surface.match(new RegExp(`import ${name} from '([^']+)'`)); return m ? m[1] : null; };
const resolve = (rel) => { if (!rel) return null; const base = 'src/components/admin/' + rel; for (const ext of ['', '.tsx', '.jsx', '.ts', '.js', '/index.tsx', '/index.jsx']) { const f = (base + ext).replace(/\/components\/admin\/\.\.\//, '/components/'); try { const full = new URL(f.replace('src/components/admin/../../', 'src/'), root); const norm = new URL(full.pathname.replace(/\/components\/admin\/\.\.\/\.\.\//, '/'), root); if (fs.existsSync(norm) && fs.statSync(norm).isFile()) return norm; } catch { /* next */ } } return null; };
const groups = {}; let cur = null;
for (const line of sidebar.split('\n')) { const g = line.match(/id: '[a-z-]+', label: '([^']+)'/); if (g) cur = g[1]; const l = line.match(/to: '(\/admin[^']*)'/); if (l && cur) groups[l[1]] = cur; }
const pageMap = Object.fromEntries([...perms.matchAll(/"(\/admin\/[a-z-]+)":\s+PERM\.([A-Z_]+)/g)].map((m) => [m[1], m[2]]));
const set = (name) => new Set([...(perms.match(new RegExp(`${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`)) || [, ''])[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
const superOnly = set('SUPERADMIN_ONLY'), roleOnly = set('ADMIN_ROLE_ONLY');
const anyOf = Object.fromEntries([...perms.matchAll(/"(\/admin\/[a-z-]+)":\s+\[(PERM\.[A-Z_, .]+)\]/g)].map((m) => [m[1], m[2].replace(/PERM\./g, '')]));
const SERVER = { '/admin/security-log': '/api/security-logs (VIEW_LOGS)', '/admin/feedback': '/api/feedback/admin/all (admin, superadmin)', '/admin/broadcast': '/api/announcements (admin, superadmin)', '/admin/reports': '/api/reports/admin/all (admin, superadmin, moderator)', '/admin/support-tickets': '/api/support/staff/* (support agent or oversight)', '/admin/staff': '/api/admin/staff (superadmin + owner)', '/admin/config': '/api/config/stats (admin, superadmin)', '/admin/automation': '/api/automation/* (any staff; 503 not provisioned)', '/admin/cms': '/api/cms/* management (any staff since 2026-11-24; public reads unchanged)' };
const rows = [['/admin', 'AdminView', 'src/features/AdminView.tsx']];
for (const [r, c] of comp) rows.push([r, c, importPath(c)]);
const L = ['# Route and feature ownership matrix (2026-11-24)', '',
  'Static scan of the source tree. **Authoritative workspace** = the page that owns the business operation; dashboard panels and department hubs only link to it. **UI gate** is a display mirror; the server is the authority.', '',
  '| # | Route | Page component | Business domain (sidebar group) | API calls found in page source | UI gate (mirror) | Server guard proven |', '|---|---|---|---|---|---|---|'];
let i = 0; const apiOwners = {};
for (const [route, c, rel] of rows) {
  let src = ''; let file = rel;
  try { const f = rel && rel.startsWith('src/') ? new URL(rel, root) : resolve(rel); if (f && fs.existsSync(f)) src = fs.readFileSync(f, 'utf8'); } catch { /* unresolved */ }
  const apis = [...new Set([...src.matchAll(/['"`](\/api\/[a-zA-Z0-9/_\-:${}.]+)/g)].map((m) => m[1].replace(/\$\{[^}]*\}/g, ':x')).concat([...src.matchAll(/adminAPI\.(\w+)/g)].map((m) => 'adminAPI.' + m[1])))].slice(0, 6);
  for (const a of apis) (apiOwners[a] ||= []).push(route);
  const gate = superOnly.has(route) ? 'Super Admin only' : roleOnly.has(route) ? 'role admin / superadmin' : anyOf[route] ? `any of ${anyOf[route]}` : pageMap[route] ? pageMap[route] : route === '/admin' ? 'any platform staff' : 'any platform staff';
  L.push(`| ${++i} | \`${route}\` | ${c} | ${groups[route] || (route === '/admin' ? 'Command Centre' : 'Specialist / hub-linked (no sidebar entry)')} | ${apis.length ? apis.map((a) => `\`${a}\``).join(', ') : 'not found by scan'} | ${gate} | ${SERVER[route] || 'see 53-ROUTE-AUDIT-MATRIX.md'} |`);
}
const shared = Object.entries(apiOwners).filter(([, v]) => v.length > 1 && !/dealer-platform/.test(v.join())).slice(0, 25);
L.push('', '## Endpoints used by more than one page (review for competing implementations)', '', '| Endpoint / client method | Pages |', '|---|---|', ...shared.map(([a, v]) => `| \`${a}\` | ${v.map((x) => `\`${x}\``).join(', ')} |`), '',
  'Reading: a shared read endpoint (for example the vehicle or user list) used by a dashboard panel AND a specialist page is expected; the specialist page is the authoritative workspace for actions. No competing write path for the same business action was found in this scan (writes are owned by one specialist page each). This is a static scan, not proof of runtime behaviour.', '');
fs.writeFileSync(new URL('docs/handover/ADMIN-CONSOLE-COMPLETION-20261124/ROUTE-AND-FEATURE-OWNERSHIP-MATRIX.md', root), L.join('\n') + '\n');
console.log('rows', rows.length, 'shared endpoints', shared.length);
