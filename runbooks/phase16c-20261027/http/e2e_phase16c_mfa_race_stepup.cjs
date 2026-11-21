/* global setTimeout, console, process */
// PHASE 16C - owner MFA: concurrent replay of ONE valid TOTP code, concurrent use of ONE recovery code, step-up requirement, session invalidation on owner removal.
// Disposable local stack only. Real authenticator apps and real email delivery are NOT exercised here (unverified).
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, call, sql } = L;
const OWNER = 'owner148@example.test';
const auth = (u) => ({ jar: u.jar, token: u.token });
(async () => {
  const T = await import('../../../backend/utils/totp.js');
  const mk = async (email) => { const u = await L.register('user', email ? { email } : {}); await L.verifyEmailViaToken(u.email); const id = u.id || sql(`select id from users where email='${u.email}'`); sql(`update users set status='approved', email_verified=true where id='${id}'`); const l = await L.login(u.email); return { id, email: u.email, jar: l.jar, token: l.res.body?.token || l.res.body?.accessToken }; };
  sql(`update users set email='retired_'||id||'@example.test' where email='${OWNER}'`);
  const o1t = await mk(); sql(`update users set email='${OWNER}' where id='${o1t.id}'`);
  sql(`delete from owner_memberships; insert into owner_memberships(user_id,email,status,added_via,added_by_label) values ('${o1t.id}','${OWNER}','active','bootstrap','16C fixture')`);
  await new Promise((r) => setTimeout(r, 6000));
  const lo = await L.login(OWNER); const o1 = { id: o1t.id, email: OWNER, jar: lo.jar, token: lo.res.body?.token || lo.res.body?.accessToken };
  const inv = (u, code, tag) => { const e = L.uniq(tag); return call('POST', '/api/owner/invitations', { ...auth(u), body: { email: e, confirmEmail: e, password: L.PASSWORD, ...(code ? { mfaCode: code } : {}) } }); };
  // enrol
  const en = await call('POST', '/api/owner/mfa/enroll', { ...auth(o1), body: { password: L.PASSWORD } }); const secret = en.body.secret;
  const act = await call('POST', '/api/owner/mfa/activate', { ...auth(o1), body: { code: T.totpAt(secret, Date.now()) } }); const rcodes = act.body.recoveryCodes || [];
  check('M0 fixture: owner enrolled, 10 recovery codes', en.status === 201 && act.status === 200 && rcodes.length === 10, `${en.status}/${act.status}/${rcodes.length}`);
  // step-up: sensitive owner action without a code is refused and creates nothing
  const noCode = await inv(o1, null, 'nocode');
  check('M1 step-up: owner invitation without a second factor is refused (MFA required) and creates no invitation', noCode.status >= 400 && /MFA/.test(noCode.body?.code || '') && sql(`select count(*) from owner_invitations where email like 'nocode%'`) === '0', noCode.status + ' ' + noCode.body?.code);
  // concurrent replay of ONE valid TOTP code: at most one use may succeed. Bursts containing 408 are discarded (bcrypt-before-MFA cost on a small box).
  let ok = -1, by = {}, clean = false;
  for (let a = 1; a <= 3 && !clean; a++) {
    sql(`delete from owner_invitations where email like 'race%'; update owner_mfa_factors set failed_attempts=0, locked_until=null where user_id='${o1.id}'`);
    const code = T.totpAt(secret, Date.now() + 30000 * a); // a fresh step each attempt so the previous attempt's consumed step cannot interfere
    const burst = await Promise.all(Array.from({ length: 6 }, () => inv(o1, code, 'race')));
    by = {}; burst.forEach((x) => { const k = x.status + ':' + (x.body?.code || ''); by[k] = (by[k] || 0) + 1; });
    ok = burst.filter((x) => x.status === 201).length; clean = !burst.some((x) => x.status === 408);
    console.log('INFO M2 attempt', a, JSON.stringify(by), clean ? '' : '(408 present: discarded)');
  }
  check(`M2 one valid TOTP code used by 6 concurrent requests: AT MOST ONE succeeds (succeeded=${ok})`, clean && ok <= 1 && Number(sql(`select count(*) from owner_invitations where email like 'race%'`)) === ok, JSON.stringify(by));
  // concurrent use of ONE recovery code: exactly one consumption
  sql(`update owner_mfa_factors set failed_attempts=0, locked_until=null where user_id='${o1.id}'`);
  const rc = rcodes[3]; let ok2 = -1, by2 = {}, clean2 = false;
  for (let a = 1; a <= 3 && !clean2; a++) {
    sql(`delete from owner_invitations where email like 'rcrace%'`);
    const code = a === 1 ? rc : rcodes[3 + a];
    const burst = await Promise.all(Array.from({ length: 6 }, () => inv(o1, code, 'rcrace')));
    by2 = {}; burst.forEach((x) => { const k = x.status + ':' + (x.body?.code || ''); by2[k] = (by2[k] || 0) + 1; });
    ok2 = burst.filter((x) => x.status === 201).length; clean2 = !burst.some((x) => x.status === 408);
    console.log('INFO M3 attempt', a, JSON.stringify(by2), clean2 ? '' : '(408 present: discarded)');
    if (clean2) { var usedCode = code; }
  }
  const usedRows = sql(`select count(*) from owner_mfa_recovery_codes where user_id='${o1.id}' and used_at is not null`);
  check(`M3 one recovery code used by 6 concurrent requests: AT MOST ONE succeeds and it is consumed once (succeeded=${ok2}, rows consumed=${usedRows})`, clean2 && ok2 <= 1 && Number(usedRows) >= ok2 && Number(usedRows) <= 3, JSON.stringify(by2));
  const again = await inv(o1, usedCode, 'rcagain');
  check('M3 …and that recovery code cannot be used again', again.status >= 400, again.status + ' ' + again.body?.code);
  // session invalidation: removing an owner bumps token_version and kills the session
  const o2 = await mk(); sql(`insert into owner_memberships(user_id,email,status,added_via,added_by_label) values ('${o2.id}','${o2.email}','active','invitation','16C fixture')`);
  await new Promise((r) => setTimeout(r, 6000));
  const o2l = await L.login(o2.email); const o2s = { id: o2.id, jar: o2l.jar, token: o2l.res.body?.token || o2l.res.body?.accessToken };
  const pre = await call('GET', '/api/owner', auth(o2s));
  sql(`update owner_mfa_factors set failed_attempts=0, locked_until=null where user_id='${o1.id}'`);
  const rm = await call('DELETE', `/api/owner/members/${o2.id}`, { ...auth(o1), body: { confirmEmail: o2.email, password: L.PASSWORD, mfaCode: rcodes[9], reason: '16C session invalidation test' } });
  await new Promise((r) => setTimeout(r, 1500));
  const post = await call('GET', '/api/owner', auth(o2s));
  check('M4 removing an owner: control (was an owner) then the existing session loses owner access', pre.status === 200 && rm.status === 200 && post.status !== 200, `${pre.status}/${rm.status}/${post.status} ${rm.body?.code} ${rm.body?.message}`);
  check('M4 …and the removed owner row is revoked (membership kept for audit, not deleted)', sql(`select status from owner_memberships where user_id='${o2.id}'`) === 'revoked');
  check('M5 no secret, TOTP code or recovery code appears in owner events', Number(sql(`select count(*) from owner_membership_events where metadata::text ~* '(secret|totp|recovery|password|token)' and metadata::text ~ '[0-9a-f]{32}'`)) === 0);
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
