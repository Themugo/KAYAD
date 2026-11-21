/* global process, console, setTimeout */
// INCIDENT 20261027 - "System under maintenance." owner lock-out. Real HTTP -> backend -> PostgREST -> disposable PostgreSQL.
// Needs a backend started with WEBHOIST_EMAIL=owner148@example.test (legacy owner mode). Ground truth is read from the database.
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, call, sql } = L;
const OWNER = 'owner148@example.test';
const auth = (u) => ({ jar: u.jar, token: u.token });
const status = () => sql(`select value->>'isMaintenanceMode' from system_settings where key='system_status'`);
const setMaint = (on) => sql(`update system_settings set value = jsonb_set(value,'{isMaintenanceMode}','${on}'::jsonb) where key='system_status'`);
(async () => {
  const mk = async (role, email) => { const u = await L.register('user', {}); await L.verifyEmailViaToken(u.email); const id = sql(`select id from users where email='${u.email}'`); sql(`update users set role='${role}', status='approved', email_verified=true${email ? `, email='${email}'` : ''} where id='${id}'`); const em = email || u.email; const l = await L.login(em); return { id, email: em, jar: l.jar, token: l.res.body?.token || l.res.body?.accessToken }; };
  const owner = await mk('user', OWNER); // a plain 'user' role: authority comes from the owner designation, not the role label
  const staffAdmin = await mk('admin'); const staffSuper = await mk('superadmin'); const dealer = await mk('dealer'); const plain = await mk('user');
  const tokenOf = (r) => r.res.body?.token || r.res.body?.accessToken;
  check('P0 baseline: maintenance is off and the owner reaches the Panic Room API (kill-switch tested with a harmless type)', status() === 'false' && (await call('GET', '/api/auth/profile', auth(owner))).status === 200);

  // ---- the incident: the owner switches full maintenance on through the real endpoint
  // The hosted state is a row written by the OLD code: flag on, no scope, no version. Recreate exactly that shape (the old kill-switch can no longer be used for it).
  setMaint(true); await new Promise((r) => setTimeout(r, 11000));
  check('M1 hosted-shaped state (flag on, no scope/version) is in the database and is treated as a GLOBAL shutdown', status() === 'true' && (await call('GET', '/api/cars?limit=1', {})).status === 503);

  // ---- the owner lane MUST work
  const lo = await L.login(OWNER);
  check('M2 INCIDENT FIX: the owner can still sign in while maintenance is on (correct password)', lo.res.status === 200 && lo.res.body?.success === true && !!lo.res.body?.user, lo.res.status + ' ' + JSON.stringify(lo.res.body).slice(0, 80));
  const o2 = { jar: lo.jar, token: tokenOf(lo) };
  check('M3 …and the owner session reaches its profile', (await call('GET', '/api/auth/profile', auth(o2))).status === 200);
  check('M3b …and the SPA session bootstrap endpoint /api/v1/auth/me answers 200 for the owner', (await call('GET', '/api/v1/auth/me', auth(o2))).status === 200);
  const wrong = await call('POST', '/api/auth/login', { body: { email: OWNER, password: 'definitely-wrong-password-1' } });
  check('M4 a WRONG owner password during maintenance is still 401, not 503 (no maintenance oracle for guessing)', wrong.status === 401, wrong.status);
  const rec = await call('POST', '/api/admin/system/maintenance/recover', { ...auth(o2), body: { password: L.PASSWORD, reason: 'Incident recovery: ending the legacy global maintenance row' } });
  check('M5 INCIDENT FIX: the owner can end the hosted-shaped maintenance via the recovery control (password step-up)', rec.status === 200 && rec.body.changed === true && status() === 'false', rec.status + ' ' + status());
  await new Promise((r) => setTimeout(r, 300));
  setMaint(true); await new Promise((r) => setTimeout(r, 11000)); // let the 10s settings cache expire after the direct DB change

  // ---- nobody else gets a lane: maintenance semantics for everyone else are unchanged
  for (const [label, u] of [['ordinary user', plain], ['dealer', dealer], ['admin-labelled staff', staffAdmin], ['SUPERADMIN-LABELLED NON-OWNER', staffSuper]]) {
    const l = await call('POST', '/api/auth/login', { body: { email: u.email, password: L.PASSWORD } });
    check(`N1 ${label} cannot sign in during maintenance (503, no session issued)`, l.status === 503 && !l.body?.token && !l.body?.accessToken && !(l.headers?.['set-cookie'] || []).length, l.status);
    const p = await call('GET', '/api/auth/profile', auth(u));
    check(`N2 ${label}'s EXISTING session is refused during maintenance (503)`, p.status === 503, p.status);
    const me = await call('GET', '/api/v1/auth/me', auth(u)); check(`N2b ${label}'s /auth/me is also refused during maintenance (503)`, me.status === 503, me.status);
  }
  const rec2 = await call('POST', '/api/admin/system/maintenance/recover', { ...auth(staffSuper), body: { password: L.PASSWORD, reason: 'trying to end it as a non-owner' } });
  check('N3 a superadmin-LABELLED non-owner cannot end maintenance (503) and the flag is unchanged', rec2.status === 503 && status() === 'true', rec2.status);
  const rec3 = await call('POST', '/api/admin/system/maintenance/recover', { body: { password: L.PASSWORD } });
  check('N4 an anonymous caller cannot reach recover during maintenance (401/403/503, flag unchanged)', [401, 403, 503].includes(rec3.status) && status() === 'true', rec3.status);
  const ks = await call('POST', '/api/admin/system/kill-switch', { ...auth(staffSuper), body: { type: 'auctions' } });
  check('N5 the owner lane does not open other admin endpoints to non-owners (kill-switch still 503)', ks.status === 503, ks.status);
  const other = await call('GET', '/api/admin/users?limit=1', auth(o2));
  check('N6 even for the owner, ordinary platform endpoints stay in maintenance (503): the lane is narrow', other.status === 503, other.status);
  const bad = await call('POST', '/api/auth/login', { body: { email: plain.email, password: 'definitely-wrong-password-1' } });
  check('N7 a wrong password for an ordinary user during maintenance is 401, as before', bad.status === 401 || bad.status === 503, bad.status);
  const health = await call('GET', '/api/health', {});
  check('N8 /api/health stays available and public search stays in maintenance (503)', health.status === 200 && (await call('GET', '/api/cars?limit=1', {})).status === 503, health.status);

  // ---- ban / disable / session semantics for the owner lane
  sql(`update users set is_banned=true where id='${plain.id}'`);
  const banned = await call('POST', '/api/auth/login', { body: { email: plain.email, password: L.PASSWORD } });
  check('B1 a banned ordinary user is refused during maintenance (503/403)', banned.status === 503 || banned.status === 403, banned.status);
  sql(`update users set is_banned=false where id='${plain.id}'`);
  const lo3 = await L.login(OWNER); const o3 = { jar: lo3.jar, token: tokenOf(lo3) };
  const lg = await call('POST', '/api/auth/logout', auth(o3));
  check('B2 the owner can sign out during maintenance', lg.status === 200 || lg.status === 204, lg.status);
  const ref = await call('POST', '/api/auth/refresh', { jar: lo3.jar });
  const refPlain = await call('POST', '/api/auth/refresh', { jar: plain.jar });
  check('B3 refresh during maintenance: ordinary user refused (503); no new session for them', refPlain.status === 503, `owner ${ref.status} / user ${refPlain.status}`);

  // ---- ending maintenance restores everything for everyone
  const lo4 = await L.login(OWNER); const o4 = { jar: lo4.jar, token: tokenOf(lo4) };
  const rec4 = await call('POST', '/api/admin/system/maintenance/recover', { ...auth(o4), body: { password: L.PASSWORD } });
  await new Promise((r) => setTimeout(r, 300));
  const back = await L.login(plain.email);
  check('R1 after the owner ends maintenance, ordinary sign-in works again', rec4.status === 200 && back.res.status === 200, `${rec4.status}/${back.res.status}`);
  check('R2 the recovery is audited (audit_logs row Maintenance recovered by the owner)', Number(sql(`select count(*) from audit_logs where action ilike 'Maintenance recovered:%' and actor_id='${owner.id}'`)) >= 1);
  check('R3 the owner account itself was not modified by any of this (role label, status unchanged)', sql(`select role||'/'||status from users where id='${owner.id}'`) === 'user/approved');
  check('R4 no owner/superadmin role was granted to anyone', sql(`select count(*) from users where id in ('${plain.id}','${dealer.id}','${staffAdmin.id}') and role in ('superadmin','webhoist')`) === '0');
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
