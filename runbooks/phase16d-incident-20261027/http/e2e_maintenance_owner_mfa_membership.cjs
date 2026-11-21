/* global process, console, setTimeout */
// INCIDENT 20261027 - owner lane under maintenance in DATABASE-MEMBERSHIP mode with MFA. Needs owner-governance + owner-MFA migrations and
// a backend started with WEBHOIST_EMAIL=owner148@example.test and OWNER_MFA_ENCRYPTION_KEY. Real authenticator apps are NOT exercised (RFC 6238 code from KAYAD's own implementation).
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, call, sql } = L;
const OWNER = 'owner148@example.test';
const status = () => sql(`select value->>'isMaintenanceMode' from system_settings where key='system_status'`);
(async () => {
  const T = await import('../../../backend/utils/totp.js');
  const mk = async (email) => { const u = await L.register('user', {}); await L.verifyEmailViaToken(u.email); const id = sql(`select id from users where email='${u.email}'`); sql(`update users set status='approved', email_verified=true${email ? `, email='${email}'` : ''} where id='${id}'`); const em = email || u.email; const l = await L.login(em); return { id, email: em, jar: l.jar, token: l.res.body?.token || l.res.body?.accessToken }; };
  sql(`update users set email='retired_'||id||'@example.test' where email='${OWNER}'`);
  const owner = await mk(OWNER);
  sql(`delete from owner_memberships; insert into owner_memberships(user_id,email,status,added_via,added_by_label) values ('${owner.id}','${OWNER}','active','bootstrap','incident fixture')`);
  await new Promise((r) => setTimeout(r, 6000));
  const o = await L.login(OWNER); const A = { jar: o.jar, token: o.res.body?.token || o.res.body?.accessToken };
  const en = await call('POST', '/api/owner/mfa/enroll', { ...A, body: { password: L.PASSWORD } }); const secret = en.body.secret;
  const act = await call('POST', '/api/owner/mfa/activate', { ...A, body: { code: T.totpAt(secret, Date.now()) } }); const rc = act.body.recoveryCodes || [];
  check('F0 fixture: owner (membership) has an ACTIVE authenticator and 10 recovery codes', en.status === 201 && act.status === 200 && rc.length === 10);
  const actNoMfa = await call('POST', '/api/admin/system/maintenance/activate', { ...A, body: { scope: 'global', reason: 'MFA step-up rehearsal', password: L.PASSWORD, confirmation: 'GLOBAL SHUTDOWN' } });
  check('F0b STEP-UP: with an enrolled authenticator, activating maintenance without a code is refused (OWNER_MFA_REQUIRED) and nothing changes', actNoMfa.status === 403 && actNoMfa.body?.code === 'OWNER_MFA_REQUIRED' && status() !== 'true', actNoMfa.status + ' ' + actNoMfa.body?.code);
  const actBadMfa = await call('POST', '/api/admin/system/maintenance/activate', { ...A, body: { scope: 'global', reason: 'MFA step-up rehearsal', password: L.PASSWORD, confirmation: 'GLOBAL SHUTDOWN', mfaCode: '000000' } });
  check('F0c an invalid code is refused and nothing changes', actBadMfa.status >= 400 && status() !== 'true', actBadMfa.status + ' ' + actBadMfa.body?.code);
  sql(`update owner_mfa_factors set failed_attempts=0, locked_until=null where user_id='${owner.id}'`);
  const on = await call('POST', '/api/admin/system/maintenance/activate', { ...A, body: { scope: 'global', reason: 'MFA step-up rehearsal', password: L.PASSWORD, confirmation: 'GLOBAL SHUTDOWN', mfaCode: T.totpAt(secret, Date.now() + 30000) } });
  check('F1 owner activates GLOBAL maintenance with password + authenticator code', on.status === 200 && status() === 'true', on.status + ' ' + on.body?.code);
  await new Promise((r) => setTimeout(r, 300));
  const noCode = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD } });
  check('F2 MFA IS NOT BYPASSED: during maintenance, owner sign-in without a code answers MFA_REQUIRED and issues no session', noCode.status === 401 && noCode.body?.code === 'MFA_REQUIRED' && !noCode.body?.token, noCode.status + ' ' + noCode.body?.code);
  const bad = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD, mfaCode: '000000' } });
  check('F3 a wrong authenticator code is refused during maintenance (no session)', bad.status >= 400 && bad.status !== 503 || bad.body?.code === 'OWNER_MFA_INVALID', bad.status + ' ' + bad.body?.code);
  sql(`update owner_mfa_factors set failed_attempts=0, locked_until=null where user_id='${owner.id}'`);
  const good = await L.login(OWNER, T.totpAt(secret, Date.now() + 30000));
  const lg = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD, mfaCode: rc[0] } });
  check('F4 owner signs in during maintenance with a valid recovery code (single use, MFA enforced)', lg.status === 200 && lg.body?.success === true, lg.status + ' ' + lg.body?.code);
  const jar = lg.jar || good.jar;
  const login2 = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD, mfaCode: rc[0] } });
  check('F5 the same recovery code cannot be replayed', login2.status >= 400 && login2.body?.success !== true, login2.status);
  const cookieJar = lg.jar; const tok = lg.body?.token || lg.body?.accessToken;
  const recNoMfa = await call('POST', '/api/admin/system/maintenance/recover', { jar: cookieJar || A.jar, token: tok, body: { password: L.PASSWORD } });
  check('F6a STEP-UP: ending maintenance without the authenticator/recovery code is refused (OWNER_MFA_REQUIRED)', recNoMfa.status === 403 && recNoMfa.body?.code === 'OWNER_MFA_REQUIRED' && status() === 'true', recNoMfa.status + ' ' + recNoMfa.body?.code);
  const rec = await call('POST', '/api/admin/system/maintenance/recover', { jar: cookieJar || A.jar, token: tok, body: { password: L.PASSWORD, mfaCode: rc[2] } });
  check('F6 the MFA-authenticated owner ends maintenance (password + recovery code)', rec.status === 200 && status() === 'false', rec.status + ' ' + status());
  // membership missing / inconsistent => no lane
  sql(`update system_settings set value = jsonb_set(value,'{isMaintenanceMode}','true'::jsonb) where key='system_status'`); await new Promise((r) => setTimeout(r, 11000));
  sql(`update owner_memberships set status='revoked', revoked_at=now() where user_id='${owner.id}'`);
  sql(`update owner_mfa_factors set failed_attempts=0, locked_until=null where user_id='${owner.id}'`);
  const noMem = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD, mfaCode: rc[1] } });
  check('G1 owner membership missing (revoked): sign-in during maintenance is refused (503) — no owner lane without a usable membership', noMem.status === 503 || noMem.status === 401 || noMem.status === 403, noMem.status + ' ' + noMem.body?.code);
  check('G2 …and no session cookie was issued', !((noMem.headers && noMem.headers['set-cookie']) || []).length);
  check('G3 maintenance is still on and no owner exists', status() === 'true' && sql(`select count(*) from owner_memberships where status='active'`) === '0');
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
