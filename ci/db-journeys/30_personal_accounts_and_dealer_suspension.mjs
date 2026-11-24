// Personal Accounts API + formal dealer suspension (request -> Super Admin decision), over real HTTP against the disposable database.
// No payment, escrow or hosted object is touched. Every actor calls the API directly (no UI), so frontend guards prove nothing here.
import crypto from 'node:crypto';
import { makeUser, q, check, finish, uid, PW, B } from './lib.mjs';

const owner = async () => { const a = await makeUser({ tag: 'own30', dbRole: 'superadmin' }); q(`update users set email='prev-owner-'||id||'@example.test' where email='ci-owner@example.test'`); q(`update users set email='ci-owner@example.test' where id='${a.id}'`); a.csrf = null; await a.raw('/api/v1/auth/login', { method: 'POST', body: { email: 'ci-owner@example.test', password: PW } }); a.csrf = null; return a; };
const secondSuper = () => makeUser({ tag: 'sa230', dbRole: 'superadmin' });
const staff = (role, tag) => makeUser({ tag: tag || role.slice(0, 5) + '30', dbRole: role });
const dealer = async (tag) => {
  const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `Susp ${uid()} Motors`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
  q(`update users set status='approved' where id='${d.id}'`);
  q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`);
  let vid = q(`select id from dealer_verifications where "user"='${d.id}'`);
  if (!vid) { q(`insert into dealer_verifications ("user", dealer, verification_status) select '${d.id}', id, 'approved' from dealers where "user"='${d.id}'`); vid = q(`select id from dealer_verifications where "user"='${d.id}'`); }
  else q(`update dealer_verifications set verification_status='approved' where id='${vid}'`);
  await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: PW } }); d.csrf = null;
  d.vid = vid; return d;
};
const REASON = 'Repeated listing misrepresentation reported by three buyers';
const body = (extra = {}) => ({ reasonCategory: 'fraud_or_misrepresentation', reason: REASON, evidenceReference: 'CASE-1042', ...extra });

const SA = await owner();
const SA2 = await secondSuper();
const ADMIN = await staff('admin', 'adm30');
const ADMIN2 = await staff('admin', 'ad230');
const MOD = await staff('moderator');
const PERSONAL = await makeUser({ tag: 'per30' });
const PERSONAL2 = await makeUser({ tag: 'pr230' }); // never banned: its session stays valid for the authorization checks (banning revokes sessions)
const D1 = await dealer('dl130');
const D2 = await dealer('dl230');

// ===================== A. Personal Accounts API =====================
{
  const legacy = await makeUser({ tag: 'leg30', dbRole: 'individual_seller' });
  q(`update users set status='pending', email_verified=true where id='${legacy.id}'`);
  const p0 = await ADMIN.raw('/api/private-seller-capability/admin/accounts?limit=50&q=' + encodeURIComponent('@'));
  check('A1 accounts list works with NO historical application rows', p0.status === 200 && Array.isArray(p0.j?.data?.accounts), [p0.status, p0.j?.message]);
  const mine = p0.j?.data?.accounts?.find((a) => a.id === PERSONAL.id);
  check('A2 a plain personal account is listed as personal/active with no application', mine && mine.accountType === 'personal' && mine.accountState === 'active' && mine.historicalApplication === null, mine);
  const leg = (await ADMIN.raw('/api/private-seller-capability/admin/accounts?q=' + encodeURIComponent(legacy.email))).j?.data?.accounts?.[0];
  check('A3 legacy seller is shown as personal (legacy) with its old status as a historical value, not as approval', leg?.accountType === 'personal_legacy' && leg.legacyRecordStatus === 'pending' && leg.accountState === 'active', leg);
  const dealerLeak = (await ADMIN.raw('/api/private-seller-capability/admin/accounts?limit=50&q=' + encodeURIComponent(D1.email))).j?.data?.accounts || [];
  check('A4 dealers never appear in the personal accounts list', dealerLeak.length === 0, dealerLeak.length);
  check('A5 old historical applications endpoint no longer 500s without the optional table (200)', (await ADMIN.raw('/api/private-seller-capability/admin/applications?status=pending')).status === 200);
  const page = await ADMIN.raw('/api/private-seller-capability/admin/accounts?limit=1&page=2');
  check('A6 pagination: limit 1 returns at most 1 row and a total', page.status === 200 && page.j.data.accounts.length <= 1 && Number.isFinite(page.j.data.total) && page.j.data.page === 2, page.j);
  // listings counted without moving ownership
  q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold) values ('Axio ${uid()}','Toyota','Axio',2015,1200000,'available','${legacy.id}',false)`);
  const withCar = (await ADMIN.raw('/api/private-seller-capability/admin/accounts?q=' + encodeURIComponent(legacy.email))).j?.data?.accounts?.[0];
  check('A7 published listing is counted for the account', withCar?.listings?.total === 1 && withCar.listings.published === 1, withCar?.listings);
  // search/filter
  check('A8 search by unrelated text returns an honest empty list', (await ADMIN.raw('/api/private-seller-capability/admin/accounts?q=zzzz-nobody-' + uid())).j?.data?.total === 0);
  // suspend / restore via the existing ban control, then listing + account history intact
  const ban = await SA.raw(`/api/admin/users/${PERSONAL.id}/toggle-ban`, { method: 'POST', body: { banned: true } });
  const after = (await ADMIN.raw('/api/private-seller-capability/admin/accounts?state=restricted&q=' + encodeURIComponent(PERSONAL.email))).j?.data?.accounts?.[0];
  check('A9 suspended personal account is listed as restricted and filterable', ban.status === 200 && after?.accountState === 'restricted', [ban.status, after]);
  const res = await SA.raw(`/api/admin/users/${PERSONAL.id}/toggle-ban`, { method: 'POST', body: { banned: false } });
  const back = (await ADMIN.raw('/api/private-seller-capability/admin/accounts?state=active&q=' + encodeURIComponent(PERSONAL.email))).j?.data?.accounts?.[0];
  check('A10 restored personal account is active again and still exists', res.status === 200 && back?.accountState === 'active', [res.status, back]);
  check('A11 listing and user rows are untouched by suspend/restore', q(`select count(*) from cars where dealer_id='${legacy.id}'`) === '1' && q(`select count(*) from users where id='${PERSONAL.id}'`) === '1');
  // authorization
  for (const [name, actor] of [['anonymous', null], ['personal', PERSONAL2], ['dealer owner', D1], ['moderator', MOD]]) {
    const r = actor ? await actor.raw('/api/private-seller-capability/admin/accounts') : await fetch(B + '/api/private-seller-capability/admin/accounts');
    check(`A12 ${name} cannot list personal accounts (${r.status})`, actor ? r.status === 403 : r.status === 401);
  }
  const leakBody = JSON.stringify((await PERSONAL2.raw('/api/private-seller-capability/admin/accounts')).j || {});
  check('A13 refusal body leaks no account data', !/@example\.test/.test(leakBody));
}

// ===================== B. Dealer suspension request / approval =====================
const vstatus = (d) => q(`select verification_status from dealer_verifications where id='${d.vid}'`);
const dsusp = (d) => q(`select is_suspended from dealers where "user"='${d.id}'`);
const reqs = (d) => q(`select count(*) from dealer_suspension_requests where verification_id='${d.vid}'`);
{
  // request validation
  let r = await ADMIN.raw(`/api/verification/admin/${D1.vid}/suspend-request`, { method: 'POST', body: body({ reason: 'short' }) });
  check('B1 a reason is required (too short -> 400)', r.status === 400 && r.j?.code === 'REASON_REQUIRED', [r.status, r.j]);
  r = await ADMIN.raw(`/api/verification/admin/${D1.vid}/suspend-request`, { method: 'POST', body: body({ reasonCategory: 'bogus' }) });
  check('B2 an unknown reason category is refused (400)', r.status === 400, r.status);
  check('B3 refused requests recorded nothing and the dealer is untouched', reqs(D1) === '0' && vstatus(D1) === 'approved' && dsusp(D1) === 'f');

  // submit
  r = await ADMIN.raw(`/api/verification/admin/${D1.vid}/suspend-request`, { method: 'POST', body: body() });
  const rid = r.j?.data?.id;
  check('B4 Admin submits a reasoned request (201, pending)', r.status === 201 && r.j.data.status === 'pending' && r.j.data.requestedBy === ADMIN.id && r.j.data.evidenceReference === 'CASE-1042', [r.status, r.j]);
  check('B5 a PENDING request is NOT an effective suspension (verification approved, dealer active, owner status approved)', vstatus(D1) === 'approved' && dsusp(D1) === 'f' && q(`select status from users where id='${D1.id}'`) === 'approved');
  check('B6 every Super Admin was notified', Number(q(`select count(*) from notifications where user_id in ('${SA.id}','${SA2.id}') and title like 'Dealer suspension awaiting%'`)) >= 2);
  r = await ADMIN2.raw(`/api/verification/admin/${D1.vid}/suspend-request`, { method: 'POST', body: body() });
  check('B7 duplicate pending request is refused (409)', r.status === 409 && r.j?.code === 'SUSPENSION_REQUEST_EXISTS', [r.status, r.j]);
  check('B7b still exactly one request row', reqs(D1) === '1');

  // separation of duties / bypass attempts (all by direct API)
  r = await ADMIN.raw(`/api/verification/admin/${D1.vid}/suspend`, { method: 'POST', body: { suspensionReason: REASON } });
  check('B8 Admin cannot suspend directly (403 SUSPENSION_REQUIRES_APPROVAL)', r.status === 403 && r.j?.code === 'SUSPENSION_REQUIRES_APPROVAL', [r.status, r.j]);
  r = await ADMIN.raw(`/api/admin/users/${D1.id}/toggle-ban`, { method: 'POST', body: { banned: true } });
  check('B9 Admin cannot ban the dealer login as an alternate route (403)', r.status === 403 && r.j?.code === 'SUSPENSION_REQUIRES_APPROVAL', [r.status, r.j]);
  r = await ADMIN.raw(`/api/verification/admin/suspension-requests/${rid}/decision`, { method: 'POST', body: { decision: 'approve' } });
  check('B10 Admin cannot approve (403)', r.status === 403, r.status);
  r = await ADMIN2.raw(`/api/verification/admin/suspension-requests/${rid}/decision`, { method: 'POST', body: { decision: 'approve' } });
  check('B11 another Admin cannot approve either (403)', r.status === 403, r.status);
  for (const [n, a] of [['moderator', MOD], ['personal', PERSONAL2], ['dealer owner', D1]]) {
    const x = await a.raw(`/api/verification/admin/suspension-requests/${rid}/decision`, { method: 'POST', body: { decision: 'approve' } });
    check(`B12 ${n} cannot decide (403)`, x.status === 403, x.status);
    const y = await a.raw(`/api/verification/admin/${D1.vid}/suspend-request`, { method: 'POST', body: body() });
    check(`B12b ${n} cannot submit a request (403)`, y.status === 403, y.status);
  }
  const anon = await fetch(B + `/api/verification/admin/suspension-requests/${rid}/decision`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  check('B13 anonymous cannot decide (401/403)', [401, 403].includes(anon.status), anon.status);
  check('B14 after every bypass attempt the dealer is still active', vstatus(D1) === 'approved' && dsusp(D1) === 'f' && q(`select is_banned from users where id='${D1.id}'`) !== 't');

  // admin sees only own requests; super admin sees all
  const own = await ADMIN.raw('/api/verification/admin/suspension-requests?status=pending');
  const other = await ADMIN2.raw('/api/verification/admin/suspension-requests?status=pending');
  const all = await SA.raw('/api/verification/admin/suspension-requests?status=pending');
  check('B15 Admin sees own request; another Admin does not; Super Admin sees it in the queue', own.j.data.some((x) => x.id === rid) && !other.j.data.some((x) => x.id === rid) && all.j.data.some((x) => x.id === rid));

  // reject first (separate request on D2) — rejection needs a reason; dealer stays active
  const r2 = await ADMIN.raw(`/api/verification/admin/${D2.vid}/suspend-request`, { method: 'POST', body: body() });
  const rid2 = r2.j?.data?.id;
  r = await SA.raw(`/api/verification/admin/suspension-requests/${rid2}/decision`, { method: 'POST', body: { decision: 'reject' } });
  check('B16 rejection without a reason is refused (400) and the request stays pending', r.status === 400 && q(`select status from dealer_suspension_requests where id='${rid2}'`) === 'pending', [r.status, r.j]);
  r = await SA.raw(`/api/verification/admin/suspension-requests/${rid2}/decision`, { method: 'POST', body: { decision: 'reject', reason: 'Evidence insufficient' } });
  check('B17 Super Admin rejects with a reason; decision attributed', r.status === 200 && r.j.data.request.status === 'rejected' && r.j.data.request.decidedBy === SA.id, [r.status, r.j]);
  check('B18 a rejected request leaves the dealer active', vstatus(D2) === 'approved' && dsusp(D2) === 'f' && q(`select status from users where id='${D2.id}'`) === 'approved');
  check('B19 the requester was told', Number(q(`select count(*) from notifications where user_id='${ADMIN.id}' and title like 'Dealer suspension request rejected%'`)) === 1);
  r = await SA.raw(`/api/verification/admin/suspension-requests/${rid2}/decision`, { method: 'POST', body: { decision: 'approve' } });
  check('B20 a rejected request cannot be approved later (replay -> 409)', r.status === 409 && vstatus(D2) === 'approved', [r.status, r.j]);

  // dealer staff + listing + business records to prove preservation
  const emp = await makeUser({ tag: 'emp30' });
  const inv = await D1.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: emp.email, role: 'viewer' } });
  const tok = crypto.randomBytes(32).toString('hex');
  q(`update dealer_teams set invite_token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}' where invite_email='${emp.email}'`);
  const acc = await emp.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } });
  q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold) values ('CX5 ${uid()}','Mazda','CX-5',2018,2900000,'available','${D1.id}',false)`);
  const before = { cars: q(`select count(*) from cars where dealer_id='${D1.id}'`), team: q(`select count(*) from dealer_teams where dealer='${D1.id}' or invite_email='${emp.email}'`), dealers: q(`select count(*) from dealers where "user"='${D1.id}'`), empUser: q(`select status||':'||coalesce(is_banned::text,'f') from users where id='${emp.id}'`) };

  // approve: only a Super Admin who is not the requester
  r = await SA.raw(`/api/verification/admin/suspension-requests/${rid}/decision`, { method: 'POST', body: { decision: 'approve', reason: 'Confirmed by case review' } });
  check('B21 Super Admin approves; request approved and attributed', r.status === 200 && r.j.data.request.status === 'approved' && r.j.data.request.decidedBy === SA.id && r.j.data.request.decidedAt, [r.status, r.j]);
  check('B22 suspension is now effective through the existing mechanism', vstatus(D1) === 'suspended' && dsusp(D1) === 't' && q(`select status from users where id='${D1.id}'`) === 'suspended');
  check('B23 the suspension reason was carried from the request', q(`select suspension_reason from dealer_verifications where id='${D1.vid}'`) === REASON);
  const after = { cars: q(`select count(*) from cars where dealer_id='${D1.id}'`), team: q(`select count(*) from dealer_teams where dealer='${D1.id}' or invite_email='${emp.email}'`), dealers: q(`select count(*) from dealers where "user"='${D1.id}'`), empUser: q(`select status||':'||coalesce(is_banned::text,'f') from users where id='${emp.id}'`) };
  check('B24 listings, team membership and the dealer record are preserved; the employee personal account is NOT suspended', JSON.stringify(before) === JSON.stringify(after) && acc.status < 300, { before, after });
  check('B25 audit trail records the request and the approval (audit_logs; security_logs is a hosted-only table here)', Number(q(`select count(*) from audit_logs where action in ('dealer_suspension_requested','dealer_suspension_request_approved')`)) >= 2);
  check('B26 the approver was never the requester (DB constraint satisfied)', q(`select count(*) from dealer_suspension_requests where decided_by = requested_by`) === '0');
  check('B27 the requester was told of the approval', Number(q(`select count(*) from notifications where user_id='${ADMIN.id}' and title like 'Dealer suspension request approved%'`)) === 1);
  r = await SA.raw(`/api/verification/admin/suspension-requests/${rid}/decision`, { method: 'POST', body: { decision: 'approve' } });
  check('B28 replaying the approval is refused (409) and changes nothing', r.status === 409 && vstatus(D1) === 'suspended', [r.status, r.j]);
  r = await ADMIN.raw(`/api/verification/admin/${D1.vid}/reinstate`, { method: 'POST', body: {} });
  check('B29 Admin cannot reinstate an approved suspension (403)', r.status === 403 && vstatus(D1) === 'suspended', [r.status, r.j]);
  r = await ADMIN.raw(`/api/admin/users/${D1.id}/toggle-ban`, { method: 'POST', body: { banned: false } });
  check('B30 Admin cannot un-ban the dealer login either (403)', r.status === 403, r.status);
  r = await ADMIN.raw(`/api/verification/admin/${D1.vid}/suspend-request`, { method: 'POST', body: body() });
  check('B31 an already-suspended dealer cannot be re-requested (409)', r.status === 409 && r.j?.code === 'DEALER_NOT_SUSPENDABLE', [r.status, r.j]);
  r = await SA.raw(`/api/verification/admin/${D1.vid}/reinstate`, { method: 'POST', body: {} });
  check('B32 a Super Admin can restore; history rows are kept', r.status === 200 && vstatus(D1) === 'approved' && reqs(D1) === '1', [r.status, r.j]);

  // cancelled requests cannot be approved; Super Admin direct path needs a reason
  const D3 = await dealer('dl330');
  const r3 = await ADMIN.raw(`/api/verification/admin/${D3.vid}/suspend-request`, { method: 'POST', body: body() });
  const c = await ADMIN2.raw(`/api/verification/admin/suspension-requests/${r3.j.data.id}/cancel`, { method: 'POST' });
  check('B33 a different Admin cannot cancel someone else\'s request (403)', c.status === 403, c.status);
  const c2 = await ADMIN.raw(`/api/verification/admin/suspension-requests/${r3.j.data.id}/cancel`, { method: 'POST' });
  check('B34 the requester cancels their own pending request', c2.status === 200 && c2.j.data.status === 'cancelled', [c2.status, c2.j]);
  r = await SA.raw(`/api/verification/admin/suspension-requests/${r3.j.data.id}/decision`, { method: 'POST', body: { decision: 'approve' } });
  check('B35 a cancelled request cannot be approved (409) and the dealer stays active', r.status === 409 && vstatus(D3) === 'approved', [r.status, r.j]);
  r = await SA.raw(`/api/verification/admin/${D3.vid}/suspend`, { method: 'POST', body: { suspensionReason: 'short' } });
  check('B36 Super Admin direct suspension also needs a server-side reason (400)', r.status === 400 && vstatus(D3) === 'approved', [r.status, r.j]);
  r = await SA.raw(`/api/verification/admin/${D3.vid}/suspend`, { method: 'POST', body: { suspensionReason: 'Direct Super Admin decision after review' } });
  check('B37 Super Admin direct suspension with a reason works (Super Admin is the approving authority)', r.status === 200 && vstatus(D3) === 'suspended', [r.status, r.j]);
  // race: two approvals at once
  const D4 = await dealer('dl430');
  const r4 = await ADMIN.raw(`/api/verification/admin/${D4.vid}/suspend-request`, { method: 'POST', body: body() });
  const [x, y] = await Promise.all([SA.raw(`/api/verification/admin/suspension-requests/${r4.j.data.id}/decision`, { method: 'POST', body: { decision: 'approve' } }), SA.raw(`/api/verification/admin/suspension-requests/${r4.j.data.id}/decision`, { method: 'POST', body: { decision: 'approve' } })]);
  const sa2 = await SA2.raw(`/api/verification/admin/suspension-requests/${r4.j.data.id}/decision`, { method: 'POST', body: { decision: 'reject', reason: 'second super admin' } });
  check('B38b a non-owner Super Admin is refused by the owner decision-authority setting (403 DECISION_AUTHORITY_REQUIRED or 409 if already decided)', [403, 409].includes(sa2.status), [sa2.status, sa2.j]);
  check('B38 two simultaneous approvals: exactly one wins, the other gets 409', [x.status, y.status].sort().join() === '200,409', [x.status, y.status]);
  check('B39 the DB forbids deciding your own request even by direct write', (() => { try { q(`update dealer_suspension_requests set status='approved', decided_by=requested_by, decided_at=now() where id='${r4.j.data.id}'`); return false; } catch { return true; } })());
}
finish('30_personal_accounts_and_dealer_suspension');
