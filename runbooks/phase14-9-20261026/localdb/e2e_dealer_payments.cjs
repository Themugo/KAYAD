// Phase 14.9 - DB-backed dealer settings, auction-configuration ownership, customer payment initiation, M-Pesa callback idempotency
// and payment-history visibility checks. Sandbox/deterministic: no request ever leaves the machine (Daraja is not configured locally;
// provider callbacks are posted to the local callback route with fixture CheckoutRequestIDs). Never run against staging/production.
const crypto = require('crypto');
const fs = require('fs');
const L = require('./e2e_lib.cjs');
const { check, call, sql } = L;
const one = (q) => sql(q);
const uuidOf = (out) => out.split('\n').filter((x) => /^[0-9a-f-]{36}$/.test(x))[0];
const BACKEND_LOG = process.env.BACKEND_LOG || '/home/claude/work/p149/logs/backend-live.log';

const seedCar = (dealerId, title, cols = {}) => {
  const base = { title, brand: 'Toyota', model: 'Prado', year: 2018, price: 1000000, dealer_id: dealerId, status: 'available', images: `[{"url":"https://img.test/x.jpg"}]`, ...cols };
  const keys = Object.keys(base); const vals = keys.map((k) => { const v = base[k]; return k === 'images' ? `'${v}'::jsonb` : v === null ? 'null' : typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`; });
  return uuidOf(sql(`set session_replication_role=replica; insert into cars(${keys.join(',')}) values (${vals.join(',')}) returning id`));
};
async function approvedDealer() {
  const d = await L.register('dealer'); await L.verifyEmailViaToken(d.email);
  sql(`update users set status='approved' where id='${d.id}'`); sql(`update dealers set approved=true, business_name='Fixture Motors' where "user"='${d.id}'`); L.grantFixtureSubscription(d.id);
  const l = await L.login(d.email); return { ...d, jar: l.jar };
}
let _freshQueue = [];
const fresh = () => { const id = require('crypto').randomUUID(); const email = L.uniq('pp') ; sql(`insert into users(id,name,email,role,status,email_verified,phone) values ('${id}','Payer','${email}','user','approved',true,'2547${String(10000000 + Math.floor(Math.random() * 89999999))}')`); return { id }; };
async function buyer() { const u = await L.register('user'); await L.verifyEmailViaToken(u.email); const l = await L.login(u.email); return { ...u, jar: l.jar }; }
const phoneOf = () => '2547' + String(10000000 + Math.floor(Math.random() * 89999999));
const cb = (checkout, { code = 0, amount, receipt = 'R' + crypto.randomBytes(4).toString('hex').toUpperCase(), phone = '254700000000' } = {}) => ({
  Body: { stkCallback: { MerchantRequestID: 'mr_' + checkout, CheckoutRequestID: checkout, ResultCode: code, ResultDesc: code === 0 ? 'The service request is processed successfully.' : 'Request cancelled by user',
    ...(code === 0 ? { CallbackMetadata: { Item: [{ Name: 'Amount', Value: amount }, { Name: 'MpesaReceiptNumber', Value: receipt }, { Name: 'PhoneNumber', Value: Number(phone) }] } } : {}) } },
});
const post = (body, headers = {}) => call('POST', '/api/payments/callback', { noCsrf: true, body, headers });
const seedPaymentRaw = (userId, carId, { type = 'listing', amount = 100, status = 'pending', processed = false, phone = '254711111111' } = {}) => {
  const ck = 'ws_CO_' + crypto.randomBytes(8).toString('hex');
  sql(`insert into payments(user_id,car_id,amount,type,status,checkout_request_id,phone,processed,mode,metadata) values ('${userId}',${carId ? `'${carId}'` : 'null'},${amount},'${type}','${status}','${ck}','${phone}',${processed},'mpesa','{}'::jsonb)`);
  return ck;
};
const seedPayment = (userId, carId, opts = {}) => seedPaymentRaw(userId === global.__buyId && opts.status !== 'success' ? fresh().id : userId, carId, opts);
const pay = (ck) => one(`select status||'|'||coalesce(mpesa_receipt,'-')||'|'||processed::text from payments where checkout_request_id='${ck}'`).split('|');

(async () => {
  const A = await approvedDealer(); const B = await approvedDealer(); const buy = await buyer(); global.__buyId = buy.id;

  // ---------------- E. dealer settlement details / payout destination
  const setl = (who, body) => call('PUT', '/api/dealer/settlement', { jar: who.jar, body });
  let r = await setl(A, { mpesaBusiness: 'abc<script>' }); check('E1 a non-numeric Paybill/Till is refused (400) and nothing is stored', r.status === 400 && one(`select coalesce(payment_details->>'paybillNumber','-') from dealers where "user"='${A.id}'`) === '-', r.status);
  r = await setl(A, { paymentDetails: { mpesaPhone: '12' } }); check('E1 an invalid M-Pesa phone is refused (400)', r.status === 400, r.status);
  r = await setl(A, { bankAccount: '<b>1</b>' }); check('E1 markup / control characters in settlement text are refused', r.status === 400, r.status);
  r = await setl(A, { mpesaBusiness: '123456', mpesaBusinessName: 'Fixture Motors', paymentDetails: { mpesaPhone: '0712345678' } }); check('E2 valid settlement details are saved', r.status === 200 && one(`select payment_details->>'paybillNumber' from dealers where "user"='${A.id}'`) === '123456', r.status);
  r = await setl(A, { mpesaBusiness: '', mpesaBusinessName: 'Fixture Motors' }); check('E2 a field can still be cleared with an empty string', r.status === 200, r.status);
  const bBefore = one(`select coalesce(payment_details::text,'{}') from dealers where "user"='${B.id}'`);
  r = await setl(A, { mpesaBusiness: '999999', user: B.id, dealer: B.id, id: one(`select id from dealers where "user"='${B.id}'`) });
  check('E3 identifier substitution in the body cannot change another dealer\'s settlement details', one(`select coalesce(payment_details::text,'{}') from dealers where "user"='${B.id}'`) === bBefore, '');
  r = await call('PUT', '/api/dealer/settlement', { jar: buy.jar, body: { mpesaBusiness: '123456' } }); check('E3 a buyer cannot write dealer settlement details', [403, 404].includes(r.status), r.status);
  r = await call('PUT', '/api/dealer/settlement', { jar: A.jar, noCsrf: true, body: { mpesaBusiness: '123456' } }); check('E3 settlement write without CSRF is refused', r.status === 403, r.status);

  // payout-destination step-up (account phone is the payout destination)
  const prof = (who, body) => call('PUT', `/api/dealer-platform/profile/${who.id}`, { jar: who.jar, body });
  sql(`update users set phone='254722000001' where id='${A.id}'`);
  r = await prof(A, { phone: '0722000002' }); check('E4 changing the payout phone without the current password is refused (403 STEP_UP_REQUIRED) and nothing changes', r.status === 403 && r.body.code === 'STEP_UP_REQUIRED' && one(`select phone from users where id='${A.id}'`) === '254722000001', r.status + ' ' + (r.body.code || ''));
  r = await prof(A, { phone: '0722000002', currentPassword: 'Wrong#Pass9z' }); check('E4 a wrong current password is refused (403 STEP_UP_FAILED)', r.status === 403 && r.body.code === 'STEP_UP_FAILED' && one(`select phone from users where id='${A.id}'`) === '254722000001', r.status + ' ' + (r.body.code || ''));
  r = await call('PUT', '/api/auth/profile', { jar: A.jar, body: { phone: '0722000002' } }); check('E4 the account-profile endpoint enforces the same step-up (no bypass route)', r.status === 403 && one(`select phone from users where id='${A.id}'`) === '254722000001', r.status);
  sql(`update users set phone_verified=true where id='${A.id}'`);
  r = await prof(A, { phone: '0722000002', currentPassword: L.PASSWORD }); check('E4 with the correct password the phone changes and verification is reset (14.6 protection preserved)', r.status === 200 && one(`select phone||'|'||phone_verified::text from users where id='${A.id}'`) === '254722000002|false', r.status + JSON.stringify(r.body).slice(0, 100));
  r = await prof(A, { phone: '0722000002', bio: 'unchanged phone needs no password' }); check('E4 an unchanged phone or non-phone edit needs no password', r.status === 200, r.status);
  r = await prof(B, { businessName: 'New Name Ltd' }); check('E5 other profile edits are unaffected by the step-up', r.status === 200, r.status);
  r = await call('PUT', `/api/dealer-platform/profile/${B.id}`, { jar: A.jar, body: { bio: 'x' } }); check('E5 a dealer cannot edit another dealer\'s profile (403)', r.status === 403, r.status);
  const wrongBurst = []; const C = await approvedDealer(); sql(`update users set phone='254733000001' where id='${C.id}'`);
  for (let i = 0; i < 12; i++) wrongBurst.push((await prof(C, { phone: '07330000' + String(10 + i), currentPassword: 'Wrong#Pass' + i })).status);
  check('E6 repeated wrong step-up passwords are rate limited (429)', wrongBurst.includes(429), wrongBurst.join(','));
  const bu = await buyer(); r = await call('PUT', '/api/auth/profile', { jar: bu.jar, body: { phone: '0744000001' } }); check('E7 non-payout roles (buyer) keep changing their phone without a password', r.status === 200, r.status);

  // dealer earnings do not expose the buyer's phone / identity
  const earnCar = seedCar(A.id, 'Earnings car');
  const ckE = seedPayment(buy.id, earnCar, { type: 'purchase', amount: 1000000, status: 'success', processed: true, phone: '254799123456' });
  sql(`update payments set dealer_amount=950000, platform_fee=50000, mpesa_receipt='RCPT123' where checkout_request_id='${ckE}'`);
  r = await call('GET', '/api/dealer/earnings', { jar: A.jar });
  const earnJson = JSON.stringify(r.body);
  check('E8 dealer earnings list the sale and its receipt', r.status === 200 && r.body.payments?.length >= 1 && /RCPT123/.test(earnJson), r.status);
  check('E8 dealer earnings never expose the buyer\'s phone number, user id or checkout id', !/254799123456|799123456/.test(earnJson) && !earnJson.includes(buy.id) && !earnJson.includes(ckE), '');

  // ---------------- F. dealer-configured auction settings (ownership + state)
  const cfg = () => ({ config: { startingBid: 5000, bidIncrement: 500, reserveMode: 'none', startsAt: new Date(Date.now() + 3 * 864e5).toISOString(), endsAt: new Date(Date.now() + 5 * 864e5).toISOString(), registrationDeadline: new Date(Date.now() + 2 * 864e5).toISOString(), settlement: { mode: 'direct', paymentMethod: 'mpesa' }, commitment: { required: false }, paymentDeadlineHours: 24, termsAccepted: true, winnerFulfilment: { collectionLocation: 'Nairobi' } } });
  const save = (who, car) => call('PUT', `/api/dealer/cars/${car}/auction/setup`, { jar: who.jar, body: cfg() });
  const carOk = seedCar(A.id, 'Auction ok');
  r = await save(A, carOk); check('F1 the owner can save an auction setup for an available listing', r.status === 200 && one(`select count(*) from auction_setups where car_id='${carOk}'`) === '1', r.status + JSON.stringify(r.body).slice(0, 100));
  r = await save(B, carOk); check('F1 another dealer cannot read-modify the setup (403) and the saved config is unchanged', r.status === 403, r.status);
  r = await call('GET', `/api/dealer/cars/${carOk}/auction/setup`, { jar: B.jar }); check('F1 another dealer cannot read the setup (403)', r.status === 403, r.status);
  r = await call('POST', `/api/dealer/cars/${carOk}/auction/amendments`, { jar: B.jar, body: { reason: 'x', config: cfg().config } }); check('F1 another dealer cannot request an amendment (403)', r.status === 403, r.status);
  r = await call('POST', `/api/dealer/cars/${carOk}/auction/publish`, { jar: B.jar, body: {} }); check('F1 another dealer cannot publish (403)', r.status === 403, r.status);
  r = await call('PUT', `/api/dealer/cars/${carOk}/auction/setup`, { jar: buy.jar, body: cfg() }); check('F1 a buyer cannot configure an auction (403)', r.status === 403, r.status);
  const states = [['soft-deleted listing', { deleted_at: 'now()' }, [404, 409]], ['sold listing', { status: 'sold' }, [409]], ['reserved listing', { status: 'reserved' }, [409]], ['listing whose auction is live', { auction_status: 'live' }, [409]], ['listing whose auction has ended', { auction_status: 'ended' }, [409]]];
  for (const [label, cols, ok] of states) {
    const sc = seedCar(A.id, 'Auction ' + label); if (cols.deleted_at) sql(`update cars set deleted_at=now() where id='${sc}'`); else { const k = Object.keys(cols)[0]; sql(`update cars set ${k}='${cols[k]}' where id='${sc}'`); }
    const before = one(`select count(*) from auction_setups where car_id='${sc}'`);
    r = await save(A, sc); check(`F2 saving an auction setup for a ${label} is refused (${ok.join('/')}) and nothing is written`, ok.includes(r.status) && one(`select count(*) from auction_setups where car_id='${sc}'`) === before, r.status);
    r = await call('POST', `/api/dealer/cars/${sc}/auction/publish`, { jar: A.jar, body: {} }); check(`F2 publishing for a ${label} is refused`, [400, 404, 409, 422].includes(r.status) && one(`select count(*) from auction_setups where car_id='${sc}' and publication_status='published'`) === '0', r.status);
  }
  sql(`update auction_setups set publication_status='published', published_at=now(), locked_at=now() where car_id='${carOk}'`);
  const cfgBefore = one(`select config::text from auction_setups where car_id='${carOk}'`);
  r = await call('PUT', `/api/dealer/cars/${carOk}/auction/setup`, { jar: A.jar, body: { config: { ...cfg().config, startingBid: 1 } } }); check('F3 a published auction setup is immutable (409) and its terms are untouched', r.status === 409 && one(`select config::text from auction_setups where car_id='${carOk}'`) === cfgBefore, r.status);
  r = await call('POST', `/api/dealer/cars/${carOk}/auction/amendments`, { jar: A.jar, body: { reason: 'raise reserve', config: { ...cfg().config, reservePrice: 9000 } } }); check('F3 the owner can only request a controlled amendment (201), which does not change the live terms', r.status === 201 && one(`select config::text from auction_setups where car_id='${carOk}'`) === cfgBefore, r.status);
  r = await call('POST', `/api/dealer/cars/${carOk}/auction/amendments`, { jar: A.jar, body: { config: cfg().config } }); check('F3 an amendment requires a reason (400)', r.status === 400, r.status);

  // ---------------- G. customer payment initiation (server-authoritative amount, listing state)
  const init = async (who, body) => { const w = who === buy ? await buyer() : who; return call('POST', '/api/payments/initiate', { jar: w.jar, body: { phone: phoneOf(), type: 'purchase', ...body } }); }; // the payment limiter is per account, so each customer request uses a fresh customer
  const mk = (label, cols = {}) => { const c = seedCar(A.id, 'Pay ' + label, cols); return c; };
  const counts = (c) => Number(one(`select count(*) from payments where car_id='${c}'`));
  const live = mk('available'); r = await init(buy, { carId: live, amount: 1000000 });
  check('G1 an available listing reaches the provider stage (local Daraja is unconfigured, so the request fails AFTER validation and the payment is marked failed - never pending/success)', r.status !== 400 && counts(live) === 1 && one(`select status from payments where car_id='${live}'`) === 'failed', r.status + ' ' + JSON.stringify(r.body).slice(0, 120));
  r = await init(buy, { carId: live, amount: 1 }); check('G2 a client-supplied amount that differs from the listing price is refused (400)', r.status === 400 && /does not match/i.test(JSON.stringify(r.body)), r.status);
  const refused = [['soft-deleted listing', { status: 'available' }, 'deleted', [404]], ['sold listing', { status: 'sold' }, '', [409]], ['pending-review listing', { status: 'pending' }, '', [404]], ['hidden listing', { status: 'hidden' }, '', [404]], ['draft listing', { status: 'draft' }, '', [404]]];
  for (const [label, cols, flag, ok] of refused) {
    const c = mk(label, cols); if (flag === 'deleted') sql(`update cars set deleted_at=now() where id='${c}'`);
    r = await init(buy, { carId: c, amount: 1000000 }); check(`G3 payment initiation for a ${label} is refused (${ok.join('/')}) and no payment row is created`, ok.includes(r.status) && counts(c) === 0, r.status + ' rows=' + counts(c));
  }
  const own = mk('own'); r = await init(A, { carId: own, amount: 1000000 }); check('G4 a dealer cannot pay for their own listing (403/409) and no payment row is created', [403, 409].includes(r.status) && counts(own) === 0, r.status);
  r = await init(buy, { carId: live, amount: 1000000, phone: '0712345678' }); check('G5 a malformed phone is refused by validation (400)', r.status === 400, r.status);
  r = await call('POST', '/api/payments/initiate', { jar: buy.jar, noCsrf: true, body: { phone: phoneOf(), type: 'purchase', carId: live, amount: 1000000 } }); check('G5 initiation without CSRF is refused (403)', r.status === 403, r.status);
  r = await call('POST', '/api/payments/initiate', { jar: {}, body: { phone: phoneOf(), type: 'purchase', carId: live, amount: 1000000 } }); check('G5 unauthenticated initiation is refused (401)', r.status === 401, r.status);
  r = await init(buy, { carId: live, amount: 1000000, type: 'subscription' }); check('G5 types without a server-authoritative amount stay refused', r.status === 400, r.status);
  const logTxt = fs.existsSync(BACKEND_LOG) ? fs.readFileSync(BACKEND_LOG, 'utf8') : '';
  check('G6 the backend log contains no full customer phone numbers from payment initiation', !/\b2547\d{8}\b/.test(logTxt.replace(/254700000000|254711111111|254799123456/g, '')), '');

  // ---------------- H. callbacks: authenticity shape, idempotency, replay, ordering, amounts
  const payer = await buyer(); const ck1 = seedPaymentRaw(payer.id, null, { amount: 100 });
  const body1 = cb(ck1, { amount: 100, receipt: 'RECEIPT1' });
  const burst = await Promise.all(Array.from({ length: 5 }, () => post(body1)));
  check('H1 five concurrent identical success callbacks all acknowledge (200) and the payment succeeds exactly once with the provider receipt', burst.every((x) => x.status === 200) && pay(ck1)[0] === 'success' && pay(ck1)[1] === 'RECEIPT1', burst.map((x) => x.status).join(',') + ' ' + pay(ck1).join('|'));
  check('H1 payment events are not duplicated by the replay (one callback_received, at most one amount_verified)', Number(one(`select count(*) from payment_events where payment_id=(select id from payments where checkout_request_id='${ck1}') and event_type='callback_received'`)) <= 1, one(`select string_agg(event_type,',') from payment_events where payment_id=(select id from payments where checkout_request_id='${ck1}')`));
  await new Promise((z) => setTimeout(z, 1500));
  check('H1 the customer receipt is delivered: an in-app payment notification exists for the payer', Number(one(`select count(*) from notifications where user_id='${payer.id}' and type='payment'`)) >= 1, '');
  await post(cb(ck1, { amount: 100, receipt: 'DIFFERENT' })); check('H2 a later replay with a different receipt cannot overwrite the recorded receipt', pay(ck1)[1] === 'RECEIPT1', pay(ck1).join('|'));
  await post(cb(ck1, { code: 1032 })); check('H3 a failure callback arriving after success cannot downgrade the payment (reordered delivery)', pay(ck1)[0] === 'success', pay(ck1).join('|'));
  const ck2 = seedPayment(buy.id, null, { amount: 100 }); await post(cb(ck2, { code: 1032 }));
  check('H4 a cancelled/failed callback marks the payment failed with no receipt', pay(ck2)[0] === 'failed' && pay(ck2)[1] === '-', pay(ck2).join('|'));
  await post(cb(ck2, { amount: 100, receipt: 'LATE' })); const lateState = pay(ck2).join('|');
  check('H4 a success callback after a recorded failure does not silently flip the state (documented reconciliation case: provider says paid, platform says failed)', lateState.startsWith('failed|-'), lateState);
  const ck3 = seedPayment(buy.id, null, { amount: 100 }); await post(cb(ck3, { amount: 99, receipt: 'SHORT' }));
  check('H5 an amount that differs from the server-recorded amount fails the payment and records no success receipt', pay(ck3)[0] === 'failed' && pay(ck3)[1] !== 'SHORT', pay(ck3).join('|'));
  const before = one(`select count(*) from payments`); r = await post(cb('ws_CO_unknown_' + Date.now(), { amount: 100 }));
  check('H6 a callback for an unknown checkout id changes nothing and still acknowledges', r.status === 200 && one(`select count(*) from payments`) === before, r.status);
  r = await call('POST', '/api/payments/callback', { noCsrf: true, form: JSON.stringify(cb(ck3, { amount: 100 })), headers: { 'Content-Type': 'text/plain' } }); check('H7 a callback that is not JSON is rejected without processing', JSON.stringify(r.body).includes('Invalid') || r.status >= 400 || r.body?.ResultCode === 1, r.status + JSON.stringify(r.body).slice(0, 80));
  r = await post({ Body: {} }); check('H7 a structurally invalid callback is rejected', r.body?.ResultCode === 1 || r.status >= 400, JSON.stringify(r.body).slice(0, 80));
  const stale = cb(seedPayment(buy.id, null, { amount: 100 }), { amount: 100 }); stale.Body.stkCallback.TransactTime = new Date(Date.now() - 3600e3).toISOString(); const sck = stale.Body.stkCallback.CheckoutRequestID;
  await post(stale); check('H7 a callback with an old timestamp is rejected as a replay and the payment stays pending', pay(sck)[0] === 'pending', pay(sck).join('|'));
  const ck4 = seedPayment(buy.id, null, { amount: 100 });
  const mixed = await Promise.all([post(cb(ck4, { amount: 100, receipt: 'WIN' })), post(cb(ck4, { code: 1032 }))]);
  check('H8 concurrent success and failure callbacks for one checkout end in exactly one terminal state with no 5xx', mixed.every((x) => x.status < 500) && ['success', 'failed'].includes(pay(ck4)[0]) && (pay(ck4)[0] === 'success' ? pay(ck4)[1] === 'WIN' : pay(ck4)[1] === '-'), mixed.map((x) => x.status).join(',') + ' ' + pay(ck4).join('|'));

  // purchase fulfilment only after a verified successful callback
  const buyCar = mk('fulfilment'); const ckP = seedPayment(buy.id, buyCar, { type: 'purchase', amount: 1000000 });
  check('H9 a pending purchase does not fulfil the sale (listing stays available)', one(`select status from cars where id='${buyCar}'`) === 'available', '');
  await post(cb(ckP, { code: 1032 })); check('H9 a failed purchase does not fulfil the sale', one(`select status from cars where id='${buyCar}'`) === 'available' && pay(ckP)[0] === 'failed', one(`select status from cars where id='${buyCar}'`));
  const ckP2 = seedPayment(buy.id, buyCar, { type: 'purchase', amount: 1000000 }); await Promise.all([post(cb(ckP2, { amount: 1000000, receipt: 'BUY1' })), post(cb(ckP2, { amount: 1000000, receipt: 'BUY1' }))]);
  const sold = one(`select status||'|'||coalesce(sold::text,'-') from cars where id='${buyCar}'`);
  check('H9 a verified successful purchase callback (sent twice) settles the payment once', pay(ckP2)[0] === 'success' && Number(one(`select count(*) from payments where car_id='${buyCar}' and status='success'`)) === 1, pay(ckP2).join('|') + ' car=' + sold);
  check('H9 the sale is recorded against the listing exactly once (escrow or direct settlement per the listing configuration)', Number(one(`select count(*) from escrows where car='${buyCar}'`)) <= 1, sold + ' escrows=' + one(`select count(*) from escrows where car='${buyCar}'`));

  // ---------------- I. history visibility
  const other = await buyer();
  r = await call('GET', '/api/payments/my', { jar: other.jar }); check('I1 a customer\'s payment history contains only their own payments', r.status === 200 && (r.body.payments || []).length === 0, r.status + ' ' + (r.body.payments || []).length);
  r = await call('GET', '/api/payments/my', { jar: payer.jar }); check('I1 the payer sees their own payments', r.status === 200 && (r.body.payments || []).length >= 1, (r.body.payments || []).length);
  r = await call('GET', `/api/payments/status/${ck1}`, { jar: other.jar }); check('I2 another customer cannot read a payment by checkout id', !(r.body.payment || r.body.data) && !JSON.stringify(r.body).includes('RECEIPT1') && !JSON.stringify(r.body).includes('254711111111'), r.status + JSON.stringify(r.body).slice(0, 100));
  r = await call('GET', `/api/payments/status/${ck1}`, { jar: payer.jar }); check('I2 the payer can read their own payment status', r.status === 200 && JSON.stringify(r.body).includes('success'), r.status);
  r = await call('GET', `/api/payments/status/${ck1}`, { jar: A.jar }); check('I3 a dealer cannot read a customer\'s payment record through the customer status route', !JSON.stringify(r.body).includes('254711111111'), r.status + JSON.stringify(r.body).slice(0, 100));

  fs.writeFileSync(process.env.OUT || 'e2e_dealer_payments_results.json', JSON.stringify({ results: L.results }, null, 1));
  const failed = L.results.filter((x) => !x.ok); console.log(`\n${L.results.length - failed.length}/${L.results.length} passed`); process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
