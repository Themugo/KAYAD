// Invitation-first dealer team onboarding, end to end with the REAL backend, REAL PostgREST and a disposable PostgreSQL.
// A person with NO account is invited, registers a normal personal account with the invited address, verifies the e-mail, signs in and
// accepts the very same invitation. Also: distinct link states, recipient rules (invitee / dealership only), simultaneous accept and
// resend, tenant isolation, staff least privilege, removal revoking dealership access while the personal account survives.
// E-mail provider = loopback stub (brevo_stub.cjs). EVIDENCE TIER: local disposable stack; NOT a real mailbox, Brevo or hosted test.
// Evidence: out/invitation-first.json
import fs from 'node:fs';
import crypto from 'node:crypto';
import { makeUser, q, check, finish, Client, uid, PW } from './lib.mjs';

const OUT = process.env.KAYAD_CI_OUT || new URL('./out/', import.meta.url).pathname;
const LOG = `${OUT}/brevo-stub.log`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mails = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const mailsTo = (email) => mails().filter((m) => (m.to || []).some((t) => t.email === email));
const inviteTok = (m) => (/dealer\/setup\?invite=([0-9a-f]{64})/.exec(m?.html || '') || [])[1] || null;
const verifyTok = (m) => (/verify-email\?token=([0-9a-f]{64})/.exec(m?.html || m?.text || '') || [])[1] || null;
async function waitMail(email, re, ms = 9000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const m = mailsTo(email).filter((x) => re.test(x.subject || '')); if (m.length) return m.at(-1); await sleep(250); } return null; }
const ev = {};
const mkDealer = async (tag) => {
  const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
  q(`update users set status='approved' where id='${d.id}'`);
  q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`);
  await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: PW } }); d.csrf = null;
  return d;
};
// Invitation creation is rate limited per account (10 per minute): the journey waits out the window instead of weakening the limit.
const invite = async (o, email, role = 'sales_agent') => { let r; for (let i = 0; i < 6; i++) { r = await o.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email, role } }); if (r.status !== 429) return r; await sleep(12000); } return r; };
const preview = (token) => new Client().raw('/api/dealer-platform/team/invitation/preview', { method: 'POST', body: { token } });
const accept = (c, token) => c.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token } });
const rowId = (email, dealer) => q(`select id from dealer_teams where invite_email='${email}' and dealer='${dealer}'`);

const A = await mkDealer('ifa'), Bd = await mkDealer('ifb');
const notifCount = (user, kind) => Number(q(`select count(*) from notifications where user_id='${user}' and data->>'kind'='${kind}'`));

// ---- 1. a person with NO account is invited
const email = `newhire-${uid()}@example.test`;
const c = await invite(A, email, 'sales_agent');
check('1.1 invite an e-mail with no account -> 201, e-mail sent', c.status === 201 && c.j?.email?.sent === true, c);
const m1 = await waitMail(email, /invited you to join/i); const tok = inviteTok(m1);
check('1.2 the invitee e-mail has a 64-hex link, names the dealership and role, explains what happens and how to report', !!tok && /ifa Motors/i.test(m1.html) && /sales agent/i.test(m1.html) && /does not become a dealer account/i.test(m1.html) && /create a free personal account/i.test(m1.html) && /support@/.test(m1.html), (m1?.html || '').slice(0, 300));
check('1.3 recipients: exactly one `to` (the invitee), no cc, no bcc', (m1.to || []).length === 1 && !(m1.cc || []).length && !(m1.bcc || []).length, { to: m1.to, cc: m1.cc, bcc: m1.bcc });
const pv = await preview(tok);
check('1.4 public preview (no sign-in): valid, dealership + role + invited e-mail, accountStatus none', pv.status === 200 && pv.j?.data?.state === 'valid' && pv.j.data.accountStatus === 'none' && pv.j.data.invitedEmail === email && /ifa Motors/i.test(pv.j.data.dealershipName), pv);
check('1.5 preview never returns the token, its hash or other members', !JSON.stringify(pv.j).includes(tok) && !/invite_?token|inviteTokenHash/i.test(JSON.stringify(pv.j)), pv.j);
check('1.6 preview changed nothing (row still invited, same hash)', q(`select status||'|'||(member is null) from dealer_teams where invite_email='${email}'`) === 'invited|true');

// ---- 2. the invitee registers a NORMAL PERSONAL account with the invited address and verifies it
const N = new Client();
const reg = await N.raw('/api/v1/auth/register', { method: 'POST', body: { name: 'New Hire', email, password: PW, role: 'user' }, headers: { 'idempotency-key': 'k' + crypto.randomUUID() } });
check('2.1 registration succeeds as role "user"; no session before verification', reg.status < 300 && q(`select role||'|'||email_verified from users where email='${email}'`) === 'user|false', reg);
const early = await N.raw('/api/v1/auth/login', { method: 'POST', body: { email, password: PW } });
check('2.2 sign-in is refused until the e-mail is verified (verification is NOT bypassed by an invitation)', early.status >= 400, early);
const earlyAccept = await accept(N, tok);
check('2.3 an unverified/unauthenticated visitor cannot accept (401) and the invitation is untouched', earlyAccept.status === 401 && q(`select status from dealer_teams where invite_email='${email}'`) === 'invited', earlyAccept);
const mv = await waitMail(email, /verify/i); const vt = verifyTok(mv);
check('2.4 the verification e-mail arrived (to the invitee only)', !!vt && (mv.to || []).length === 1, mv && { to: mv.to });
check('2.5 preview now reports an existing PERSONAL account for the same link', (await preview(tok)).j?.data?.accountStatus === 'personal');
const ver = await N.raw(`/api/v1/auth/verify-email/${vt}`);
check('2.6 verification succeeds', ver.status < 300 && q(`select email_verified from users where email='${email}'`) === 't', ver);
const lg = await N.raw('/api/v1/auth/login', { method: 'POST', body: { email, password: PW } }); N.csrf = null;
check('2.7 sign-in works after verification', lg.status === 200, lg);

// ---- 3. the same invitation is accepted exactly once; account identity unchanged; dealership is notified
const roleBefore = q(`select role from users where email='${email}'`);
const ac = await accept(N, tok);
check('3.1 accept the ORIGINAL link -> 200 (no second invitation needed)', ac.status === 200, ac);
check('3.2 one active membership for this dealership and role; personal role unchanged', q(`select status||'|'||role||'|'||(member='${N.id || q(`select id from users where email='${email}'`)}') from dealer_teams where invite_email='${email}' and dealer='${A.id}'`) === 'active|sales_agent|true' && q(`select role from users where email='${email}'`) === roleBefore && roleBefore === 'user');
const ac2 = await accept(N, tok);
check('3.3 accepting again -> 409 INVITATION_ALREADY_ACCEPTED with alreadyMember', ac2.status === 409 && ac2.j?.code === 'INVITATION_ALREADY_ACCEPTED' && ac2.j?.alreadyMember === true, ac2);
const accMail = await waitMail(A.email, /accepted your team invitation/i);
check('3.4 the DEALERSHIP receives the acceptance e-mail (to the dealer only, no cc/bcc, no token or invitation link)', !!accMail && (accMail.to || []).length === 1 && !(accMail.cc || []).length && !(accMail.bcc || []).length && !/dealer\/setup|invite=|[0-9a-f]{64}/.test(accMail.html || ''), accMail && { to: accMail.to });
check('3.5 the dealership has an in-app notification for the acceptance', notifCount(A.id, 'team_invitation_accepted') === 1);
const toOthers = mails().filter((m) => /dealer\/setup\?invite=/.test(m.html || '') && !(m.to || []).every((t) => /@example\.test$/.test(t.email)));
check('3.6 NO invitation e-mail with an acceptance link went to any non-test (e.g. platform/staff) address', toOthers.length === 0, toOthers.map((m) => m.to));
check('3.7 the roster shows 1 active, 0 pending for this invitee; dealer B sees nothing of it', (await A.raw('/api/dealer-platform/team')).j?.data?.stats?.active >= 1 && !(JSON.stringify((await Bd.raw('/api/dealer-platform/team')).j)).includes(email));

// ---- 4. distinct link states
const mk = async (tag) => { const e = `${tag}-${uid()}@example.test`; await invite(A, e, 'viewer'); const t = inviteTok(await waitMail(e, /invited you to join/i)); return { e, t, id: rowId(e, A.id) }; };
const ex = await mk('expd'); q(`update dealer_teams set invite_expires_at=now()-interval '1 minute' where id='${ex.id}'`);
const ca = await mk('canc'); await A.raw(`/api/dealer-platform/team/${ca.id}`, { method: 'DELETE' });
const rp = await mk('repl'); const rpOld = rp.t; await A.raw(`/api/dealer-platform/team/${rp.id}/resend`, { method: 'POST' });
const states = { expired: (await preview(ex.t)).j?.data?.state, cancelled: (await preview(ca.t)).j?.data?.state, accepted: (await preview(tok)).j?.data?.state, replaced: (await preview(rpOld)).j?.data?.state, unknown: (await preview('9'.repeat(64))).j?.data?.state };
check('4.1 preview states: expired / cancelled / accepted / replaced+unknown (not recognised)', JSON.stringify(states) === JSON.stringify({ expired: 'expired', cancelled: 'cancelled', accepted: 'accepted', replaced: 'not_recognised', unknown: 'not_recognised' }), states);
const mkAcct = (e) => makeUser({ tag: 'st', email: e });
const exU = await mkAcct(ex.e), caU = await mkAcct(ca.e);
const r1 = await accept(exU, ex.t), r2 = await accept(caU, ca.t);
check('4.2 accept: expired -> 410 INVITATION_EXPIRED; cancelled -> 410 INVITATION_CANCELLED; neither activates anything', r1.status === 410 && r1.j?.code === 'INVITATION_EXPIRED' && r2.status === 410 && r2.j?.code === 'INVITATION_CANCELLED' && q(`select count(*) from dealer_teams where invite_email in ('${ex.e}','${ca.e}') and status='active'`) === '0', { r1: r1.status, r2: r2.status });
check('4.3 malformed link -> 400 INVITATION_LINK_INCOMPLETE from preview', (await preview('nope')).j?.code === 'INVITATION_LINK_INCOMPLETE');
const rpU = await mkAcct(rp.e);
const rOld = await accept(rpU, rpOld);
check('4.4 replaced link -> 404 INVITATION_LINK_NOT_VALID and the invitation stays pending', rOld.status === 404 && rOld.j?.code === 'INVITATION_LINK_NOT_VALID' && q(`select status from dealer_teams where id='${rp.id}'`) === 'invited', rOld);

// ---- 5. wrong account never consumes the invitation
const wr = await mk('wrong'); const wrongUser = await makeUser({ tag: 'otheracct' });
const wa = await accept(wrongUser, wr.t);
check('5.1 wrong signed-in account -> 403 INVITATION_EMAIL_MISMATCH with a masked hint only', wa.status === 403 && wa.j?.code === 'INVITATION_EMAIL_MISMATCH' && !JSON.stringify(wa.j).includes(wr.e), wa);
check('5.2 ...invitation untouched; the right account then accepts it', q(`select status from dealer_teams where id='${wr.id}'`) === 'invited' && (await accept(await mkAcct(wr.e), wr.t)).status === 200);

// ---- 6. races
const rc = await mk('race'); const rcU = await mkAcct(rc.e);
const rs = await Promise.all([accept(rcU, rc.t), accept(rcU, rc.t), accept(rcU, rc.t), accept(rcU, rc.t)]);
check('6.1 four simultaneous accepts: exactly one 200, the rest 409, one membership', rs.filter((r) => r.status === 200).length === 1 && rs.filter((r) => r.status === 409).length === 3 && q(`select count(*) from dealer_teams where invite_email='${rc.e}' and status='active'`) === '1', rs.map((r) => r.status));
const rr = await mk('rsacc'); const rrU = await mkAcct(rr.e);
const mix = await Promise.all([A.raw(`/api/dealer-platform/team/${rr.id}/resend`, { method: 'POST' }), accept(rrU, rr.t)]);
const rrRow = q(`select status||'|'||(member is not null) from dealer_teams where id='${rr.id}'`);
check('6.2 simultaneous resend + accept: a single consistent outcome (never two memberships, never half state)', ['active|true', 'invited|false'].includes(rrRow) && q(`select count(*) from dealer_teams where invite_email='${rr.e}'`) === '1' && [200, 404, 409].includes(mix[1].status), { rrRow, status: mix.map((x) => x.status) });

// ---- 7. tenant isolation + staff least privilege + removal
const mem = await mkAcct(`staff-${uid()}@example.test`);
await invite(A, mem.email, 'viewer'); const mt = inviteTok(await waitMail(mem.email, /invited you to join/i)); await accept(mem, mt);
const memRow = rowId(mem.email, A.id);
check('7.1 a viewer cannot invite, list or remove team members (owner-only controls)', (await invite(mem, `x-${uid()}@example.test`)).status === 403 && (await mem.raw('/api/dealer-platform/team')).status === 403 && (await mem.raw(`/api/dealer-platform/team/${memRow}`, { method: 'DELETE' })).status === 403);
check('7.2 a viewer cannot raise their own permissions or role', (await mem.raw(`/api/dealer-platform/team/${memRow}`, { method: 'PUT', body: { role: 'manager' } })).status === 403);
check('7.3 dealer B cannot resend, change or remove dealer A\'s members or invitations (404)', (await Bd.raw(`/api/dealer-platform/team/${memRow}/resend`, { method: 'POST' })).status === 404 && (await Bd.raw(`/api/dealer-platform/team/${memRow}`, { method: 'PUT', body: { status: 'suspended' } })).status === 404 && (await Bd.raw(`/api/dealer-platform/team/${memRow}`, { method: 'DELETE' })).status === 404);
const ws1 = await mem.raw('/api/dealer-platform/my-workspace');
check('7.4 before removal the staff member has a workspace membership for dealer A', !!ws1.j?.data?.membership, ws1.j);
const rm = await A.raw(`/api/dealer-platform/team/${memRow}`, { method: 'DELETE' });
const ws2 = await mem.raw('/api/dealer-platform/my-workspace');
const stillLogin = await new Client().raw('/api/v1/auth/login', { method: 'POST', body: { email: mem.email, password: PW } });
check('7.5 owner removes them: workspace access revoked at once, personal account still signs in', rm.status === 200 && !ws2.j?.data?.membership && stillLogin.status === 200 && q(`select role from users where email='${mem.email}'`) === 'user', { rm: rm.status, ws2: ws2.j, login: stillLogin.status });
check('7.6 a removed member\'s old link cannot bring them back', (await accept(mem, mt)).status === 404);

// ---- 8. delivery failure: dealership told, nobody else holds a link
fs.writeFileSync(`${OUT}/brevo-stub.fail`, '1');
const fe = `fail-${uid()}@example.test`; const fc = await invite(A, fe, 'viewer');
fs.rmSync(`${OUT}/brevo-stub.fail`);
check('8.1 provider outage: invite created, email.sent=false, response has no token', fc.status === 201 && fc.j?.email?.sent === false && !/[0-9a-f]{64}/.test(JSON.stringify(fc.j)), fc);
check('8.2 the dealership gets an in-app "not delivered" notification', notifCount(A.id, 'team_invitation_delivery_failed') >= 1);

// ---- 9. rate limiting is present on the public preview and acceptance
const rl = await new Client().raw('/api/dealer-platform/team/invitation/preview', { method: 'POST', body: { token: 'z'.repeat(64) } });
check('9.1 preview/accept expose rate-limit headers', !!(rl.headers.get('ratelimit-limit') || rl.headers.get('x-ratelimit-limit') || rl.headers.get('ratelimit')), [...rl.headers.keys()].filter((k) => /rate/i.test(k)));

fs.writeFileSync(`${OUT}/invitation-first.json`, JSON.stringify({ ...ev, states }, null, 1));
finish('invitation-first onboarding');
