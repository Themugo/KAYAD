// Dealer publish / pause / republish against a REAL (disposable) schema: validation, ownership, duplicate requests, locks,
// audit trail (who/when), listing number and photos preserved, public marketplace visibility, bulk consistency.
import { makeUser, q, check, finish, uid } from './lib.mjs';

const mkDealer = async (tag) => {
  const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `Vis ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
  q(`update users set status='approved' where id='${d.id}'`);
  q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`);
  await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: 'Str0ng!Passw0rd' } }); d.csrf = null;
  return d;
};
const A = await mkDealer('visa'); const B = await mkDealer('visb'); const buyer = await makeUser({ tag: 'visbuyer' });
const IMG = `'[{"url":"https://res.example.test/a.jpg","publicId":"a"},{"url":"https://res.example.test/b.jpg","publicId":"b"}]'::jsonb`;
const car = (owner, title, status = 'available', imgs = IMG) => q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold,images) values ('${title}','Mazda','CX-5',2019,3000000,'${status}','${owner.id}',false,${imgs}) returning id`).split('\n')[0];
const st = (id) => q(`select status from cars where id='${id}'`);
const act = (c, id, a) => c.raw(`/api/dealer/cars/${id}/${a}`, { method: 'PATCH' });
const events = (id) => q(`select string_agg(action||':'||previous_status||'>'||next_status, ',' order by created_at, id) from dealer_listing_lifecycle_events where car_id='${id}'`);

// Pause -> Republish keeps everything
const c1 = car(A, 'Vis1'); const num = q(`select listing_number from cars where id='${c1}'`);
let r;
const B0 = process.env.KAYAD_JOURNEY_BASE;
const pubStatus = async (id) => (await fetch(`${B0}/api/cars/${id}`)).status;
const inList = async (id) => JSON.stringify(await (await fetch(`${B0}/api/cars?dealer=${A.id}&limit=100`)).json().catch(() => ({}))).includes(id);
check('before the pause the listing is publicly visible (detail 200 and in the list)', (await pubStatus(c1)) === 200 && (await inList(c1)), `detail=${await pubStatus(c1)}`);
r = await act(A, c1, 'pause');
check('pause an active listing -> 200 and status hidden', r.status === 200 && st(c1) === 'hidden' && r.j?.label === 'Paused', r.j);
check('pause preserves the listing number and photos', q(`select listing_number::text||'|'||jsonb_array_length(images) from cars where id='${c1}'`) === `${num}|2`);
check('a paused listing leaves the public marketplace immediately (no stale cache)', (await pubStatus(c1)) === 404 && !(await inList(c1)), `detail=${await pubStatus(c1)}`);
r = await act(A, c1, 'pause');
check('pausing twice is a clean 409 ALREADY_PAUSED', r.status === 409 && r.j?.code === 'ALREADY_PAUSED', r.j);
r = await act(A, c1, 'publish');
check('republish -> 200 and status available', r.status === 200 && st(c1) === 'available' && r.j?.label === 'Active', r.j);
check('the republished listing is back in the public marketplace (detail 200 and in the list)', (await pubStatus(c1)) === 200 && (await inList(c1)), `detail=${await pubStatus(c1)}`);
r = await act(A, c1, 'publish');
check('publishing twice is a clean 409 ALREADY_PUBLISHED', r.status === 409 && r.j?.code === 'ALREADY_PUBLISHED', r.j);
check('listing number unchanged after the round trip', q(`select listing_number::text from cars where id='${c1}'`) === num);
check('audit trail records pause then publish with the actor', events(c1) === 'dealer_hide:available>hidden,dealer_publish:hidden>available'
  && q(`select count(*) from dealer_listing_lifecycle_events where car_id='${c1}' and actor_user_id='${A.id}'`) === '2', events(c1));

// Validation before publish
const d1 = car(A, 'NoPhotos', 'hidden', `'[]'::jsonb`);
r = await act(A, d1, 'publish');
check('publishing without photos is 422 LISTING_INCOMPLETE naming the missing item', r.status === 422 && r.j?.code === 'LISTING_INCOMPLETE' && (r.j?.missing || []).includes('photos'), r.j);
check('the refusal changed nothing', st(d1) === 'hidden');
const d2 = car(A, 'Draft1', 'draft');
r = await act(A, d2, 'publish');
check('a complete draft can be published', r.status === 200 && st(d2) === 'available', r.j);
const rev = car(A, 'Review1', 'pending');
r = await act(A, rev, 'publish');
check('an under-review listing cannot be published by the dealer (409)', r.status === 409 && r.j?.code === 'LISTING_UNDER_REVIEW' && st(rev) === 'pending', r.j);
// 'rejected' is not a stored cars.status in this schema (available, sold, pending, reserved, hidden, draft), so the locked state is 'reserved'.
const rej = car(A, 'Reserved1', 'reserved');
r = await act(A, rej, 'publish');
check('a reserved listing stays locked', r.status === 409 && st(rej) === 'reserved', r.j);
r = await act(A, rev, 'pause');
check('pause is only allowed from Active', r.status === 409 && st(rev) === 'pending', r.j);

// Ownership
const own = car(A, 'OwnedByA');
r = await act(B, own, 'pause');
check('another dealer cannot pause my listing (404) and nothing changes', r.status === 404 && st(own) === 'available', r.j);
r = await act(buyer, own, 'pause');
check('a non-dealer cannot pause a dealer listing', [401, 403, 404].includes(r.status) && st(own) === 'available', r.status);

// Locks
const e1 = car(A, 'EscrowVis');
q(`insert into escrows(buyer,seller,car,amount,status) values('${buyer.id}','${A.id}','${e1}',1000000,'funded')`);
r = await act(A, e1, 'pause');
check('a funded escrow blocks pausing (409 TRANSACTION_LOCK)', r.status === 409 && r.j?.code === 'TRANSACTION_LOCK' && st(e1) === 'available', r.j);
const s1 = car(A, 'SoldVis');
await A.raw(`/api/dealer/cars/${s1}/mark-sold`, { method: 'PATCH', body: {} });
r = await act(A, s1, 'publish');
check('a sold listing cannot be published or paused (409 ALREADY_SOLD)', r.status === 409 && r.j?.code === 'ALREADY_SOLD' && st(s1) === 'sold', r.j);
const au = car(A, 'BidVis'); q(`update cars set bids_count=2 where id='${au}'`);
r = await act(A, au, 'pause');
check('a listing with bids cannot be paused (409 AUCTION_OR_BID_LOCK)', r.status === 409 && r.j?.code === 'AUCTION_OR_BID_LOCK', r.j);

// Concurrency: two simultaneous pauses -> exactly one succeeds, exactly one audit row
const cc = car(A, 'RaceVis');
const rs = await Promise.all([act(A, cc, 'pause'), act(A, cc, 'pause'), act(A, cc, 'pause')]);
check('three concurrent pauses: one 200, the rest 409', rs.filter((x) => x.status === 200).length === 1 && rs.filter((x) => x.status === 409).length === 2, rs.map((x) => x.status));
check('exactly one hide audit row', q(`select count(*) from dealer_listing_lifecycle_events where car_id='${cc}' and action='dealer_hide'`) === '1');

// Bulk uses the same rules
const g1 = car(A, 'Bulk-ok'); const g2 = car(A, 'Bulk-nophoto', 'hidden', `'[]'::jsonb`); const g3 = car(A, 'Bulk-escrow');
q(`insert into escrows(buyer,seller,car,amount,status) values('${buyer.id}','${A.id}','${g3}',1000000,'funded')`);
r = await A.raw('/api/dealer/cars/bulk-status', { method: 'PATCH', body: { ids: [g1, g3], status: 'hidden' } });
check('bulk pause is itemised: ok paused, escrow-locked skipped', r.status === 200 && st(g1) === 'hidden' && st(g3) === 'available' && (r.j?.skipped || []).some((s) => s.id === g3 && s.code === 'TRANSACTION_LOCK'), r.j);
r = await A.raw('/api/dealer/cars/bulk-status', { method: 'PATCH', body: { ids: [g1, g2], status: 'available' } });
check('bulk publish validates each listing (incomplete one skipped LISTING_INCOMPLETE)', r.status === 200 && st(g1) === 'available' && st(g2) === 'hidden' && (r.j?.skipped || []).some((s) => s.id === g2 && s.code === 'LISTING_INCOMPLETE'), r.j);

finish();
