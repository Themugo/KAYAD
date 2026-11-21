// Dealer listing lifecycle against a REAL (disposable) schema: DA-01 sale vs escrow/settlement locks (individual + bulk), DA-02 one
// canonical sold lifecycle, DA-03 sold read-only (API + DB), DA-07 permanent listing numbers incl. concurrency, and the
// sale-vs-funding race. Photo FILE upload needs an image provider; photo rows are seeded directly.
import { makeUser, q, qAsync, check, finish, Client, listingForm, uid } from './lib.mjs';

const mkDealer = async (tag) => {
  const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `Journey ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
  q(`update users set status='approved' where id='${d.id}'`);
  q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`);
  await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: 'Str0ng!Passw0rd' } }); d.csrf = null;
  return d;
};
const A = await mkDealer('dealera'); const B = await mkDealer('dealerb'); const buyer = await makeUser({ tag: 'buyer' });
const car = (owner, title, extra = '') => q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold${extra ? ',' + extra.split('=')[0] : ''}) values ('${title}','Mazda','CX-5',2019,3000000,'available','${owner.id}',false${extra ? ',' + extra.split('=')[1] : ''}) returning id`).split('\n')[0];
const row = (id) => q(`select status||'|'||sold||'|'||(sold_at is not null) from cars where id='${id}'`);
const sold = (c, id, body = {}) => c.raw(`/api/dealer/cars/${id}/mark-sold`, { method: 'PATCH', body });
const bulk = (c, ids, status) => c.raw('/api/dealer/cars/bulk-status', { method: 'PATCH', body: { ids, status } });
const escrow = (carId, status) => q(`insert into escrows(buyer,seller,car,amount,status) values('${buyer.id}','${A.id}','${carId}',1000000,'${status}') returning id`).split('\n')[0];

// ---- DA-07 permanent listing numbers ----------------------------------------------------------------------------------------
const n1 = car(A, 'N1'), n2 = car(A, 'N2'), n3 = car(A, 'N3');
const nums = () => q(`select string_agg(listing_number::text, ',' order by listing_number) from cars where dealer_id='${A.id}'`);
check('numbers are sequential from 1 per dealer, in creation order', nums() === '1,2,3', nums());
check('another dealer starts at 1 independently', (() => { car(B, 'B1'); return q(`select listing_number from cars where dealer_id='${B.id}'`) === '1'; })());
q(`update cars set deleted_at=now() where id='${n2}'`);
check('removal does not renumber', nums() === '1,2,3');
const n4 = car(A, 'N4');
check('a new listing never reuses a removed number', q(`select listing_number from cars where id='${n4}'`) === '4');
q(`delete from cars where id='${n4}'`);
check('even after a hard delete the number is not reused', (() => q(`select listing_number from cars where id='${car(A, 'N5')}'`) === '5')());
const imm = await qAsync(`update cars set listing_number=99 where id='${n1}'`);
check('listing number is immutable', !imm.ok && /LISTING_NUMBER_IMMUTABLE/.test(imm.err || imm.out || JSON.stringify(imm)), imm);
const conc = await Promise.all(Array.from({ length: 20 }, (_, i) => qAsync(`insert into cars(title,brand,model,year,price,status,dealer_id,sold) values ('C${i}','Mazda','CX-5',2019,1,'available','${B.id}',false)`)));
check('20 concurrent inserts all succeed', conc.every((r) => r.ok), conc.filter((r) => !r.ok).slice(0, 1));
check('concurrent allocation gives unique contiguous numbers', q(`select count(distinct listing_number)||'/'||max(listing_number)||'/'||min(listing_number) from cars where dealer_id='${B.id}'`) === '21/21/1');
const api = await A.raw('/api/cars', { method: 'POST', form: listingForm('API numbered') });
const apiId = api.j?.data?.id || api.j?.car?.id;
check('listing created through the API receives the next number and keeps its UUID', api.status === 201 && q(`select listing_number from cars where id='${apiId}'`) === '6', api.j);

const mine = (await A.raw('/api/cars/my-listings?limit=100')).j?.data || [];
check('my-listings exposes the permanent listingNumber to the dealer (never the UUID as a number)', mine.length >= 4 && mine.every((x) => Number.isInteger(x.listingNumber)) && mine.find((x) => x.id === apiId)?.listingNumber === 6, mine.map((x) => x.listingNumber));
const inv = (await A.raw('/api/dealer-platform/inventory?limit=100')).j?.data;
const invRows = inv?.items || inv?.listings || inv?.cars || (Array.isArray(inv) ? inv : []);
check('dealer-platform inventory exposes listingNumber too', invRows.length > 0 && invRows.every((x) => Number.isInteger(x.listingNumber ?? x.listing_number)), Object.keys(inv || {}));

// ---- DA-01 escrow / settlement locks (individual) ---------------------------------------------------------------------------
const e1 = car(A, 'EscrowLock'); const eid = escrow(e1, 'funded');
let r = await sold(A, e1);
check('mark sold is refused (409 TRANSACTION_LOCK) while a funded escrow is open', r.status === 409 && r.j?.code === 'TRANSACTION_LOCK', r.j);
check('the refusal changed nothing', row(e1) === 'available|false|false');
q(`update escrows set status='released' where id='${eid}'`);
r = await sold(A, e1, { buyerName: 'Jane Buyer', salePrice: 2900000, notes: 'cash' });
check('after the escrow is released the legitimate sale completes', r.status === 200, r.j);
check('status, sold flag and sold_at agree', row(e1) === 'sold|true|true', row(e1));
check('sale record stores buyer, price and notes', q(`select buyer_name||'|'||sale_price||'|'||notes||'|'||actor_type from dealer_listing_lifecycle_events where car_id='${e1}' and action='dealer_mark_sold'`) === 'Jane Buyer|2900000|cash|dealer_owner');
r = await sold(A, e1);
check('second sale of the same listing is 409 ALREADY_SOLD', r.status === 409 && r.j?.code === 'ALREADY_SOLD', r.j);
check('exactly one sale record exists', q(`select count(*) from dealer_listing_lifecycle_events where car_id='${e1}' and action='dealer_mark_sold'`) === '1');

const s1 = car(A, 'SettleLock');
const lead = q(`insert into leads(buyer,dealer,vehicle,source) values('${buyer.id}','${A.id}','${s1}','chat') returning id`).split('\n')[0];
const offer = q(`insert into marketplace_offers(lead_id,vehicle_id,buyer_id,seller_id,sender_id,recipient_id,amount,idempotency_key,status) values('${lead}','${s1}','${buyer.id}','${A.id}','${buyer.id}','${A.id}',2500000,'k-'||gen_random_uuid(),'accepted') returning id`).split('\n')[0];
q(`insert into marketplace_offer_settlements(offer_id,lead_id,vehicle_id,buyer_id,seller_id,agreed_amount,expires_at) values('${offer}','${lead}','${s1}','${buyer.id}','${A.id}',2500000,now()+interval '48 hours')`);
r = await sold(A, s1);
check('mark sold is refused (409 OFFER_SETTLEMENT_LOCK) while an accepted offer awaits payment', r.status === 409 && r.j?.code === 'OFFER_SETTLEMENT_LOCK', r.j);
check('settlement refusal changed nothing', row(s1) === 'available|false|false');

// ---- DA-02 bulk: one canonical lifecycle, itemised, mixed and duplicate selections ---------------------------------------------
const b1 = car(A, 'Bulk1'), b2 = car(A, 'Bulk2'), b3 = car(A, 'Bulk3');
escrow(b2, 'funded');
r = await bulk(A, [b1, b1, b2, s1, e1, b3, crypto.randomUUID(), car(B, 'ForeignCar')], 'sold');
const skippedBy = Object.fromEntries((r.j?.skipped || []).map((x) => [x.id, x.code]));
check('bulk sold is itemised: 2 sold, rest skipped with codes', r.status === 200 && r.j.modified === 2 && skippedBy[b2] === 'TRANSACTION_LOCK' && skippedBy[s1] === 'OFFER_SETTLEMENT_LOCK' && skippedBy[e1] === 'ALREADY_SOLD', r.j);
check('bulk sold used the canonical writer (status, flag, sold_at, record)', row(b1) === 'sold|true|true' && row(b3) === 'sold|true|true' && q(`select count(*) from dealer_listing_lifecycle_events where car_id in ('${b1}','${b3}') and action='dealer_mark_sold'`) === '2');
check('duplicate id in a bulk selection produces one sale record', q(`select count(*) from dealer_listing_lifecycle_events where car_id='${b1}'`) === '1');
check('locked and foreign listings were untouched', row(b2) === 'available|false|false' && Object.keys(skippedBy).length === 5);
r = await bulk(A, [b2, s1], 'sold');
check('bulk where every item is blocked returns 409 with codes', r.status === 409 && r.j.skipped.length === 2, r.j);
r = await B.raw('/api/dealer-platform/inventory/bulk', { method: 'POST', body: { ids: [b2], action: 'status', data: { status: 'sold' } } });
check("another dealer cannot bulk-sell someone else's listing", r.status === 409 || r.status === 403 || r.status === 404, r.status);
check('the dealer-platform bulk endpoint uses the same lifecycle', (await A.raw('/api/dealer-platform/inventory/bulk', { method: 'POST', body: { ids: [b2], action: 'status', data: { status: 'sold' } } })).status === 409);

// ---- DA-03 sold is read-only -------------------------------------------------------------------------------------------------
const put = await A.raw(`/api/cars/${e1}`, { method: 'PUT', body: { price: 1 } });
check('edit/price change of a sold listing is 409 LISTING_SOLD_READ_ONLY', put.status === 409 && put.j?.code === 'LISTING_SOLD_READ_ONLY', put.j);
check('photo cover/reorder/remove/delete are refused on a sold listing', (await Promise.all([
  A.raw(`/api/cars/${e1}/images/cover`, { method: 'PATCH', body: { index: 0 } }), A.raw(`/api/cars/${e1}/images/order`, { method: 'PATCH', body: { order: [0] } }),
  A.raw(`/api/cars/${e1}/images/0`, { method: 'DELETE' }), A.raw(`/api/cars/${e1}`, { method: 'DELETE' }),
])).every((x) => x.status === 409));
check('pause and republish of a sold listing are refused', (await bulk(A, [e1], 'hidden')).status === 409 && (await bulk(A, [e1], 'available')).status === 409);
check('bulk delete does not erase a sold listing', (await A.raw('/api/dealer/cars/bulk-delete', { method: 'POST', body: { ids: [e1] } })).status === 409 && q(`select deleted_at is null from cars where id='${e1}'`) === 't');
for (const col of ["price=1", "title='x'", "status='available'", "sold=false", "deleted_at=now()"]) {
  const x = await qAsync(`update cars set ${col} where id='${e1}'`);
  check(`database refuses "${col}" on a sold listing`, !x.ok && /LISTING_SOLD_READ_ONLY/.test(JSON.stringify(x)), x);
}
check('counters (views) may still change on a sold listing', (await qAsync(`update cars set views=coalesce(views,0)+1 where id='${e1}'`)).ok);
const nonAdmin = await qAsync(`select kayad_admin_correct_sold_listing('${e1}','${A.id}','trying to reopen my sale')`);
check('only an admin can correct a sold listing', !nonAdmin.ok && /ADMIN_REQUIRED/.test(JSON.stringify(nonAdmin)));
const adm = await makeUser({ tag: 'adm', dbRole: 'admin' });
const noReason = await qAsync(`select kayad_admin_correct_sold_listing('${e1}','${adm.id}','short')`);
check('an admin correction needs a reason', !noReason.ok && /REASON_REQUIRED/.test(JSON.stringify(noReason)));
const fix = await qAsync(`select kayad_admin_correct_sold_listing('${e1}','${adm.id}','Sale recorded in error, customer confirmed')`);
check('authorised admin correction succeeds, reopens and is audited', fix.ok && row(e1) === 'hidden|false|false' && q(`select count(*) from dealer_listing_lifecycle_events where car_id='${e1}' and action='admin_sold_correction' and reason like 'Sale recorded%'`) === '1', fix);
check('after the correction the listing is an ordinary reopened listing again', row(e1) === 'hidden|false|false');

// a manually sold listing cannot be pulled into a new escrow or offer settlement
const ms = car(A, 'ManualSold'); await sold(A, ms);
const lm = q(`insert into leads(buyer,dealer,vehicle,source) values('${buyer.id}','${A.id}','${ms}','chat') returning id`).split('\n')[0];
const om = q(`insert into marketplace_offers(lead_id,vehicle_id,buyer_id,seller_id,sender_id,recipient_id,amount,idempotency_key,status) values('${lm}','${ms}','${buyer.id}','${A.id}','${buyer.id}','${A.id}',2500000,'k-'||gen_random_uuid(),'accepted') returning id`).split('\n')[0];
const ns = await qAsync(`insert into marketplace_offer_settlements(offer_id,lead_id,vehicle_id,buyer_id,seller_id,agreed_amount,expires_at) values('${om}','${lm}','${ms}','${buyer.id}','${A.id}',2500000,now()+interval '48 hours')`);
check('an offer settlement cannot be opened on a listing the dealer already sold', !ns.ok && /LISTING_ALREADY_SOLD/.test(JSON.stringify(ns)), ns);
const ne = await qAsync(`insert into escrows(buyer,seller,car,amount,status) values('${buyer.id}','${A.id}','${ms}',1000000,'funded')`);
check('an escrow cannot be funded on a listing the dealer already sold', !ne.ok && /LISTING_ALREADY_SOLD/.test(JSON.stringify(ne)), ne);

// ---- pause / publish -----------------------------------------------------------------------------------------------------------
const p1 = car(A, 'Pausable');
check('pause then publish round-trip', (await bulk(A, [p1], 'hidden')).status === 200 && row(p1).startsWith('hidden') && (await bulk(A, [p1], 'available')).status === 200 && row(p1).startsWith('available'));
check('pause/publish are audited', q(`select count(*) from dealer_listing_lifecycle_events where car_id='${p1}'`) === '2');

// ---- race: mark sold vs funding an escrow (truly concurrent, 12 rounds) -----------------------------------------------------------
let bad = 0, wonSale = 0, wonEscrow = 0;
for (let i = 0; i < 12; i++) {
  const rc = car(A, 'Race' + i);
  const [s, e] = await Promise.all([
    qAsync(`select kayad_dealer_listing_lifecycle_atomic('${rc}','${A.id}','mark_sold','${A.id}','{}')`),
    qAsync(`insert into escrows(buyer,seller,car,amount,status) values('${buyer.id}','${A.id}','${rc}',1000000,'funded')`),
  ]);
  const soldNow = q(`select status='sold' from cars where id='${rc}'`) === 't';
  const activeEscrow = Number(q(`select count(*) from escrows where car='${rc}' and status in ('funded','pending')`)) > 0;
  if (soldNow && activeEscrow) bad++;
  if (s.ok) wonSale++; if (e.ok) wonEscrow++;
}
check('race: a listing is never both sold and under a live escrow', bad === 0, { bad, wonSale, wonEscrow });
check('race: exactly one side wins each round', wonSale + wonEscrow === 12, { wonSale, wonEscrow }); console.log('  race tally', { wonSale, wonEscrow });
let bad2 = 0;
for (let i = 0; i < 8; i++) {
  const rc = car(A, 'RaceS' + i);
  const l2 = q(`insert into leads(buyer,dealer,vehicle,source) values('${buyer.id}','${A.id}','${rc}','chat') returning id`).split('\n')[0];
  const o2 = q(`insert into marketplace_offers(lead_id,vehicle_id,buyer_id,seller_id,sender_id,recipient_id,amount,idempotency_key,status) values('${l2}','${rc}','${buyer.id}','${A.id}','${buyer.id}','${A.id}',2500000,'k-'||gen_random_uuid(),'accepted') returning id`).split('\n')[0];
  await Promise.all([
    qAsync(`select kayad_dealer_listing_lifecycle_atomic('${rc}','${A.id}','mark_sold','${A.id}','{}')`),
    qAsync(`insert into marketplace_offer_settlements(offer_id,lead_id,vehicle_id,buyer_id,seller_id,agreed_amount,expires_at) values('${o2}','${l2}','${rc}','${buyer.id}','${A.id}',2500000,now()+interval '48 hours')`),
  ]);
  if (q(`select status='sold' from cars where id='${rc}'`) === 't' && Number(q(`select count(*) from marketplace_offer_settlements where vehicle_id='${rc}' and status in ('awaiting_payment','paid')`)) > 0) bad2++;
}
check('race: a listing is never both sold and under an open offer settlement', bad2 === 0, { bad2 });

// ---- tenant isolation / auth ---------------------------------------------------------------------------------------------------
const iso = car(A, 'Iso');
check("another dealer cannot mark this dealer's listing sold", (await sold(B, iso)).status === 404 && row(iso) === 'available|false|false');
check('anonymous cannot mark sold', (await sold(new Client(), iso)).status === 401);
check('a personal account cannot use the dealer sold endpoint', [401, 403, 404].includes((await sold(buyer, iso)).status));

finish('09_dealer_listing_lifecycle');
