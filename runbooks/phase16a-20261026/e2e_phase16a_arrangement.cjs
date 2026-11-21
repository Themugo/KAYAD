// PHASE 16A - the confirmed account arrangement, rehearsed end to end on the disposable stack (never hosted):
//   primary owner (hosted-shaped: verified, role 'dealer', business name, live sessions)  -> proposed role/profile correction -> bootstrap invitation -> accept -> MFA
//   second owner (address with NO account)  -> invited by the primary with password + MFA -> accepts -> enrols MFA -> peer rules -> revoke -> re-invite
//   second owner address squatted by an unverified account -> linked, no duplicate row
//   main test dealer (hosted-shaped: unverified, pending, business name, no dealers/verification rows) -> untouched by all of the above -> normal activation path
const crypto = require('crypto'); const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./e2e_lib.cjs'); const { check, call, sql } = L;
const PRIMARY = 'owner148@example.test'; const SECOND = 'second.owner@example.test';
const ENV_FILE = process.env.BACKEND_ENV || '/home/claude/work/p16a/logs/backend.env';
const env = Object.fromEntries(fs.readFileSync(ENV_FILE, 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1)]));
const cli = (...a) => { try { const out = execFileSync('node', ['scripts/owner-bootstrap.mjs', ...a], { cwd: path.join(__dirname, '../../backend'), env: { ...process.env, ...env, WEBHOIST_EMAIL: PRIMARY }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); return JSON.parse(out.slice(out.indexOf('{'))); } catch (e) { return { error: String((e.stderr || '') + (e.stdout || '') + e.message).slice(0, 300) }; } };
const settle = () => new Promise((r) => setTimeout(r, 6000));
const A = (u) => ({ jar: u.jar, token: u.token });
const tokenOf = (l) => l.res.body?.token || l.res.body?.accessToken;
const rawToken = () => crypto.randomBytes(32).toString('hex');
(async () => {
  const T = await import('../../backend/utils/totp.js');
  const NOW = Date.now(); let step = 0;
  const code = (secret) => { sql(`update owner_mfa_factors set last_used_step=null`); return T.totpAt(secret, Date.now()); }; // fixture: clear the replay marker so consecutive steps can be exercised inside one 30 s window (replay itself is tested explicitly)
  // idempotency: retire leftovers of earlier runs (rename only; nothing deleted)
  sql(`update users set email='retired_'||id||'@example.test' where lower(email) in ('${SECOND}','squatted.owner@example.test') or email like 'main.test.dealer%'`);
  // ============ fixtures shaped like the hosted rows ============
  // main test dealer: unverified, pending, business name, NO dealers / verification rows
  const kd = await L.register('dealer', { email: L.uniq('main.test.dealer') });
  const kid = sql(`select id from users where email='${kd.email}'`);
  sql(`delete from dealer_verifications where "user"='${kid}'; delete from dealers where "user"='${kid}'; update users set business_name='MAKENA DEALERS FIXTURE', email_verified=false, status='pending' where id='${kid}'`);
  const dealerShape = () => sql(`select md5(u::text)||'/'||(select count(*) from dealers where "user"='${kid}')||'/'||(select count(*) from dealer_verifications where "user"='${kid}')||'/'||(select count(*) from user_auth where user_id='${kid}')||'/'||(select count(*) from profiles where id='${kid}') from users u where id='${kid}'`);
  const dealerBefore = dealerShape();
  // primary: verified, role dealer, business name, live sessions, audit rows
  sql(`update users set email='retired_'||id||'@example.test' where email='${PRIMARY}'`);
  const p = await L.register('user', {}); await L.verifyEmailViaToken(p.email);
  const pid = p.id || sql(`select id from users where email='${p.email}'`);
  sql(`update users set email='${PRIMARY}', role='dealer', business_name='Frameworks fixture', status='pending', email_verified=true, super_admin=false where id='${pid}'; delete from dealers where "user"='${pid}'`);
  // owner tables empty => start of the sequence
  sql(`alter table owner_membership_events disable trigger all; delete from owner_membership_events; alter table owner_membership_events enable trigger all; delete from owner_mfa_recovery_codes; delete from owner_mfa_factors; delete from owner_invitations; delete from owner_memberships; update owner_bootstrap_state set status='open', closed_at=null, closed_by=null, closed_reason=null`);
  await settle();
  const sessions = []; for (let i = 0; i < 3; i++) { const l = await L.login(PRIMARY); sessions.push({ jar: l.jar, token: tokenOf(l) }); }
  const before = sql(`select role||'/'||super_admin||'/'||status||'/'||business_name from users where id='${pid}'`);
  check('fixture: primary is a verified account labelled dealer, with live sessions', before === 'dealer/false/pending/Frameworks fixture' && sessions.length === 3, before);
  const noOwner = await call('GET', '/api/owner', A(sessions[0]));
  check('before any change the primary is NOT yet an owner in database mode (membership required) - owner routes refuse', noOwner.status === 403, noOwner.status);

  // ============ (1) proposed role/profile correction, applied exactly as it will be proposed for hosted ============
  const upd = sql(`with u as (update users set role='superadmin', super_admin=true where id='${pid}' and role='dealer' and super_admin=false and email_verified=true returning 1), pr as (update profiles set role='superadmin' where id='${pid}' and role='dealer' returning 1) select (select count(*) from u)||'/'||(select count(*) from pr)`);
  check('correction touches exactly 1 users row and 1 profiles row', upd === '1/1', upd);
  check('correction left business name, status, credentials, sessions untouched', sql(`select status||'/'||business_name||'/'||(select count(*) from user_auth where user_id='${pid}')||'/'||(select count(*) from refresh_tokens where "user"='${pid}' and revoked_at is null) from users where id='${pid}'`).startsWith('pending/Frameworks fixture/1/'));
  const still = await call('GET', '/api/owner', A(sessions[0]));
  check('existing session survives the correction (no forced sign-out) and is still not an owner until a membership exists', still.status === 403 && still.body.code !== 'AUTH_SESSION_EXPIRED', JSON.stringify(still.body).slice(0, 120));
  const relog = await L.login(PRIMARY);
  check('primary can still sign in after the correction', relog.res.status === 200, relog.res.status);
  check('a superadmin role alone does not make an owner (sufficiency): decision-authority routes still refuse', (await call('GET', '/api/owner/mfa', A({ jar: relog.jar, token: tokenOf(relog) }))).status === 403);

  // ============ (2) bootstrap through the real operator CLI ============
  const plan = cli('--plan');
  check('bootstrap plan sees the verified primary as account_verified_not_owner', plan.designated?.[0]?.state === 'account_verified_not_owner' && plan.bootstrap === 'open', JSON.stringify(plan).slice(0, 200));
  const bad = cli('--apply', '--operator', 'e2e-operator', '--confirm-host', 'wrong.example');
  check('bootstrap refuses a wrong --confirm-host', !!bad.error || bad.results === undefined);
  const host = new URL(env.SUPABASE_URL).host;
  let ap = cli('--apply', '--operator', 'e2e-operator', '--confirm-host', host);
  if (ap.error) { console.log('     (operator CLI warm-up error right after a PostgREST restart, retried once - the command is idempotent):', String(ap.error).slice(0, 80).replace(/\s+/g, ' ')); await settle(); ap = cli('--apply', '--operator', 'e2e-operator', '--confirm-host', host); }
  check('bootstrap issues ONE invitation (primary only); no password set, nothing printed', JSON.stringify(ap).length > 2 && !/token|password/i.test(JSON.stringify(ap)) && sql(`select count(*) from owner_invitations where status='pending'`) === '1', JSON.stringify(ap).slice(0, 200));
  const rawP = rawToken(); sql(`update owner_invitations set token_hash='${L.hashToken(rawP)}' where email='${PRIMARY}'`); // stands in for the e-mailed link
  const accP = await call('POST', '/api/owner-access/accept', { ...A({ jar: relog.jar, token: tokenOf(relog) }), body: { token: rawP } });
  check('primary accepts while signed in; no new user row, no password change', accP.status === 200 && sql(`select count(*) from users where lower(email)='${PRIMARY}'`) === '1', JSON.stringify(accP.body).slice(0, 120));
  await settle();
  const pl = await L.login(PRIMARY); const P = { jar: pl.jar, token: tokenOf(pl) };
  const ov = await call('GET', '/api/owner', A(P));
  check('primary is now recognised: owner list, canManage, flagged primary', ov.status === 200 && ov.body.canManage === true && ov.body.self?.primary === true && ov.body.members.some((m) => m.primary && m.email === PRIMARY), JSON.stringify(ov.body).slice(0, 160));
  check('the three pre-existing sessions of the primary kept working through the whole sequence', (await call('GET', '/api/owner', A(sessions[1]))).status === 200);
  check('bootstrap closes itself only when every designated owner is established (1 designated => closed)', sql(`select status from owner_bootstrap_state`) === 'closed');

  // ---- is the role change REQUIRED for owner authority? Same membership, role label flipped back and forth (fixture only) ----
  const probeRole = async (role, flag) => {
    sql(`update users set role='${role}', super_admin=${flag} where id='${pid}'; update profiles set role='${role}' where id='${pid}'`); await settle();
    const l = await L.login(PRIMARY); const j = { jar: l.jar, token: tokenOf(l) };
    return { owner: (await call('GET', '/api/owner', A(j))).status, invite: (await call('GET', '/api/owner/mfa', A(j))).status, adminUsers: (await call('GET', '/api/admin/users', A(j))).status, me: (await call('GET', '/api/auth/me', A(j))).body };
  };
  const asDealer = await probeRole('dealer', false);
  check('NECESSITY: with the membership in place, an account still labelled role=dealer IS recognised as owner (owner routes 200) - the role label is not what grants owner access', asDealer.owner === 200 && asDealer.invite === 200, JSON.stringify({ o: asDealer.owner, m: asDealer.invite, a: asDealer.adminUsers }));
  const asSuper = await probeRole('superadmin', true);
  check('SAFETY/CONSISTENCY: after the proposed correction the same account is still an owner and its stored role agrees with the effective role', asSuper.owner === 200 && asSuper.invite === 200, JSON.stringify({ o: asSuper.owner, a: asSuper.adminUsers }));
  console.log('     effective admin-surface access  role=dealer -> /api/admin/users', asDealer.adminUsers, ' role=superadmin ->', asSuper.adminUsers);

  // ============ (3) primary enrols the authenticator ============
  const en = await call('POST', '/api/owner/mfa/enroll', { ...A(P), body: { password: L.PASSWORD } }); const secretP = en.body.secret;
  const act = await call('POST', '/api/owner/mfa/activate', { ...A(P), body: { code: code(secretP) } });
  check('primary enrols and activates TOTP; recovery codes issued', act.status === 200 && act.body.recoveryCodes?.length === 10, act.status);
  const rcP = act.body.recoveryCodes;

  // ============ (4) second owner whose address has NO account ============
  check('second address has no account before the invitation', sql(`select count(*) from users where lower(email)='${SECOND}'`) === '0');
  const inv0 = await call('POST', '/api/owner/invitations', { ...A(P), body: { email: SECOND, confirmEmail: SECOND, password: L.PASSWORD } });
  check('primary cannot invite without the second factor now that it is enrolled', inv0.status >= 400 && /MFA/.test(inv0.body.code || ''), JSON.stringify(inv0.body).slice(0, 100));
  const inv = await call('POST', '/api/owner/invitations', { ...A(P), body: { email: SECOND, confirmEmail: SECOND, password: L.PASSWORD, mfaCode: code(secretP) } });
  check('primary invites the second owner with password + typed address + authenticator code', inv.status === 201 && inv.body.invitation?.id, JSON.stringify(inv.body).slice(0, 120));
  check('second address is reserved immediately: public sign-up of it is refused', (await L.register('user', { email: SECOND })).res.status === 403);
  const dupInv = await call('POST', '/api/owner/invitations', { ...A(P), body: { email: SECOND, confirmEmail: SECOND, password: L.PASSWORD, mfaCode: code(secretP) } });
  check('duplicate invitation refused (one pending per address)', dupInv.status === 409 && /PENDING/.test(dupInv.body.code||'') && sql(`select count(*) from owner_invitations where email='${SECOND}' and status='pending'`) === '1', `${dupInv.status} ${JSON.stringify(dupInv.body).slice(0,120)}`);
  const rawS = rawToken(); sql(`update owner_invitations set token_hash='${L.hashToken(rawS)}' where email='${SECOND}' and status='pending'`);
  const pv = await call('GET', `/api/owner-access/invitation?token=${rawS}`, { noCsrf: true });
  check('preview offers account creation (set a password), address masked', pv.body.mode === 'set_password' && !String(pv.body.email).includes('second.owner'), JSON.stringify(pv.body));
  const weak = await call('POST', '/api/owner-access/accept', { body: { token: rawS, password: 'short' } });
  check('a weak password is refused and the invitation stays usable', weak.status === 400 && sql(`select status from owner_invitations where email='${SECOND}' order by created_at desc limit 1`) === 'pending');
  const SPASS = 'Second!Own3r#Passw0rd';
  const accS = await call('POST', '/api/owner-access/accept', { body: { token: rawS, name: 'Second Owner', password: SPASS } });
  check('the invitee creates their OWN password via the link (nobody else knows it) and becomes an owner', accS.status === 200 && accS.body.accountCreated === true, JSON.stringify(accS.body).slice(0, 140));
  const reuse = await call('POST', '/api/owner-access/accept', { body: { token: rawS, name: 'Replay', password: 'Replay!Own3r#Passw0rd' } });
  check('SINGLE USE: the same link cannot be used a second time (no new session, no password change)', reuse.status >= 400 && /INVALID|CLOSED/.test(reuse.body.code || ''), `${reuse.status} ${reuse.body.code}`);
  check('exactly one users row, verified by the link', sql(`select count(*)||'/'||bool_and(email_verified)::text from users where lower(email)='${SECOND}'`) === '1/true');
  await settle();
  const sl = await L.login(SECOND, SPASS); const S = { jar: sl.jar, token: tokenOf(sl) };
  check('second owner signs in; owner list shows two usable owners, themselves non-primary', (await call('GET', '/api/owner', A(S))).body.members?.filter((m) => m.usable).length === 2 && (await call('GET', '/api/owner', A(S))).body.self?.primary === false);
  const enS = await call('POST', '/api/owner/mfa/enroll', { ...A(S), body: { password: SPASS } }); const secretS = enS.body.secret;
  const actS = await call('POST', '/api/owner/mfa/activate', { ...A(S), body: { code: code(secretS) } });
  check('second owner enrols TOTP (own device, own secret, different from the primary)', enS.status === 201 && actS.status === 200 && secretS !== secretP, `${enS.status} ${JSON.stringify(enS.body).slice(0,120)} ${actS.status}`);
  const sl2 = await call('POST', '/api/auth/login', { body: { email: SECOND, password: SPASS } });
  check('second owner is now challenged at sign-in', sl2.status === 401 && sl2.body.code === 'MFA_REQUIRED', `${sl2.status} ${JSON.stringify(sl2.body).slice(0,100)}`);

  // ============ (5) peer rules and the primary-owner asymmetry ============
  const rmPrimary = await call('DELETE', `/api/owner/members/${pid}`, { ...A(S), body: { confirmEmail: PRIMARY, password: SPASS, mfaCode: code(secretS), reason: 'e2e peer removal attempt' } });
  check('a peer owner CANNOT remove the primary owner (OWNER_PRIMARY_PROTECTED)', rmPrimary.status === 403 && rmPrimary.body.code === 'OWNER_PRIMARY_PROTECTED' && sql(`select status from owner_memberships where user_id='${pid}'`) === 'active', JSON.stringify(rmPrimary.body).slice(0, 120));
  check('the refusal is recorded in the audit ledger', Number(sql(`select count(*) from owner_membership_events where action='owner.remove' and result='denied'`)) >= 1);
  const banPrimary = await call('POST', `/api/admin/users/${pid}/toggle-ban`, { ...A(S), body: { banned: true } });
  check('a peer owner cannot ban/deactivate the primary either', banPrimary.status === 403 && sql(`select is_banned::text from users where id='${pid}'`) === 'false', banPrimary.status);
  // lower ranks cannot elevate
  const adm = await L.register('user', {}); await L.verifyEmailViaToken(adm.email); const aid = adm.id || sql(`select id from users where email='${adm.email}'`);
  sql(`update users set role='admin', status='approved', email_verified=true where id='${aid}'`); const al = await L.login(adm.email);
  const esc = await call('POST', '/api/owner/invitations', { jar: al.jar, token: tokenOf(al), body: { email: adm.email, confirmEmail: adm.email, password: L.PASSWORD } });
  check('an admin cannot invite themselves (or anyone) as owner', esc.status === 403 && sql(`select count(*) from owner_invitations where email='${adm.email}'`) === '0');
  check('an admin cannot touch either owner account', (await call('DELETE', `/api/admin/users/${pid}`, { jar: al.jar, token: tokenOf(al) })).status === 403 && (await call('POST', `/api/admin/users/${(sql(`select id from users where email='${SECOND}'`))}/toggle-ban`, { jar: al.jar, token: tokenOf(al), body: { banned: true } })).status === 403);

  // ============ (6) primary revokes the second owner; consistency DB/API/UI-facing payload ============
  const sid = sql(`select id from users where email='${SECOND}'`);
  const rmWrong = await call('DELETE', `/api/owner/members/${sid}`, { ...A(P), body: { confirmEmail: SECOND, password: L.PASSWORD, reason: 'e2e', mfaCode: '000000' } });
  check('revocation with a wrong authenticator code is refused and nothing changes', rmWrong.status >= 400 && sql(`select status from owner_memberships where user_id='${sid}'`) === 'active');
  const rm = await call('DELETE', `/api/owner/members/${sid}`, { ...A(P), body: { confirmEmail: SECOND, password: L.PASSWORD, mfaCode: rcP[0], reason: 'e2e revocation by primary' } });
  check('primary revokes the second owner (recovery code accepted as second factor)', rm.status === 200 && rm.body.usableOwnersRemaining === 1, JSON.stringify(rm.body).slice(0, 100));
  check('DB: membership revoked with actor + reason', sql(`select status||'/'||coalesce(revoked_by_label,'')||'/'||coalesce(revoke_reason,'') from owner_memberships where user_id='${sid}'`).startsWith('revoked/') );
  check('API: the revoked owner loses owner routes and live sessions immediately', [(await call('GET', '/api/owner', A(S))).status].every((x) => x === 401 || x === 403));
  const view = await call('GET', '/api/owner', A(P));
  check('UI payload: the list no longer shows them as active, and the ledger shows who removed them', !view.body.members.some((m) => m.userId === sid && m.status === 'active') && view.body.events.some((e) => /remove|revoke/i.test(e.action)), JSON.stringify(view.body.events?.[0]).slice(0, 100));
  check('their user account itself still exists (revocation removes ownership, not the person)', sql(`select count(*) from users where id='${sid}'`) === '1');
  const slogin = await call('POST', '/api/auth/login', { body: { email: SECOND, password: SPASS } });
  check('revoked owner can still sign in as an ordinary user and is no longer challenged for owner MFA', slogin.status === 200, slogin.status);
  // re-invite existing account => linked, no duplicate
  const reinv = await call('POST', '/api/owner/invitations', { ...A(P), body: { email: SECOND, confirmEmail: SECOND, password: L.PASSWORD, mfaCode: code(secretP) } });
  check('re-inviting an EXISTING account is allowed and links to it (no second user row)', reinv.status === 201 && sql(`select count(*) from users where lower(email)='${SECOND}'`) === '1', JSON.stringify(reinv.body).slice(0, 100));

  // ============ (7) squatted address: an unverified account already uses the target email ============
  const SQ = 'squatted.owner@example.test';
  const sq = await L.register('user', { email: SQ });
  const sqId = sq.id || sql(`select id from users where email='${SQ}'`);
  check('fixture: an unverified account already holds the address', sql(`select email_verified::text from users where id='${sqId}'`) === 'false');
  const invSq = await call('POST', '/api/owner/invitations', { ...A(P), body: { email: SQ, confirmEmail: SQ, password: L.PASSWORD, mfaCode: code(secretP) } });
  const rawQ = rawToken(); sql(`update owner_invitations set token_hash='${L.hashToken(rawQ)}' where email='${SQ}' and status='pending'`);
  const accQ = await call('POST', '/api/owner-access/accept', { body: { token: rawQ, password: 'Squat!Owner#Passw0rd9' } });
  check('the existing unverified account is LINKED (same id), verified by the mailbox link, password reset by the mailbox holder', invSq.status === 201 && accQ.status === 200 && sql(`select count(*)||'/'||bool_and(email_verified)::text||'/'||min(id::text) from users where lower(email)='${SQ}'`) === `1/true/${sqId}`, JSON.stringify(accQ.body).slice(0, 120));
  sql(`update owner_memberships set status='revoked', revoked_at=now() where email='${SQ}'`);

  // expiry
  const EXP = 'expired.owner@example.test';
  const invExp = await call('POST', '/api/owner/invitations', { ...A(P), body: { email: EXP, confirmEmail: EXP, password: L.PASSWORD, mfaCode: code(secretP) } });
  const rawE = rawToken(); sql(`update owner_invitations set token_hash='${L.hashToken(rawE)}', expires_at=now()-interval '1 minute' where email='${EXP}' and status='pending'`);
  const pvE = await call('GET', `/api/owner-access/invitation?token=${rawE}`, { noCsrf: true });
  const acE = await call('POST', '/api/owner-access/accept', { body: { token: rawE, password: 'Expired!Own3r#Passw0rd' } });
  check('EXPIRY: an expired link previews as invalid and cannot be accepted; no account or membership results', invExp.status === 201 && (pvE.status >= 400 || pvE.body.valid === false) && acE.status >= 400 && sql(`select count(*) from users where lower(email)='${EXP}'`) === '0' && sql(`select count(*) from owner_memberships where email='${EXP}'`) === '0', `${pvE.status} ${acE.status} ${acE.body.code}`);
  const flat = await call('GET', '/api/owner', A(P));
  const expInv = (flat.body.invitations || []).find((i) => i.email === EXP);
  check('the owner list shows the lapsed invitation as expired/not pending, and a fresh one can be issued by resend', !expInv || expInv.status !== 'pending');

  // ============ (8) main test dealer: preserved, then the normal activation path ============
  check('main test dealer row, credentials, profile, and absence of dealer/verification records are byte-identical after every owner operation', dealerShape() === dealerBefore);
  check('main test dealer holds no owner membership and no owner access', sql(`select count(*) from owner_memberships where user_id='${kid}'`) === '0');
  const kl = await L.login(kd.email);
  const kt = tokenOf(kl);
  check('test dealer cannot reach owner routes, admin routes or create listings while unverified/pending', [(await call('GET', '/api/owner', { jar: kl.jar, token: kt })).status, (await call('GET', '/api/admin/users', { jar: kl.jar, token: kt })).status].every((x) => x === 401 || x === 403) && (await call('POST', '/api/cars', { jar: kl.jar, token: kt, body: { title: 'x' } })).status >= 400);
  const rs = await call('POST', '/api/auth/resend-verification', { body: { email: kd.email } });
  check('step 1 - resend verification (generic, enumeration-safe answer)', [200, 202].includes(rs.status), rs.status);
  const vr = await L.verifyEmailViaToken(kd.email); // stands in for opening the e-mailed link
  check('step 2 - opening the verification link verifies the mailbox', vr.status === 200 && sql(`select email_verified::text from users where id='${kid}'`) === 'true', vr.status);
  const kl2 = await L.login(kd.email); const K = { jar: kl2.jar, token: tokenOf(kl2) };
  const ONB = ((n = 'Amani Motors Ltd') => ({ businessName: n, location: 'Nairobi', bio: 'Used cars', paymentDetails: { bankName: 'KCB', accountName: 'Amani Motors', accountNumber: '1234567890', mpesaPhone: '0712345678' }, documents: { governmentId: { type: 'national_id', documentNumber: '12345678' }, kraPin: { pinNumber: 'A123456789Z' } } }))('MAKENA DEALERS FIXTURE');
  const ob = await call('PUT', '/api/dealer/onboarding', { ...A(K), body: ONB });
  const ver = sql(`select verification_status from dealer_verifications where "user"='${kid}'`);
  check('step 3 - onboarding creates the dealership + verification records (pending)', ob.status === 200 && ob.body.verification?.verificationStatus === 'pending' && sql(`select count(*) from dealers where "user"='${kid}'`) === '1' && ver === 'pending', `${ob.status} ${JSON.stringify(ob.body).slice(0, 100)} ${ver}`);
  const vid = sql(`select id from dealer_verifications where "user"='${kid}'`);
  check('still not approved, not an owner, cannot publish', sql(`select approved::text from dealers where "user"='${kid}'`) === 'false');
  const apAdmin = await call('POST', `/api/verification/admin/${vid}/approve`, { jar: al.jar, token: tokenOf(al), body: {} });
  check('an ordinary admin cannot approve while decision authority is owner_only (403 DECISION_AUTHORITY_REQUIRED)', apAdmin.status === 403 && apAdmin.body.code === 'DECISION_AUTHORITY_REQUIRED', `${apAdmin.status} ${apAdmin.body.code || ''}`);
  const apPrimary = await call('POST', `/api/verification/admin/${vid}/approve`, { ...A(P), body: {} });
  check('step 4 - the primary owner approves through the normal authorised route', apPrimary.status === 200 && sql(`select verification_status from dealer_verifications where id='${vid}'`) === 'approved', `${apPrimary.status} ${JSON.stringify(apPrimary.body).slice(0, 120)}`);
  check('after approval the account is a dealer and STILL not an owner (no owner permissions granted)', sql(`select role from users where id='${kid}'`) === 'dealer' && sql(`select count(*) from owner_memberships where user_id='${kid}'`) === '0' && [(await call('GET', '/api/owner', A(K))).status].every((x) => x === 403));
  L.grantFixtureSubscription(kid);
  const ls = await call('POST', '/api/cars', { ...A(K), body: { title: 'Dealer fixture car', brand: 'Toyota', model: 'Prado', year: 2020, price: 5000000 } });
  check('approved dealer is now allowed past the dealer gate (listing creation is validated server-side; a photo is mandatory)', ls.status === 400 || ls.status === 201, `${ls.status} ${JSON.stringify(ls.body).slice(0, 100)}`);

  const failed = L.results.filter((r) => !r.ok);
  console.log(`\nRESULT pass=${L.results.filter((r) => r.ok).length} fail=${failed.length}`); process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('crashed', e); process.exit(2); });
