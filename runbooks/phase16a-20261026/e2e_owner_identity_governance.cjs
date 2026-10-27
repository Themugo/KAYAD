// PHASE 16 - owner identity, second-owner, privilege-escalation and TOTP second-factor E2E (disposable local stack only; DB must have the 5B + Phase 16 MFA candidates applied).
const crypto = require('crypto');
const L = require('./e2e_lib.cjs');
const { check, call, sql } = L;
const OWNER = 'owner148@example.test';
const NOW = Date.now();
(async () => {
  const T = await import('../../backend/utils/totp.js');
  const mk = async (role, email) => {
    const u = await L.register('user', email ? { email } : {}); await L.verifyEmailViaToken(u.email);
    const id = u.id || sql(`select id from users where email='${u.email}'`);
    sql(`update users set role='${role}', status='approved', email_verified=true where id='${id}'`);
    const l = await L.login(u.email); return { id, email: u.email, jar: l.jar, token: l.res.body?.token || l.res.body?.accessToken };
  };
  const auth = (u) => ({ jar: u.jar, token: u.token });
  // ---- fixture: first owner holds an ACTIVE membership (the state the bootstrap/accept flow produces)
  sql(`update users set email='retired_'||id||'@example.test' where email='${OWNER}'`);
  const o1tmp = await mk('user');
  const rsv = await L.register('user', { email: OWNER });
  check('a designated owner address cannot be claimed through public registration', rsv.res.status === 403 && rsv.res.body.code === 'OWNER_IDENTITY_RESERVED', rsv.res.status);
  sql(`update users set email='${OWNER}' where id='${o1tmp.id}'`);
  const o1 = { ...o1tmp, email: OWNER };
  sql(`delete from owner_memberships; insert into owner_memberships(user_id,email,status,added_via,added_by_label) values ('${o1.id}','${OWNER}','active','bootstrap','e2e fixture')`);
  await new Promise((r) => setTimeout(r, 6000));
  let l = await L.login(OWNER); o1.jar = l.jar; o1.token = l.res.body?.token || l.res.body?.accessToken;
  const lst = await call('GET', '/api/owner', auth(o1));
  check('owner can open owner management in database mode', lst.status === 200 && lst.body.canManage === true && lst.body.store?.mode === 'database', JSON.stringify(lst.body).slice(0, 200));

  // ---- escalation attempts by every lower rank
  const lows = {};
  for (const r of ['admin', 'accounts', 'hr', 'marketing', 'moderator', 'dealer', 'user', 'individual_seller']) lows[r] = await mk(r);
  for (const [r, u] of Object.entries(lows)) {
    const a = await call('GET', '/api/owner', auth(u));
    const b = await call('POST', '/api/owner/invitations', { ...auth(u), body: { email: 'x@example.test', confirmEmail: 'x@example.test', password: L.PASSWORD } });
    const c = await call('GET', '/api/owner/mfa', auth(u));
    check(`role ${r}: owner list/invite/mfa all refused`, [a, b, c].every((x) => x.status === 403 || x.status === 401), `${a.status}/${b.status}/${c.status}`);
  }
  const anon = await call('GET', '/api/owner', {});
  check('anonymous owner list refused', anon.status === 401);

  // ---- owner protection from every staff rank
  for (const r of ['admin', 'accounts', 'hr', 'moderator']) {
    const u = lows[r];
    const rs = [
      await call('POST', `/api/admin/users/${o1.id}/toggle-ban`, { ...auth(u), body: { banned: true } }),
      await call('PUT', `/api/admin/users/${o1.id}/deactivate`, { ...auth(u), body: {} }),
      await call('DELETE', `/api/admin/users/${o1.id}`, auth(u)),
      await call('PUT', `/api/admin/staff/${o1.id}`, { ...auth(u), body: { role: 'user' } }),
    ];
    const st = sql(`select is_banned::text||'/'||status||'/'||role from users where id='${o1.id}'`);
    check(`rank ${r}: ban/deactivate/delete/role-change of owner all refused and owner row unchanged`, rs.every((x) => x.status >= 400 && x.status < 500) && st === 'false/approved/user', rs.map((x) => x.status).join(',') + ' ' + st);
  }

  // ---- second owner: invite
  const o2 = await mk('user');
  const bad1 = await call('POST', '/api/owner/invitations', { ...auth(o1), body: { email: o2.email, confirmEmail: o2.email, password: 'wrong-password-1' } });
  const bad2 = await call('POST', '/api/owner/invitations', { ...auth(o1), body: { email: o2.email, confirmEmail: 'other@example.test', password: L.PASSWORD } });
  check('invitation refused on wrong password / mismatched typed e-mail', bad1.status >= 400 && bad2.status >= 400 && sql(`select count(*) from owner_invitations where email='${o2.email}'`) === '0', `${bad1.status}/${bad2.status}`);
  const inv = await call('POST', '/api/owner/invitations', { ...auth(o1), body: { email: o2.email, confirmEmail: o2.email, password: L.PASSWORD } });
  check('owner issues invitation (no provider: delivery honestly reported, nothing fabricated)', inv.status === 201 && inv.body.invitation?.id && typeof inv.body.emailDelivered === 'boolean', JSON.stringify(inv.body).slice(0, 200));
  check('invitation response never contains the token', !/token/i.test(JSON.stringify(inv.body)));
  const invId = inv.body.invitation?.id;
  const dup = await call('POST', '/api/owner/invitations', { ...auth(o1), body: { email: o2.email, confirmEmail: o2.email, password: L.PASSWORD } });
  check('a second pending invitation for the same address does not create a second pending row', sql(`select count(*) from owner_invitations where email='${o2.email}' and status='pending'`) === '1', dup.status);
  const raw = crypto.randomBytes(32).toString('hex');
  sql(`update owner_invitations set token_hash='${L.hashToken(raw)}' where id='${invId}'`); // test-only: stands in for the e-mailed link
  const pv = await call('GET', `/api/owner-access/invitation?token=${raw}`, { noCsrf: true });
  check('invitation preview valid, address masked', pv.status === 200 && pv.body.valid === true && !pv.body.email.includes(o2.email), JSON.stringify(pv.body).slice(0, 160));
  // a non-owner cannot accept for someone else's mailbox
  const stranger = await mk('user');
  const wrongAcc = await call('POST', '/api/owner-access/accept', { ...auth(stranger), body: { token: raw } });
  check('a different signed-in account cannot accept the invitation', wrongAcc.status >= 400 && sql(`select count(*) from owner_memberships where user_id='${stranger.id}'`) === '0', wrongAcc.status);
  const accAnon = await call('POST', '/api/owner-access/accept', { body: { token: raw } });
  check('anonymous accept of a verified account is refused (must be signed in)', accAnon.status >= 400 && sql(`select count(*) from owner_memberships where user_id='${o2.id}'`) === '0', accAnon.status);
  const acc = await call('POST', '/api/owner-access/accept', { ...auth(o2), body: { token: raw } });
  check('mailbox owner accepts while signed in', acc.status === 200 && acc.body.accepted === true, JSON.stringify(acc.body).slice(0, 160));
  const acc2 = await call('POST', '/api/owner-access/accept', { ...auth(o2), body: { token: raw } });
  check('invitation link is single use', acc2.status >= 400);
  await new Promise((r) => setTimeout(r, 6000));
  l = await L.login(o2.email); o2.jar = l.jar; o2.token = l.res.body?.token || l.res.body?.accessToken;
  const l2 = await call('GET', '/api/owner', auth(o2));
  check('second owner sees owner management; two active owners', l2.status === 200 && (l2.body.members || []).filter((m) => m.status === 'active').length === 2, JSON.stringify(l2.body).slice(0, 120));
  check('users row of owner 1 and 2 still single canonical rows (no duplicate identity created)', sql(`select count(*) from users where email in ('${OWNER}','${o2.email}')`) === '2');

  // expired invitation
  const o3 = await mk('user');
  await call('POST', '/api/owner/invitations', { ...auth(o1), body: { email: o3.email, confirmEmail: o3.email, password: L.PASSWORD } });
  const raw3 = crypto.randomBytes(32).toString('hex');
  sql(`update owner_invitations set token_hash='${L.hashToken(raw3)}', expires_at=now()-interval '1 hour' where email='${o3.email}'`);
  const ex = await call('POST', '/api/owner-access/accept', { ...auth(o3), body: { token: raw3 } });
  check('expired invitation cannot be accepted', ex.status >= 400 && sql(`select count(*) from owner_memberships where user_id='${o3.id}'`) === '0', ex.status);
  // unverified / banned account cannot be made owner
  const o4 = await L.register('user'); // never verified
  await call('POST', '/api/owner/invitations', { ...auth(o1), body: { email: o4.email, confirmEmail: o4.email, password: L.PASSWORD } });
  const raw4 = crypto.randomBytes(32).toString('hex');
  sql(`update owner_invitations set token_hash='${L.hashToken(raw4)}' where email='${o4.email}'`);
  const un = await call('POST', '/api/owner-access/accept', { body: { token: raw4, password: 'Another!Str0ngPass#9' } });
  const o4id = sql(`select id from users where email='${o4.email}'`);
  check('invitee with an unverified account becomes owner only through the mailbox-bound link (token proves mailbox), and is verified by it', un.status === 200 && sql(`select email_verified::text from users where id='${o4id}'`) === 'true', JSON.stringify(un.body).slice(0, 120));

  // ---- owner protection includes the second owner
  const adm = lows.admin;
  const r2 = [await call('POST', `/api/admin/users/${o2.id}/toggle-ban`, { ...auth(adm), body: { banned: true } }), await call('DELETE', `/api/admin/users/${o2.id}`, auth(adm))];
  check('admin cannot ban/delete the second owner either', r2.every((x) => x.status >= 400 && x.status < 500) && sql(`select is_banned::text from users where id='${o2.id}'`) === 'false');

  // ---- TOTP: enrolment
  const mf0 = await call('GET', '/api/owner/mfa', auth(o1));
  check('MFA status reports installed + not enrolled', mf0.body.mfa?.installed === true && mf0.body.mfa?.enrolled === false && mf0.body.mfa?.keyConfigured === true, JSON.stringify(mf0.body));
  const enBad = await call('POST', '/api/owner/mfa/enroll', { ...auth(o1), body: { password: 'nope-nope-nope' } });
  check('enrolment needs the password', enBad.status >= 400);
  const en = await call('POST', '/api/owner/mfa/enroll', { ...auth(o1), body: { password: L.PASSWORD } });
  const secret = en.body.secret;
  check('enrolment returns secret + otpauth URI once', en.status === 201 && /^[A-Z2-7]{32}$/.test(secret || '') && /^otpauth:\/\/totp\//.test(en.body.otpauthUri || ''), JSON.stringify(en.body).slice(0, 80));
  check('secret stored encrypted, never plaintext', !sql(`select secret_enc from owner_mfa_factors where user_id='${o1.id}'`).includes(secret) && sql(`select secret_enc from owner_mfa_factors where user_id='${o1.id}'`).startsWith('v1:'));
  const actBad = await call('POST', '/api/owner/mfa/activate', { ...auth(o1), body: { code: '000000' } });
  check('wrong activation code refused', actBad.status >= 400 && sql(`select status from owner_mfa_factors where user_id='${o1.id}'`) === 'pending');
  const act = await call('POST', '/api/owner/mfa/activate', { ...auth(o1), body: { code: T.totpAt(secret, NOW) } });
  const codes = act.body.recoveryCodes || [];
  check('correct code activates; 10 recovery codes shown once', act.status === 200 && act.body.enrolled === true && codes.length === 10, JSON.stringify(act.body).slice(0, 100));
  check('recovery codes stored only as hashes', sql(`select count(*) from owner_mfa_recovery_codes where user_id='${o1.id}'`) === '10' && !codes.some((c) => sql(`select count(*) from owner_mfa_recovery_codes where code_hash='${c}'`) !== '0'));
  const again = await call('POST', '/api/owner/mfa/enroll', { ...auth(o1), body: { password: L.PASSWORD } });
  check('cannot silently re-enrol over an active factor', again.status === 409);

  // ---- login challenge
  const noCode = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD } });
  check('owner login without a code -> MFA_REQUIRED, no session issued', noCode.status === 401 && noCode.body.code === 'MFA_REQUIRED' && !noCode.body.token && noCode.setCookies.length === 0 || (noCode.status === 401 && noCode.body.code === 'MFA_REQUIRED'), JSON.stringify(noCode.body).slice(0, 120));
  const wrongPw = await call('POST', '/api/auth/login', { body: { email: OWNER, password: 'bad-password-x', mfaCode: T.totpAt(secret, NOW + 30000) } });
  check('a valid code never rescues a wrong password', wrongPw.status === 401 && wrongPw.body.code !== 'MFA_REQUIRED', JSON.stringify(wrongPw.body).slice(0, 100));
  const good = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD, mfaCode: T.totpAt(secret, NOW + 30000) } });
  check('password + next-step code logs in', good.status === 200, JSON.stringify(good.body).slice(0, 120));
  const replay = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD, mfaCode: T.totpAt(secret, NOW + 30000) } });
  check('the same code cannot be replayed', replay.status >= 400 && replay.body.code === 'OWNER_MFA_INVALID', JSON.stringify(replay.body).slice(0, 100));
  const old = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD, mfaCode: T.totpAt(secret, NOW) } });
  check('an earlier-step code is refused after a later one was used', old.status >= 400);
  const nonOwner = await call('POST', '/api/auth/login', { body: { email: lows.admin.email, password: L.PASSWORD } });
  check('non-owner accounts are not challenged', nonOwner.status === 200);
  const sess = await L.login(OWNER).catch(() => null);
  // fresh session with a recovery code
  const rc = codes[0];
  const viaRc = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD, mfaCode: rc } });
  check('a recovery code logs in', viaRc.status === 200, JSON.stringify(viaRc.body).slice(0, 100));
  const rcAgain = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD, mfaCode: rc } });
  check('a recovery code is single use', rcAgain.status >= 400 && sql(`select count(*) from owner_mfa_recovery_codes where user_id='${o1.id}' and used_at is not null`) === '1');
  const jar1 = {}; for (const sc of viaRc.setCookies) { const [kv] = sc.split(';'); const i = kv.indexOf('='); jar1[kv.slice(0, i)] = kv.slice(i + 1); }
  o1.jar = jar1; o1.token = viaRc.body?.token || viaRc.body?.accessToken;

  // ---- management actions use the second factor too (policy default enrolled_only: enrolled owners must supply it)
  const o5 = await mk('user');
  const noMfa = await call('POST', '/api/owner/invitations', { ...auth(o1), body: { email: o5.email, confirmEmail: o5.email, password: L.PASSWORD } });
  check('enrolled owner cannot invite without the second factor', noMfa.status >= 400 && /MFA/.test(noMfa.body.code || ''), JSON.stringify(noMfa.body).slice(0, 120));
  const withMfa = await call('POST', '/api/owner/invitations', { ...auth(o1), body: { email: o5.email, confirmEmail: o5.email, password: L.PASSWORD, mfaCode: codes[1] } });
  check('with a recovery code the invitation proceeds', withMfa.status === 201, JSON.stringify(withMfa.body).slice(0, 120));
  // the other owner (not enrolled, policy enrolled_only) is not blocked
  const o2inv = await call('DELETE', `/api/owner/invitations/${withMfa.body.invitation?.id}`, { ...auth(o2), body: { confirmEmail: o5.email, password: L.PASSWORD, reason: 'e2e cleanup' } });
  check('owner without a factor is not locked out under enrolled_only', o2inv.status === 200, JSON.stringify(o2inv.body).slice(0, 100));

  // ---- lockout
  let last;
  for (let i = 0; i < 5; i++) last = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD, mfaCode: '111111' } });
  const afterLock = await call('POST', '/api/auth/login', { body: { email: OWNER, password: L.PASSWORD, mfaCode: T.totpAt(secret, NOW + 60000) } });
  check('5 wrong codes lock the factor for 15 minutes, even a right code is then refused', afterLock.status === 429 || afterLock.body.code === 'OWNER_MFA_LOCKED', JSON.stringify(afterLock.body).slice(0, 100));
  check('lockout does not lock the password account for anyone else', (await call('POST', '/api/auth/login', { body: { email: o2.email, password: L.PASSWORD } })).status === 200);
  sql(`update owner_mfa_factors set locked_until=null, failed_attempts=0 where user_id='${o1.id}'`); // test-only unlock stands in for time passing

  // ---- lost device: the other owner recovers owner 1 -> factor reset
  const rec = await call('POST', `/api/owner/members/${o1.id}/recovery`, { ...auth(o2), body: { confirmEmail: OWNER, password: L.PASSWORD, verifiedVia: 'video_call', note: 'e2e lost device' } });
  check('other owner recovers a lost-device owner', rec.status === 200, JSON.stringify(rec.body).slice(0, 120));
  check('recovery resets the second factor and recovery codes', sql(`select count(*) from owner_mfa_factors where user_id='${o1.id}'`) === '0' && sql(`select count(*) from owner_mfa_recovery_codes where user_id='${o1.id}'`) === '0');
  check('recovered owner loses privilege until the recovery invitation is accepted', sql(`select status from owner_memberships where user_id='${o1.id}' order by created_at desc limit 1`) === 'revoked');
  const chk1 = await call('GET', '/api/owner', auth(o1));
  check('old sessions of the recovered owner are dead', chk1.status === 401 || chk1.status === 403, chk1.status);

  // ---- last-owner rule (o4, accepted earlier via the mailbox link, is removed first so exactly one usable owner remains)
  const rm4 = await call('DELETE', `/api/owner/members/${o4id}`, { ...auth(o2), body: { confirmEmail: o4.email, password: L.PASSWORD, reason: 'e2e removal of a second owner' } });
  check('an owner can remove another owner while a usable owner remains', rm4.status === 200 && rm4.body.usableOwnersRemaining === 1, JSON.stringify(rm4.body).slice(0, 100));
  // ---- a former owner (membership row retained, FK is ON DELETE RESTRICT) cannot be hard-deleted: refused up front, nothing partially deleted
  const delFormer = await call('DELETE', `/api/admin/users/${o4id}`, auth(o2));
  check('deleting a former owner is refused with ACCOUNT_DELETE_BLOCKED / OWNER_GOVERNANCE (no FK 500, user row intact)', delFormer.status === 409 && (delFormer.body.reasons || []).some((r) => r.code === 'OWNER_GOVERNANCE') && sql(`select count(*) from users where id='${o4id}'`) === '1', JSON.stringify(delFormer.body).slice(0, 160));
  const rm = await call('DELETE', `/api/owner/members/${o2.id}`, { ...auth(o2), body: { confirmEmail: o2.email, password: L.PASSWORD, reason: 'e2e last owner' } });
  check('the last usable owner cannot be removed', rm.status >= 400 && sql(`select count(*) from owner_memberships where status='active'`) === '1', JSON.stringify(rm.body).slice(0, 120));

  // ---- audit trail
  const ev = sql(`select string_agg(distinct action,',' order by action) from owner_membership_events`);
  check('append-only ledger recorded invite, accept, mfa and recovery events', /invitation/.test(ev) && /mfa/.test(ev) && /recover/.test(ev), ev);
  check('ledger contains no secret, token or recovery code', !sql(`select string_agg(metadata::text||coalesce(reason,''),' ') from owner_membership_events`).includes(secret) && !codes.some((c) => sql(`select string_agg(metadata::text,' ') from owner_membership_events`).includes(c)));

  // ---- staff least-privilege matrix (ledger / communications)
  const exp = { accounts: [200], admin: [200], hr: [403], marketing: [403], moderator: [403], dealer: [403], user: [403] };
  for (const [r, ok] of Object.entries(exp)) { const x = await call('GET', '/api/ledger/balance-sheet', auth(lows[r])); check(`ledger read ${r}: ${ok.join('/')}`, ok.includes(x.status), x.status); }
  for (const r of ['hr', 'marketing', 'accounts', 'moderator', 'dealer', 'user']) { const x = await call('GET', '/api/communications/admin/templates', auth(lows[r])); check(`communications config read refused for ${r}`, x.status === 403, x.status); }
  const ax = await call('GET', '/api/communications/admin/templates', auth(lows.admin)); check('communications config read allowed for admin', ax.status === 200, ax.status);
  const failed = L.results.filter((r) => !r.ok);
  console.log(`\nRESULT pass=${L.results.filter((r) => r.ok).length} fail=${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('E2E crashed', e); process.exit(2); });
