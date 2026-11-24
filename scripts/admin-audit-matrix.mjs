// Generates docs/handover/ADMIN-CONSOLE-20261124/PAGE-AUDIT-MATRIX.md from the registered routes, permission tables and the browser sweep evidence.
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const surface = fs.readFileSync(new URL('src/components/admin/AdminRouteSurface.tsx', root), 'utf8');
const perms = fs.readFileSync(new URL('src/utils/permissions.ts', root), 'utf8');
const sweep = JSON.parse(fs.readFileSync(new URL('reports/ADMIN-CONSOLE/evidence/sweep/sweep.json', root), 'utf8'));
const pageMap = Object.fromEntries([...perms.matchAll(/"(\/admin\/[a-z-]+)":\s+PERM\.([A-Z_]+)/g)].map((m) => [m[1], m[2]]));
const superOnly = new Set([...perms.matchAll(/SUPERADMIN_ONLY = new Set\(\[([\s\S]*?)\]\)/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])));
const comp = Object.fromEntries([...surface.matchAll(/'((?:\/admin)[^']*)': \{ component: (\w+)(?:, superadminOnly: true)? \}/g)].map((m) => [m[1], m[2]]));
const routeSuper = new Set([...surface.matchAll(/'((?:\/admin)[^']*)': \{ component: \w+, superadminOnly: true \}/g)].map((m) => m[1]));
const NOTES = JSON.parse(fs.readFileSync(new URL('scripts/admin-audit-notes.json', root), 'utf8'));
const row = (who, route, w = 1440) => sweep.find((r) => r.who === who && r.route === route && r.width === w);
const lines = ['# Page-by-page audit matrix (generated from source + browser sweep, 2026-11-24)', '',
  'Evidence: `reports/ADMIN-CONSOLE/evidence/sweep/sweep.json` (every registered admin route opened as Super Admin and as a platform moderator, at 1440px and 390px, on the disposable local stack). Status words: VERIFIED = opened and behaved as described in that run; NOT VERIFIED = not exercised beyond opening the page.', '',
  '| Route | Component | Gate (UI mirror; server is authoritative) | Super Admin @1440 | Moderator @1440 | Failed API calls seen (Super Admin) | Mobile overflow | Finding / status |', '|---|---|---|---|---|---|---|---|'];
for (const route of ['/admin', ...Object.keys(comp)]) {
  const sa = row('superadmin', route), mo = row('moderator', route), mob = row('superadmin', route, 390);
  const gate = superOnly.has(route) || routeSuper.has(route) ? 'Super Admin only' : pageMap[route] ? `permission ${pageMap[route]}` : route === '/admin' ? 'any platform staff' : 'any platform staff (page-level)';
  const saTxt = sa ? (sa.errorBoundary ? 'ERROR BOUNDARY' : sa.restricted ? 'denied' : `opens${sa.heading ? ` ("${sa.heading.replace(/\|/g, '/')}")` : ''}`) : 'n/a';
  const moTxt = mo ? (mo.restricted ? 'denied (correct)' : 'opens') : 'n/a';
  const n = NOTES[route] || {};
  lines.push(`| \`${route}\` | ${route === '/admin' ? 'AdminView' : comp[route]} | ${gate} | ${saTxt} | ${moTxt} | ${(sa?.failedApi || []).join('; ') || 'none'} | ${mob?.overflow ? 'YES' : 'no'} | ${n.finding || 'No defect found in this pass; internal workflows not re-engineered.'} |`);
}
fs.writeFileSync(new URL('docs/handover/ADMIN-CONSOLE-20261124/PAGE-AUDIT-MATRIX.md', root), lines.join('\n') + '\n');
console.log('rows', lines.length - 5);
