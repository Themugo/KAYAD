// Personal listing management on a HOSTED-SHAPED schema: the objects that are absent on the hosted project (lifecycle history, policy
// visibility, purchase outcomes, offer settlements, seller capability tables and the atomic lifecycle function) are dropped first, then the
// real HTTP API is driven end to end. Proves: the owner can edit and manage photos on that schema; other users and anonymous callers cannot;
// concurrent writes cannot lose or duplicate photos; a genuine read failure still fails closed; status changes report an explicit,
// non-leaky 503. Photo upload runs the REAL upload code path against the local Cloudinary-compatible stub (NOT real Cloudinary).
// MUST run last: it intentionally damages the disposable schema.
import fs from 'node:fs';
import { check, finish, makeUser, listingForm, q, qAsync, Client, PW, PNG_1PX } from './lib.mjs';
import { B } from './lib.mjs';

const STUB_LOG = process.env.CLOUDINARY_STUB_LOG || '/tmp/cloudinary-stub.log';
const FAIL_FILE = process.env.CLOUDINARY_STUB_FAIL_FILE || '/tmp/cloudinary-stub.fail';
const stub = () => (fs.existsSync(STUB_LOG) ? fs.readFileSync(STUB_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : null);
const count = (action) => (stub() || []).filter((c) => c.action === action).length;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reload = async () => { q(`notify pgrst, 'reload schema'`); await sleep(1500); };
const photos = (id) => JSON.parse(q(`select coalesce(images,'[]'::jsonb)::text from cars where id='${id}'`)).map((i) => i.public_id);
const rowHash = (id) => q(`select md5(row_to_json(c)::text) from cars c where id='${id}'`);
const form = (n, name = 'p') => { const fd = new FormData(); for (let i = 0; i < n; i++) fd.append('images', new Blob([PNG_1PX], { type: 'image/png' }), `${name}${i}.png`); return fd; };
const mine = async (c, id) => { const r = await c.raw('/api/cars/my-listings'); return { status: r.status, row: (r.j?.data || []).find((x) => x.id === id) }; };

// ---- 0. hosted-shaped schema -------------------------------------------------------------------------------------------------------
q(`drop trigger if exists trg_cars_private_seller_visibility_enforce on public.cars; drop trigger if exists trg_escrow_purchase_outcome_reconciliation on public.escrows;
   drop trigger if exists trg_offer_settlement_payment_guard on public.payments; drop trigger if exists trg_offer_settlement_payment_status on public.payments;
   drop function if exists public.kayad_personal_listing_lifecycle_atomic(uuid, uuid, text) cascade;
   drop table if exists public.personal_listing_lifecycle_events cascade; drop table if exists public.private_seller_listing_visibility_events cascade;
   drop table if exists public.purchase_outcomes cascade; drop table if exists public.marketplace_offer_settlements cascade;
   drop table if exists public.private_seller_capability_events cascade; drop table if exists public.private_seller_capabilities cascade;
   drop function if exists public.apply_private_seller_listing_visibility() cascade; drop function if exists public.enforce_private_seller_listing_visibility() cascade;
   drop function if exists public.kayad_sync_purchase_outcome_from_escrow() cascade; drop function if exists public.kayad_offer_settlement_payment_guard() cascade;
   drop function if exists public.kayad_offer_settlement_payment_status() cascade;`);
await reload();
check('schema is hosted-shaped: the five record sets and the lifecycle function are absent',
  q(`select count(*) from information_schema.tables where table_schema='public' and table_name in ('personal_listing_lifecycle_events','private_seller_listing_visibility_events','purchase_outcomes','marketplace_offer_settlements','private_seller_capabilities')`) === '0'
  && q(`select count(*) from pg_proc where proname='kayad_personal_listing_lifecycle_atomic'`) === '0');
check('upload stub is reachable (uploads exercise the real code path against a local stub, not real Cloudinary)', stub() !== null, 'start ci/db-journeys/cloudinary_stub.cjs and point the backend at it');
fs.rmSync(FAIL_FILE, { force: true });

// ---- 1-2. owner signs in and sees the listing under Active -----------------------------------------------------------------------------
const owner = await makeUser({ tag: 'own' });
const other = await makeUser({ tag: 'oth' });
const anon = new Client();
const created = await owner.raw('/api/cars', { method: 'POST', form: listingForm('2020 Mazda CX5', '2800000') });
const id = created.j?.data?.id;
check('owner creates a listing (1 photo uploaded through the real upload path)', created.status === 201 && id && photos(id).length === 1, created);
let m = await mine(owner, id);
const e0 = m.row?.ownerActionEligibility || {};
check('listing is Active and carries listing number 1', m.row?.status === 'available' && m.row?.listingNumber === 1, m.row && { s: m.row.status, n: m.row.listingNumber });
check('owner tools are ENABLED on the hosted-shaped schema (no blanket permission warning)', e0.permissionsAvailable === true && e0.canEdit === true && e0.canManagePhotos === true && e0.canRemove === true && e0.reason === '', e0);
check('status actions are disabled with an explicit, non-leaky reason (status service not deployed)', e0.canMarkSold === false && e0.canHide === false && e0.lifecycleReasonCode === 'LISTING_STATUS_SERVICE_UNAVAILABLE' && !/function|schema cache|public\./i.test(e0.lifecycleReason || ''), e0);
check('degraded record sets are reported, not hidden', Array.isArray(e0.degraded) && e0.degraded.includes('lifecycle history'), e0.degraded);

// ---- 3-4. edit details persists, status/photos preserved, audited, publicly visible -----------------------------------------------------
const before = photos(id);
const edit = await owner.raw(`/api/cars/${id}`, { method: 'PUT', body: { title: '2020 Mazda CX5 Signature', brand: 'Mazda', model: 'CX-5', year: 2020, price: 3250000, mileage: 38000, fuel: 'Petrol', transmission: 'Automatic', city: 'Nairobi', description: 'Updated by owner' } });
check('owner edits vehicle details (200)', edit.status === 200, edit);
m = await mine(owner, id);
check('updated details appear in the owner dashboard; status, number and photos preserved', m.row?.title === '2020 Mazda CX5 Signature' && Number(m.row?.price) === 3250000 && Number(m.row?.mileage) === 38000 && m.row?.status === 'available' && m.row?.listingNumber === 1 && JSON.stringify(photos(id)) === JSON.stringify(before), m.row && { t: m.row.title, p: m.row.price });
check('the edit is written to the audit log', Number(q(`select count(*) from audit_logs where entity_id::text='${id}'`)) >= 1);
const pub = await anon.raw(`/api/cars/${id}`);
check('listing remains publicly visible with the updated details', pub.status === 200 && JSON.stringify(pub.j).includes('Signature'), pub.status);
const pubList = await anon.raw('/api/cars?limit=100');
check('listing is in the public inventory', JSON.stringify(pubList.j).includes(id), pubList.status);

// ---- 6-10. photos: upload, reorder, cover, remove -----------------------------------------------------------------------------------------
const up0 = count('upload');
const add = await owner.raw(`/api/cars/${id}/images`, { method: 'POST', form: form(2) });
check('owner uploads 2 photos (real upload path, stub storage)', add.status === 200 && photos(id).length === 3 && count('upload') === up0 + 2, { s: add.status, n: photos(id).length });
let ids = photos(id);
const rord = await owner.raw(`/api/cars/${id}/images/order`, { method: 'PATCH', body: { order: [2, 0, 1], currentOrder: ids } });
check('owner reorders photos; the new order persists', rord.status === 200 && JSON.stringify(photos(id)) === JSON.stringify([ids[2], ids[0], ids[1]]), { s: rord.status, got: photos(id) });
ids = photos(id);
const staleOrder = await owner.raw(`/api/cars/${id}/images/order`, { method: 'PATCH', body: { order: [1, 0, 2], currentOrder: [...ids].reverse() } });
check('a reorder based on a stale view is rejected (409) and changes nothing', staleOrder.status === 409 && staleOrder.j?.code === 'LISTING_PHOTO_CONFLICT' && JSON.stringify(photos(id)) === JSON.stringify(ids), staleOrder);
const cov = await owner.raw(`/api/cars/${id}/images/cover`, { method: 'PATCH', body: { index: 2, publicId: ids[2] } });
check('owner changes the cover photo; it becomes first and persists', cov.status === 200 && photos(id)[0] === ids[2], { s: cov.status, first: photos(id)[0] });
ids = photos(id);
const wrongCover = await owner.raw(`/api/cars/${id}/images/cover`, { method: 'PATCH', body: { index: 1, publicId: 'not/this' } });
check('cover change naming the wrong photo is rejected (409), nothing changes', wrongCover.status === 409 && JSON.stringify(photos(id)) === JSON.stringify(ids), wrongCover);
const d0 = count('destroy');
const wrongDel = await owner.raw(`/api/cars/${id}/images/1?publicId=${encodeURIComponent('not/this')}`, { method: 'DELETE' });
check('removal naming the wrong photo is refused (409); storage is NOT touched', wrongDel.status === 409 && JSON.stringify(photos(id)) === JSON.stringify(ids) && count('destroy') === d0, wrongDel);
const del = await owner.raw(`/api/cars/${id}/images/1?publicId=${encodeURIComponent(ids[1])}`, { method: 'DELETE' });
check('owner removes a photo: gone from the listing, then deleted from storage (after the database confirmed)', del.status === 200 && !photos(id).includes(ids[1]) && photos(id).length === 2 && count('destroy') === d0 + 1, { s: del.status, n: photos(id).length });
const one = (await owner.raw('/api/cars', { method: 'POST', form: listingForm('Single Photo Car', '1500000') })).j?.data?.id;
const d1 = count('destroy');
const lastPhoto = await owner.raw(`/api/cars/${one}/images/0`, { method: 'DELETE' });
check('the last photo of a submitted listing cannot be removed (409), storage untouched', lastPhoto.status === 409 && lastPhoto.j?.code === 'LAST_PHOTO_REQUIRED' && photos(one).length === 1 && count('destroy') === d1, lastPhoto);
m = await mine(owner, one);
check('a second listing gets number 2; the first keeps number 1', m.row?.listingNumber === 2 && (await mine(owner, id)).row?.listingNumber === 1);

// ---- concurrency ---------------------------------------------------------------------------------------------------------------------------
await owner.raw(`/api/cars/${id}/images`, { method: 'POST', form: form(3, 'c') });
ids = photos(id);
const target = ids[0];
const racers = await Promise.all(Array.from({ length: 6 }, () => owner.raw(`/api/cars/${id}/images/0?publicId=${encodeURIComponent(target)}`, { method: 'DELETE' })));
const codes = racers.map((r) => r.status).sort();
check('6 simultaneous removals of the same photo remove it exactly once (never a different photo)', codes.filter((c) => c === 200).length === 1 && photos(id).length === ids.length - 1 && !photos(id).includes(target) && photos(id).every((p) => ids.includes(p)), codes);
ids = photos(id);
const perms = [[1, 0, 2, 3], [3, 2, 1, 0], [2, 3, 0, 1], [0, 3, 1, 2], [1, 2, 3, 0], [3, 0, 2, 1]];
const rr = await Promise.all(perms.map((order) => owner.raw(`/api/cars/${id}/images/order`, { method: 'PATCH', body: { order } })));
const after = photos(id);
check('6 simultaneous reorders never lose or duplicate a photo', rr.every((r) => [200, 409].includes(r.status)) && after.length === ids.length && new Set(after).size === ids.length && ids.every((p) => after.includes(p)), { codes: rr.map((r) => r.status), after });
const pr = await Promise.all([3300000, 3310000, 3320000, 3330000, 3340000, 3350000].map((price) => owner.raw(`/api/cars/${id}`, { method: 'PUT', body: { price } })));
const finalPrice = Number(q(`select price from cars where id='${id}'`));
check('6 simultaneous edits leave one valid, consistent value', pr.every((r) => [200, 409].includes(r.status)) && [3300000, 3310000, 3320000, 3330000, 3340000, 3350000].includes(finalPrice) && photos(id).length === ids.length, { codes: pr.map((r) => r.status), finalPrice });

// ---- failures: validation and upload ------------------------------------------------------------------------------------------------------
const snapshot = rowHash(id);
const bad = [
  ['negative price', await owner.raw(`/api/cars/${id}`, { method: 'PUT', body: { price: -5 } })],
  ['non-numeric year', await owner.raw(`/api/cars/${id}`, { method: 'PUT', body: { year: 'abc' } })],
  ['incomplete reorder', await owner.raw(`/api/cars/${id}/images/order`, { method: 'PATCH', body: { order: [0, 1] } })],
  ['duplicate reorder', await owner.raw(`/api/cars/${id}/images/order`, { method: 'PATCH', body: { order: [0, 0, 1, 2] } })],
  ['cover out of range', await owner.raw(`/api/cars/${id}/images/cover`, { method: 'PATCH', body: { index: 99 } })],
  ['delete index NaN', await owner.raw(`/api/cars/${id}/images/x`, { method: 'DELETE' })],
];
check('invalid input is rejected with a client error and changes nothing', bad.every(([, r]) => r.status >= 400 && r.status < 500) && rowHash(id) === snapshot, bad.map(([n, r]) => `${n}:${r.status}`));
fs.writeFileSync(FAIL_FILE, '');
const upFail = await owner.raw(`/api/cars/${id}/images`, { method: 'POST', form: form(1, 'f') });
check('an upload failure is reported plainly (not as a permission problem) and the listing is unchanged', upFail.status >= 400 && !/permission/i.test(JSON.stringify(upFail.j)) && rowHash(id) === snapshot, upFail);
fs.writeFileSync(FAIL_FILE, '1');
const d2 = count('destroy'); const u2 = count('upload');
const partial = await owner.raw(`/api/cars/${id}/images`, { method: 'POST', form: form(3, 'g') });
check('a part-way upload failure leaves the listing unchanged and cleans up the photo that did upload (no orphan)', partial.status >= 400 && rowHash(id) === snapshot && count('upload') - u2 >= 1 && count('destroy') - d2 === count('upload') - u2, { s: partial.status, uploaded: count('upload') - u2, destroyed: count('destroy') - d2 });
fs.rmSync(FAIL_FILE, { force: true });
const upOk = await owner.raw(`/api/cars/${id}/images`, { method: 'POST', form: form(1, 'ok') });
check('after the fault clears, upload works again', upOk.status === 200 && photos(id).length === ids.length + 1, upOk.status);

// ---- persistence after re-login ----------------------------------------------------------------------------------------------------------------
const finalState = { photos: photos(id), price: finalPrice };
const again = new Client();
const login = await again.raw('/api/v1/auth/login', { method: 'POST', body: { email: owner.email, password: PW } });
const m2 = await mine(again, id);
check('after logging in again every change persists (details, photo order, number, status)', login.status === 200 && m2.row?.title === '2020 Mazda CX5 Signature' && Number(m2.row?.price) === finalState.price && m2.row?.listingNumber === 1 && m2.row?.status === 'available' && JSON.stringify(photos(id)) === JSON.stringify(finalState.photos));
const pub2 = await new Client().raw(`/api/cars/${id}`);
check('the listing is still publicly visible after all changes', pub2.status === 200);

// ---- ownership: another personal account and anonymous callers ---------------------------------------------------------------------------------
const h0 = rowHash(id); const s0 = count('upload') + count('destroy');
const attempts = async (c) => [
  await c.raw(`/api/cars/${id}`, { method: 'PUT', body: { title: 'hijack', price: 1 } }),
  await c.raw(`/api/cars/${id}/images`, { method: 'POST', form: form(1, 'x') }),
  await c.raw(`/api/cars/${id}/images/0`, { method: 'DELETE' }),
  await c.raw(`/api/cars/${id}/images/cover`, { method: 'PATCH', body: { index: 1 } }),
  await c.raw(`/api/cars/${id}/images/order`, { method: 'PATCH', body: { order: [3, 2, 1, 0, 4].slice(0, photos(id).length) } }),
  await c.raw(`/api/cars/${id}/lifecycle`, { method: 'PATCH', body: { action: 'mark_sold' } }),
  await c.raw(`/api/cars/${id}`, { method: 'DELETE' }),
];
const otherRes = await attempts(other);
check('another personal account cannot edit, upload, remove, reorder, set cover, change status or delete (all 4xx)', otherRes.every((r) => r.status >= 400 && r.status < 500), otherRes.map((r) => r.status));
check('…and the listing and storage are untouched', rowHash(id) === h0 && count('upload') + count('destroy') === s0);
const anonRes = await attempts(anon);
check('anonymous callers are blocked from every management endpoint (401)', anonRes.every((r) => r.status === 401), anonRes.map((r) => r.status));
check('…and the listing is untouched', rowHash(id) === h0);
check("another user's dashboard never lists this vehicle", !((await other.raw('/api/cars/my-listings')).j?.data || []).some((x) => x.id === id));
const takeover = await owner.raw(`/api/cars/${id}`, { method: 'PUT', body: { price: finalPrice, dealer: other.id, dealerId: other.id, dealer_id: other.id } });
check('a browser-supplied owner id cannot transfer a listing', q(`select dealer_id from cars where id='${id}'`) === owner.id, takeover.status);

// The edit, delete and status routes share a deliberate per-user limiter (10 requests/minute). The checks above spent the window, so wait it out
// rather than weaken the limiter: otherwise the remaining checks would observe 429s instead of the behaviour under test.
await sleep(62000);

// ---- status changes without the status service -------------------------------------------------------------------------------------------------
const sold = await owner.raw(`/api/cars/${id}/lifecycle`, { method: 'PATCH', body: { action: 'mark_sold' } });
check('Mark as sold answers an explicit 503 (status service not enabled), never leaks internals, and changes nothing', sold.status === 503 && sold.j?.code === 'LISTING_STATUS_SERVICE_UNAVAILABLE' && !/function|schema cache|public\./i.test(sold.j?.message || '') && q(`select status from cars where id='${id}'`) === 'available', sold);

// ---- a genuine read failure still fails closed, then recovers ----------------------------------------------------------------------------------
q(`revoke select on public.bids from service_role`);
await reload();
const mDown = await mine(owner, id);
const eDown = mDown.row?.ownerActionEligibility || {};
const editDown = await owner.raw(`/api/cars/${id}`, { method: 'PUT', body: { price: 3999999 } });
check('an UNREADABLE lock table fails closed: tools paused with a retry reason, edit refused with 503, nothing written', eDown.permissionsAvailable === false && eDown.canEdit === false && eDown.reasonCode === 'PERMISSION_CHECK_UNAVAILABLE' && editDown.status === 503 && Number(q(`select price from cars where id='${id}'`)) === finalPrice, { eDown: eDown.reasonCode, editDown: editDown.status });
q(`grant select on public.bids to service_role`);
await reload();
const mUp = await mine(owner, id);
const editUp = await owner.raw(`/api/cars/${id}`, { method: 'PUT', body: { price: 3360000 } });
check('after the fault clears, tools are enabled again and the edit succeeds (no stuck disabled state)', mUp.row?.ownerActionEligibility?.permissionsAvailable === true && mUp.row?.ownerActionEligibility?.canEdit === true && editUp.status === 200 && Number(q(`select price from cars where id='${id}'`)) === 3360000, { up: mUp.row?.ownerActionEligibility?.permissionsAvailable, edit: editUp.status });

finish('08_personal_listing_hosted_schema');
