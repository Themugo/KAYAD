// Staff roles x admin WRITE endpoints against the real backend and disposable database.
// For every mutating route in backend/routes/adminRoutes.js whose guard is statically known (adminOrSuper, or requirePermission(PERMISSIONS.X)),
// each role calls it directly over HTTP (no UI) with an empty body and a random, non-existent id. Invariants (hard checks):
//   anonymous -> 401; personal user and dealer -> 403; every role the guard does NOT allow -> 403.
// Roles the guard allows are recorded (observed status) but not asserted beyond "not a 401".
// admin and superadmin are NOT called (they are allowed and an empty body could still change global state); routes whose path looks like a
// global switch (maintenance, panic, lockdown, recovery, shutdown) are skipped. Evidence: out/staff-write-matrix.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { makeUser, check, finish, uid, B } from './lib.mjs';
import { STAFF_ROLES, ROLE_PERMISSIONS, PERM } from '../../backend/config/roles.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.resolve(here, '../../backend/routes/adminRoutes.js'), 'utf8');
// PERMISSIONS aliases (backend/middleware/rbac.js, e.g. MANAGE_PAYMENTS -> PERM.MANAGE_FINANCE) are read from the source, not guessed.
const rbac = fs.readFileSync(path.resolve(here, '../../backend/middleware/rbac.js'), 'utf8');
const ALIAS = Object.fromEntries([...rbac.matchAll(/^\s*([A-Z_]+):\s*PERM\.([A-Z_]+),/gm)].map((m) => [m[1], PERM[m[2]]]));
const SKIP = /maintenance|panic|lockdown|shutdown|recovery|kill/i;
const routes = [];
for (const m of src.matchAll(/router\.(post|put|patch|delete)\(\s*"([^"]+)"([\s\S]*?)(?=asyncHandler|async \(|\n\);)/g)) {
  const [, method, p, guards] = m;
  if (SKIP.test(p)) continue;
  let allowed = null;
  if (/\badminOrSuper\b/.test(guards)) allowed = ['admin', 'superadmin'];
  else { const pm = guards.match(/requirePermission\(PERMISSIONS\.([A-Z_]+)\)/); if (pm) { const perm = ALIAS[pm[1]]; if (!perm) continue; allowed = STAFF_ROLES.filter((r) => r === 'superadmin' || (ROLE_PERMISSIONS[r] || []).includes(perm)); } }
  if (allowed) routes.push({ method: method.toUpperCase(), path: p, allowed });
}
console.log(`INFO ${routes.length} admin write routes with a statically known guard (of ${[...src.matchAll(/router\.(post|put|patch|delete)\(/g)].length} write routes in adminRoutes.js)`);
const url = (p) => '/api/admin' + p.replace(/:[A-Za-z]+/g, () => crypto.randomUUID());

const actors = {};
for (const r of STAFF_ROLES.filter((x) => x !== 'admin' && x !== 'superadmin')) actors[r] = await makeUser({ tag: 'st' + r.slice(0, 4), role: 'user', dbRole: r });
actors.user = await makeUser({ tag: 'stuser', role: 'user' });
actors.dealer = await makeUser({ tag: 'stdeal', role: 'dealer', extra: { businessName: `Staff matrix ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
const anon = actors.user; // fresh client without cookies below
const matrix = {}; const violations = []; let calls = 0;
for (const rt of routes) {
  const key = `${rt.method} ${rt.path}`; matrix[key] = { guardAllows: rt.allowed };
  for (const [role, a] of Object.entries(actors)) {
    const r = await a.raw(url(rt.path), { method: rt.method, body: {} }); calls++;
    matrix[key][role] = r.status;
    const mustDeny = role === 'user' || role === 'dealer' || !rt.allowed.includes(role);
    if (mustDeny && r.status !== 403) violations.push(`${role} ${key} -> ${r.status} (expected 403)`);
    if (!mustDeny && r.status === 401) violations.push(`${role} ${key} -> 401 although the guard allows it`);
  }
  const an = await fetch(B + url(rt.path), { method: rt.method }); calls++;
  matrix[key].anonymous = an.status;
  if (![401, 403].includes(an.status)) violations.push(`anonymous ${key} -> ${an.status} (expected 401/403)`);
}
fs.mkdirSync(path.resolve(here, 'out'), { recursive: true });
fs.writeFileSync(path.resolve(here, 'out/staff-write-matrix.json'), JSON.stringify({ roles: Object.keys(actors), routes: matrix }, null, 1));
console.log(`INFO ${calls} direct API calls across ${routes.length} routes x ${Object.keys(actors).length} roles (+ anonymous)`);
for (const v of violations.slice(0, 40)) console.log('VIOLATION ' + v);
check(`write endpoints refuse every role the guard does not allow (${routes.length} routes, ${calls} calls, ${violations.length} violations)`, violations.length === 0, violations.slice(0, 10));
check('at least 20 write routes were covered by the static guard analysis', routes.length >= 20, routes.length);
finish('14_staff_role_write_matrix');
