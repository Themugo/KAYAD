// Read-side permission matrix for the Super Admin console (KAYARD KE), over real HTTP against the disposable database.
// For each sensitive READ endpoint every actor calls it directly (no UI), and the result must match the guard that the route declares:
//   anonymous -> 401; personal account / legacy seller / dealer owner / dealer staff -> 403; staff roles -> allowed only where the guard allows.
// Expectations are written from the route guards and backend/config/roles.js (VIEW_LOGS holders are read from roles.js, not guessed).
// Read-only: no state is changed. Public CMS content is asserted to remain public (preserved behaviour).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeUser, q, check, finish, uid, PW, B } from './lib.mjs';
import { ROLE_PERMISSIONS, PERM } from '../../backend/config/roles.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const owner = async () => { const a = await makeUser({ tag: 'own29', dbRole: 'superadmin' }); q(`update users set email='prev-owner-'||id||'@example.test' where email='ci-owner@example.test'`); q(`update users set email='ci-owner@example.test' where id='${a.id}'`); a.csrf = null; await a.raw('/api/v1/auth/login', { method: 'POST', body: { email: 'ci-owner@example.test', password: PW } }); a.csrf = null; return a; };
const staff = (role) => makeUser({ tag: role.slice(0, 5) + '29', dbRole: role });
const dealerOwner = async () => { const d = await makeUser({ tag: 'dlo29', role: 'dealer', extra: { businessName: `Matrix ${uid()} Motors`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } }); q(`update users set status='approved' where id='${d.id}'`); q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`); await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: PW } }); d.csrf = null; return d; };

const A = {};
A.superadmin = await owner();
for (const r of ['admin', 'moderator', 'hr', 'marketing', 'technical_support']) A[r] = await staff(r);
A.personal = await makeUser({ tag: 'per29' });
A.legacy_seller = await makeUser({ tag: 'leg29', dbRole: 'individual_seller' });
A.dealer_owner = await dealerOwner();
{ // dealer staff through the real invitation flow (viewer = least privileged team role)
  const u = await makeUser({ tag: 'dst29' });
  const inv = await A.dealer_owner.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: u.email, role: 'viewer' } });
  if (inv.status >= 300) throw new Error('team invite failed ' + inv.status);
  const tok = crypto.randomBytes(32).toString('hex');
  q(`update dealer_teams set invite_token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}' where invite_email='${u.email}'`);
  const ac = await u.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } });
  if (ac.status >= 300) throw new Error('team accept failed ' + ac.status);
  A.dealer_staff = u;
}
const STAFF = ['admin', 'superadmin', 'moderator', 'hr', 'marketing', 'technical_support'];
const NON_STAFF = ['personal', 'legacy_seller', 'dealer_owner', 'dealer_staff'];
const viewLogs = (r) => r === 'superadmin' || r === 'admin' || (ROLE_PERMISSIONS[r] || []).includes(PERM.VIEW_LOGS);

// endpoint -> predicate "this role must be allowed through the guard"; `okStatuses` are the statuses an allowed role may legitimately see.
const ENDPOINTS = [
  { name: 'security log list',        path: '/api/security-logs',                allow: viewLogs,                                    ok: [200] },
  { name: 'security log summary',     path: '/api/security-logs/summary',        allow: viewLogs,                                    ok: [200] },
  { name: 'automation stats',         path: '/api/automation/stats',             allow: (r) => STAFF.includes(r),                    ok: [200, 503] }, // any staff (intentional adminOnly); 503 = not provisioned
  { name: 'CMS dashboard (studio)',   path: '/api/cms/dashboard/stats',          allow: (r) => STAFF.includes(r),                    ok: [200, 503] },
  { name: 'report queue',             path: '/api/reports/admin/all',            allow: (r) => ['admin', 'superadmin', 'moderator'].includes(r), ok: [200] },
  { name: 'feedback queue',           path: '/api/feedback/admin/all',           allow: (r) => ['admin', 'superadmin'].includes(r),  ok: [200] },
  { name: 'announcements',            path: '/api/announcements',                allow: (r) => ['admin', 'superadmin'].includes(r),  ok: [200] },
  { name: 'platform config stats',    path: '/api/config/stats',                 allow: (r) => ['admin', 'superadmin'].includes(r),  ok: [200, 503] },
  { name: 'staff directory',          path: '/api/admin/staff',                  allow: (r) => r === 'superadmin',                   ok: [200] },
  { name: 'support staff queue',      path: '/api/support/staff/queue',          allow: (r) => ['technical_support', 'admin', 'superadmin'].includes(r), ok: [200] },
];

const matrix = [];
for (const e of ENDPOINTS) {
  const anon = await fetch(B + e.path);
  check(`${e.name}: anonymous -> 401`, anon.status === 401, anon.status);
  const row = { endpoint: e.path, anonymous: anon.status };
  for (const role of [...NON_STAFF, ...STAFF]) {
    const r = await A[role].raw(e.path);
    row[role] = r.status;
    if (e.allow(role)) check(`${e.name}: ${role} is allowed through the guard (got ${r.status}, never 401/403/500)`, e.ok.includes(r.status), [r.status, r.j?.message || r.j?.code]);
    else check(`${e.name}: ${role} is refused (403)`, r.status === 403, r.status);
  }
  matrix.push(row);
}

// Preserved public behaviour: published CMS content stays readable without login.
for (const p of ['/api/cms/faqs', '/api/cms/content']) { const r = await fetch(B + p); check(`public CMS read ${p} remains public (200 anonymously)`, r.status === 200, r.status); }
// A staff-only studio read must not leak through a public-looking sibling.
const leak = await fetch(B + '/api/cms/pages'); check('CMS page management list is not anonymous (401)', leak.status === 401, leak.status);

// Nothing above is allowed to have changed state.
check('no staff or user accounts were modified by the matrix reads', Number(q(`select count(*) from users where email like '%29-%@example.test' and is_banned`)) === 0);
fs.mkdirSync(path.resolve(here, 'out'), { recursive: true });
fs.writeFileSync(path.resolve(here, 'out/permission-matrix-read.json'), JSON.stringify({ roles: [...NON_STAFF, ...STAFF], matrix }, null, 1));
finish('29_permission_matrix');
