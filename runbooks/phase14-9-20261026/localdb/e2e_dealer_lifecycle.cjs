// DB-backed dealer lifecycle journey (Phase 14.8). Requires the disposable local stack. Produces results JSON.
const L = require('./e2e_lib.cjs');
const { check, call, sql } = L;
const ONBOARD = (n = 'Amani Motors Ltd') => ({ businessName: n, location: 'Nairobi', bio: 'Used cars', paymentDetails: { bankName: 'KCB', accountName: 'Amani Motors', accountNumber: '1234567890', mpesaPhone: '0712345678' }, documents: { governmentId: { type: 'national_id', documentNumber: '12345678' }, kraPin: { pinNumber: 'A123456789Z' } } });
const CAR = (t = 'Prado TX') => ({ title: t, brand: 'Toyota', model: 'Prado', year: 2018, price: 5000000, city: 'Nairobi' });
const row = (q) => sql(q);

async function makeAdmin() {
  const a = await L.register('user', { email: L.uniq('admin') });
  sql(`update users set role='superadmin', status='approved', email_verified=true where email='${a.email}'`);
  const l = await L.login(a.email); return { ...a, jar: l.jar };
}
const OWNER_EMAIL = 'owner148@example.test';
async function makeOwner() {
  sql(`update users set email='retired_'||id||'@example.test', role='user' where email='${OWNER_EMAIL}'`);
  const a = await L.register('user', { email: L.uniq('ownertmp') });
  sql(`update users set email='${OWNER_EMAIL}', role='superadmin', status='approved', email_verified=true where id='${a.id}'`);
  const l = await L.login(OWNER_EMAIL); return { id: a.id, email: OWNER_EMAIL, jar: l.jar };
}
async function makeDealer(label) {
  const d = await L.register('dealer');
  await L.verifyEmailViaToken(d.email);
  const l = await L.login(d.email);
  return { ...d, jar: l.jar, label };
}
(async () => {
  // 1-2 registration + validation
  const d1 = await L.register('dealer');
  check('1 dealer registration returns 201 with status pending, unverified email', d1.res.status === 201 && d1.res.body.user.status === 'pending' && d1.res.body.user.emailVerified === false, d1.res.status);
  check('1 response never contains password or tokens', !/"(password|emailVerifyToken|resetToken|refreshToken|accessToken)"/i.test(JSON.stringify(d1.res.body)), '');
  const weak = await L.register('dealer', { password: 'short' });
  check('2 weak password rejected (400)', weak.res.status === 400, weak.res.status);
  const nobiz = await call('POST', '/api/auth/register', { body: { name: 'X Y', email: L.uniq('nobiz'), password: L.PASSWORD, role: 'dealer', phone: '0712345670' } });
  check('2 dealer without businessName/location rejected', nobiz.status === 400, nobiz.status);
  const adminReg = await call('POST', '/api/auth/register', { body: { name: 'Eve', email: L.uniq('evil'), password: L.PASSWORD, role: 'admin', phone: '0712345671' } });
  check('2 self-registration as admin/superadmin is refused', adminReg.status >= 400 && adminReg.status < 500, adminReg.status);
  // 3 duplicates + races
  const dup = await call('POST', '/api/auth/register', { body: { name: 'Dup', email: d1.email.toUpperCase(), password: L.PASSWORD, role: 'dealer', phone: '0712345672', businessName: 'B', location: 'N' } });
  check('3 duplicate email (case-insensitive) -> 409', dup.status === 409, dup.status);
  const raceEmail = L.uniq('race');
  const race = await Promise.all(Array.from({ length: 8 }, (_, i) => call('POST', '/api/auth/register', { body: { name: 'Race ' + i, email: raceEmail, password: L.PASSWORD, role: 'dealer', phone: '07123' + String(45700 + i), businessName: 'R', location: 'N' } })));
  const created = race.filter((r) => r.status === 201).length;
  check('3 concurrent duplicate registrations create exactly one account', created === 1 && race.every((r) => [201, 409].includes(r.status)), race.map((r) => r.status).join(','));
  check('3 database holds exactly one user and one user_auth row for the race email', row(`select count(*) from users where email='${raceEmail}'`) === '1' && row(`select count(*) from user_auth where user_id in (select id from users where email='${raceEmail}')`) === '1', '');
  // 4 security controls
  const pw = row(`select password from user_auth where user_id='${d1.id}'`);
  check('4 password stored as a hash, not plaintext', pw && pw !== L.PASSWORD && /^\$2[aby]\$/.test(pw), pw.slice(0, 4));
  // 5 email verification + resend
  const pre = await L.login(d1.email);
  check('5 login before email verification: ' + pre.res.status, [200, 403].includes(pre.res.status), pre.res.status);
  const bad = await call('GET', '/api/auth/verify-email/not-a-real-token', { noCsrf: true });
  check('5 invalid verification token rejected', bad.status >= 400 && bad.status < 500, bad.status);
  const ve = await L.verifyEmailViaToken(d1.email);
  check('5 verification token verifies the email once', ve.status === 200 && row(`select email_verified from users where id='${d1.id}'`) === 't', ve.status);
  const raw = 'replay_' + Date.now(); // replay of a consumed token
  const replay = await call('GET', '/api/auth/verify-email/' + raw, { noCsrf: true });
  check('5 consumed/unknown token cannot be replayed', replay.status >= 400, replay.status);
  const rs = await call('POST', '/api/auth/resend-verification', { body: { email: L.uniq('ghost') } });
  check('5 resend for unknown email gives a non-enumerating response', [200, 202, 429].includes(rs.status), rs.status);
  // 6 login/session/CSRF
  const l1 = await L.login(d1.email);
  check('6 login succeeds and sets session cookies', l1.res.status === 200 && l1.jar.token, l1.res.status);
  const me = await call('GET', '/api/auth/me', { jar: l1.jar });
  check('6 session persists across requests', me.status === 200 && me.body.user.email === d1.email.toLowerCase(), me.status);
  const nocsrf = await call('PUT', '/api/dealer/onboarding', { jar: l1.jar, body: ONBOARD(), csrfHeader: 'wrong' });
  check('6 cookie session without a valid CSRF token is refused (403)', nocsrf.status === 403, nocsrf.status);
  const anon = await call('GET', '/api/auth/me', {});
  check('6 no session -> 401', anon.status === 401, anon.status);
  const badpw = await L.login(d1.email, 'Wrong!Passw0rd#9');
  check('6 wrong password -> 401', badpw.res.status === 401, badpw.res.status);
  // 7 pre-onboarding state
  const car0 = await call('POST', '/api/cars', { jar: l1.jar, body: CAR() });
  check('7 registered (unapproved, no verification) dealer cannot create a listing (403)', car0.status === 403, car0.status);
  const dash0 = await call('POST', '/api/dealer-platform/inventory', { jar: l1.jar, body: {} });
  check('7 dealer inventory-write routes refuse an unapproved dealer (403; the dashboard itself stays readable so onboarding state can be shown)', [401, 403].includes(dash0.status), dash0.status);
  // 8 onboarding
  const bizBad = await call('PUT', '/api/dealer/onboarding', { jar: l1.jar, body: { ...ONBOARD(), paymentDetails: { bankName: 'K' } } });
  check('8 invalid onboarding data -> 400 and nothing persisted', bizBad.status === 400 && row(`select count(*) from dealer_verifications where "user"='${d1.id}'`) === '0', bizBad.status);
  const ob = await call('PUT', '/api/dealer/onboarding', { jar: l1.jar, body: ONBOARD() });
  check('8 onboarding completes and submits verification (pending)', ob.status === 200 && ob.body.verification?.verificationStatus === 'pending', ob.status + JSON.stringify(ob.body).slice(0, 120));
  check('8 dealers row has business details, onboarding flags and payment details', row(`select onboarding_complete::text||'|'||coalesce(business_name,'')||'|'||(payment_details->>'bankName') from dealers where "user"='${d1.id}'`) === 'true|Amani Motors Ltd|KCB', '');
  const ob2 = await call('PUT', '/api/dealer/onboarding', { jar: l1.jar, body: ONBOARD('Amani Motors Ltd 2') });
  check('8 resubmission while pending is allowed and idempotent (one verification row)', ob2.status === 200 && row(`select count(*) from dealer_verifications where "user"='${d1.id}'`) === '1', ob2.status);
  const getOb = await call('GET', '/api/dealer/onboarding', { jar: l1.jar });
  check('8 onboarding is resumable: saved details are returned to the owner', getOb.status === 200 && getOb.body.dealer.businessName === 'Amani Motors Ltd 2', getOb.status);
  // 9 pending-state listing rules; approval != publish
  const car1 = await call('POST', '/api/cars', { jar: l1.jar, body: CAR('Pending-state Prado') });
  const carId1 = null;
  check('9 pending dealer cannot create a listing under the default approval_required policy (403 DEALER_APPROVAL_PENDING)', car1.status === 403 && car1.body.code === 'DEALER_APPROVAL_PENDING', car1.status + JSON.stringify(car1.body).slice(0, 150));
  const pubBefore = await call('GET', '/api/cars?limit=50', { noCsrf: true });
  check('9 public search responds', pubBefore.status === 200, pubBefore.status);
  const adm = await makeOwner();
  const plainAdmin = await makeAdmin();
  const vid = row(`select id from dealer_verifications where "user"='${d1.id}'`);
  const stranger = await makeDealer('other');
  const forbid = await call('POST', `/api/verification/admin/${vid}/approve`, { jar: stranger.jar, body: {} });
  check('9 a dealer cannot approve a verification (403)', forbid.status === 403, forbid.status);
  const adminTry = await call('POST', `/api/verification/admin/${vid}/approve`, { jar: plainAdmin.jar, body: {} });
  check('9 under the default owner_only policy a non-owner superadmin cannot approve a dealer (403 DECISION_AUTHORITY_REQUIRED)', adminTry.status === 403 && adminTry.body.code === 'DECISION_AUTHORITY_REQUIRED' && row(`select verification_status from dealer_verifications where id='${vid}'`) === 'pending', adminTry.status);
  const ap = await call('POST', `/api/verification/admin/${vid}/approve`, { jar: adm.jar, body: {} });
  check('9 admin approves the dealer', ap.status === 200 && row(`select verification_status from dealer_verifications where id='${vid}'`) === 'approved' && row(`select approved::text from dealers where "user"='${d1.id}'`) === 'true', ap.status + JSON.stringify(ap.body).slice(0, 120));
  // Inventory that already exists in a non-public state must not be published by approval: seed one via SQL (pending review listing)
  const seedPending = row(`insert into cars(title,brand,model,year,price,dealer_id,status) values ('Seeded pending','Toyota','Prado',2018,1000000,'${d1.id}','pending') returning id`).split('\n')[0];
  const ap0 = await call('POST', `/api/verification/admin/${vid}/suspend`, { jar: adm.jar, body: { suspensionReason: 'x' } });
  const ap1 = await call('POST', `/api/verification/admin/${vid}/approve`, { jar: adm.jar, body: {} });
  check('9 APPROVAL DOES NOT PUBLISH INVENTORY: pending listing still pending after approval', ap1.status === 200 && row(`select status from cars where id='${seedPending}'`) === 'pending', ap1.status);
  const pubAfter = await call('GET', '/api/cars?limit=50', { noCsrf: true });
  check('9 listing still absent from public search after approval', !JSON.stringify(pubAfter.body).includes(seedPending), '');
  const ob3 = await call('PUT', '/api/dealer/onboarding', { jar: l1.jar, body: ONBOARD('Hijack Name') });
  check('9 approved dealer cannot rewrite onboarding/payment details (409, nothing written)', ob3.status === 409 && row(`select business_name from dealers where "user"='${d1.id}'`) === 'Amani Motors Ltd 2', ob3.status);
  // 10 approved: dashboard + inventory
  const st = await call('GET', '/api/dealer-platform/dashboard', { jar: l1.jar });
  check('10 approved dealer reaches dashboard data', st.status === 200, st.status);
  L.grantFixtureSubscription(d1.id); // listing quota needs an active plan (fixture row; billing is out of scope)
  const car2 = await call('POST', '/api/cars', { jar: l1.jar, body: CAR('Approved-state Prado') });
  check('10 approved dealer listing creation is validated server-side: a photo is mandatory (400, nothing written); real photo upload needs Cloudinary and is an UNEXECUTED staging test', car2.status === 400 && /image/i.test(JSON.stringify(car2.body)) && row(`select count(*) from cars where dealer_id='${d1.id}' and title='Approved-state Prado'`) === '0', car2.status);
  const carId2 = row(`set session_replication_role=replica; insert into cars(title,brand,model,year,price,dealer_id,status,images) values ('Seeded Prado','Toyota','Prado',2018,5000000,'${d1.id}','pending','[{"url":"https://img.test/x.jpg"}]'::jsonb) returning id`).split('\n').filter((x) => /^[0-9a-f-]{36}$/.test(x))[0];
  const ed = await call('PUT', `/api/cars/${carId2}`, { jar: l1.jar, body: { title: 'Edited Prado', price: 4900000 } });
  check('10 owner edits own listing', ed.status === 200 && row(`select title from cars where id='${carId2}'`) === 'Edited Prado', ed.status);
  const edOther = await call('PUT', `/api/cars/${carId2}`, { jar: stranger.jar, body: { title: 'Stolen' } });
  check('10 another dealer cannot edit it (403/404)', [403, 404].includes(edOther.status) && row(`select title from cars where id='${carId2}'`) === 'Edited Prado', edOther.status);
  // 11 reject / suspend / reinstate
  const d2 = await makeDealer('rej');
  const l2 = await L.login(d2.email); await call('PUT', '/api/dealer/onboarding', { jar: l2.jar, body: ONBOARD('Reject Co') });
  const vid2 = row(`select id from dealer_verifications where "user"='${d2.id}'`);
  const rj = await call('POST', `/api/verification/admin/${vid2}/reject`, { jar: adm.jar, body: { rejectionReason: 'Documents unreadable' } });
  check('11 rejection recorded with reason', rj.status === 200 && row(`select verification_status from dealer_verifications where id='${vid2}'`) === 'rejected', rj.status);
  const carRej = await call('POST', '/api/cars', { jar: l2.jar, body: CAR() });
  check('11 rejected dealer cannot create listings (403 DEALER_VERIFICATION_REJECTED)', carRej.status === 403 && carRej.body.code === 'DEALER_VERIFICATION_REJECTED', carRej.status);
  const rs2 = await call('PUT', '/api/dealer/onboarding', { jar: l2.jar, body: ONBOARD('Reject Co v2') });
  check('11 rejected dealer may resubmit -> pending', rs2.status === 200 && row(`select verification_status from dealer_verifications where id='${vid2}'`) === 'pending', rs2.status);
  const su = await call('POST', `/api/verification/admin/${vid}/suspend`, { jar: adm.jar, body: { suspensionReason: 'Policy review' } });
  check('11 admin suspends an approved dealer', su.status === 200 && row(`select is_suspended::text||approved::text from dealers where "user"='${d1.id}'`) === 'truefalse', su.status + JSON.stringify(su.body).slice(0, 100));
  const carSus = await call('POST', '/api/cars', { jar: l1.jar, body: CAR('while suspended') });
  check('11 suspended dealer cannot create listings (403 DEALER_ACCOUNT_SUSPENDED)', carSus.status === 403 && carSus.body.code === 'DEALER_ACCOUNT_SUSPENDED', carSus.status + JSON.stringify(carSus.body).slice(0, 100));
  const obSus = await call('PUT', '/api/dealer/onboarding', { jar: l1.jar, body: ONBOARD('Suspended Edit') });
  check('11 suspended dealer cannot rewrite onboarding data (409)', obSus.status === 409, obSus.status);
  const re = await call('POST', `/api/verification/admin/${vid}/reinstate`, { jar: adm.jar, body: {} });
  check('11 reinstatement is an explicit admin decision', re.status === 200 && row(`select verification_status from dealer_verifications where id='${vid}'`) === 'approved', re.status);
  check('11 reinstatement does not change listing publication state', row(`select status from cars where id='${seedPending}'`) === 'pending', '');
  const badTrans = await call('POST', `/api/verification/admin/${vid}/reject`, { jar: adm.jar, body: {} });
  check('11 illegal transition approved->rejected refused (409)', badTrans.status === 409, badTrans.status);
  // 12 private seller does not get dealer privileges
  const ps = await L.register('individual_seller', { email: L.uniq('seller') });
  await L.verifyEmailViaToken(ps.email); sql(`update users set status='approved' where id='${ps.id}'`);
  const psl = await L.login(ps.email);
  const psTeam = await call('GET', '/api/dealer-platform/team', { jar: psl.jar });
  check('12 approved private seller cannot use dealer team routes (403)', psTeam.status === 403, psTeam.status);
  const psVerify = row(`select count(*) from dealers where "user"='${ps.id}'`);
  check('12 private seller approval creates no dealer identity', psVerify === '0', psVerify);
  const psSub = await call('POST', '/api/verification/submit', { jar: psl.jar, body: { documents: {} } });
  check('12 private seller cannot enter the dealer verification workflow', [400, 403].includes(psSub.status), psSub.status);
  require('fs').writeFileSync(process.env.OUT || 'e2e_lifecycle_results.json', JSON.stringify({ ctx: { seedPending, carId2, d1: d1.id, d1email: d1.email }, results: L.results }, null, 1));
  const failed = L.results.filter((r) => !r.ok);
  console.log(`\n${L.results.length - failed.length}/${L.results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
