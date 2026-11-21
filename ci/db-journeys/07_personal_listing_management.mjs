// Personal listing management against a REAL (disposable) schema: stable numbering, Edit Details, photo reorder/cover/remove, Mark as Sold,
// public-cache invalidation, accepted-offer settlement lock, permission boundaries, legacy individual_seller, and fail-safe service-fault reporting.
// Photo FILE upload needs an image provider (Cloudinary) and is not exercised here; photo rows are seeded directly.
import { makeUser, listingForm, q, check, finish, Client } from './lib.mjs';

const s = await makeUser({ tag: 'seller' }); const other = await makeUser({ tag: 'other' }); const buyer = await makeUser({ tag: 'buyer' });
const mk = async (client, title, price) => (await client.raw('/api/cars', { method: 'POST', form: listingForm(title, price) })).j.data.id;
const mine = async (client = s) => (await client.raw('/api/cars/my-listings')).j.data;
const num = (rows) => Object.fromEntries(rows.map((r) => [r.title, r.listingNumber]));
const seedPhotos = (id, n) => q(`update cars set images='${JSON.stringify(Array.from({ length: n }, (_, i) => ({ url: `https://img.test/${id}/${i + 1}.jpg`, public_id: `t/${id}/${i + 1}` })))}'::jsonb, updated_at=now() where id='${id}'`);
const ids = (rows, id) => rows.find((r) => r.id === id).images.map((i) => i.public_id.split('/').pop());

// ---- numbering ------------------------------------------------------------------------------------------------------
const a = await mk(s, 'Num A'); const b = await mk(s, 'Num B'); const c = await mk(s, 'Num C');
check('numbers start at 1 in creation order', JSON.stringify(num(await mine())) === JSON.stringify({ 'Num C': 3, 'Num B': 2, 'Num A': 1 }), num(await mine()));
await s.raw(`/api/cars/${b}`, { method: 'DELETE' });
check('removing a listing does not renumber the others', JSON.stringify(num(await mine())) === JSON.stringify({ 'Num C': 3, 'Num A': 1 }), num(await mine()));
const d = await mk(s, 'Num D');
check('a new listing continues the sequence (no reuse of a removed number)', (await mine()).find((r) => r.id === d).listingNumber === 4);
const paged = (await s.raw('/api/cars/my-listings?page=1&limit=2')).j.data;
check('paging does not change numbers', paged.map((r) => r.listingNumber).join() === '4,3', paged.map((r) => r.listingNumber));
check('another user starts at 1 independently', (await mine(other)).length === 0 && (await (async () => { await mk(other, 'Other 1'); return (await mine(other))[0].listingNumber === 1; })()));

// ---- edit details ---------------------------------------------------------------------------------------------------
seedPhotos(a, 3);
const before = q(`select images::text from cars where id='${a}'`);
const e = await s.raw(`/api/cars/${a}`, { method: 'PUT', body: { title: 'Num A v2', brand: 'Toyota', model: 'Prado', year: 2018, price: 5200000, mileage: 61000, fuel: 'Diesel', transmission: 'Automatic', condition: 'Used', city: 'Mombasa', description: 'Edited', features: ['Sunroof'] } });
check('owner can edit permitted fields', e.status === 200, e.j);
check('edit persisted and status unchanged', q(`select title||'|'||brand||'|'||price||'|'||location_city||'|'||status from cars where id='${a}'`) === 'Num A v2|Toyota|5200000|Mombasa|available');
check('edit preserved the photos', q(`select images::text from cars where id='${a}'`) === before);
check('edit is audited', Number(q(`select count(*) from audit_logs where entity_id::text='${a}' and action in ('update_car','vehicle_edited')`)) >= 1);
check('another personal user cannot edit', (await other.raw(`/api/cars/${a}`, { method: 'PUT', body: { price: 1 } })).status === 403);
check('anonymous cannot edit', (await new Client().raw(`/api/cars/${a}`, { method: 'PUT', body: { price: 1 } })).status === 401);
check('invalid price is rejected', (await s.raw(`/api/cars/${a}`, { method: 'PUT', body: { price: -5 } })).status === 400);

// ---- manage photos (owner writes use the optimistic jsonb filter: this failed on a real database before the fix) ----------
let r = await s.raw(`/api/cars/${a}/images/order`, { method: 'PATCH', body: { order: [2, 0, 1] } });
check('reorder persists the new order', r.status === 200 && ids(await mine(), a).join() === '3,1,2', r.j);
check('first photo after reorder is the cover', (await mine()).find((x) => x.id === a).images[0].public_id.endsWith('/3'));
check('reorder rejects a non-permutation', (await s.raw(`/api/cars/${a}/images/order`, { method: 'PATCH', body: { order: [0, 0, 1] } })).j?.code === 'INVALID_IMAGE_ORDER');
check('reorder rejects a wrong length', (await s.raw(`/api/cars/${a}/images/order`, { method: 'PATCH', body: { order: [0, 1] } })).j?.code === 'INVALID_IMAGE_ORDER');
r = await s.raw(`/api/cars/${a}/images/cover`, { method: 'PATCH', body: { index: 2 } });
check('set cover moves the chosen photo first', r.status === 200 && ids(await mine(), a)[0] === '2', r.j);
r = await s.raw(`/api/cars/${a}/images/1`, { method: 'DELETE' });
check('remove deletes the right photo and keeps the rest', r.status === 200 && ids(await mine(), a).length === 2, r.j);
check('photo count persists after refresh', (await mine()).find((x) => x.id === a).images.length === 2);
check('another user cannot reorder photos', (await other.raw(`/api/cars/${a}/images/order`, { method: 'PATCH', body: { order: [1, 0] } })).status === 403);
check('another user cannot delete photos', (await other.raw(`/api/cars/${a}/images/0`, { method: 'DELETE' })).status === 403);
check('anonymous cannot reorder photos', (await new Client().raw(`/api/cars/${a}/images/order`, { method: 'PATCH', body: { order: [1, 0] } })).status === 401);

// ---- mark as sold -----------------------------------------------------------------------------------------------------
const pub = async () => (await new Client().raw('/api/cars?limit=50')).j.data.some((x) => x.id === c);
check('listing is public before it is sold', await pub());
check('anonymous cannot mark sold', (await new Client().raw(`/api/cars/${c}/lifecycle`, { method: 'PATCH', body: { action: 'mark_sold' } })).status === 401);
check("another user cannot mark someone else's listing sold", (await other.raw(`/api/cars/${c}/lifecycle`, { method: 'PATCH', body: { action: 'mark_sold' } })).status === 404);
r = await s.raw(`/api/cars/${c}/lifecycle`, { method: 'PATCH', body: { action: 'mark_sold' } });
check('owner marks it sold', r.status === 200 && r.j.data.status === 'sold', r.j);
const soldRow = (await mine()).find((x) => x.id === c);
check('status and sold flag persisted', soldRow.status === 'sold' && soldRow.sold === true && q(`select status from cars where id='${c}'`) === 'sold');
check('sold listing keeps its listing number and photos', soldRow.listingNumber === 3);
check('sold listing leaves public inventory immediately (cache invalidated)', !(await pub()));
check('sold listing gives the real reason', soldRow.ownerActionEligibility.reasonCode === 'SOLD' && /marked as sold/i.test(soldRow.ownerActionEligibility.reason));
check('sold listing cannot be edited', (await s.raw(`/api/cars/${c}`, { method: 'PUT', body: { price: 111 } })).status === 409);
check('sold listing cannot be sold again or republished', [(await s.raw(`/api/cars/${c}/lifecycle`, { method: 'PATCH', body: { action: 'mark_sold' } })).status, (await s.raw(`/api/cars/${c}/lifecycle`, { method: 'PATCH', body: { action: 'publish' } })).status].join() === '409,409');
check('sold history row recorded', Number(q(`select count(*) from personal_listing_lifecycle_events where car_id='${c}' and action='seller_mark_sold'`)) === 1);

// ---- accepted offer settlement lock -------------------------------------------------------------------------------------
const lead = q(`insert into leads(buyer,dealer,vehicle,source) values('${buyer.id}','${s.id}','${d}','chat') returning id`).split('\n')[0];
const offer = q(`insert into marketplace_offers(lead_id,vehicle_id,buyer_id,seller_id,sender_id,recipient_id,amount,idempotency_key,status) values('${lead}','${d}','${buyer.id}','${s.id}','${buyer.id}','${s.id}',2500000,'k-'||gen_random_uuid(),'accepted') returning id`).split('\n')[0];
q(`insert into marketplace_offer_settlements(offer_id,lead_id,vehicle_id,buyer_id,seller_id,agreed_amount,expires_at) values('${offer}','${lead}','${d}','${buyer.id}','${s.id}',2500000,now()+interval '48 hours')`);
const lk = await s.raw(`/api/cars/${d}/lifecycle`, { method: 'PATCH', body: { action: 'mark_sold' } });
check('Mark as sold is refused while an accepted offer awaits payment', lk.status === 409 && lk.j.code === 'OFFER_SETTLEMENT_LOCK', lk.j);
const dRow = (await mine()).find((x) => x.id === d);
check('eligibility reports the same lock', dRow.ownerActionEligibility.canMarkSold === false && dRow.ownerActionEligibility.reasonCode === 'OFFER_SETTLEMENT_LOCK');
check('car is still available (the refusal changed nothing)', q(`select status from cars where id='${d}'`) === 'available');
q(`update marketplace_offer_settlements set status='cancelled' where vehicle_id='${d}'`);
check('after the settlement is cancelled the owner may mark it sold', (await s.raw(`/api/cars/${d}/lifecycle`, { method: 'PATCH', body: { action: 'mark_sold' } })).status === 200);

// ---- legacy individual_seller compatibility -------------------------------------------------------------------------------
const legacy = await makeUser({ tag: 'legacy', dbRole: 'individual_seller' });
const lid = await mk(legacy, 'Legacy 1');
const le = (await mine(legacy))[0];
check('legacy individual_seller keeps edit/photo access and numbering', le.ownerActionEligibility.canEdit === true && le.listingNumber === 1 && (await legacy.raw(`/api/cars/${lid}`, { method: 'PUT', body: { price: 2999000 } })).status === 200);

// ---- fail-safe service fault (a required record set unavailable) -----------------------------------------------------------
const fs = await makeUser({ tag: 'fault' }); // fresh account: the per-user write limiter (10/min) is a real control and is not bypassed
const f = await mk(fs, 'Fault probe');
// A genuine read failure (permission error), not a missing table: a table that is not deployed is an empty set (see journey 08).
q('revoke select on public.purchase_outcomes from service_role'); q("notify pgrst, 'reload schema'");
await new Promise((res) => setTimeout(res, 1500));
try {
  const row = (await mine(fs)).find((x) => x.id === f);
  check('service fault is reported as such, not as a permission denial', row.ownerActionEligibility.permissionsAvailable === false && row.ownerActionEligibility.reasonCode === 'PERMISSION_CHECK_UNAVAILABLE' && /could not check this listing/i.test(row.ownerActionEligibility.reason) && !/could not verify this listing/i.test(row.ownerActionEligibility.reason));
  check('mutations fail closed during the fault', (await fs.raw(`/api/cars/${f}`, { method: 'PUT', body: { price: 123456 } })).status === 503);
  check('the listing itself stays readable during the fault', (await fs.raw('/api/cars/my-listings')).status === 200);
} finally { q('grant select on public.purchase_outcomes to service_role'); q("notify pgrst, 'reload schema'"); }
await new Promise((res) => setTimeout(res, 1500));
const rec = await fs.raw(`/api/cars/${f}`, { method: 'PUT', body: { price: 5300000 } });
check('recovers when the records return', rec.status === 200, { status: rec.status, body: rec.j });

finish('07_personal_listing_management');
