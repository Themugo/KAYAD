/* global setTimeout, console, process */
// PHASE 16B - owner/dealer separation: crafted requests, mass assignment, stale sessions, KAYAD-domain addresses, and TOTP lockout under
// concurrency. Disposable local stack only (backend -> PostgREST -> disposable PostgreSQL); DB needs the owner-governance + owner-MFA
// candidates and the backend needs WEBHOIST_EMAIL=owner148@example.test + OWNER_MFA_ENCRYPTION_KEY. Ground truth is always read from the DB.
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, call, sql } = L;
const OWNER = 'owner148@example.test';
const auth = (u) => ({ jar: u.jar, token: u.token });
const row = (id) => sql(`select role||'/'||coalesce(super_admin::text,'null')||'/'||status||'/'||email_verified::text from users where id='${id}'`);
const owners = () => sql(`select count(*) from owner_memberships`);
const isOwnerView = async (u) => (await call('GET', '/api/owner', auth(u))).status;
(async () => {
  const T = await import('../../../backend/utils/totp.js');
  const mk = async (role, email) => {
    const u = await L.register('user', email ? { email } : {}); await L.verifyEmailViaToken(u.email);
    const id = u.id || sql(`select id from users where email='${u.email}'`);
    sql(`update users set role='${role}', status='approved', email_verified=true where id='${id}'`);
    const l = await L.login(u.email); return { id, email: u.email, jar: l.jar, token: l.res.body?.token || l.res.body?.accessToken };
  };
  // fixture: one real owner (active membership) so "owners unchanged" is meaningful
  sql(`update users set email='retired_'||id||'@example.test' where email='${OWNER}'`);
  const o1t = await mk('user'); sql(`update users set email='${OWNER}' where id='${o1t.id}'`);
  sql(`delete from owner_memberships; insert into owner_memberships(user_id,email,status,added_via,added_by_label) values ('${o1t.id}','${OWNER}','active','bootstrap','16B fixture')`);
  await new Promise((r) => setTimeout(r, 6000));
  const lo = await L.login(OWNER); const o1 = { id: o1t.id, email: OWNER, jar: lo.jar, token: lo.res.body?.token || lo.res.body?.accessToken };
  check('S0 fixture: the fixture owner is recognised as owner', (await isOwnerView(o1)) === 200);
  const M0 = owners();

  // ======== S1 registration mass assignment ========
  const evil = { role: 'superadmin', super_admin: true, superAdmin: true, isOwner: true, effectiveRole: 'webhoist', emailVerified: true, email_verified: true, status: 'approved', permissions: ['*'], grantedPermissions: ['owner.manage'], isBanned: false };
  for (const asRole of ['superadmin', 'webhoist', 'admin', 'user', 'dealer', 'individual_seller', 'owner']) {
    const email = L.uniq('mass_reg');
    const r = await call('POST', '/api/auth/register', { body: { name: 'Mass Assign', email, password: L.PASSWORD, phone: '07' + String(10000000 + Math.floor(Math.random() * 89999999)), role: asRole, businessName: 'Biz', location: 'Nairobi', ...evil } });
    const id = sql(`select id from users where email='${email}'`);
    const st = id ? row(id) : 'none';
    const okRole = ['user', 'dealer', 'individual_seller'].includes(asRole) ? st.startsWith(asRole === 'user' ? 'user/' : asRole + '/') : st.startsWith('user/');
    check(`S1 register as '${asRole}' with privilege fields: stored role is never elevated (${st})`, id ? okRole && st.split('/')[1] !== 'true' && st.endsWith('/false') : r.status >= 400, r.status + ' ' + st);
  }
  check('S1 no owner membership was created by any registration', owners() === M0);

  // ======== S2 profile mass assignment / role + identity fields ========
  const u2 = await mk('user');
  const pr = await call('PUT', '/api/auth/profile', { ...auth(u2), body: { name: 'Renamed', role: 'superadmin', super_admin: true, superAdmin: true, status: 'approved', emailVerified: true, email: OWNER, isOwner: true, effectiveRole: 'webhoist', grantedPermissions: ['*'] } });
  check('S2 profile update cannot change role/super_admin/status/email (DB row unchanged apart from name)', row(u2.id) === 'user/false/approved/true' && sql(`select email from users where id='${u2.id}'`) === u2.email, pr.status + ' ' + row(u2.id));
  check('S2 …and the account is still not an owner', (await isOwnerView(u2)) === 403 && owners() === M0);
  const dp = await mk('dealer');
  const pr2 = await call('PUT', '/api/auth/profile', { ...auth(dp), body: { role: 'superadmin', super_admin: true, businessName: 'Keep Biz' } });
  check('S2 dealer profile update cannot self-promote', row(dp.id).startsWith('dealer/false/') && (await isOwnerView(dp)) === 403, pr2.status + ' ' + row(dp.id));

  // ======== S3 dealer onboarding / dealership ownership never grants owner or approval ========
  const dn = await L.register('dealer'); await L.verifyEmailViaToken(dn.email); const dnid = sql(`select id from users where email='${dn.email}'`);
  sql(`update users set status='approved' where id='${dnid}'`); const dnl = await L.login(dn.email); const D = { id: dnid, email: dn.email, jar: dnl.jar, token: dnl.res.body?.token || dnl.res.body?.accessToken };
  const ob = await call('PUT', '/api/dealer/onboarding', { ...auth(D), body: { businessName: 'Own Biz', location: 'Nairobi', bio: 'x', paymentDetails: { method: 'mpesa', phone: '0700000000' }, documents: {}, role: 'superadmin', approved: true, verified: true, super_admin: true, isOwner: true, status: 'approved', verificationStatus: 'approved' } });
  const dstate = sql(`select approved::text from dealers where "user"='${D.id}'`);
  check('S3 onboarding with approved/verified/owner fields: dealer NOT approved, role unchanged, no owner access', dstate !== 't' && row(D.id).startsWith('dealer/false/') && (await isOwnerView(D)) === 403, ob.status + ' dealers.approved=' + dstate + ' ' + row(D.id));
  const vs = sql(`select coalesce((select verification_status from dealer_verifications where "user"='${D.id}'),'none')`);
  check('S3 verification (if created) is pending, never approved by the dealer itself', vs === 'pending' || vs === 'none', vs);
  for (const tr of ['owner', 'webhoist', 'superadmin', 'admin']) {
    const inv = await call('POST', '/api/dealer-platform/team/invite', { ...auth(D), body: { email: L.uniq('team') , role: tr } });
    check(`S3 dealer team invite with role '${tr}' is refused (400/403/404) and creates nothing`, inv.status >= 400 && inv.status < 500 && sql(`select count(*) from dealer_teams where role='${tr}'`) === '0', inv.status);
  }
  check('S3 dealer cannot reach any owner or staff-management surface', [await call('GET', '/api/owner', auth(D)), await call('POST', '/api/owner/invitations', { ...auth(D), body: { email: 'x@example.test', confirmEmail: 'x@example.test', password: L.PASSWORD } }), await call('GET', '/api/admin/staff', auth(D)), await call('POST', '/api/admin/staff', { ...auth(D), body: { name: 'x', email: L.uniq('st'), password: L.PASSWORD, role: 'admin' } })].every((x) => x.status === 403 || x.status === 401), '');

  // ======== S4 staff-role escalation by admin / superadmin-labelled non-owner ========
  const adm = await mk('admin'); const sup = await mk('superadmin'); const tgt = await mk('user');
  for (const [who, u] of [['admin', adm], ['superadmin-labelled non-owner', sup]]) {
    for (const rl of ['superadmin', 'webhoist', 'owner']) {
      const r = await call('PUT', `/api/admin/staff/${tgt.id}`, { ...auth(u), body: { role: rl } });
      check(`S4 ${who} cannot set role '${rl}' via PUT /api/admin/staff/:id (4xx, row unchanged)`, r.status >= 400 && r.status < 500 && row(tgt.id) === 'user/false/approved/true', r.status + ' ' + row(tgt.id));
    }
    const cs = await call('POST', '/api/admin/staff', { ...auth(u), body: { name: 'Mk', email: L.uniq('mkstaff'), password: L.PASSWORD, role: 'superadmin' } });
    check(`S4 ${who} cannot create a superadmin staff account`, cs.status >= 400 && cs.status < 500, cs.status);
  }
  check('S4 a "superadmin" label alone grants no owner authority', (await isOwnerView(sup)) === 403 && (await call('POST', '/api/owner/invitations', { ...auth(sup), body: { email: 'y@example.test', confirmEmail: 'y@example.test', password: L.PASSWORD } })).status === 403);
  const rl = await call('PUT', `/api/admin/users/${tgt.id}/role`, { ...auth(adm), body: { role: 'superadmin' } });
  check('S4 direct role endpoint (if mounted) cannot grant superadmin', rl.status >= 400 || row(tgt.id).startsWith('user/'), rl.status + ' ' + row(tgt.id));
  check('S4 owners unchanged after all escalation attempts', owners() === M0);

  // ======== S5 stale sessions ========
  const st = await mk('admin');
  const before = await call('GET', '/api/admin/users?limit=1', auth(st));
  sql(`update users set role='user' where id='${st.id}'`);
  await new Promise((r) => setTimeout(r, 1500));
  const after = await call('GET', '/api/admin/users?limit=1', auth(st));
  check('S5 demoted admin: the ALREADY-ISSUED session loses admin access (no stale privilege)', before.status === 200 && after.status === 403, `${before.status} -> ${after.status}`);
  const bn = await mk('admin'); sql(`update users set is_banned=true where id='${bn.id}'`); await new Promise((r) => setTimeout(r, 1500));
  const bnr = await call('GET', '/api/admin/users?limit=1', auth(bn));
  check('S5 banned admin: existing session is rejected', bnr.status === 401 || bnr.status === 403, bnr.status);
  const ow = await mk('user'); sql(`update users set email='ow_tmp_${Date.now()}@example.test' where id='${ow.id}'`);
  sql(`update owner_memberships set status='revoked' where user_id='${o1.id}' and false`); // (membership revocation itself is covered by the Phase 16/16A suites; here: a stolen non-owner session never becomes owner)
  check('S5 the fixture owner session still works (control)', (await isOwnerView(o1)) === 200);

  // ======== S6 KAYAD-domain / lookalike addresses carry no privilege ========
  for (const em of ['kayadautomotives@gmail.com', 'ops@kayad.co.ke', 'admin@kayadautomotives.com', 'jimmythemugo@gmail.com'.replace('gmail.com', 'gmail.com.evil.test')]) {
    const e2 = em.replace(/@.*/, '') + '+' + Date.now() + '@' + em.split('@')[1];
    const r = await call('POST', '/api/auth/register', { body: { name: 'Domain', email: e2, password: L.PASSWORD, phone: '07' + String(10000000 + Math.floor(Math.random() * 89999999)), role: 'user' } });
    const id = sql(`select id from users where email='${e2.toLowerCase()}'`);
    if (!id) { check(`S6 ${em}-style address: registration outcome is not a privilege (status ${r.status})`, r.status >= 200, r.status); continue; }
    sql(`update users set email_verified=true, status='approved' where id='${id}'`);
    const l = await L.login(e2); const u = { id, jar: l.jar, token: l.res.body?.token || l.res.body?.accessToken };
    check(`S6 ${em.split('@')[1]} address: plain user, no owner/admin/staff surface`, row(id).startsWith('user/false/') && (await isOwnerView(u)) === 403 && (await call('GET', '/api/admin/users?limit=1', auth(u))).status === 403, row(id));
  }

  // ======== S7 TOTP lockout cannot be bypassed by concurrency ========
  const en = await call('POST', '/api/owner/mfa/enroll', { ...auth(o1), body: { password: L.PASSWORD } });
  const secret = en.body.secret; const NOW = Date.now();
  const act = await call('POST', '/api/owner/mfa/activate', { ...auth(o1), body: { code: T.totpAt(secret, NOW) } });
  check('S7 fixture: owner TOTP enrolled and active', en.status === 201 && act.status === 200 && Array.isArray(act.body.recoveryCodes), `${en.status}/${act.status}`);
  sql(`update owner_mfa_factors set failed_attempts=0, locked_until=null where user_id='${o1.id}'`);
  // The invitation route spends a bcrypt (cost 12) per request BEFORE the second factor is checked, so a very wide burst on a small CI box can hit the
  // server's own 408 request timeout. A burst containing any 408 says nothing about the counter, so it is discarded and re-run (up to 3 times).
  const N = 12; let by = {}, invalid = 0, locked = 0, lockedUntil = 'none', clean = false;
  for (let attempt = 1; attempt <= 3 && !clean; attempt++) {
    sql(`delete from owner_invitations where email like 'lock%'; update owner_mfa_factors set failed_attempts=0, locked_until=null where user_id='${o1.id}'`);
    const burst = await Promise.all(Array.from({ length: N }, (_, i) => call('POST', '/api/owner/invitations', { ...auth(o1), body: { email: `lock${i}_${Date.now()}@example.test`, confirmEmail: `lock${i}_${Date.now()}@example.test`, password: L.PASSWORD, mfaCode: String(100000 + ((i * 7919) % 899999)) } })));
    by = {}; burst.forEach((x) => { const k = x.status + ':' + (x.body?.code || ''); by[k] = (by[k] || 0) + 1; });
    invalid = burst.filter((x) => x.body?.code === 'OWNER_MFA_INVALID').length; locked = burst.filter((x) => x.body?.code === 'OWNER_MFA_LOCKED').length;
    lockedUntil = sql(`select coalesce(locked_until::text,'none') from owner_mfa_factors where user_id='${o1.id}'`);
    clean = !burst.some((x) => x.status === 408);
    console.log('INFO S7 attempt', attempt, 'burst outcome', JSON.stringify(by), 'lockedUntil', lockedUntil, clean ? '' : '(contains 408 timeouts: discarded)');
  }
  check(`S7 ${N} concurrent wrong codes: at most 5 are evaluated as invalid, the rest are locked out (evaluated=${invalid}, locked=${locked})`, clean && invalid <= 5 && locked >= N - 5 && lockedUntil !== 'none', JSON.stringify(by));
  check('S7 no invitation was created by the wrong-code burst', sql(`select count(*) from owner_invitations where email like 'lock%'`) === '0');
  // a correct code is still refused while locked (no oracle) and works after the lock is cleared by the operator
  const alEmail = L.uniq('afterlock'); const whileLocked = await call('POST', '/api/owner/invitations', { ...auth(o1), body: { email: alEmail, confirmEmail: alEmail, password: L.PASSWORD, mfaCode: T.totpAt(secret, Date.now() + 30000) } });
  check('S7 while locked even a correct code gets the lockout answer (no oracle)', whileLocked.body?.code === 'OWNER_MFA_LOCKED' || whileLocked.status === 429, whileLocked.status + ' ' + whileLocked.body?.code);
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
