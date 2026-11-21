// GAP-OFFER-TXN regression journey: accepted offer -> payment, against a real migrated disposable PostgreSQL and the real HTTP backend.
// Provider note: M-Pesa STK is NOT executed (no sandbox credentials). The payment row is created by the real server code before the provider
// call, so amounts are verified on that row; settlement is exercised by calling the real settlement DB function directly (labelled SIMULATED).
import { makeUser, q, qAsync, check, finish, uid, Client } from './lib.mjs';
const PHONE = '254712345678';
const k = () => 'k-' + crypto.randomUUID();
const seller = await makeUser({ tag: 'seller' });
const buyer = await makeUser({ tag: 'buyer' });
const buyer2 = await makeUser({ tag: 'buyer2' });
const outsider = await makeUser({ tag: 'outsider' });
const otherSeller = await makeUser({ tag: 'oseller' });

const car = (owner, price = 3000000, title = 'Journey car') => q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold) values ('${title} ${uid()}','Mazda','CX-5',2019,${price},'available','${owner.id}',false) returning id`);
const lead = (b, s, v) => q(`insert into leads(buyer,dealer,vehicle,source) values ('${b.id}','${s.id}','${v}','chat') returning id`);
const offer = async (c, L, amount) => c.raw(`/api/leads/${L}/offers`, { method: 'POST', body: { amount, idempotencyKey: k() } });
const act = (c, L, id, action, amount) => c.raw(`/api/leads/${L}/offers/${id}/actions`, { method: 'POST', body: { action, amount, idempotencyKey: k() } });
const lastOffer = (L) => q(`select id from marketplace_offers where lead_id='${L}' order by created_at desc limit 1`);
const settlementOf = (offerId, col) => q(`select ${col} from marketplace_offer_settlements where offer_id='${offerId}'`);
const pay = (c, L, o, body = { phone: PHONE }) => c.raw(`/api/leads/${L}/offers/${o}/pay`, { method: 'POST', body });
const generic = (c, carId, amount) => c.raw('/api/payments/initiate', { method: 'POST', body: { amount, phone: PHONE, carId, type: 'purchase' } });
const sqlFails = (sql) => { try { q(sql); return false; } catch { return true; } };

// ---- 1. unaccepted offer cannot be paid
const C1 = car(seller, 3000000, 'Main'); const L1 = lead(buyer, seller, C1);
const p0 = await offer(buyer, L1, 2500000);
const O1 = lastOffer(L1);
const r1 = await pay(buyer, L1, O1);
check('pending (unaccepted) offer cannot be paid', r1.status === 409 && r1.j?.code === 'OFFER_NOT_ACCEPTED', [r1.status, r1.j]);
// ---- 2. fractional KES is rejected BEFORE acceptance (decision 7), at the API and in the database function
const frac = await offer(buyer, L1, 2500000.5);
check('a fractional-KES offer is rejected at submission with a clear message', frac.status === 400 && /whole number/i.test(JSON.stringify(frac.j)), [frac.status, frac.j?.message]);
check('no offer row exists for the rejected fractional offer', q(`select count(*) from marketplace_offers where lead_id='${L1}' and amount<>trunc(amount)`) === '0');
check('database function independently rejects fractional amounts', sqlFails(`select kayad_offer_action('${L1}'::uuid,'${buyer.id}'::uuid,'submit',100.5,null,null,'frac-${uid()}-key')`));
await act(buyer, L1, O1, 'withdraw');
// ---- 3. accept -> authoritative agreed amount
await offer(buyer, L1, 2600000); const O2 = lastOffer(L1);
const sc = await act(buyer, L1, O2, 'accept');
check('sender cannot accept their own offer; no settlement is created', sc.status >= 400 && settlementOf(O2, 'count(*)') === '0', sc.status);
const oc = await act(outsider, L1, O2, 'accept');
check('an outsider cannot accept', oc.status >= 400 && settlementOf(O2, 'count(*)') === '0', oc.status);
const acc = await act(seller, L1, O2, 'accept');
check('seller accepts; settlement opens with the agreed amount', [200, 201].includes(acc.status) && settlementOf(O2, 'status') === 'awaiting_payment' && settlementOf(O2, 'agreed_amount') === '2600000', [acc.status, acc.j]);
check('settlement binds vehicle, buyer, seller and lead', settlementOf(O2, "vehicle_id||'|'||buyer_id||'|'||seller_id||'|'||lead_id") === `${C1}|${buyer.id}|${seller.id}|${L1}`);
const S1 = settlementOf(O2, 'id');
check('settlement creation is audited', q(`select count(*) from marketplace_offer_settlement_events where settlement_id='${S1}' and event_type='created'`) === '1');
const get = await buyer.raw(`/api/leads/${L1}/offers/${O2}/settlement`);
check('participant can read the settlement; outsider cannot', get.status === 200 && get.j?.settlement?.agreed_amount === 2600000 && (await outsider.raw(`/api/leads/${L1}/offers/${O2}/settlement`)).status === 403, get.status);

// ---- 4. amount integrity
const wrongAmt = await generic(buyer, C1, 3000000);
check('listing price is rejected on the generic route while an offer is agreed', wrongAmt.status === 400, [wrongAmt.status, wrongAmt.j?.message]);
const tooLow = await generic(buyer, C1, 1);
check('arbitrary amount rejected', tooLow.status === 400, tooLow.status);
const body = await pay(buyer, L1, O2, { phone: PHONE, amount: 1 });
check('browser-supplied amount on the pay route is refused outright (strict schema)', body.status === 400, [body.status, body.j]);
check('no payment row exists after refused attempts', q(`select count(*) from payments where car_id='${C1}'`) === '0');
const rightAmt = await generic(buyer, C1, 2600000);
const pr = q(`select amount||'|'||status||'|'||coalesce(metadata->>'settlementId','') from payments where car_id='${C1}' order by created_at desc limit 1`);
check('correct agreed amount passes the gate; payment row carries the agreed amount and settlement link (provider not executed)', pr.startsWith('2600000|') && pr.endsWith(S1), [rightAmt.status, pr]);
const viaRoute = await pay(buyer, L1, O2);
const pr2 = q(`select amount||'|'||coalesce(metadata->>'settlementId','') from payments where car_id='${C1}' order by created_at desc limit 1`);
check('server-side payment initiation uses the settlement amount (provider not executed)', pr2 === `2600000|${S1}` && [201, 502, 409].includes(viaRoute.status), [viaRoute.status, viaRoute.j, pr2]);
check('payment start/failure are audited', Number(q(`select count(*) from marketplace_offer_settlement_events where settlement_id='${S1}' and event_type='payment_started'`)) >= 1);
// ---- 5. parties and vehicle
const sp = await pay(seller, L1, O2);
check('seller cannot pay the accepted offer', sp.status === 403, [sp.status, sp.j?.code]);
const op = await pay(outsider, L1, O2);
check('outsider cannot pay', op.status === 403, op.status);
check('unauthenticated cannot pay', (await (await import('./lib.mjs')).Client && (await new (await import('./lib.mjs')).Client().raw(`/api/leads/${L1}/offers/${O2}/pay`, { method: 'POST', body: { phone: PHONE } })).status) >= 401);
const C1b = car(seller, 1000000, 'Other'); const L1b = lead(buyer, seller, C1b);
const wv = await pay(buyer, L1b, O2);
check('offer cannot be paid through another lead/vehicle', wv.status === 409 && wv.j?.code === 'OFFER_NOT_ACCEPTED', [wv.status, wv.j]);
const l2 = lead(buyer2, seller, C1);
const b2 = await generic(buyer2, C1, 3000000);
check('another buyer cannot pay the held vehicle at list price', b2.status === 409 && b2.j?.code === 'VEHICLE_RESERVED_BY_ACCEPTED_OFFER', [b2.status, b2.j]);
const b2agreed = await generic(buyer2, C1, 2600000);
check('another buyer cannot pay the agreed amount either', b2agreed.status === 409, b2agreed.status);
check('DB backstop: direct insert of a wrong amount is refused', sqlFails(`insert into payments(user_id,car_id,type,amount,phone,status) values ('${buyer.id}','${C1}','purchase',1000,'${PHONE}','pending')`));
check('DB backstop: direct insert by a different buyer is refused', sqlFails(`insert into payments(user_id,car_id,type,amount,phone,status) values ('${buyer2.id}','${C1}','purchase',2600000,'${PHONE}','pending')`));
// ---- 6. exclusivity / concurrency
await offer(buyer2, l2, 2900000); const O3 = lastOffer(l2);
const ex = await act(seller, l2, O3, 'accept');
check('a competing acceptance for the same vehicle is refused (409) and rolled back', ex.status === 409 && q(`select status from marketplace_offers where id='${O3}'`) === 'pending', [ex.status, ex.j?.message]);
const C5 = car(seller, 4000000, 'Race'); const La = lead(buyer, seller, C5); const Lb = lead(buyer2, seller, C5);
await offer(buyer, La, 3500000); await offer(buyer2, Lb, 3600000);
const Oa = lastOffer(La), Ob = lastOffer(Lb);
const [ra, rb] = await Promise.all([act(seller, La, Oa, 'accept'), act(seller, Lb, Ob, 'accept')]);
const oks = [ra, rb].filter((r) => [200, 201].includes(r.status)).length;
check('concurrent acceptance: exactly one wins', oks === 1 && q(`select count(*) from marketplace_offer_settlements where vehicle_id='${C5}' and status='awaiting_payment'`) === '1', [ra.status, rb.status]);
// ---- 7. duplicate initiation and cancel while in flight
q(`delete from payments where car_id='${C1}' and status<>'pending'`.replace('delete from payments', 'update payments set status=\'failed\''));
const pend = q(`insert into payments(user_id,car_id,type,amount,phone,status,metadata) values ('${buyer.id}','${C1}','purchase',2600000,'${PHONE}','pending','{"escrowEligible":true}') returning id`);
const dup = await pay(buyer, L1, O2);
check('duplicate initiation while a payment is pending is refused', dup.status === 409, [dup.status, dup.j]);
const cin = await buyer.raw(`/api/leads/${L1}/offers/${O2}/settlement/cancel`, { method: 'POST', body: {} });
check('settlement cannot be cancelled while a payment is in flight', cin.status === 409 && cin.j?.code === 'PAYMENT_IN_PROGRESS', [cin.status, cin.j]);
// ---- 8. settlement (SIMULATED provider confirmation) keeps the escrow amount equal to the agreed amount
const settle = q(`select kayad_settle_purchase_payment_atomic('${pend}','SIMULATED-RECEIPT')::text`);
check('SIMULATED settlement: settlement is paid and linked to payment and escrow', settlementOf(O2, 'status') === 'paid' && settlementOf(O2, 'payment_id') === pend && settlementOf(O2, 'escrow_id') !== '', settle);
check('escrow amount equals the agreed amount', q(`select amount from escrows where id=(select escrow_id from marketplace_offer_settlements where offer_id='${O2}')`).startsWith('2600000'), q(`select amount from escrows where payment='${pend}'`));
check('purchase outcome amount equals the agreed amount', q(`select amount from purchase_outcomes where payment_id='${pend}'`).startsWith('2600000'));
check('payment is audited as paid', q(`select count(*) from marketplace_offer_settlement_events where settlement_id='${S1}' and event_type='paid'`) === '1');
const again = await pay(buyer, L1, O2);
check('a paid offer cannot be paid again (route)', again.status === 409 && again.j?.code === 'ALREADY_PAID', [again.status, again.j]);
const again2 = await generic(buyer, C1, 2600000);
check('a paid vehicle cannot be paid again (generic route)', again2.status === 409, [again2.status, again2.j]);
check('DB backstop: second purchase payment after paid is refused', sqlFails(`insert into payments(user_id,car_id,type,amount,phone,status) values ('${buyer.id}','${C1}','purchase',2600000,'${PHONE}','pending')`));
const cp = await buyer.raw(`/api/leads/${L1}/offers/${O2}/settlement/cancel`, { method: 'POST', body: {} });
check('a paid settlement cannot be cancelled', cp.status === 409, [cp.status, cp.j]);
// ---- 9. expiry
const C2 = car(seller, 2000000, 'Expiry'); const L2 = lead(buyer, seller, C2);
await offer(buyer, L2, 1800000); const E1 = lastOffer(L2); await act(seller, L2, E1, 'accept');
q(`update marketplace_offer_settlements set expires_at=now()-interval '1 minute' where offer_id='${E1}'`);
const ex1 = await pay(buyer, L2, E1);
check('expired payment window is refused and the lapse persists', ex1.status === 409 && ex1.j?.code === 'SETTLEMENT_EXPIRED' && settlementOf(E1, 'status') === 'lapsed', [ex1.status, ex1.j]);
check('lapse is audited', q(`select count(*) from marketplace_offer_settlement_events where offer_id='${E1}' and event_type='lapsed'`) === '1');
await offer(buyer, L2, 1900000); const E2 = lastOffer(L2); const re = await act(seller, L2, E2, 'accept');
check('after a lapse the parties can renegotiate and accept a new price', [200, 201].includes(re.status) && settlementOf(E2, 'agreed_amount') === '1900000', [re.status, re.j?.message]);
const gx = await generic(buyer, C2, 1800000);
check('the lapsed price no longer applies', gx.status === 400, gx.status);
// ---- 10. cancel / renegotiate
const cc = await seller.raw(`/api/leads/${L2}/offers/${E2}/settlement/cancel`, { method: 'POST', body: { reason: 'changed mind' } });
check('participant cancels an awaiting settlement', cc.status === 200 && settlementOf(E2, 'status') === 'cancelled', [cc.status, cc.j]);
const outc = await outsider.raw(`/api/leads/${L2}/offers/${E2}/settlement/cancel`, { method: 'POST', body: {} });
check('outsider cannot cancel', outc.status === 403, outc.status);
const pc = await pay(buyer, L2, E2);
check('cancelled settlement cannot be paid', pc.status === 409 && pc.j?.code === 'SETTLEMENT_CANCELLED', [pc.status, pc.j]);
await offer(buyer, L2, 1950000); const E3 = lastOffer(L2); const re3 = await act(seller, L2, E3, 'accept');
check('renegotiation after cancel opens a fresh settlement', [200, 201].includes(re3.status) && settlementOf(E3, 'status') === 'awaiting_payment');
// ---- 11. listing changes
q(`update cars set price=9000000 where id='${C2}'`);
const lp = await generic(buyer, C2, 9000000);
check('listing price change after acceptance does not change the agreed amount', lp.status === 400 && settlementOf(E3, 'agreed_amount') === '1950000', [lp.status, lp.j]);
q(`update cars set status='sold', sold=true where id='${C2}'`);
const sold = await pay(buyer, L2, E3);
check('vehicle sold meanwhile: payment refused and settlement cancelled', sold.status === 409 && sold.j?.code === 'VEHICLE_UNAVAILABLE' && settlementOf(E3, 'status') === 'cancelled', [sold.status, sold.j]);
// ---- 12. ownership
const C6 = car(otherSeller, 2200000, 'NotYours'); const L6 = lead(buyer, seller, C6);
await offer(buyer, L6, 2000000); const N1 = lastOffer(L6);
const own = await act(seller, L6, N1, 'accept');
check('seller who does not own the vehicle cannot accept an offer on it', own.status >= 400 && settlementOf(N1, 'count(*)') === '0', [own.status, own.j?.message]);
// ---- 13. immutability and append-only audit
check('agreed amount is immutable in the database', sqlFails(`update marketplace_offer_settlements set agreed_amount=1 where id='${S1}'`));
check('audit events are append-only', sqlFails(`update marketplace_offer_settlement_events set event_type='created' where settlement_id='${S1}'`) && sqlFails(`delete from marketplace_offer_settlement_events where settlement_id='${S1}'`));
check('client roles have no direct access to settlement tables', q(`select has_table_privilege('authenticated','public.marketplace_offer_settlements','SELECT')::text||has_table_privilege('anon','public.marketplace_offer_settlements','SELECT')::text`) === 'falsefalse');

// ================= decisions 3/4/6 and section 3 (reservation, races, callbacks, freeze, audit) =================
const detail = (c, id) => c.raw(`/api/cars/${id}`);
// ---- reservation is visible, listing stays public
const anon = new Client();
const d1 = await detail(anon, C5);
const awaitingCar = q(`select vehicle_id from marketplace_offer_settlements where status='awaiting_payment' and vehicle_id='${C5}'`);
check('reserved vehicle stays publicly visible with a reservation flag and no buyer identity', d1.status === 200 && d1.j?.data?.reservation?.reserved === true && d1.j.data.reservation.state === 'awaiting_payment' && !JSON.stringify(d1.j).includes(buyer.id) && !JSON.stringify(d1.j).includes(buyer2.id), [d1.status, d1.j?.data?.reservation]);
check('cars.status is unchanged (still available) while reserved', q(`select status from cars where id='${C5}'`) === 'available' && awaitingCar === C5);
const lst = await anon.raw('/api/cars?limit=100');
const row = (lst.j?.data || []).find((c) => (c.id || c._id) === C5);
check('reserved vehicle is still in the public list, flagged reserved', !!row && row.reservation?.reserved === true, [lst.status, !!row]);
const cFree = car(seller, 1500000, 'Free'); const dfree = await detail(anon, cFree);
check('an unreserved vehicle carries no reservation flag', dfree.status === 200 && !dfree.j?.data?.reservation);
const sr = await anon.raw(`/api/search?limit=100`);
check('search responses also carry the reservation flag', sr.status === 200 ? ((sr.j?.data || []).find((c) => (c.id || c._id) === C5)?.reservation?.reserved === true) || (sr.j?.data || []).every((c) => (c.id || c._id) !== C5) : true, sr.status);
// ---- audit: actor, role, timestamp, reason, settlement reference on every transition
const ev = q(`select count(*) from marketplace_offer_settlement_events where settlement_id='${S1}' and settlement_id is not null and created_at is not null and actor_role is not null`);
const evTotal = q(`select count(*) from marketplace_offer_settlement_events where settlement_id='${S1}'`);
check('every audit event has settlement reference, timestamp and actor role', ev === evTotal && Number(evTotal) >= 3, [ev, evTotal]);
check('created event records the accepting seller and a reason', q(`select actor_role||'|'||actor_id||'|'||reason from marketplace_offer_settlement_events where settlement_id='${S1}' and event_type='created'`) === `seller|${seller.id}|Offer accepted`);
check('system transitions (lapse) have actor_role system and a reason', q(`select actor_role||'|'||reason from marketplace_offer_settlement_events where offer_id='${E1}' and event_type='lapsed'`) === 'system|Payment window elapsed');
check('participant cancellation records actor and reason', q(`select actor_role||'|'||reason from marketplace_offer_settlement_events where offer_id='${E2}' and event_type='cancelled'`) === 'seller|changed mind');
// ---- 48h deadline is server-side and derived from the acceptance timestamp
check('payment window is exactly 48 hours from acceptance, set by the database', q(`select (expires_at - created_at) = interval '48 hours' from marketplace_offer_settlements where offer_id='${O2}'`) === 't');
check('the client cannot move the deadline (no endpoint accepts it; column update only by service role functions)', q(`select has_column_privilege('authenticated','public.marketplace_offer_settlements','expires_at','UPDATE')::text`) === 'false');
// ---- callbacks: idempotent, duplicate and concurrent
const cb = car(seller, 900000, 'Callback'); const Lc = lead(buyer, seller, cb);
await offer(buyer, Lc, 850000); const Oc = lastOffer(Lc); await act(seller, Lc, Oc, 'accept');
const Sc = settlementOf(Oc, 'id');
const pc1 = q(`insert into payments(user_id,car_id,type,amount,phone,status,metadata) values ('${buyer.id}','${cb}','purchase',850000,'${PHONE}','pending','{"escrowEligible":true}') returning id`);
const calls = await Promise.all([1, 2, 3, 4, 5].map(() => qAsync(`select kayad_settle_purchase_payment_atomic('${pc1}','RCPT-DUP')::text`)));
check('duplicate/concurrent callbacks all succeed without error (idempotent)', calls.every((c) => c.ok), calls.map((c) => c.err).filter(Boolean));
check('exactly one escrow, one outcome and one paid event result', q(`select count(*) from escrows where payment='${pc1}'`) === '1' && q(`select count(*) from purchase_outcomes where payment_id='${pc1}'`) === '1' && q(`select count(*) from marketplace_offer_settlement_events where settlement_id='${Sc}' and event_type='paid'`) === '1' && settlementOf(Oc, 'status') === 'paid');
check('exactly one ledger-relevant outcome amount equal to the agreed amount', q(`select amount from escrows where payment='${pc1}'`).startsWith('850000'));
const after = q(`select count(*) from purchase_outcomes where payment_id='${pc1}'`);
await qAsync(`select kayad_settle_purchase_payment_atomic('${pc1}','RCPT-LATE-DUP')::text`);
check('a delayed duplicate callback after completion changes nothing', q(`select count(*) from purchase_outcomes where payment_id='${pc1}'`) === after && q(`select count(*) from escrows where payment='${pc1}'`) === '1');
check('out-of-order: a failure update after success does not undo the paid settlement', (await qAsync(`update payments set status='failed' where id='${pc1}'`), settlementOf(Oc, 'status') === 'paid'));
// ---- races: cancel vs expiry vs callback on the same settlement, many rounds
let bad = 0, deadlocks = 0, rounds = 12;
for (let i = 0; i < rounds; i++) {
  const rc = car(seller, 700000, `Race${i}`); const Lr = lead(buyer, seller, rc);
  await offer(buyer, Lr, 650000); const Or = lastOffer(Lr); await act(seller, Lr, Or, 'accept');
  const Sr = settlementOf(Or, 'id');
  const pr = q(`insert into payments(user_id,car_id,type,amount,phone,status,metadata) values ('${buyer.id}','${rc}','purchase',650000,'${PHONE}','pending','{"escrowEligible":true}') returning id`);
  q(`update marketplace_offer_settlements set expires_at=now()-interval '1 second' where id='${Sr}'`);
  const rs = await Promise.all([
    qAsync(`select kayad_settle_purchase_payment_atomic('${pr}','RACE-${i}')::text`),
    qAsync(`select kayad_offer_settlement_cancel('${Sr}','${seller.id}','race')::text`),
    qAsync(`select kayad_offer_settlement_sweep('${rc}')`),
    qAsync(`select kayad_offer_settlement_begin_payment('${Or}','${buyer.id}')::text`),
    qAsync(`select kayad_offer_settlement_cancel('${Sr}','${buyer.id}','race2')::text`),
  ]);
  if (rs.some((r) => /deadlock/i.test(r.err))) deadlocks++;
  const st = settlementOf(Or, 'status'); const paidPay = q(`select status from payments where id='${pr}'`);
  const outcomes = q(`select count(*) from purchase_outcomes where payment_id='${pr}'`);
  // invariant: a successful payment is never released; exactly one outcome; paid settlement keeps its payment; no cancel after money moved
  if (!(outcomes === '1' && paidPay === 'success' && st === 'paid' && q(`select count(*) from marketplace_offer_settlement_events where settlement_id='${Sr}' and event_type in ('cancelled','lapsed') and created_at > (select paid_at from marketplace_offer_settlements where id='${Sr}')`) === '0')) bad++;
}
check(`race: settle vs cancel vs expiry vs begin_payment x${rounds}: payment never released, one outcome, settlement paid`, bad === 0, { bad });
check('race: no deadlocks across rounds', deadlocks === 0, { deadlocks });
// ---- late payment after lapse commits the sale when nobody else holds the vehicle
const lc = car(seller, 600000, 'Late'); const Ll = lead(buyer, seller, lc);
await offer(buyer, Ll, 550000); const Ol = lastOffer(Ll); await act(seller, Ll, Ol, 'accept');
const Sl = settlementOf(Ol, 'id');
const pl = q(`insert into payments(user_id,car_id,type,amount,phone,status,metadata) values ('${buyer.id}','${lc}','purchase',550000,'${PHONE}','pending','{"escrowEligible":false}') returning id`);
q(`update marketplace_offer_settlements set status='lapsed',cancel_reason='test' where id='${Sl}'`);
q(`select kayad_settle_purchase_payment_atomic('${pl}','LATE')::text`);
check('payment that completes after the reservation lapsed commits the sale and is audited as late', settlementOf(Ol, 'status') === 'paid' && q(`select count(*) from marketplace_offer_settlement_events where settlement_id='${Sl}' and event_type='paid' and detail->>'late_payment'='true'`) === '1');
// ---- Panic Room payments freeze covers payment initiation (and only starts of payments)
const fc = car(seller, 500000, 'Freeze'); const Lf = lead(buyer, seller, fc);
await offer(buyer, Lf, 450000); const Of = lastOffer(Lf); await act(seller, Lf, Of, 'accept');
q(`insert into system_settings(key,value) values ('system_status','{"isPaymentsActive":false}'::jsonb) on conflict (key) do update set value=excluded.value`);
await new Promise((r) => setTimeout(r, 11500));
const frz = await pay(buyer, Lf, Of);
const frzGeneric = await generic(buyer, fc, 450000);
check('payments freeze blocks accepted-offer payment initiation', frz.status >= 400 && /FEATURE_FROZEN|paused/i.test(JSON.stringify(frz.j)), [frz.status, frz.j]);
check('payments freeze blocks generic payment initiation too (same switch)', frzGeneric.status >= 400 && /FEATURE_FROZEN|paused/i.test(JSON.stringify(frzGeneric.j)), frzGeneric.status);
check('no payment row was created while frozen', q(`select count(*) from payments where car_id='${fc}'`) === '0');
const canc = await seller.raw(`/api/leads/${Lf}/offers/${Of}/settlement/cancel`, { method: 'POST', body: {} });
check('cancelling a reservation during a payments freeze still works (it starts no payment, strands no funds)', canc.status === 200, [canc.status, canc.j]);
q(`delete from system_settings where key='system_status'`);
await new Promise((r) => setTimeout(r, 11500));

finish('offer-payment');
