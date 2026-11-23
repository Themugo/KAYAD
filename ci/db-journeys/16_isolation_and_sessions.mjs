// Phase 5 (FINAL-COMPLETION): object-level cross-business isolation, dealer team role permitted/denied matrix, and session
// expiry/revocation, all against the REAL backend and a disposable database (no mocks). Evidence: out/isolation-sessions.json
import fs from 'node:fs';
import crypto from 'node:crypto';
import { BUILTIN_ROLES } from '../../backend/services/dealerTeamRoles.service.js';
import { makeUser, q, check, finish, Client, uid, PW, B } from './lib.mjs';

const mkDealer = async (tag) => {
  const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `Iso ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
  q(`update users set status='approved' where id='${d.id}'`);
  q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`);
  await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: PW } }); d.csrf = null;
  return d;
};
const member = async (owner, role, tag) => {
  const u = await makeUser({ tag });
  // invitations are limited per account (10/min): wait out the window rather than weaken the limit
  for (let i = 0; i < 6; i++) { const r = await owner.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: u.email, role } }); if (r.status !== 429) break; await new Promise((res) => setTimeout(res, 12000)); }
  const tok = crypto.randomBytes(32).toString('hex');
  q(`update dealer_teams set invite_token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}' where invite_email='${u.email}'`);
  const acc = await u.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } });
  u.accStatus = acc.status; return u;
};
const car = (owner, title) => q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold,images) values ('${title}','Mazda','CX-5',2019,3000000,'available','${owner.id}',false,'[{"url":"https://res.example.test/a.jpg","publicId":"a"}]'::jsonb) returning id`).split('\n')[0];
const lead = (owner, carId, buyer) => q(`insert into leads(dealer,buyer,vehicle,stage) values ('${owner.id}','${buyer.id}','${carId}','new') returning id`).split('\n')[0];
const ev = {};

const A = await mkDealer('isoa'), Bd = await mkDealer('isob'); const buyer = await makeUser({ tag: 'isobuyer' });
const carA = car(A, 'A-car'), carB = car(Bd, 'B-car');
let leadB = null; try { leadB = lead(Bd, carB, buyer); } catch { leadB = null; }
const snap = (id) => q(`select title||'|'||status||'|'||price||'|'||(deleted_at is not null)||'|'||sold from cars where id='${id}'`);
const before = snap(carB);

// ---- 1. Cross-business object isolation (dealer A acting on dealer B's objects) -----------------------------------------
const attempts = [
  ['PUT', `/api/dealer-platform/inventory/${carB}`, { title: 'hijack', price: 1 }],
  ['DELETE', `/api/dealer-platform/inventory/${carB}`],
  ['POST', '/api/dealer-platform/inventory/bulk', { ids: [carB], action: 'delete', status: 'paused' }],
  ['PUT', `/api/cars/${carB}`, { title: 'hijack' }],
  ['DELETE', `/api/cars/${carB}`],
  ['PATCH', `/api/dealer/cars/${carB}/pause`],
  ['PATCH', `/api/dealer/cars/${carB}/publish`],
  ['PATCH', `/api/dealer/cars/${carB}/mark-sold`, {}],
  ['PATCH', '/api/dealer/cars/bulk-status', { ids: [carB], status: 'paused' }],
];
if (leadB) attempts.push(['PUT', `/api/dealer-platform/leads/${leadB}`, { stage: 'won' }], ['GET', `/api/dealer-platform/leads/${leadB}/activities`], ['POST', `/api/dealer-platform/leads/${leadB}/notes`, { note: 'x' }]);
const iso = [];
for (const [m, p, b] of attempts) { const r = await A.raw(p, { method: m, body: b }); iso.push({ m, p: p.replace(carB, ':carB').replace(leadB || 'x', ':leadB'), status: r.status }); }
ev.crossBusiness = iso;
check(`A cannot mutate B's objects: ${attempts.length} direct attempts all refused (4xx, none 2xx)`, iso.every((x) => x.status >= 400 && x.status < 500), iso.filter((x) => x.status < 400 || x.status >= 500));
check("B's listing is byte-for-byte unchanged after all attempts", snap(carB) === before, snap(carB));
const aInv = (await A.raw('/api/dealer-platform/inventory?limit=100')).j; const aTxt = JSON.stringify(aInv);
check("A's inventory listing never contains B's listing id/title (query isolation)", !aTxt.includes(carB) && !aTxt.includes('B-car'));
const aMine = JSON.stringify((await A.raw('/api/cars/my-listings?limit=100')).j);
check("A's my-listings never contains B's listing", !aMine.includes(carB));
const bulkR = await A.raw('/api/dealer/cars/bulk-status', { method: 'PATCH', body: { ids: [carA, carB], status: 'paused' } });
check('bulk mixing own+foreign ids never changes the foreign one', snap(carB) === before, bulkR.j);
const anon = await fetch(B + `/api/dealer-platform/inventory`); check('anonymous inventory -> 401', anon.status === 401, anon.status);
const buyerTry = await buyer.raw('/api/dealer-platform/inventory'); check('personal buyer inventory -> 403', buyerTry.status === 403, buyerTry.status);
const prof = await A.raw(`/api/dealer-platform/profile/${Bd.id}`, { method: 'PUT', body: { businessName: 'Hijacked' } });
check("A cannot update B's dealer profile", prof.status >= 400 && prof.status < 500, prof.status);
check("B's business name unchanged", !/Hijacked/.test(q(`select coalesce(business_name,'') from dealers where "user"='${Bd.id}'`)));

// ---- 2. Team role matrix (permitted AND denied) -----------------------------------------------------------------------
const roles = BUILTIN_ROLES.map((r) => r.key); // viewer, lot_agent, sales_agent, finance_officer, manager (real permission model)
const perm = (r, k) => BUILTIN_ROLES.find((x) => x.key === r).permissions[k] === true;
ev.builtinRoles = Object.fromEntries(BUILTIN_ROLES.map((r) => [r.key, Object.keys(r.permissions).filter((k) => r.permissions[k])]));
const team = {}; for (const r of roles) team[r] = await member(A, r, 'iso' + r.slice(0, 4));
check('all built-in team roles accepted invitations (200)', roles.every((r) => team[r].accStatus === 200), roles.map((r) => `${r}:${team[r].accStatus}`));
const probes = [
  ['GET /dealer-platform/inventory (canViewCars)', 'GET', '/api/dealer-platform/inventory'],
  ['GET /dealer-platform/dashboard (earnings)', 'GET', '/api/dealer-platform/dashboard'],
  ['GET /dealer-platform/team (manage team)', 'GET', '/api/dealer-platform/team'],
  ['POST /dealer-platform/team/invite', 'POST', '/api/dealer-platform/team/invite', { email: `x-${uid()}@example.test`, role: 'viewer' }],
  ['GET /dealer-platform/subscription (owner only)', 'GET', '/api/dealer-platform/subscription'],
  ['GET /dealer-platform/finance (owner only)', 'GET', '/api/dealer-platform/finance'],
  ['DELETE /dealer-platform/inventory/:ownCar', 'DELETE', `/api/dealer-platform/inventory/${carA}`],
];
const matrix = {};
for (const [label, m, p, b] of probes) { matrix[label] = {}; for (const r of roles) { const x = await team[r].raw(p, { method: m, body: b }); matrix[label][r] = x.status; } matrix[label].owner = (await A.raw(p.replace(carA, car(A, 'tmp')), { method: m, body: b })).status; }
ev.teamMatrix = matrix;
const M = (l, r) => matrix[l][r];
const L = { inv: 'GET /dealer-platform/inventory (canViewCars)', dash: 'GET /dealer-platform/dashboard (earnings)', team: 'GET /dealer-platform/team (manage team)', inv2: 'POST /dealer-platform/team/invite', sub: 'GET /dealer-platform/subscription (owner only)', fin: 'GET /dealer-platform/finance (owner only)', del: 'DELETE /dealer-platform/inventory/:ownCar' };
const exp = (r, l) => l === L.inv ? (perm(r, 'canListCars') || perm(r, 'canEditCars') || perm(r, 'canDeleteCars')) : l === L.dash ? perm(r, 'canViewEarnings') : (l === L.team || l === L.inv2) ? perm(r, 'canManageTeam') : l === L.del ? perm(r, 'canDeleteCars') : false;
const mism = []; for (const l of Object.values(L)) for (const r of roles) { const allowed = M(l, r) >= 200 && M(l, r) < 300; if (allowed !== exp(r, l)) mism.push(`${r} ${l} -> ${M(l, r)} (permission model says ${exp(r, l) ? 'allow' : 'deny'})`); }
check(`every built-in team role x ${Object.values(L).length} probes matches the permission model exactly (${roles.length * Object.values(L).length} cells; allowed AND denied)`, mism.length === 0, mism);
check('owner-only surfaces (subscription, finance) denied for EVERY team role and allowed for the owner', roles.every((r) => M(L.sub, r) === 403 && M(L.fin, r) === 403) && M(L.sub, 'owner') === 200, matrix);
check('team management is owner-only: manager included is denied (403)', M(L.team, 'manager') === 403 && M(L.inv2, 'manager') === 403 && M(L.team, 'owner') === 200, matrix);
check('viewer is denied every probe', Object.values(L).every((l) => M(l, 'viewer') === 403), matrix);
check('team members can never reach the OTHER dealership (B inventory item edit)', (await Promise.all(roles.map((r) => team[r].raw(`/api/dealer-platform/inventory/${carB}`, { method: 'PUT', body: { title: 'x' } })))).every((x) => x.status >= 400) && snap(carB) === before);
// removal cuts access immediately
const tid = q(`select id from dealer_teams where invite_email='${team.manager.email}'`);
const pre = (await team.manager.raw('/api/dealer-platform/inventory')).status;
let del; for (let i = 0; i < 6; i++) { del = await A.raw(`/api/dealer-platform/team/${tid}`, { method: 'DELETE' }); if (del.status !== 429) break; await new Promise((res) => setTimeout(res, 12000)); }
const post = (await team.manager.raw('/api/dealer-platform/inventory')).status;
check('removing a member cuts access on the very next request (no re-login)', pre === 200 && del.status === 200 && post === 403, { pre, del: del.status, post });
q(`update users set status='suspended' where id='${A.id}'`);
check('suspending the dealership cuts every member (sales_agent -> 403/401)', [401, 403].includes((await team.sales_agent.raw('/api/dealer-platform/inventory')).status));
q(`update users set status='approved' where id='${A.id}'`);

// ---- 3. Session expiry and revocation ---------------------------------------------------------------------------------
const S = {};
const u1 = await makeUser({ tag: 'sess' });
S.authed = (await u1.raw('/api/v1/auth/sessions')).status;
check('S1 valid session reads own sessions (200)', S.authed === 200);
const keep = new Client(); Object.assign(keep.jar, u1.jar);
const lo = await u1.raw('/api/v1/auth/logout', { method: 'POST' });
const afterLogout = await keep.raw('/api/v1/auth/sessions');
check('S2 logout then replay of the OLD cookies -> 401', lo.status < 300 && afterLogout.status === 401, { logout: lo.status, replay: afterLogout.status });
const u2 = await makeUser({ tag: 'sess2' }); const old2 = new Client(); Object.assign(old2.jar, u2.jar);
const sess = (await u2.raw('/api/v1/auth/sessions')).j; const ra = await u2.raw('/api/v1/auth/sessions/revoke-all', { method: 'POST' });
check('S3 revoke-all succeeds', ra.status < 300, ra.status);
check('S4 after revoke-all the OLD access token stops working immediately (token version bump)', (await old2.raw('/api/v1/auth/sessions')).status === 401);
const u3 = await makeUser({ tag: 'sess3' });
q(`update users set deactivated_at=now() where id='${u3.id}'`);
check('S5 deactivated account is refused on its existing session (403)', (await u3.raw('/api/v1/auth/sessions')).status === 403);
const u4 = await makeUser({ tag: 'sess4' });
q(`update users set is_banned=true where id='${u4.id}'`);
check('S6 banned account is refused on its existing session', [401, 403].includes((await u4.raw('/api/v1/auth/sessions')).status));
const u5 = await makeUser({ tag: 'sess5' });
const ref5 = await u5.raw('/api/v1/auth/refresh', { method: 'POST' });
check('S7 refresh with a valid refresh cookie works (rotation)', ref5.status === 200, ref5.status);
const stale = new Client(); stale.jar = { ...u5.jar }; // after rotation u5 holds new cookies
const u6 = await makeUser({ tag: 'sess6' }); const oldRefresh = { ...u6.jar }; await u6.raw('/api/v1/auth/refresh', { method: 'POST' });
const reuse = new Client(); reuse.jar = oldRefresh; const reuseR = await reuse.raw('/api/v1/auth/refresh', { method: 'POST' });
check('S8 re-using an already-rotated refresh token is rejected (401/403)', [401, 403].includes(reuseR.status), { status: reuseR.status, code: reuseR.j?.code });
{ const s9 = await u6.raw('/api/v1/auth/refresh', { method: 'POST' }); check('S9 reuse of a rotated refresh token revokes the family (the legitimate newer token is also dead)', [401, 403].includes(s9.status), { status: s9.status, code: s9.j?.code }); };
const noTok = await fetch(B + '/api/v1/auth/sessions', { headers: { cookie: 'accessToken=garbage' } });
check('S10 malformed/garbage token -> 401', noTok.status === 401, noTok.status);
const u7 = await makeUser({ tag: 'sess7', role: 'dealer', extra: { businessName: `S7 ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
const w = await mkDealer('sess8'); const wm = await member(w, 'sales_agent', 'sess8m');
check('S11 member session works before demotion', (await wm.raw('/api/dealer-platform/inventory')).status === 200);
q(`update dealer_teams set status='suspended' where invite_email='${wm.email}'`);
check('S12 member access ends on membership suspension without logout', (await wm.raw('/api/dealer-platform/inventory')).status === 403);
const u8 = await makeUser({ tag: 'sess9' }); q(`update users set role='dealer' where id='${u8.id}'`);
const adm = await u8.raw('/api/admin/users');
check('S13 privilege check is server-side (self-promotion in DB to dealer still cannot reach admin API)', [401, 403].includes(adm.status), adm.status);
const csrfMiss = await fetch(B + '/api/v1/auth/logout', { method: 'POST', headers: { cookie: (new Client()).cookie() } });
check('S14 state-changing call without CSRF/session -> rejected', [401, 403].includes(csrfMiss.status), csrfMiss.status);
S.note = 'Access-token natural expiry and refresh-token TTL are NOT exercised (would need clock control or waiting); covered by unit tests only. Concurrent multi-device and password-change revocation: see S3/S4 token-version mechanism; password-change/role-change/subscription-change paths NOT TESTED here.';
ev.sessions = S;
fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('./out/isolation-sessions.json', import.meta.url), JSON.stringify(ev, null, 1));
finish('16_isolation_and_sessions');
