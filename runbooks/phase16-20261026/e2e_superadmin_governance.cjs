// Phase 15 - DB-backed Super Admin governance checks. Requires the disposable local stack (backend -> PostgREST -> PostgreSQL).
const crypto = require('crypto');
const L = require('./e2e_lib.cjs');
const { check, call, sql } = L;
const one = (q) => sql(q);
const ONBOARD = (n = 'Amani Motors Ltd') => ({ businessName: n, location: 'Nairobi', bio: 'Used cars', paymentDetails: { bankName: 'KCB', accountName: 'Amani Motors', accountNumber: '1234567890', mpesaPhone: '0712345678' }, documents: { governmentId: { type: 'national_id', documentNumber: '12345678' }, kraPin: { pinNumber: 'A123456789Z' } } });
const uuidOf = (out) => out.split('\n').filter((x) => /^[0-9a-f-]{36}$/.test(x))[0];
const OWNER_EMAIL = 'owner148@example.test';
async function mk(role) {
  const u = await L.register('user'); await L.verifyEmailViaToken(u.email);
  u.id = u.id || one(`select id from users where email='${u.email}'`);
  sql(`update users set role='${role}', status='approved', email_verified=true where id='${u.id}'`);
  const l = await L.login(u.email); return { ...u, jar: l.jar };
}
async function makeOwner() {
  sql(`update users set email='retired_'||id||'@example.test', role='user' where email='${OWNER_EMAIL}'`);
  const a = await L.register('user', { email: L.uniq('ownertmp') });
  sql(`update users set email='${OWNER_EMAIL}', role='superadmin', status='approved', email_verified=true where id='${a.id}'`);
  const l = await L.login(OWNER_EMAIL); return { id: a.id, email: OWNER_EMAIL, jar: l.jar };
}
const seedCar = (dealerId, title, status = 'available') => uuidOf(sql(`set session_replication_role=replica; insert into cars(title,brand,model,year,price,dealer_id,status,images) values ('${title}','Toyota','Prado',2018,1000000,'${dealerId}','${status}','[{"url":"https://img.test/x.jpg"}]'::jsonb) returning id`));
const freshUser = () => { const id = crypto.randomUUID(); sql(`insert into users(id,name,email,role,status,email_verified,phone) values ('${id}','Payer','${L.uniq('pp')}','user','approved',true,'2547${String(10000000 + Math.floor(Math.random() * 89999999))}')`); return id; };
const seedPay = (_unused, { status, phone, receipt = null, amount = 5000, ageMin = 0 }) => {
  const userId = freshUser();
  const ck = 'ws_CO_' + crypto.randomBytes(6).toString('hex');
  sql(`insert into payments(user_id,amount,type,status,checkout_request_id,phone,processed,mode,metadata,mpesa_receipt,created_at) values ('${userId}',${amount},'purchase','${status}','${ck}','${phone}',${status !== 'pending'},'mpesa','{"internalNote":"do-not-show"}',${receipt ? `'${receipt}'` : 'null'}, now() - interval '${ageMin} minutes')`);
  return { ck, id: one(`select id from payments where checkout_request_id='${ck}'`) };
};

(async () => {
  const ownerAcc = await makeOwner(); const sa = await mk('superadmin'); const adm = await mk('admin'); const accts = await mk('accounts');
  const staffLow = {}; for (const r of ['moderator', 'hr', 'marketing', 'ghost_checker']) staffLow[r] = await mk(r);
  const buyer = await mk('user'); const seller = await mk('individual_seller');
  const dealer = await (async () => { const d0 = await L.register('dealer'); await L.verifyEmailViaToken(d0.email); sql(`update users set status='approved' where id='${d0.id}'`); const l0 = await L.login(d0.email); return { ...d0, jar: l0.jar }; })();
  sql(`update dealers set approved=true, business_name='Gov Fixture Motors' where "user"='${dealer.id}'`); L.grantFixtureSubscription(dealer.id);

  // ---------- A. privileged tooling surfaces are staff-only (reads were open to every signed-in account)
  const gated = ['/api/platform-factory/dashboard', '/api/platform-factory/products', '/api/improvement/dashboard', '/api/improvement/opportunities', '/api/automation/ai-suggestions', '/api/automation/templates', '/api/lowcode/field-types'];
  for (const p of gated) {
    const rs = await Promise.all([call('GET', p, {}), call('GET', p, { jar: buyer.jar }), call('GET', p, { jar: seller.jar }), call('GET', p, { jar: dealer.jar })]);
    check(`A1 ${p} is closed to anonymous, buyer, private seller and dealer`, rs[0].status === 401 && rs.slice(1).every((r) => r.status === 403), rs.map((r) => r.status).join(','));
    const st = await call('GET', p, { jar: adm.jar });
    check(`A2 ${p} still opens for staff (no 401/403)`, ![401, 403].includes(st.status) && st.status < 500, st.status);
  }
  let r = await call('POST', '/api/platform-factory/design', { jar: buyer.jar, body: {} }); check('A3 a buyer can no longer call the platform-factory design endpoint', r.status === 403, r.status);
  r = await call('POST', '/api/automation/rules/evaluate', { jar: buyer.jar, body: {} }); check('A3 a buyer can no longer evaluate automation rules', r.status === 403, r.status);
  const hs = await call('GET', '/api/dealer-health-score/' + dealer.id + '/details', {}); check('A4 dealer health-score breakdown is not public (401 anonymous)', hs.status === 401, hs.status);
  const hs2 = await call('GET', '/api/dealer-health-score/' + dealer.id + '/details', { jar: buyer.jar }); check('A4 dealer health-score breakdown is closed to a buyer (403)', hs2.status === 403, hs2.status);
  const sg = await call('GET', '/api/automation/ai-suggestions', { jar: sa.jar });
  const sgText = JSON.stringify(sg.body);
  check('A5 automation suggestions contain no hard-coded figures (no "47 pending", "4.2 hours", efficiency claims)', sg.status === 200 && !/47 pending|4\.2 hours|efficiency|timeSaved/.test(sgText), sgText.slice(0, 160));

  // ---------- B. payment oversight: privacy + honest reconciliation state
  const payer = await mk('user');
  const P = {
    ok: seedPay(payer.id, { status: 'success', phone: '254755500001', receipt: 'RCPTOK1' }),
    pend: seedPay(payer.id, { status: 'pending', phone: '254755500002', ageMin: 3 }),
    stale: seedPay(payer.id, { status: 'pending', phone: '254755500003', ageMin: 180 }),
    fail: seedPay(payer.id, { status: 'failed', phone: '254755500004' }),
    mism: seedPay(payer.id, { status: 'failed', phone: '254755500005', receipt: 'RCPTMM1', amount: 5000 }),
    late: seedPay(payer.id, { status: 'failed', phone: '254755500006' }),
    refund: seedPay(payer.id, { status: 'failed', phone: '254755500007' }),
  };
  sql(`insert into payment_events(payment_id,event_type,payload) values ('${P.mism.id}','amount_mismatch','{"expected":5000,"reported":4000,"receipt":"RCPTMM1"}'), ('${P.refund.id}','refund_required','{}')`);
  sql(`insert into webhook_events(event_source,dedupe_key,raw_payload,processed) values ('mpesa','dk_${crypto.randomBytes(5).toString('hex')}', '{"Body":{"stkCallback":{"CheckoutRequestID":"${P.late.ck}","ResultCode":0}}}'::jsonb, true)`);
  const want = new Set(Object.values(P).map((x) => x.id));
  const list = await call('GET', '/api/admin/payments?limit=100', { jar: sa.jar });
  const found = [...(list.body.payments || [])];
  for (let pg = 2; pg <= 30 && found.filter((x) => want.has(x.id)).length < want.size; pg++) { const nx = await call('GET', `/api/admin/payments?limit=100&page=${pg}`, { jar: sa.jar }); found.push(...(nx.body.payments || [])); }
  const body = JSON.stringify({ payments: found.filter((x) => want.has(x.id)) });
  const by = (p) => found.find((x) => x.id === p.id);
  check('B1 superadmin can list payments', list.status === 200 && Array.isArray(list.body.payments), list.status);
  check('B2 no full customer phone number appears anywhere in the response', !/2547555000\d\d/.test(body), '');
  check('B2 phones are masked to the last three digits', by(P.ok)?.phoneMasked?.endsWith('001') && !/^\d+$/.test(by(P.ok)?.phoneMasked || ''), by(P.ok)?.phoneMasked);
  check('B3 checkout request ids, raw metadata and internal user ids are not returned', !body.includes(P.ok.ck) && !/internalNote|do-not-show|checkout_request_id|checkoutRequestId|"user_id"|"metadata"/.test(body), '');
  check('B4 a verified success is "settled" and carries its receipt', by(P.ok)?.reconciliation?.state === 'settled' && by(P.ok)?.mpesaReceipt === 'RCPTOK1', JSON.stringify(by(P.ok)?.reconciliation));
  check('B5 a pending payment is shown as pending (never settled) with its age', by(P.pend)?.reconciliation?.state === 'pending' && typeof by(P.pend)?.reconciliation?.ageMinutes === 'number', JSON.stringify(by(P.pend)?.reconciliation));
  check('B5 a long-pending payment keeps its pending status and reports the real age', by(P.stale)?.status === 'pending' && by(P.stale)?.reconciliation?.ageMinutes >= 170, JSON.stringify(by(P.stale)));
  check('B6 an ordinary failure is "failed" (no reconciliation claim)', by(P.fail)?.reconciliation?.state === 'failed', JSON.stringify(by(P.fail)?.reconciliation));
  check('B7 failed + amount-mismatch evidence is flagged needs_reconciliation (money may have moved)', by(P.mism)?.reconciliation?.state === 'needs_reconciliation' && by(P.mism).reconciliation.reasons.includes('AMOUNT_MISMATCH_PROVIDER_RECEIPT_RECORDED'), JSON.stringify(by(P.mism)?.reconciliation));
  check('B8 failed + a success callback received afterwards is flagged needs_reconciliation', by(P.late)?.reconciliation?.state === 'needs_reconciliation' && by(P.late).reconciliation.reasons.includes('SUCCESS_CALLBACK_RECEIVED_AFTER_FAILURE'), JSON.stringify(by(P.late)?.reconciliation));
  check('B9 failed + refund_required is flagged needs_reconciliation', by(P.refund)?.reconciliation?.state === 'needs_reconciliation', JSON.stringify(by(P.refund)?.reconciliation));
  check('B10 stored payment status is never rewritten by viewing (read-only)', one(`select status from payments where id='${P.mism.id}'`) === 'failed' && one(`select status from payments where id='${P.pend.id}'`) === 'pending', '');
  check('B11 the summary names what it measures (successful collections, not platform revenue)', typeof list.body.summary?.totalCollected === 'number' && /not platform revenue/.test(list.body.summary?.basis || ''), JSON.stringify(list.body.summary));
  const denied = {};
  for (const [name, who] of Object.entries({ buyer, seller, dealer, moderator: staffLow.moderator, hr: staffLow.hr, marketing: staffLow.marketing, ghost_checker: staffLow.ghost_checker })) denied[name] = (await call('GET', '/api/admin/payments', { jar: who.jar })).status;
  check('B12 payment oversight is closed to buyers, sellers, dealers and non-finance staff', Object.values(denied).every((s) => s === 403), JSON.stringify(denied));
  check('B12 anonymous gets 401', (await call('GET', '/api/admin/payments', {})).status === 401, '');
  const ac = await call('GET', '/api/admin/payments', { jar: accts.jar }); check('B13 the accounts role still has oversight, with the same masking', ac.status === 200 && !/2547555000\d\d/.test(JSON.stringify(ac.body)), ac.status);
  const wr = await Promise.all(['POST', 'PUT', 'PATCH', 'DELETE'].map((m) => call(m, '/api/admin/payments/' + P.mism.id, { jar: sa.jar, body: { status: 'success' } })));
  check('B14 there is no admin route that edits a payment status (all methods 404/405)', wr.every((x) => [404, 405].includes(x.status)) && one(`select status from payments where id='${P.mism.id}'`) === 'failed', wr.map((x) => x.status).join(','));

  // ---------- C. ban / unban: explicit state, idempotent, audited, sessions revoked
  const victim = await mk('user');
  const b1 = await call('POST', `/api/admin/users/${victim.id}/toggle-ban`, { jar: sa.jar, body: { banned: true } });
  check('C1 ban with explicit target state returns the server-confirmed state', b1.status === 200 && b1.body.isBanned === true && b1.body.changed === true, JSON.stringify(b1.body));
  const b2 = await call('POST', `/api/admin/users/${victim.id}/toggle-ban`, { jar: sa.jar, body: { banned: true } });
  check('C2 repeating the same ban is idempotent (stays banned, changed=false, no second audit entry)', b2.status === 200 && b2.body.isBanned === true && b2.body.changed === false && one(`select count(*) from audit_logs where action='User banned' and entity_id='${victim.id}' or (action='User banned' and details::text like '%${victim.id}%')`) === '1', JSON.stringify(b2.body));
  const me = await call('GET', '/api/auth/me', { jar: victim.jar }); check('C3 the banned user\'s existing session stops working', [401, 403].includes(me.status), me.status);
  const lg = await L.login(victim.email); check('C3 the banned user cannot log in', lg.res.status >= 400, lg.res.status);
  check('C4 refresh tokens of the banned user are revoked', one(`select count(*) from refresh_tokens where "user"='${victim.id}' and is_revoked=false`) === '0', one(`select count(*) from refresh_tokens where "user"='${victim.id}' and is_revoked=false`));
  const aud = one(`select details::text from audit_logs where action='User banned' and details::text like '%${victim.id}%' limit 1`);
  check('C5 the ban is audited with ids and outcome only (no password/token/e-mail)', /success/.test(aud) && !/password|token|@example\.test/i.test(aud), aud);
  const u1 = await call('POST', `/api/admin/users/${victim.id}/toggle-ban`, { jar: sa.jar, body: { banned: false } });
  check('C6 unban restores access', u1.status === 200 && u1.body.isBanned === false && (await L.login(victim.email)).res.status === 200, JSON.stringify(u1.body));
  const legacy = await call('POST', `/api/admin/users/${victim.id}/toggle-ban`, { jar: sa.jar });
  check('C7 the legacy no-body toggle still works and reports the resulting state', legacy.status === 200 && legacy.body.isBanned === true, JSON.stringify(legacy.body));
  await call('POST', `/api/admin/users/${victim.id}/toggle-ban`, { jar: sa.jar, body: { banned: false } });
  check('C8 a superadmin cannot ban themselves', (await call('POST', `/api/admin/users/${sa.id}/toggle-ban`, { jar: sa.jar, body: { banned: true } })).status === 400, '');
  check('C8 an admin cannot ban a superadmin', [403, 400].includes((await call('POST', `/api/admin/users/${sa.id}/toggle-ban`, { jar: adm.jar, body: { banned: true } })).status) && one(`select is_banned::text from users where id='${sa.id}'`) !== 'true', one(`select is_banned::text from users where id='${sa.id}'`));
  check('C9 a buyer cannot ban anyone', (await call('POST', `/api/admin/users/${victim.id}/toggle-ban`, { jar: buyer.jar, body: { banned: true } })).status === 403, '');

  // ---------- D. system health never claims "healthy"
  const sh = await call('GET', '/api/admin/system/health', { jar: sa.jar });
  check('D1 system health reports only what it measured (warning | no_critical_alerts), never "healthy"', sh.status === 200 && ['warning', 'no_critical_alerts'].includes(sh.body.health?.status) && /not probed/.test(sh.body.health?.basis || ''), JSON.stringify(sh.body.health).slice(0, 200));

  // ---------- E. dealer approval does not publish inventory
  const d = await L.register('dealer'); await L.verifyEmailViaToken(d.email); const dl = await L.login(d.email);
  const ob = await call('PUT', '/api/dealer/onboarding', { jar: dl.jar, body: ONBOARD('Approval Gate Motors') });
  const pendingCar = seedCar(d.id, 'Awaiting moderation', 'pending'); const draftCar = seedCar(d.id, 'Draft', 'draft'); const hiddenCar = seedCar(d.id, 'Hidden', 'hidden');
  const vid = one(`select id from dealer_verifications where "user"='${d.id}'`);
  const ap = await call('POST', `/api/verification/admin/${vid}/approve`, { jar: ownerAcc.jar, body: {} });
  check('E1 the owner can approve the dealer verification', ap.status === 200 && one(`select approved::text from dealers where "user"='${d.id}'`) === 'true', ap.status + JSON.stringify(ap.body || ap).slice(0, 160));
  check('E2 approval did not publish pending, draft or hidden listings', one(`select string_agg(status, ',' order by status) from cars where dealer_id='${d.id}'`) === 'draft,hidden,pending', one(`select string_agg(status, ',' order by status) from cars where dealer_id='${d.id}'`));
  const pub = await call('GET', '/api/cars?limit=100', { noCsrf: true });
  check('E3 none of them is visible on the public marketplace after approval', !JSON.stringify(pub.body).includes(pendingCar) && !JSON.stringify(pub.body).includes(draftCar) && !JSON.stringify(pub.body).includes(hiddenCar), pub.status);
  const ap2 = await call('POST', `/api/verification/admin/${vid}/approve`, { jar: ownerAcc.jar, body: {} });
  check('E4 approving an already-approved dealer is refused as an invalid transition (4xx, state unchanged)', ap2.status >= 400 && ap2.status < 500 && one(`select approved::text from dealers where "user"='${d.id}'`) === 'true', ap2.status);
  const su = await call('POST', `/api/verification/admin/${vid}/suspend`, { jar: ownerAcc.jar, body: { suspensionReason: 'Policy review' } });
  check('E5 suspension is audited and does not delete listings', su.status === 200 && one(`select count(*) from cars where dealer_id='${d.id}' and deleted_at is null`) === '3' && Number(one(`select count(*) from audit_logs where details::text like '%${d.id}%' or entity_id='${vid}'`)) >= 1, su.status);
  const re = await call('POST', `/api/verification/admin/${vid}/reinstate`, { jar: ownerAcc.jar, body: {} });
  check('E6 reinstatement restores approval without publishing the unpublished listings', re.status === 200 && one(`select string_agg(status, ',' order by status) from cars where dealer_id='${d.id}'`) === 'draft,hidden,pending', re.status + ' ' + one(`select string_agg(status, ',' order by status) from cars where dealer_id='${d.id}'`));
  const nonOwner = await call('POST', `/api/verification/admin/${vid}/suspend`, { jar: staffLow.hr.jar, body: { suspensionReason: 'x' } }); check('E7 non-privileged staff cannot suspend a dealer (403)', nonOwner.status === 403, nonOwner.status);

  // ---------- F. newly mounted dealer auction-setup endpoints: boundaries + concurrency
  const cfg = () => ({ config: { startingBid: 5000, bidIncrement: 500, reserveMode: 'none', startsAt: new Date(Date.now() + 3 * 864e5).toISOString(), endsAt: new Date(Date.now() + 5 * 864e5).toISOString(), registrationDeadline: new Date(Date.now() + 2 * 864e5).toISOString(), settlement: { mode: 'direct', paymentMethod: 'mpesa' }, commitment: { required: false }, paymentDeadlineHours: 24, termsAccepted: true, winnerFulfilment: { collectionLocation: 'Nairobi' } } });
  const car = seedCar(dealer.id, 'Auction ops car');
  const sv = await call('PUT', `/api/dealer/cars/${car}/auction/setup`, { jar: dealer.jar, body: cfg() }); check('F1 the owning dealer can save a setup', sv.status === 200, sv.status + JSON.stringify(sv.body).slice(0, 100));
  const asStaff = await call('PUT', `/api/dealer/cars/${car}/auction/setup`, { jar: sa.jar, body: cfg() }); check('F2 a superadmin cannot write dealer-configured terms through the dealer endpoint', [403, 404].includes(asStaff.status), asStaff.status);
  const asSeller = await call('GET', `/api/dealer/cars/${car}/auction/setup`, { jar: seller.jar }); check('F3 a private seller cannot read a dealer setup', asSeller.status === 403, asSeller.status);
  const asBuyer = await call('POST', `/api/dealer/cars/${car}/auction/publish`, { jar: buyer.jar, body: {} }); check('F3 a buyer cannot publish', asBuyer.status === 403, asBuyer.status);
  const pubs = await Promise.all(Array.from({ length: 6 }, () => call('POST', `/api/dealer/cars/${car}/auction/publish`, { jar: dealer.jar, body: {} })));
  check('F4 publishing a listing that is not auction-ready is refused with its readiness blockers (422), never a 5xx, and publishes nothing', pubs.every((x) => x.status === 422 && Array.isArray(x.body?.readiness?.blockers) && x.body.readiness.blockers.length > 0) && one(`select count(*) from auction_setups where car_id='${car}' and publication_status='published'`) === '0', pubs.map((x) => x.status).join(','));
  const saves = await Promise.all([1, 2, 3, 4, 5, 6].map((n) => call('PUT', `/api/dealer/cars/${car}/auction/setup`, { jar: dealer.jar, body: { config: { ...cfg().config, startingBid: 5000 + n * 100 } } })));
  check('F4 concurrent saves by the owner never 5xx and leave exactly one setup row', saves.every((x) => x.status === 200) && one(`select count(*) from auction_setups where car_id='${car}'`) === '1', saves.map((x) => x.status).join(','));
  sql(`update auction_setups set publication_status='published', published_at=now(), locked_at=now() where car_id='${car}'`);
  const frozen = one(`select config::text from auction_setups where car_id='${car}'`);
  const after = await call('PUT', `/api/dealer/cars/${car}/auction/setup`, { jar: dealer.jar, body: { config: { ...cfg().config, startingBid: 1 } } });
  check('F5 once published, the terms are immutable (409) and the stored configuration is byte-identical', after.status === 409 && one(`select config::text from auction_setups where car_id='${car}'`) === frozen, after.status);
  const asStaff2 = await call('PUT', `/api/dealer/cars/${car}/auction/setup`, { jar: ownerAcc.jar, body: { config: { ...cfg().config, startingBid: 1 } } }); check('F5 not even the platform owner can alter published dealer terms through the dealer endpoint', [403, 404, 409].includes(asStaff2.status) && one(`select config::text from auction_setups where car_id='${car}'`) === frozen, asStaff2.status);
  const au = {}; for (const [n, who] of Object.entries({ buyer, seller, dealer })) au[n] = (await call('GET', `/api/auction-admin/${car}/bids`, { jar: who.jar })).status;
  check('F6 the Super Admin auction bid view is closed to buyers, sellers and dealers', Object.values(au).every((s) => s === 403), JSON.stringify(au));

  // ---------- G. cross-organization boundaries on the dealer team surfaces
  const dealer2 = await (async () => { const d0 = await L.register('dealer'); await L.verifyEmailViaToken(d0.email); sql(`update users set status='approved' where id='${d0.id}'`); const l0 = await L.login(d0.email); return { ...d0, jar: l0.jar }; })(); sql(`update dealers set approved=true where "user"='${dealer2.id}'`);
  const tm = await call('GET', '/api/dealer/team', { jar: dealer2.jar }); const tmText = JSON.stringify(tm.body);
  check('G1 a dealer\'s team list never contains another organization\'s members', tm.status < 500 && !tmText.includes(dealer.email), tm.status);
  const crossProfile = await call('PUT', `/api/dealer-platform/profile/${dealer.id}`, { jar: dealer2.jar, body: { bio: 'hijack' } }); check('G2 a dealer cannot edit another dealer\'s profile', crossProfile.status === 403, crossProfile.status);
  const crossSettle = await call('PUT', '/api/dealer/settlement', { jar: buyer.jar, body: { mpesaBusiness: '123456' } }); check('G3 a buyer cannot write dealer settlement details', [403, 404].includes(crossSettle.status), crossSettle.status);

  // ---------- H. self-promotion / privilege escalation
  const sp = await call('PUT', '/api/auth/profile', { jar: buyer.jar, body: { role: 'superadmin', isBanned: false, grantedPermissions: ['full_access'] } });
  check('H1 a profile update cannot change role or permissions', one(`select role from users where id='${buyer.id}'`) === 'user', sp.status);
  const sp2 = await call('PUT', `/api/admin/users/${buyer.id}`, { jar: buyer.jar, body: { role: 'superadmin' } }); check('H2 a buyer cannot use the admin user-update route on themselves', [403, 404].includes(sp2.status) && one(`select role from users where id='${buyer.id}'`) === 'user', sp2.status);
  const sp3 = await call('PUT', `/api/admin/users/${buyer.id}`, { jar: adm.jar, body: { role: 'superadmin' } }); check('H3 an admin cannot promote an account to superadmin', one(`select role from users where id='${buyer.id}'`) !== 'superadmin', sp3.status);
  const sp4 = await call('POST', '/api/auth/register', { body: { name: 'Eve', email: L.uniq('evil'), password: L.PASSWORD, role: 'superadmin', phone: '0712345999' } }); check('H4 self-registration as superadmin is refused', sp4.status >= 400 && sp4.status < 500, sp4.status);

  // ---------- I. per-seller commission settings are not schema-backed: the API must say so instead of leaking a raw 500
  const ss = await call('PUT', `/api/admin/users/${dealer.id}/seller-settings`, { jar: sa.jar, body: { commission: 7 } });
  check('I1 saving per-seller commission settings answers 503 SELLER_SETTINGS_NOT_PERSISTED (nothing stored, no raw database error)', ss.status === 503 && ss.body.code === 'SELLER_SETTINGS_NOT_PERSISTED' && !/schema cache|column/i.test(JSON.stringify(ss.body)), ss.status + JSON.stringify(ss.body).slice(0, 160));
  check('I2 a buyer cannot reach seller-settings', (await call('PUT', `/api/admin/users/${dealer.id}/seller-settings`, { jar: buyer.jar, body: { commission: 1 } })).status === 403, '');

  const failed = L.results.filter((x) => !x.ok).length;
  console.log(`\n${L.results.length - failed}/${L.results.length} passed`);
  require('fs').writeFileSync(process.env.RESULT_JSON || '/dev/null', JSON.stringify(L.results, null, 1));
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(2); });
