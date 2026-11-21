// Phase 14.9 - DB-backed account deletion, credential and profile security checks.
// Requires the disposable local stack (backend -> PostgREST -> PostgreSQL). Refuses non-local API bases (see e2e_lib.cjs).
const crypto = require('crypto');
const L = require('./e2e_lib.cjs');
const { check, call, sql } = L;
const OWNER_EMAIL = 'owner148@example.test';
const one = (q) => sql(q);
const uuidOf = (out) => out.split('\n').filter((x) => /^[0-9a-f-]{36}$/.test(x))[0];

async function makeUser(role = 'user') {
  const u = await L.register(role); await L.verifyEmailViaToken(u.email);
  const l = await L.login(u.email); return { ...u, jar: l.jar };
}
async function makeAdmin() {
  const a = await L.register('user', { email: L.uniq('admin') });
  sql(`update users set role='superadmin', status='approved', email_verified=true where email='${a.email}'`);
  const l = await L.login(a.email); return { ...a, jar: l.jar };
}
async function makeOwner() {
  sql(`update users set email='retired_'||id||'@example.test', role='user' where email='${OWNER_EMAIL}'`);
  const a = await L.register('user', { email: L.uniq('ownertmp') });
  sql(`update users set email='${OWNER_EMAIL}', role='superadmin', status='approved', email_verified=true where id='${a.id}'`);
  const l = await L.login(OWNER_EMAIL); return { id: a.id, email: OWNER_EMAIL, jar: l.jar };
}
const seedCar = (dealerId, title = 'Fixture car', cols = {}) => {
  const base = { title, brand: 'Toyota', model: 'Prado', year: 2018, price: 1000000, dealer_id: dealerId, status: 'available', images: `[{"url":"https://img.test/x.jpg"}]`, ...cols };
  const keys = Object.keys(base); const vals = keys.map((k) => { const v = base[k]; return k === 'images' ? `'${v}'::jsonb` : v === null ? 'null' : typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`; });
  return uuidOf(sql(`set session_replication_role=replica; insert into cars(${keys.join(',')}) values (${vals.join(',')}) returning id`));
};
const exists = (table, col, id) => one(`select count(*) from ${table} where ${col}='${id}'`) !== '0';

(async () => {
  const admin = await makeAdmin();
  // ---------------- A. account deletion (the only deletion paths in the codebase are staff-initiated: DELETE /api/admin/users/:id and DELETE /api/admin/staff/:id)
  const del = (who, id) => call('DELETE', `/api/admin/users/${id}`, { jar: who.jar });
  const buyer = await makeUser('user');
  let r = await del(buyer, admin.id);
  check('A1 a non-admin cannot delete accounts (403) - identifier substitution against an admin', r.status === 403 && exists('users', 'id', admin.id), r.status);
  r = await call('DELETE', `/api/admin/users/${buyer.id}`, { jar: admin.jar, csrfHeader: null, noCsrf: true });
  check('A2 deletion without a CSRF token is refused and the account survives', r.status === 403 && exists('users', 'id', buyer.id), r.status);
  r = await del(admin, admin.id); check('A3 an admin cannot delete themselves', r.status === 400 && exists('users', 'id', admin.id), r.status);

  // dealer owner with an onboarded dealership, team member, listings (one soft-deleted)
  const dealer = await makeUser('dealer');
  const member = await makeUser('user');
  const dealerCar = seedCar(dealer.id, 'Active listing'); const goneCar = seedCar(dealer.id, 'Deleted listing');
  sql(`update cars set deleted_at=now() where id='${goneCar}'`);
  sql(`insert into dealer_teams(dealer,member,role,status,invite_email,invited_by,permissions) values ('${dealer.id}','${member.id}','sales_agent','active','m@example.test','${dealer.id}','{"canListCars":true}'::jsonb)`);
  r = await del(admin, dealer.id);
  check('A4 a dealer owner with a dealership, team and listings cannot be deleted: 409 ACCOUNT_DELETE_BLOCKED', r.status === 409 && r.body.code === 'ACCOUNT_DELETE_BLOCKED' && Array.isArray(r.body.reasons) && r.body.reasons.length > 0, r.status + ' ' + JSON.stringify(r.body).slice(0, 200));
  check('A4 nothing was changed by the refused deletion (user, dealership, team, both listings; no partial listing deletion)',
    exists('users', 'id', dealer.id) && exists('dealers', '"user"', dealer.id) && exists('dealer_teams', 'dealer', dealer.id) && one(`select count(*) from cars where dealer_id='${dealer.id}'`) === '2' && one(`select deleted_at is null from cars where id='${dealerCar}'`) === 't', '');
  check('A4 the 409 does not leak emails, phones or token material', !/@|254\d{9}|hash|token/i.test(JSON.stringify(r.body).replace(/ACCOUNT_DELETE_BLOCKED/, '')), JSON.stringify(r.body).slice(0, 200));
  check('A4 the refusal is audited (no sensitive payload)', Number(one(`select count(*) from audit_logs where action ilike '%deletion blocked%' and (details::text like '%${dealer.id}%')`)) >= 1, '');

  // dependency matrix: each protected relation alone blocks deletion
  const dep = async (label, setup, tableCheck) => {
    const u = await makeUser('user'); setup(u.id);
    const rr = await del(admin, u.id);
    check(`A5 ${label} blocks deletion (409) and the record is preserved`, rr.status === 409 && exists('users', 'id', u.id) && tableCheck(u.id), rr.status + ' ' + JSON.stringify(rr.body).slice(0, 120));
  };
  await dep('a payment record', (id) => sql(`insert into payments(user_id,amount,type,status,checkout_request_id,phone,processed) values ('${id}',100,'bid','success','ws_CO_dep_${id.slice(0, 8)}','254700000001',true)`), (id) => exists('payments', 'user_id', id));
  await dep('a bid', (id) => { const c = seedCar(dealer.id, 'bid target'); sql(`insert into bids(car_id,user_id,amount,status) values ('${c}','${id}',5000,'paid')`); }, (id) => exists('bids', 'user_id', id));
  await dep('a team membership', (id) => sql(`insert into dealer_teams(dealer,member,role,status,invite_email,invited_by,permissions) values ('${dealer.id}','${id}','viewer','active','v@example.test','${dealer.id}','{}'::jsonb)`), (id) => exists('dealer_teams', 'member', id));
  await dep('an escrow as buyer', (id) => { const c = seedCar(dealer.id, 'escrow car'); sql(`insert into escrows(buyer,seller,car,amount,status) values ('${id}','${dealer.id}','${c}',1000,'funded')`); }, (id) => exists('escrows', 'buyer', id));
  await dep('a ledger entry', (id) => sql(`insert into ledger_entries(transaction_id,external_reference,user_id,amount,source,destination) values (gen_random_uuid()::text,'ext_'||'${id}','${id}',10,'platform','dealer')`), (id) => exists('ledger_entries', 'user_id', id));

  // a clean account is deletable; sessions die with it; replay is safe
  const clean = await makeUser('user');
  const concurrent = await Promise.all([del(admin, clean.id), del(admin, clean.id)]);
  const codes = concurrent.map((x) => x.status).sort();
  check('A6 a clean account is deleted; concurrent duplicate requests give exactly one 200 and no 5xx', codes.filter((c) => c === 200).length === 1 && codes.every((c) => c < 500), codes.join(','));
  check('A6 the deleted account is gone and its old session no longer authenticates', !exists('users', 'id', clean.id) && (await call('GET', '/api/auth/me', { jar: clean.jar })).status === 401, '');
  r = await del(admin, clean.id); check('A6 repeating the deletion is a safe 404', r.status === 404, r.status);

  // staff soft deletion (systemOwnerOnly): a soft-deleted identity must not authenticate
  const owner = await makeOwner();
  const staff = await makeUser('user'); sql(`update users set role='technical_support', status='approved' where id='${staff.id}'`);
  const stBefore = await call('GET', '/api/auth/me', { jar: staff.jar });
  r = await call('DELETE', `/api/admin/staff/${staff.id}`, { jar: owner.jar });
  const stAfter = await call('GET', '/api/auth/me', { jar: staff.jar });
  check('A7 staff deletion is a soft delete (row retained with deleted_at)', r.status === 200 && one(`select deleted_at is not null from users where id='${staff.id}'`) === 't', r.status);
  check('A7 an existing session of the soft-deleted account is rejected', stBefore.status === 200 && [401, 403].includes(stAfter.status), `${stBefore.status}->${stAfter.status}`);
  const stLogin = await call('POST', '/api/auth/login', { body: { email: staff.email, password: L.PASSWORD } });
  check('A7 the soft-deleted account cannot log in again', [401, 403].includes(stLogin.status), stLogin.status);
  const stRefresh = await call('POST', '/api/auth/refresh', { jar: staff.jar });
  check('A7 the soft-deleted account cannot refresh a session', [401, 403].includes(stRefresh.status), stRefresh.status);

  // owner accounts are immutable
  r = await del(admin, owner.id); check('A8 a platform-owner account cannot be deleted by an administrator', r.status === 403 && exists('users', 'id', owner.id), r.status);

  // ---------------- B. password security
  const pw = await makeUser('user');
  const chg = (jar, body) => call('PUT', '/api/auth/change-password', { jar, body });
  r = await chg(pw.jar, { currentPassword: 'Wrong#Pass1x', newPassword: 'N3w#Password1' }); check('B1 wrong current password -> 400, password unchanged', r.status === 400, r.status);
  r = await chg(pw.jar, { currentPassword: L.PASSWORD, newPassword: 'short' }); check('B2 weak new password rejected', r.status === 400, r.status);
  r = await call('PUT', '/api/auth/change-password', { jar: pw.jar, noCsrf: true, body: { currentPassword: L.PASSWORD, newPassword: 'N3w#Password1' } }); check('B3 change-password without CSRF is refused', r.status === 403, r.status);
  r = await chg({}, { currentPassword: L.PASSWORD, newPassword: 'N3w#Password1' }); check('B4 unauthenticated change-password is refused', r.status === 401, r.status);
  const burst = []; for (let i = 0; i < 14; i++) burst.push((await chg(pw.jar, { currentPassword: 'Wrong#Pass1x' + i, newPassword: 'N3w#Password1' })).status);
  check('B5 repeated wrong current-password guesses are rate limited (429) - brute force of the current password through a stolen session is throttled', burst.includes(429), burst.join(','));
  const pw2 = await makeUser('user');
  const before = await call('GET', '/api/auth/me', { jar: pw2.jar });
  r = await chg(pw2.jar, { currentPassword: L.PASSWORD, newPassword: 'N3w#Password1' });
  const after = await call('GET', '/api/auth/me', { jar: pw2.jar });
  check('B6 a successful change revokes the previous session and refresh tokens', r.status === 200 && before.status === 200 && after.status === 401 && Number(one(`select count(*) from refresh_tokens where "user"='${pw2.id}' and is_revoked=false`)) <= 1, `${r.status} ${before.status}->${after.status}`);
  const relog = await call('POST', '/api/auth/login', { body: { email: pw2.email, password: 'N3w#Password1' } }); check('B6 the new password works and the old one does not', relog.status === 200 && (await call('POST', '/api/auth/login', { body: { email: pw2.email, password: L.PASSWORD } })).status === 401, relog.status);
  check('B6 response never carries password material', !/"password"|\$2[aby]\$/.test(JSON.stringify(r.body)), '');

  // reset flow
  const rs = await makeUser('user');
  const f1 = await call('POST', '/api/auth/forgot-password', { body: { email: rs.email } });
  const f2 = await call('POST', '/api/auth/forgot-password', { body: { email: 'nobody_' + Date.now() + '@example.test' } });
  check('B7 forgot-password gives an identical response for registered and unknown emails (no enumeration)', f1.status === 200 && f2.status === 200 && JSON.stringify(f1.body) === JSON.stringify(f2.body), `${f1.status}/${f2.status}`);
  const rawTok = crypto.randomBytes(32).toString('hex');
  const setTok = (id, raw, interval = '1 hour') => sql(`update user_auth set reset_token='${L.hashToken(raw)}', reset_token_expire=now()+interval '${interval}' where user_id='${id}'`);
  setTok(rs.id, rawTok);
  check('B8 reset tokens are stored hashed, never raw', one(`select count(*) from user_auth where reset_token='${rawTok}'`) === '0', '');
  const reset = (t, p = 'R3set#Password1') => call('POST', '/api/auth/reset-password', { body: { token: t, password: p } });
  const race = await Promise.all([reset(rawTok, 'R3set#Password1'), reset(rawTok, 'R4ace#Password1'), reset(rawTok, 'R5ace#Password1')]);
  check('B9 concurrent resets with one token: exactly one succeeds', race.filter((x) => x.status === 200).length === 1 && race.filter((x) => x.status === 400).length === 2, race.map((x) => x.status).join(','));
  r = await reset(rawTok); check('B9 a used token cannot be replayed', r.status === 400, r.status);
  setTok(rs.id, 'expired_' + rawTok, '-1 minute'); r = await reset('expired_' + rawTok); check('B10 an expired token is refused', r.status === 400, r.status);
  r = await reset('not-a-real-token'); check('B10 an unknown token is refused', r.status === 400, r.status);
  setTok(rs.id, 'weak_' + rawTok); r = await reset('weak_' + rawTok, 'password'); check('B11 reset enforces the password policy and keeps the token usable', r.status === 400 && one(`select reset_token is not null from user_auth where user_id='${rs.id}'`) === 't', r.status);
  const oldSess = await makeUser('user'); setTok(oldSess.id, 'sess_' + rawTok); await reset('sess_' + rawTok);
  check('B12 a reset revokes existing sessions', (await call('GET', '/api/auth/me', { jar: oldSess.jar })).status === 401, '');
  const otherTok = crypto.randomBytes(32).toString('hex'); const victim = await makeUser('user'); setTok(oldSess.id, otherTok);
  await reset(otherTok, 'Cr0ss#Account1'); check('B13 a token only changes the password of the account it was issued to', (await call('POST', '/api/auth/login', { body: { email: victim.email, password: L.PASSWORD } })).status === 200, '');

  // ---------------- C. profile
  const pf = await makeUser('user');
  r = await call('PUT', '/api/auth/profile', { jar: pf.jar, body: { name: 'Renamed', role: 'superadmin', status: 'approved', email: 'hijack@example.test', emailVerified: false, isBanned: true, approved: true, escrowApproved: true } });
  check('C1 privileged/identity fields sent to the profile endpoint are ignored', r.status === 200 && one(`select role||'|'||email||'|'||is_banned from users where id='${pf.id}'`) === `user|${pf.email}|false` && one(`select name from users where id='${pf.id}'`) === 'Renamed', JSON.stringify(r.body).slice(0, 100));
  sql(`update users set phone_verified=true, phone='254711111111' where id='${pf.id}'`);
  await call('PUT', '/api/auth/profile', { jar: pf.jar, body: { phone: '0711111111' } });
  check('C2 re-saving the same phone keeps phone verification', one(`select phone_verified from users where id='${pf.id}'`) === 't', '');
  await call('PUT', '/api/auth/profile', { jar: pf.jar, body: { phone: '0722222222' } });
  check('C2 changing the phone invalidates phone verification (14.6 protection preserved)', one(`select phone_verified from users where id='${pf.id}'`) === 'f', '');
  r = await call('PUT', '/api/auth/profile', { jar: pf.jar, body: { phone: '123' } }); check('C3 an invalid phone is refused and nothing is stored', r.status === 400 && one(`select phone from users where id='${pf.id}'`) === '254722222222', r.status);
  r = await call('PUT', '/api/auth/profile', { jar: pf.jar, body: { bankAccount: '123', paymentDetails: { x: 1 } } }); check('C4 payout details are refused on the personal profile', r.status === 400, r.status);
  r = await call('PUT', '/api/auth/profile', { jar: pf.jar, noCsrf: true, body: { name: 'NoCsrf' } }); check('C5 profile write without CSRF refused', r.status === 403, r.status);
  r = await call('PUT', '/api/auth/profile', { jar: {}, body: { name: 'Anon' } }); check('C5 unauthenticated profile write refused', r.status === 401, r.status);
  // dealer business identity is separate from personal profile
  const dl = await makeUser('dealer'); sql(`update dealers set business_name='Real Motors Ltd' where "user"='${dl.id}'`);
  await call('PUT', '/api/auth/profile', { jar: dl.jar, body: { businessName: 'Spoofed Motors' } });
  check('C6 the personal profile endpoint cannot rewrite the verified dealer business identity', one(`select business_name from dealers where "user"='${dl.id}'`) === 'Real Motors Ltd', one(`select business_name from dealers where "user"='${dl.id}'`));
  const psl = await makeUser('individual_seller');
  r = await call('PUT', '/api/dealer/settlement', { jar: psl.jar, body: { mpesaBusiness: '123456' } }); check('C7 a private seller has no dealer settlement identity (cannot create one)', [403, 404].includes(r.status) && one(`select count(*) from dealers where "user"='${psl.id}'`) === '0', r.status);

  // ---------------- D. drift guard: every foreign key that can block or cascade on account deletion is covered by the guard list
  {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../../../backend/utils/accountDeletionGuard.js'), 'utf8');
    const covered = new Set(); for (const m of src.matchAll(/\["[A-Z_]+", "([a-z_]+)", \[([^\]]*)\]\]/g)) for (const c of m[2].split(',')) covered.add(m[1] + '.' + c.trim().replace(/"/g, ''));
    const personal = new Set(['user_auth', 'refresh_tokens', 'user_preferences', 'otp_challenges', 'communication_preferences', 'marketing_campaigns', 'innovation_idea_votes', 'notifications', 'saved_searches', 'activity_logs']);
    const fk = one(`select conrelid::regclass::text||'.'||a.attname||'|'||confdeltype::text from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1] where contype='f' and confrelid in ('public.users'::regclass,'public.profiles'::regclass) and conrelid<>'public.profiles'::regclass`).split('\n');
    const missing = fk.map((l) => l.split('|')).filter(([k, d]) => ['a', 'r', 'c'].includes(d) && !personal.has(k.split('.')[0]) && !covered.has(k.replace(/^public\./, ''))).map(([k]) => k);
    check('D1 every blocking/cascading foreign key to users/profiles is in the account-deletion guard list or the personal-data allowlist', missing.length === 0, missing.join(', '));
  }

  require('fs').writeFileSync(process.env.OUT || 'e2e_account_security_results.json', JSON.stringify({ results: L.results }, null, 1));
  const failed = L.results.filter((x) => !x.ok); console.log(`\n${L.results.length - failed.length}/${L.results.length} passed`); process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
