// Dealer team enrolment, end to end with the REAL invitation link: the backend builds and "sends" the e-mail through a loopback
// provider stub (brevo_stub.cjs), the journey reads the link out of that message and the invitee uses exactly that token.
// Real backend + disposable database; no token is injected into the database. Evidence: out/team-invitation.json
import fs from 'node:fs';
import crypto from 'node:crypto';
import { makeUser, q, check, finish, Client, uid, PW, B } from './lib.mjs';

const OUT = process.env.KAYAD_CI_OUT || new URL('./out/', import.meta.url).pathname;
const LOG = `${OUT}/brevo-stub.log`, FAIL = `${OUT}/brevo-stub.fail`;
const mails = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const mailTo = (email) => mails().filter((m) => (m.to || []).some((t) => t.email === email));
const tokenFrom = (m) => { const mm = /dealer\/setup\?invite=([0-9a-f]{64})/.exec(m?.html || ''); return mm ? mm[1] : null; };
const ev = {};
const mkDealer = async (tag) => {
  const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
  q(`update users set status='approved' where id='${d.id}'`);
  q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`);
  await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: PW } }); d.csrf = null;
  return d;
};
const inv = (o, email, role = 'sales_agent') => o.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email, role } });
const row = (email, dealer) => q(`select status||'|'||coalesce(member::text,'')||'|'||role||'|'||(invite_token_hash is not null) from dealer_teams where invite_email='${email}' and dealer='${dealer}'`);

if (fs.existsSync(FAIL)) fs.rmSync(FAIL);
const A = await mkDealer('tia'), Bd = await mkDealer('tib');

// ---- A. creation + real e-mail
const newEmail = `invitee-${uid()}@example.test`;
const c1 = await inv(A, newEmail);
check('A1 invite a NOT-YET-REGISTERED person -> 201 with email.sent=true', c1.status === 201 && c1.j?.email?.sent === true, c1);
const m1 = mailTo(newEmail).at(-1); const tok1 = tokenFrom(m1);
check('A2 the provider received a message addressed to the invitee', !!m1 && m1.failed === false, m1 && { ...m1, html: undefined });
check('A3 the e-mail link points at the frontend acceptance route with a 64-hex token', !!tok1 && /\/\/127\.0\.0\.1:5173\/dealer\/setup\?invite=/.test(m1.html), (m1?.html || '').match(/href="[^"]+"/g));
check('A4 only the SHA-256 hash is stored (raw token is not in the database)', q(`select count(*) from dealer_teams where invite_token_hash='${tok1}'`) === '0' && q(`select invite_token_hash from dealer_teams where invite_email='${newEmail}'`) === crypto.createHash('sha256').update(tok1).digest('hex'));
check('A5 the e-mail states the role', /sales agent/i.test(m1?.html || ''), null);
ev.emailNamesDealership = new RegExp(A.email.split('@')[0], 'i').test(m1?.html || '') || /tia Motors/i.test(m1?.html || '');
check('A6 the e-mail names the DEALERSHIP (business name), not only a person', /tia Motors/i.test(m1?.html || ''), 'inviter display name used instead of the business name');
const expiry = q(`select extract(epoch from invite_expires_at - now())::int from dealer_teams where invite_email='${newEmail}'`);
check('A7 invitation expires in about 7 days', Number(expiry) > 6.9 * 86400 && Number(expiry) < 7.1 * 86400, expiry);
check('A8 duplicate pending invitation -> 409', (await inv(A, newEmail)).status === 409);
check('A9 invalid role -> 400', (await inv(A, `x-${uid()}@example.test`, 'god_mode')).status === 400);
check('A10 inviting yourself -> 400', (await inv(A, A.email)).status === 400);
check('A11 invitation audit event persisted', Number(q(`select count(*) from audit_logs where action='dealer_team_invitation_created'`)) >= 1);

// ---- B. delivery failure is visible and retryable; resend invalidates the previous token
fs.writeFileSync(FAIL, '1');
const failEmail = `failmail-${uid()}@example.test`;
const cf = await inv(A, failEmail);
check('B1 provider failure: invite still created (201) but email.sent=false with a reason', cf.status === 201 && cf.j?.email?.sent === false && !!cf.j?.email?.reason, cf);
check('B2 row is "invited" and the response never leaks token material', row(failEmail, A.id).startsWith('invited|') && !JSON.stringify(cf.j).match(/[0-9a-f]{64}/), cf.j);
fs.rmSync(FAIL);
const failRow = q(`select id from dealer_teams where invite_email='${failEmail}'`);
const before = mails().length;
const rs = await A.raw(`/api/dealer-platform/team/${failRow}/resend`, { method: 'POST' });
const mR = mailTo(failEmail).at(-1);
check('B3 resend after the outage -> email.sent=true and a NEW message is delivered', rs.status === 200 && rs.j?.email?.sent === true && mails().length === before + 1, rs);
const tokR = tokenFrom(mR);
const rs2 = await A.raw(`/api/dealer-platform/team/${failRow}/resend`, { method: 'POST' });
const tokR2 = tokenFrom(mailTo(failEmail).at(-1));
const failUser = await makeUser({ tag: 'failinv', email: failEmail });
check('B4 resending again invalidates the previous token', tokR !== tokR2 && (await failUser.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tokR } })).status === 404);

// ---- C. acceptance
const anon = new Client();
check('C1 accepting while signed out -> 401', (await anon.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok1 } })).status === 401);
const wrong = await makeUser({ tag: 'wrongperson' });
const wr = await wrong.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok1 } });
check('C2 a different signed-in email cannot accept (403) and the invitation stays pending', wr.status === 403 && row(newEmail, A.id).startsWith('invited|'), [wr.status, row(newEmail, A.id)]);
const otherDealer = await Bd.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok1 } });
check("C3 another dealership's owner cannot accept it (403)", otherDealer.status === 403, otherDealer.status);
const newUser = await makeUser({ tag: 'newinvitee', email: newEmail });
const acc = await newUser.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok1 } });
check('C4 NEW user registers with the invited email, signs in and accepts with the e-mailed token -> 200 active', acc.status === 200 && acc.j?.data?.status === 'active', acc);
check('C5 database: membership active, member = that user, dealer = A, role = sales_agent, token cleared', row(newEmail, A.id) === `active|${newUser.id}|sales_agent|false`, row(newEmail, A.id));
check('C6 acceptance audit event persisted', Number(q(`select count(*) from audit_logs where action='dealer_team_invitation_accepted' and actor_id='${newUser.id}'`)) === 1);
check('C7 duplicate acceptance (same token again) -> 404, no second row', (await newUser.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok1 } })).status === 404 && q(`select count(*) from dealer_teams where member='${newUser.id}'`) === '1');
const mw = await newUser.raw('/api/dealer-platform/my-workspace');
check('C8 /my-workspace reports the membership (dealership name + role)', !!mw.j?.data?.membership?.dealershipName && mw.j.data.membership.teamRole === 'sales_agent', mw.j);
ev.myWorkspace = mw.j;
check('C9 member reaches the dealer leads surface (200) but NOT team/banking/subscription', (await newUser.raw('/api/dealer-platform/leads')).status === 200 && (await newUser.raw('/api/dealer-platform/team')).status === 403 && (await newUser.raw('/api/dealer-platform/subscription')).status === 403, null);
const relog = new Client(); const lg = await relog.raw('/api/v1/auth/login', { method: 'POST', body: { email: newEmail, password: PW } });
relog.csrf = null;
check('C10 after logout/login the membership persists', lg.status === 200 && (await relog.raw('/api/dealer-platform/my-workspace')).j?.data?.membership?.teamRole === 'sales_agent');
const roster = await A.raw('/api/dealer-platform/team');
const me = (roster.j?.data?.items || []).find((i) => i.inviteEmail === newEmail);
check('C11 owner Team -> Members (server data) lists the member as active with name', me?.status === 'active' && !!me?.memberProfile?.name, me);
const rosterB = await Bd.raw('/api/dealer-platform/team');
check('C12 dealer B roster does not contain dealer A members', !(rosterB.j?.data?.items || []).some((i) => i.inviteEmail === newEmail));

// ---- D. expired / revoked / already-member / role change / removal / isolation
const expEmail = `exp-${uid()}@example.test`; await inv(A, expEmail); const tokE = tokenFrom(mailTo(expEmail).at(-1));
q(`update dealer_teams set invite_expires_at = now() - interval '1 minute' where invite_email='${expEmail}'`);
const expUser = await makeUser({ tag: 'exp', email: expEmail });
check('D1 expired invitation -> 410 and not activated', (await expUser.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tokE } })).status === 410 && row(expEmail, A.id).startsWith('invited|'));
const revEmail = `rev-${uid()}@example.test`; await inv(A, revEmail); const tokV = tokenFrom(mailTo(revEmail).at(-1));
const revId = q(`select id from dealer_teams where invite_email='${revEmail}'`);
const rv = await A.raw(`/api/dealer-platform/team/${revId}`, { method: 'DELETE' });
const revUser = await makeUser({ tag: 'rev', email: revEmail });
check('D2 revoked invitation: owner revoke 200, then acceptance -> 404 and no membership', rv.status === 200 && (await revUser.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tokV } })).status === 404 && q(`select count(*) from dealer_teams where member='${revUser.id}' and status='active'`) === '0', rv.status);
const reinv = await inv(A, revEmail);
check('D3 a revoked invitation can be re-issued (201) with a fresh working token', reinv.status === 201 && !!tokenFrom(mailTo(revEmail).at(-1)) && tokenFrom(mailTo(revEmail).at(-1)) !== tokV);
const tokV2 = tokenFrom(mailTo(revEmail).at(-1));
check('D4 re-issued token is accepted by the invited user', (await revUser.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tokV2 } })).status === 200);
// already active member invited again
check('D5 inviting an existing active member -> 409', (await inv(A, newEmail)).status === 409);
// role change
const chg = await A.raw(`/api/dealer-platform/team/${q(`select id from dealer_teams where invite_email='${newEmail}'`)}`, { method: 'PUT', body: { role: 'viewer' } });
const mw2 = await newUser.raw('/api/dealer-platform/my-workspace');
check('D6 role change takes effect on the next request (no stale cache): viewer cannot read leads', chg.status === 200 && mw2.j?.data?.membership?.teamRole === 'viewer' && (await newUser.raw('/api/dealer-platform/leads')).status === 403, [chg.status, mw2.j]);
// cross-dealer manipulation of A's member by B
const memId = q(`select id from dealer_teams where invite_email='${newEmail}'`);
const x1 = await Bd.raw(`/api/dealer-platform/team/${memId}`, { method: 'PUT', body: { role: 'manager' } });
const x2 = await Bd.raw(`/api/dealer-platform/team/${memId}`, { method: 'DELETE' });
const x3 = await Bd.raw(`/api/dealer-platform/team/${memId}/resend`, { method: 'POST' });
check("D7 dealer B cannot change/remove/resend dealer A's member (404)", [x1, x2, x3].every((r) => r.status === 404) && row(newEmail, A.id).startsWith('active|'), [x1.status, x2.status, x3.status]);
const bInv = await Bd.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: `b-${uid()}@example.test`, role: 'manager' } });
check('D8 invitation created by B belongs to B only', bInv.status === 201 && q(`select dealer from dealer_teams where id='${bInv.j.data.id}'`) === Bd.id);
// member of A cannot invite/manage (no canManageTeam)
const memInv = await newUser.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: `z-${uid()}@example.test`, role: 'viewer' } });
check('D9 a team member cannot invite (403) - hiding the button is not authorisation', memInv.status === 403, memInv.status);
// removal revokes access immediately
const del = await A.raw(`/api/dealer-platform/team/${memId}`, { method: 'DELETE' });
const afterDel = await newUser.raw('/api/dealer-platform/my-workspace');
check('D10 removing a member: 200, workspace access gone on the very next request', del.status === 200 && afterDel.j?.data?.membership === null, [del.status, afterDel.j]);
check('D11 removed member re-accepting the old (cleared) token is impossible', (await newUser.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok1 } })).status === 404);
const finalDb = q(`select count(*) from dealer_teams where dealer='${A.id}' group by invite_email having count(*)>1`);
check('D12 no duplicate membership rows per dealership+email', finalDb === '');
ev.sample = { link: (m1.html.match(/href="([^"]*dealer\/setup[^"]*)"/) || [])[1] ? '[redacted-token-link]' : null };
fs.writeFileSync(`${OUT}/team-invitation.json`, JSON.stringify(ev, null, 1));
finish('team invitation lifecycle');
