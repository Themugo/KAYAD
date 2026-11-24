// Route-by-route API authorisation certification over real HTTP + PostgreSQL (disposable DB). No UI, no writes, no money movement.
// Input: the endpoints each of the 53 admin routes ACTUALLY called in the browser sweep (docs/admin-console-closure/evidence/sweep/sweep.json).
//  T1 anonymous never reads a non-public endpoint      T2 personal + dealer accounts never read staff-looking endpoints
//  T3 moderator: endpoints unique to a moderator-restricted route are refused (server agrees with the UI guard)
//  T4 no 5xx for any actor on any read endpoint        T5 error bodies for non-staff/anon carry no SQL/PostgREST internals
import fs from 'node:fs';
import { makeUser, check, finish, uid, PW, B } from './lib.mjs';

const sweep = JSON.parse(fs.readFileSync(new URL('../../docs/admin-console-closure/evidence/sweep/sweep.json', import.meta.url)));
const isApi = (c) => /^GET \d+ \/api\//.test(c);
const routeEndpoints = {}; const modAllowed = new Set(); const modRestricted = new Set();
for (const r of sweep) {
  if (r.who === 'superadmin' && r.width === 1440) routeEndpoints[r.route] = [...new Set((r.apiCalls || []).filter(isApi).map((c) => c.split(' ')[2]))];
  if (r.who === 'moderator' && r.width === 1440) (r.restricted ? modRestricted : modAllowed).add(r.route);
}
const skip = /\/auth\/|\/csrf|\/public\//;
const all = [...new Set(Object.values(routeEndpoints).flat())].filter((p) => !skip.test(p) && !/\/[0-9a-f]{8}-[0-9a-f]{4}-/.test(p));
const usedByModAllowed = new Set([...modAllowed].flatMap((r) => routeEndpoints[r] || []));
// Documented owner decision OD-5 (stage5f5RoleRouteMatrix): read-only aggregate feeds stay open to any staff role. Listed, not hidden.
// OD-1: /api/admin/system/health now requires view_system_health (Super Admin or an individual grant); no staff-wide exceptions remain.
const DOCUMENTED_STAFF_WIDE = new Set();
const uniqueToRestricted = [...modRestricted].flatMap((r) => (routeEndpoints[r] || []).filter((p) => !usedByModAllowed.has(p) && !skip.test(p) && !DOCUMENTED_STAFF_WIDE.has(p)).map((p) => [r, p]));

const mk = (role) => makeUser({ tag: role.slice(0, 5) + '32', dbRole: role });
const A = { moderator: await mk('moderator'), admin: await mk('admin') };
A.personal = await makeUser({ tag: 'per32' });
A.dealer = await makeUser({ tag: 'dlr32', role: 'dealer', extra: { businessName: `Authz ${uid()} Motors`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
const staffLooking = /\/admin\b|security|owner|panic|recover|staff|\/config|webhoist|governance|control|command|intelligence|improvement|factory|integration|provider/i;
const SQLISH = /relation "|syntax error|PGRST|pg_catalog|violates|column .* does not exist|SELECT .* FROM/i;

const anon = async (p) => { const r = await fetch(B + p); return { status: r.status, text: await r.text().catch(() => '') }; };
const as = async (who, p) => { const r = await A[who].raw(p); return { status: r.status, text: JSON.stringify(r.j ?? '') }; };

console.log(`# endpoints under test: ${all.length}; moderator-restricted routes: ${modRestricted.size}; unique-to-restricted endpoints: ${uniqueToRestricted.length}`);
const pub = [], t1bad = [], t2bad = [], t4bad = [], t5bad = [], shared = [];
for (const p of all) {
  const a = await anon(p); const per = await as('personal', p); const dl = await as('dealer', p);
  if (a.status === 200) pub.push(p);
  if (a.status >= 500 || per.status >= 500 || dl.status >= 500) t4bad.push([p, a.status, per.status, dl.status]);
  if (a.status === 200 && staffLooking.test(p)) t1bad.push(p);
  for (const [w, r] of [['personal', per], ['dealer', dl]]) {
    if (r.status === 200 && staffLooking.test(p)) t2bad.push([w, p]);
    if (r.status === 200 && !staffLooking.test(p)) shared.push(`${w} ${p}`);
  }
  for (const r of [a, per, dl]) if (r.status >= 400 && SQLISH.test(r.text)) t5bad.push([p, r.status]);
}
check(`T1 anonymous reads no staff endpoint (${all.length} endpoints; ${pub.length} publicly readable, none staff-looking)`, t1bad.length === 0, t1bad);
check('T2 personal and dealer accounts read no staff endpoint', t2bad.length === 0, t2bad);
let t3bad = [];
for (const [route, p] of uniqueToRestricted) { const m = await as('moderator', p); if (m.status === 200) t3bad.push([route, p, m.status]); }
check(`T3 moderator is refused on every endpoint unique to a moderator-restricted route (${uniqueToRestricted.length} endpoints; documented OD-5 exceptions: ${[...DOCUMENTED_STAFF_WIDE].join(', ')})`, t3bad.length === 0, t3bad);
const adminPaths = []; for (const p of all) { const r = await as('admin', p); if (r.status >= 500) adminPaths.push([p, r.status]); const m = await as('moderator', p); if (m.status >= 500) adminPaths.push(['moderator', p, m.status]); }
check('T4 no 5xx for anonymous/personal/dealer/admin/moderator on any route read endpoint (provisioning 503 counted separately)', t4bad.filter((x) => x.slice(1).some((s) => s >= 500 && s !== 503)).length === 0 && adminPaths.filter((x) => x[x.length - 1] !== 503).length === 0, { t4bad, adminPaths });
check('T5 4xx/5xx bodies for anonymous/personal/dealer carry no SQL or PostgREST internals', t5bad.length === 0, t5bad);
console.log(`# info: authenticated-shared endpoints (readable by any signed-in user, non-staff-looking): ${[...new Set(shared)].length}`);
fs.writeFileSync(process.env.KAYAD_CI_OUT ? `${process.env.KAYAD_CI_OUT}/32_route_api_authorization.summary.json` : '/tmp/32_summary.json', JSON.stringify({ endpoints: all.length, publicReadable: pub, shared: [...new Set(shared)], uniqueToRestricted, t3bad, t4bad }, null, 1));
finish('32_route_api_authorization');
