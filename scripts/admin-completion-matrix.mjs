// Generates docs/handover/ADMIN-CONSOLE-COMPLETION-20261124/53-ROUTE-AUDIT-MATRIX.md from the route registry, permission tables, the browser sweep
// evidence and scripts/admin-completion-notes.json (hand-written findings, each citing the journey/test that evidences it).
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const surface = read('src/components/admin/AdminRouteSurface.tsx');
const perms = read('src/utils/permissions.ts');
const sweep = JSON.parse(read('reports/ADMIN-CONSOLE/evidence/sweep/sweep.json'));
const notes = JSON.parse(read('scripts/admin-completion-notes.json'));
const pageMap = Object.fromEntries([...perms.matchAll(/"(\/admin\/[a-z-]+)":\s+PERM\.([A-Z_]+)/g)].map((m) => [m[1], m[2]]));
const superOnly = new Set([...perms.matchAll(/SUPERADMIN_ONLY = new Set\(\[([\s\S]*?)\]\)/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])));
const comp = Object.fromEntries([...surface.matchAll(/'((?:\/admin)[^']*)': \{ component: (\w+)(?:, superadminOnly: true)? \}/g)].map((m) => [m[1], m[2]]));
const routeSuper = new Set([...surface.matchAll(/'((?:\/admin)[^']*)': \{ component: \w+, superadminOnly: true \}/g)].map((m) => m[1]));
const row = (who, route, w = 1440) => sweep.find((r) => r.who === who && r.route === route && r.width === w);
const routes = ['/admin', ...Object.keys(comp)];
const missing = routes.filter((r) => !notes[r]); if (missing.length) throw new Error('no notes for ' + missing.join(', '));
const L = ['# 53-route audit matrix (2026-11-24, completion phase)', '',
  `Generated from the route registry (${routes.length} routes), the permission tables, the browser sweep \`reports/ADMIN-CONSOLE/evidence/sweep/sweep.json\` and \`scripts/admin-completion-notes.json\`.`,
  '**Opened** and **data loaded** come from the browser sweep (Super Admin and moderator, 1440px and 390px, disposable local stack). **Actions tested** and **workflow verified** come ONLY from the named journey/test; a page that merely opens is never marked verified. "Failed API" lists calls that returned an error status while the page was open (503 = honestly reported "not provisioned").', '',
  'State vocabulary: Fixed and verified / Fixed but not yet verified / Existing and confirmed correct / Intentionally unavailable / Blocked by missing external dependency / Not verified / Requires separate owner decision.', '',
  '| # | Route | Component | Gate (UI mirror; server authoritative) | Opened SA / moderator | Data loaded (SA) | Mobile 390 overflow | Actions tested | Workflow verified | State | Evidence | Notes |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
const tally = {}; let i = 0;
for (const route of routes) {
  const sa = row('superadmin', route), mo = row('moderator', route), mob = row('superadmin', route, 390), n = notes[route];
  const gate = superOnly.has(route) || routeSuper.has(route) ? 'Super Admin only' : pageMap[route] ? `permission ${pageMap[route]}` : route === '/admin' ? 'any platform staff' : 'any platform staff (page-level)';
  const opened = `${sa ? (sa.errorBoundary ? 'ERROR BOUNDARY' : sa.restricted ? 'denied' : 'yes') : 'n/a'} / ${mo ? (mo.restricted ? 'denied (correct)' : 'yes') : 'n/a'}`;
  const failed = sa?.failedApi || [];
  const loaded = !sa ? 'n/a' : failed.length ? `no: ${failed.map((f) => f.split(' ')[0]).join(',')} ${failed.map((f) => f.split(' ').slice(1).join(' ')).join('; ')}` : 'yes (no failed API call)';
  tally[n.state] = (tally[n.state] || 0) + 1;
  L.push(`| ${++i} | \`${route}\` | ${route === '/admin' ? 'AdminView' : comp[route]} | ${gate} | ${opened} | ${loaded.replace(/\|/g, '/')} | ${mob?.overflow ? 'YES' : 'no'} | ${n.actions} | ${n.wf} | ${n.state} | ${n.ev} | ${n.note} |`);
}
L.push('', '## Totals by state', '', '| State | Routes |', '|---|---|', ...Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`), '');
const verified = routes.filter((r) => /^VERIFIED/.test(notes[r].wf)).length;
L.push(`Routes with a workflow VERIFIED by a journey or test: **${verified} of ${routes.length}**. All others are explicitly PARTIAL, intentionally unavailable, or NOT VERIFIED.`, '');
fs.mkdirSync(new URL('docs/handover/ADMIN-CONSOLE-COMPLETION-20261124/', root), { recursive: true });
fs.writeFileSync(new URL('docs/handover/ADMIN-CONSOLE-COMPLETION-20261124/53-ROUTE-AUDIT-MATRIX.md', root), L.join('\n') + '\n');
console.log('rows', routes.length, 'verified', verified, JSON.stringify(tally));
