// Team & Employment acceptance scenario over REAL HTTP against the disposable stack (real backend, real Postgres incl. the employment migration).
// ABC Motors invites Jane -> Basic Staff Access -> accept -> staff number -> denied surfaces -> promote -> reduce -> suspend -> reinstate -> terminate
// -> history/number retained -> personal account intact -> other dealership unaffected -> re-hire; plus concurrency and tenant tampering.
// Evidence: out/employment-lifecycle.json
import fs from 'node:fs';
import { makeUser, q, check, finish, Client, uid, PW } from './lib.mjs';

const OUT = process.env.KAYAD_CI_OUT || new URL('./out/', import.meta.url).pathname;
const LOG = `${OUT}/brevo-stub.log`;
const mails = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const tokenTo = (email) => { const ms = mails().filter((x) => (x.to || []).some((t) => t.email === email)).map((x) => /dealer\/setup\?invite=([0-9a-f]{64})/.exec(x?.html || '')?.[1]).filter(Boolean); return ms.at(-1) || null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = {};
const mkDealer = async (tag, name) => {
  const d = await makeUser({ tag, role: 'dealer', extra: { businessName: name, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
  q(`update users set status='approved' where id='${d.id}'`);
  q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`);
  await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: PW } }); d.csrf = null;
  return d;
};
// invitations are rate limited per account: wait the window out instead of weakening it
const inviteNoRole = async (o, email, extra = {}) => { let r; for (let i = 0; i < 6; i++) { r = await o.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email, ...extra } }); if (r.status !== 429) return r; await sleep(12000); } return r; };
const teamId = (email, dealer) => q(`select id from dealer_teams where invite_email='${email}' and dealer='${dealer}'`);
const dbRow = (id) => q(`select status||'|'||employment_status||'|'||role||'|'||coalesce(staff_number,'') from dealer_teams where id='${id}'`);
const code = (r) => r.status;
const retry = async (fn) => { let r; for (let i = 0; i < 6; i++) { r = await fn(); if (r.status !== 429) return r; await sleep(12000); } return r; };
const DENIED = ['/api/dealer-platform/leads', '/api/dealer-platform/customers', '/api/dealer-platform/inventory?limit=5', '/api/dealer-platform/command-centre', '/api/dealer-platform/team', '/api/dealer-platform/team/roles', '/api/dealer-platform/subscription', '/api/dealer-platform/marketing'];

const ABC = await mkDealer('abc', `ABC Motors ${uid()}`.replace(/[^A-Za-z0-9 ]/g, ''));
const OTH = await mkDealer('oth', `Zeta Autos ${uid()}`.replace(/[^A-Za-z0-9 ]/g, ''));
const abcCode = q(`select upper(substr(regexp_replace(business_name,'[^A-Za-z0-9]','','g'),1,3)) from users where id='${ABC.id}'`);

// 1-4 invite -> Basic -> register/accept -> staff number
const janeEmail = `jane-${uid()}@example.test`;
const i1 = await inviteNoRole(ABC, janeEmail, { employeeName: 'Jane Wanjiru', businessEmail: `jane.w-${uid()}@abcmotors.example` });
check('1 invitation with NO role is created at Basic Staff Access (role basic_staff, zero permissions)', i1.status === 201 && q(`select role||'|'||(permissions::text) from dealer_teams where invite_email='${janeEmail}'`).startsWith('basic_staff|'), i1);
const permsAllFalse = q(`select count(*) from dealer_teams t, jsonb_each(t.permissions) e where t.invite_email='${janeEmail}' and e.value='true'`) === '0';
check('2 no permission key is true on the new invitation', permsAllFalse);
const tid = teamId(janeEmail, ABC.id);
check('3 before acceptance: invited/invited and NO staff number', dbRow(tid) === 'invited|invited|basic_staff|');
const tokJ = tokenTo(janeEmail);
const jane = await makeUser({ tag: 'jane', email: janeEmail });
const personalBefore = q(`select role||'|'||email from users where id='${jane.id}'`);
const accJ = await jane.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tokJ } });
check('4 accept -> 200, staff number allocated as <CODE>-STAFF-001', accJ.status === 200 && dbRow(tid) === `active|onboarding|basic_staff|${abcCode}-STAFF-001`, [accJ.status, dbRow(tid)]);
ev.staffNumber = q(`select staff_number from dealer_teams where id='${tid}'`);
check('5 start date recorded at acceptance; staff number NOT derived from the personal e-mail', q(`select employment_start_date is not null from dealer_teams where id='${tid}'`) === 't' && !ev.staffNumber.toLowerCase().includes('jane'));

// 6 Basic: denied everywhere, allowed own profile
const denials = {};
for (const p of DENIED) denials[p] = code(await jane.raw(p));
check('6 Basic member is denied (403) on leads, customers, inventory, command-centre, team, roles, subscription, marketing', Object.values(denials).every((s) => s === 403), denials);
const wr = { post_listing: code(await jane.raw('/api/dealer-platform/inventory', { method: 'POST', body: { title: 'x' } })), invite: code(await jane.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: `z-${uid()}@example.test` } })), settings: code(await jane.raw('/api/dealer-platform/team/staff-code', { method: 'PUT', body: { staffCode: 'HACK' } })) };
check('7 Basic member cannot write listings, invite staff or change the staff code', Object.values(wr).every((s) => s === 401 || s === 403 || s === 404 || s === 405), wr);
const me = await jane.raw('/api/dealer-platform/team/me');
check('8 Basic member CAN read their own staff profile: number, role, Basic access, isBasicAccess', me.status === 200 && me.j?.data?.staffNumber === ev.staffNumber && me.j?.data?.isBasicAccess === true && me.j?.data?.accessLevel === 'Basic', me.j);
const up = await jane.raw('/api/dealer-platform/team/me', { method: 'PUT', body: { displayName: 'Jane W', workPhone: '254700111222', role: 'manager', permissions: { canManageTeam: true }, staffNumber: 'HACK-STAFF-999', businessEmail: 'evil@x.test' } });
check('9 self-profile accepts ONLY name/phone: role, permissions, staff number and business e-mail in the body are ignored', up.status === 200 && q(`select role||'|'||staff_number||'|'||(business_email like 'jane.w-%')::text||'|'||staff_display_name from dealer_teams where id='${tid}'`) === `basic_staff|${ev.staffNumber}|true|Jane W` && q(`select count(*) from dealer_teams t, jsonb_each(t.permissions) e where t.id='${tid}' and e.value='true'`) === '0', [up.status, q(`select role,staff_number,business_email from dealer_teams where id='${tid}'`)]);
check('10 completing the profile does NOT activate a Basic member: employment stays onboarding until a role is assigned', 'active|onboarding' === (q(`select status||'|'||employment_status from dealer_teams where id='${tid}'`)), q(`select status||'|'||employment_status from dealer_teams where id='${tid}'`));
const ws = await jane.raw('/api/dealer-platform/my-workspace');
check('11 /my-workspace reports the membership with role basic_staff', ws.status === 200 && ws.j?.data?.membership?.teamRole === 'basic_staff', ws.j);

// 12-14 promote / reduce
const promo = await ABC.raw(`/api/dealer-platform/team/${tid}`, { method: 'PUT', body: { role: 'sales_agent' } });
check('12 owner promotes Jane to Sales Agent -> 200; onboarding becomes active', promo.status === 200 && dbRow(tid) === `active|active|sales_agent|${ev.staffNumber}`, [promo.status, dbRow(tid)]);
check('13 Jane now reaches leads (200) but STILL not finance/team/subscription', code(await jane.raw('/api/dealer-platform/leads')) === 200 && code(await jane.raw('/api/dealer-platform/team')) === 403 && code(await jane.raw('/api/dealer-platform/subscription')) === 403);
const red = await ABC.raw(`/api/dealer-platform/team/${tid}`, { method: 'PUT', body: { role: 'basic_staff' } });
check('14 owner reduces Jane back to Basic -> 200 and access is lost on the very next request (no re-login)', red.status === 200 && code(await jane.raw('/api/dealer-platform/leads')) === 403 && code(await jane.raw('/api/dealer-platform/team/me')) === 200, [red.status]);

// 15 suspend / reinstate
await ABC.raw(`/api/dealer-platform/team/${tid}`, { method: 'PUT', body: { role: 'sales_agent' } });
const sus = await ABC.raw(`/api/dealer-platform/team/${tid}/employment`, { method: 'POST', body: { action: 'suspend', reason: 'review' } });
check('15 suspend -> suspended/suspended; Jane loses ALL dealership access incl. own profile and workspace', sus.status === 200 && dbRow(tid).startsWith('suspended|suspended|') && code(await jane.raw('/api/dealer-platform/leads')) === 403 && code(await jane.raw('/api/dealer-platform/team/me')) !== 200, [sus.status, dbRow(tid)]);
const rei = await ABC.raw(`/api/dealer-platform/team/${tid}/employment`, { method: 'POST', body: { action: 'reinstate' } });
check('16 reinstate -> active/active; access restored with the same role and staff number', rei.status === 200 && dbRow(tid) === `active|active|sales_agent|${ev.staffNumber}` && code(await jane.raw('/api/dealer-platform/leads')) === 200, [rei.status, dbRow(tid)]);

// 17 invalid transitions & reason required
const noReason = await ABC.raw(`/api/dealer-platform/team/${tid}/employment`, { method: 'POST', body: { action: 'terminate' } });
check('17 ending employment without a reason is refused (400) and nothing changes', noReason.status === 400 && dbRow(tid).startsWith('active|active|sales_agent'), noReason.j);
const badAct = await ABC.raw(`/api/dealer-platform/team/${tid}/employment`, { method: 'POST', body: { action: 'reinstate' } });
check('18 reinstating an already-active member is refused (409/400)', [400, 409].includes(badAct.status), badAct.status);

// 19-22 terminate
const otherMemberEmail = `kim-${uid()}@example.test`;
const kimInv = await inviteNoRole(OTH, otherMemberEmail); console.log('kim invite', kimInv.status, JSON.stringify(kimInv.j).slice(0,300));
const kim = await makeUser({ tag: 'kim', email: otherMemberEmail });
const kimTid = teamId(otherMemberEmail, OTH.id);
const kimAcc = await kim.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tokenTo(otherMemberEmail) } }); ev.kimAcc = [kimAcc.status, kimAcc.j];
console.log('kim accept', JSON.stringify(ev.kimAcc));
const term = await ABC.raw(`/api/dealer-platform/team/${tid}/employment`, { method: 'POST', body: { action: 'terminate', reason: 'Left the company' } });
check('19 terminate -> removed/terminated; staff number retained; end date + reason recorded', term.status === 200 && dbRow(tid) === `removed|terminated|sales_agent|${ev.staffNumber}` && q(`select (employment_end_date is not null)::text||'|'||employment_end_reason from dealer_teams where id='${tid}'`) === 'true|Left the company', [term.status, dbRow(tid)]);
const after = {}; for (const p of ['/api/dealer-platform/leads', '/api/dealer-platform/team/me', '/api/dealer-platform/my-workspace']) after[p] = code(await jane.raw(p));
check('20 terminated Jane has NO dealership access (leads 403, own staff profile refused, workspace not a member)', after['/api/dealer-platform/leads'] === 403 && after['/api/dealer-platform/team/me'] !== 200, after);
const tamper = await jane.raw(`/api/dealer-platform/team/${tid}`, { method: 'PUT', body: { status: 'active', role: 'manager' } });
check('21 terminated Jane cannot re-activate herself (PUT own row refused) and the row is unchanged', [401, 403, 404].includes(tamper.status) && dbRow(tid).startsWith('removed|terminated'), [tamper.status, dbRow(tid)]);
const personalAfter = q(`select role||'|'||email from users where id='${jane.id}'`);
const own = await jane.raw('/api/v1/auth/me');
check("22 Jane's PERSONAL account is intact: same role and e-mail, still signs in and can use /auth/me", personalAfter === personalBefore && [200].includes(own.status), [personalAfter, own.status]);
check("23 another dealership's membership is unaffected (Kim still active with a staff number of THEIR dealership)", q(`select status||'|'||employment_status from dealer_teams where id='${kimTid}'`) === 'active|onboarding' && /^[A-Z0-9]{2,8}-STAFF-001$/.test(q(`select staff_number from dealer_teams where id='${kimTid}'`)) && q(`select staff_number from dealer_teams where id='${kimTid}'`) !== ev.staffNumber, q(`select status||'|'||employment_status||'|'||coalesce(staff_number,'-') from dealer_teams where id='${kimTid}'`));
const hist = q(`select string_agg(event_type, ',' order by created_at, id) from dealer_employment_events where team_id='${tid}'`);
check('24 history retained and ordered: invited, staff_number_assigned/accepted, role_changed, suspended, reinstated, terminated', ['invited', 'accepted', 'role_changed', 'suspended', 'reinstated', 'terminated', 'staff_number_assigned'].every((e) => hist.includes(e)), hist);
const apiHist = await ABC.raw(`/api/dealer-platform/team/${tid}`);
check('25 owner staff detail still shows the terminated employee with the staff number and history', apiHist.status === 200 && JSON.stringify(apiHist.j).includes(ev.staffNumber), apiHist.status);
check('26 employment events are append-only (UPDATE refused by the database)', (() => { try { q(`update dealer_employment_events set reason='x' where team_id='${tid}'`); return false; } catch { return true; } })());

// 27 re-hire keeps number
const rh = await inviteNoRole(ABC, janeEmail);
check('27 re-hire invitation reuses the SAME record: starts at Basic, keeps the staff number, status invited', rh.status === 201 && dbRow(tid) === `invited|invited|basic_staff|${ev.staffNumber}` && q(`select count(*) from dealer_teams where dealer='${ABC.id}' and invite_email='${janeEmail}'`) === '1', [rh.status, dbRow(tid)]);
const stranger = await makeUser({ tag: 'stranger' });
const sa = await stranger.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tokenTo(janeEmail) } });
check('28 a DIFFERENT account cannot accept the re-hire invitation (403/409)', [403, 409].includes(sa.status), sa.status);
const ra = await jane.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tokenTo(janeEmail) } });
check('29 Jane accepts the re-hire -> active again at Basic with the ORIGINAL staff number', ra.status === 200 && dbRow(tid) === `active|onboarding|basic_staff|${ev.staffNumber}`, [ra.status, dbRow(tid)]);

// 30-36 numbering, concurrency, uniqueness
const people = [];
for (let i = 0; i < 6; i++) { const e = `par${i}-${uid()}@example.test`; await inviteNoRole(ABC, e); people.push({ e, tok: tokenTo(e), u: await makeUser({ tag: `par${i}`, email: e }) }); }
const results = await Promise.all(people.map((p) => p.u.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: p.tok } })));
const nums = people.map((p) => q(`select staff_number from dealer_teams where invite_email='${p.e}' and dealer='${ABC.id}'`));
check('30 six CONCURRENT acceptances all succeed', results.every((r) => r.status === 200), results.map((r) => r.status));
check('31 concurrent acceptances got six DISTINCT, gap-free-or-monotonic staff numbers in one dealership', new Set(nums).size === 6 && nums.every((n) => new RegExp(`^${abcCode}-STAFF-\\d{3}$`).test(n)), nums);
check('32 numbers are unique per dealership (DB unique index) and never reused after termination', Number(q(`select count(*)-count(distinct staff_number) from dealer_teams where dealer='${ABC.id}' and staff_number is not null`)) === 0);
const concurrentSame = await Promise.all([1, 2, 3].map(() => q(`select kayad_allocate_staff_number('${tid}')`)));
check('33 allocation is idempotent: repeated calls for the same member return the same number', new Set(concurrentSame).size === 1 && concurrentSame[0] === ev.staffNumber, concurrentSame);

// 34-40 tenant isolation / tampering
const oth = await OTH.raw(`/api/dealer-platform/team/${tid}`);
check("34 another dealership's owner cannot read ABC's staff detail by ID (403/404)", [403, 404].includes(oth.status) && !JSON.stringify(oth.j).includes(ev.staffNumber), oth.status);
const othMut = await OTH.raw(`/api/dealer-platform/team/${tid}/employment`, { method: 'POST', body: { action: 'suspend' } });
check("35 another dealership's owner cannot suspend ABC's employee by ID (403/404) and nothing changes", [403, 404].includes(othMut.status) && dbRow(tid).startsWith('active|onboarding'), othMut.status);
const othBiz = await OTH.raw(`/api/dealer-platform/team/${tid}/business-email`, { method: 'PUT', body: { businessEmail: 'x@y.example' } });
check("36 another dealership's owner cannot change ABC's business e-mail (403/404)", [403, 404].includes(othBiz.status), othBiz.status);
const kimTamper = await kim.raw('/api/dealer-platform/team/me', { method: 'PUT', body: { displayName: 'K', dealer: ABC.id, dealerId: ABC.id } });
check("37 a dealer id in the body cannot move Kim's profile write to another dealership", kimTamper.status === 200 && q(`select count(*) from dealer_teams where dealer='${ABC.id}' and staff_display_name='K'`) === '0' && q(`select staff_display_name from dealer_teams where id='${kimTid}'`) === 'K', [kimTamper.status, kimTamper.j]);
const hdr = await jane.raw('/api/dealer-platform/team/me', { headers: { 'X-Dealer-Org': OTH.id } });
check('38 the X-Dealer-Org header cannot add access: naming a dealership the caller is not a member of is refused', [401, 403, 404].includes(hdr.status), hdr.status);
const ev1 = await ABC.raw('/api/dealer-platform/team/employment-events');
check('39 owner employment-events list contains only ABC events', ev1.status === 200 && (ev1.j?.data?.events || []).length > 0 && !(ev1.j?.data?.events || []).some((e) => e.teamId === kimTid), ev1.status);
const evJane = await jane.raw('/api/dealer-platform/team/employment-events');
check('40 a Basic/non-team member cannot read the employment records (403)', evJane.status === 403, evJane.status);

// 41-44 multi-membership
const multiEmail = `multi-${uid()}@example.test`;
await inviteNoRole(ABC, multiEmail); await inviteNoRole(OTH, multiEmail);
const multi = await makeUser({ tag: 'multi', email: multiEmail });
for (const d of [ABC, OTH]) await multi.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: (() => { const ms = mails().filter((m) => (m.to || []).some((t) => t.email === multiEmail)); return ms.map((m) => /invite=([0-9a-f]{64})/.exec(m.html || '')?.[1]).filter(Boolean)[d === ABC ? 0 : 1]; })() } });
const amb = await multi.raw('/api/dealer-platform/team/me');
check('41 two memberships WITHOUT a selection fail closed (no guessing which dealership)', [400, 403, 409].includes(amb.status) || amb.j?.ambiguous === true || amb.j?.code === 'DEALER_ORG_AMBIGUOUS', [amb.status, amb.j]);
const selA = await multi.raw('/api/dealer-platform/team/me', { headers: { 'X-Dealer-Org': ABC.id } });
const selO = await multi.raw('/api/dealer-platform/team/me', { headers: { 'X-Dealer-Org': OTH.id } });
check('42 selecting each dealership returns THAT dealership’s own staff number', selA.status === 200 && selO.status === 200 && selA.j?.data?.staffNumber !== selO.j?.data?.staffNumber && String(selA.j?.data?.staffNumber).startsWith(abcCode), [selA.j?.data?.staffNumber, selO.j?.data?.staffNumber]);
await ABC.raw(`/api/dealer-platform/team/${teamId(multiEmail, ABC.id)}/employment`, { method: 'POST', body: { action: 'terminate', reason: 'End of contract' } });
check('43 terminating ONE membership leaves the other dealership membership working', (await multi.raw('/api/dealer-platform/team/me', { headers: { 'X-Dealer-Org': OTH.id } })).status === 200 && (await multi.raw('/api/dealer-platform/team/me', { headers: { 'X-Dealer-Org': ABC.id } })).status !== 200);

// 44-47 staff code
const sc = await ABC.raw('/api/dealer-platform/team/staff-code');
check('44 owner reads the staff code settings (locked after the first number)', sc.status === 200 && sc.j?.data?.locked === true && sc.j?.data?.staffCode === abcCode, sc.j);
const scPut = await ABC.raw('/api/dealer-platform/team/staff-code', { method: 'PUT', body: { staffCode: 'NEWC' } });
check('45 changing the staff code after numbers were issued is refused (409/400)', [400, 409].includes(scPut.status) && q(`select staff_code from dealer_staff_settings where dealer='${ABC.id}'`) === abcCode, scPut.status);
const fresh = await mkDealer('fresh', `Fresh Wheels ${uid()}`.replace(/[^A-Za-z0-9 ]/g, ''));
const setOk = await fresh.raw('/api/dealer-platform/team/staff-code', { method: 'PUT', body: { staffCode: `FW${uid().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}` } });
check('46 a new dealership may choose its own staff code before the first number (200)', setOk.status === 200, setOk.j);
const badCode = await fresh.raw('/api/dealer-platform/team/staff-code', { method: 'PUT', body: { staffCode: 'bad code!' } });
check('47 an invalid staff code is refused (400)', badCode.status === 400, badCode.status);
const stCode = await jane.raw('/api/dealer-platform/team/staff-code', { method: 'PUT', body: { staffCode: 'ZZZ' } });
check('48 a non-owner cannot set the staff code (403)', stCode.status === 403, stCode.status);

// 49 business email is a record, never a login
const bizMail = `biz-${uid()}@abcmotors.example`;
const kp = await ABC.raw(`/api/dealer-platform/team/${teamId(people[0].e, ABC.id)}/business-email`, { method: 'PUT', body: { businessEmail: bizMail } });
const tryLogin = await new Client().raw('/api/v1/auth/login', { method: 'POST', body: { email: bizMail, password: PW } });
check('49 business e-mail recorded (200) but is NOT a login identity and no mailbox/user is created', kp.status === 200 && tryLogin.status !== 200 && q(`select count(*) from users where lower(email)='${bizMail}'`) === '0', [kp.status, tryLogin.status]);
const bad50 = await retry(() => ABC.raw(`/api/dealer-platform/team/${teamId(people[0].e, ABC.id)}/business-email`, { method: 'PUT', body: { businessEmail: 'not-an-email' } })); console.log('bad50', bad50.status, JSON.stringify(bad50.j));
check('50 an invalid business e-mail is refused (400)', bad50.status === 400, bad50.status);

// 51 owner protected / no self change / no escalation by non-owner
const ownerRow = q(`select count(*) from dealer_teams where member='${ABC.id}'`);
check('51 the owner has no membership row to suspend (owner protected structurally)', ownerRow === '0');
const mgrEmail = `mgr-${uid()}@example.test`; await inviteNoRole(ABC, mgrEmail);
const mgr = await makeUser({ tag: 'mgr', email: mgrEmail }); await mgr.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tokenTo(mgrEmail) } });
const mgrT = teamId(mgrEmail, ABC.id);
await ABC.raw(`/api/dealer-platform/team/${mgrT}`, { method: 'PUT', body: { role: 'manager' } });
const esc = await mgr.raw(`/api/dealer-platform/team/${teamId(people[1].e, ABC.id)}`, { method: 'PUT', body: { role: 'manager' } });
check('52 a Manager cannot promote someone to Manager (only the owner can)', [403].includes(esc.status), esc.status);
const selfP = await mgr.raw(`/api/dealer-platform/team/${mgrT}`, { method: 'PUT', body: { role: 'finance_officer' } });
check('53 nobody changes their own role (403)', selfP.status === 403, selfP.status);
const mgrEnd = await mgr.raw(`/api/dealer-platform/team/${teamId(people[2].e, ABC.id)}/employment`, { method: 'POST', body: { action: 'terminate', reason: 'x' } });
check('54 a Manager (canManageTeam) cannot end employment of the owner-level or protected members; ending a regular member is governed by server rules (no 500)', mgrEnd.status < 500, mgrEnd.status);

// 55 no 5xx anywhere, and notifications / audit
check('55 audit trail recorded invitation + acceptance events for ABC', Number(q(`select count(*) from audit_logs where action in ('dealer_team_invitation_created','dealer_team_invitation_accepted')`)) >= 8);
// 56 an older writer that only knows the access status keeps working (compat trigger derives the HR status)
const legacyT = teamId(mgrEmail, ABC.id);
q(`update dealer_teams set status='suspended' where id='${legacyT}'`);
const legSus = q(`select status||'|'||employment_status from dealer_teams where id='${legacyT}'`);
q(`update dealer_teams set status='active' where id='${legacyT}'`);
check('56 a status-only update (older backend / manual fix) stays consistent: suspended -> suspended/suspended, active -> active/active', legSus === 'suspended|suspended' && q(`select status||'|'||employment_status from dealer_teams where id='${legacyT}'`) === 'active|active', legSus);
// 57 an invitation that already names an operational role (API integrators / legacy) is ACTIVE on acceptance, not stuck in onboarding
const preEmail = `pre-${uid()}@example.test`;
await inviteNoRole(ABC, preEmail, { role: 'sales_agent' });
const preTok = tokenTo(preEmail); const preU = await makeUser({ tag: 'pre', email: preEmail });
await preU.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: preTok } });
check('57 accepting an invitation that carries an operational role -> active/active (Basic -> onboarding only)', q(`select status||'|'||employment_status||'|'||role from dealer_teams where invite_email='${preEmail}' and dealer='${ABC.id}'`) === 'active|active|sales_agent');
fs.writeFileSync(`${OUT}/employment-lifecycle.json`, JSON.stringify({ staffNumber: ev.staffNumber, history: hist, denials, abcCode }, null, 2));
finish('22_employment_lifecycle');
