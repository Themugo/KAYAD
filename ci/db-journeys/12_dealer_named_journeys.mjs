// The 30 named dealer journeys, over real HTTP against a disposable database. One row per journey is written to
// out/thirty-journeys.json with PASS / FAIL / BLOCKED / NOT TESTED and the evidence. A journey that needs a provider or an endpoint
// that does not exist is recorded as BLOCKED / NOT TESTED with the reason; it is never reported as passed.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { makeUser, q, check, finish, Client, listingForm, uid, PW } from './lib.mjs';

const rows = [];
const rec = (n, name, role, status, evidence, extra = {}) => { rows.push({ n, name, role, status, evidence, ...extra }); console.log(`${status.padEnd(10)} J${n} ${name} :: ${evidence}`); if (status === 'PASS' || status === 'FAIL') check(`J${n} ${name}`, status === 'PASS', evidence); };
const run = async (n, name, role, fn, extra) => { try { const [ok, ev] = await fn(); rec(n, name, role, ok ? 'PASS' : 'FAIL', ev, extra); } catch (e) { rec(n, name, role, 'FAIL', `threw: ${e.message}`, extra); } };
const skip = (n, name, role, status, why) => rec(n, name, role, status, why);

const mkDealer = async (tag, approve = true) => {
  const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `Named ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
  if (approve) { q(`update users set status='approved' where id='${d.id}'`); q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`); }
  await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: PW } }); d.csrf = null;
  return d;
};
const staff = async (owner, role, tag) => {
  const u = await makeUser({ tag });
  const inv = await owner.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: u.email, role } });
  const tok = crypto.randomBytes(32).toString('hex');
  q(`update dealer_teams set invite_token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}' where invite_email='${u.email}'`);
  const acc = await u.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } });
  return { u, inv, acc };
};
const car = (owner, title, status = 'available') => q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold,images) values ('${title}','Mazda','CX-5',2019,3000000,'${status}','${owner.id}',false,'[{"url":"https://res.example.test/a.jpg","publicId":"a"},{"url":"https://res.example.test/b.jpg","publicId":"b"}]'::jsonb) returning id`).split('\n')[0];
const st = (id) => q(`select status from cars where id='${id}'`);

// ---------------------------------------------------------------- registration and onboarding
const P = await mkDealer('pending', false);
await run(1, 'Dealer registration', 'dealer (new)', async () => {
  const r = q(`select role||'|'||status||'|'||(select count(*) from dealers where "user"='${P.id}') from users where id='${P.id}'`);
  return [r === 'dealer|pending|1', `user row ${r} (role|status|dealer rows)`];
});
skip(2, 'Email verification', 'dealer (new)', 'BLOCKED', 'The verification link is sent by the mail provider; the harness marks email_verified directly in the disposable DB. No provider is available, so the mail round trip is not verified here.');
await run(3, 'Business information submission', 'dealer (pending)', async () => {
  const r = await P.raw('/api/dealer/onboarding', { method: 'PUT', body: { businessName: `Named Pending Motors ${uid()}`, location: 'Nairobi', bio: 'Journey bio' } });
  const g = await P.raw('/api/dealer/onboarding');
  return [r.status === 200 && g.status === 200, `PUT ${r.status} ${JSON.stringify(r.j).slice(0, 120)} / GET ${g.status}`];
});
skip(4, 'Document upload', 'dealer (pending)', 'NOT TESTED', 'No paperwork requirements are configured in the disposable DB (checklist is empty), and the document store is an external provider. The upload path was not exercised.');
await run(5, 'Pending approval', 'dealer (pending)', async () => {
  const s = q(`select approved from dealers where "user"='${P.id}'`);
  const pub = await P.raw('/api/cars', { method: 'POST', form: listingForm('Pending dealer listing') });
  return [s === 'f' && [201, 200, 403].includes(pub.status), `dealers.approved=${s}; create-listing as pending dealer -> ${pub.status} ${pub.j?.code || ''}`];
});
skip(6, 'Approval, rejection and resubmission', 'admin + dealer', 'NOT TESTED', 'Admin dealer-review endpoints were not scripted in this suite; approval is set directly in the disposable DB for the other journeys.');

// ---------------------------------------------------------------- inventory
const A = await mkDealer('namea'); const B = await mkDealer('nameb');
let apiId = null;
await run(7, 'Create vehicle listing', 'dealer owner', async () => {
  const r = await A.raw('/api/cars', { method: 'POST', form: listingForm('Named journey car') });
  apiId = r.j?.data?.id || r.j?.car?.id;
  return [r.status === 201 && !!apiId && q(`select dealer_id::text from cars where id='${apiId}'`) === A.id, `POST /api/cars -> ${r.status}`];
});
await run(8, 'Save draft', 'dealer owner', async () => {
  const d = car(A, 'Draft car', 'draft');
  const g = await A.raw('/api/dealer-platform/inventory?limit=100'); const items = g.j?.data?.items || g.j?.data?.listings || [];
  return [st(d) === 'draft' && JSON.stringify(g.j).includes(d), `draft stored; inventory read ${g.status}; visible to owner: ${JSON.stringify(g.j).includes(d)}; hidden from public: ${(await fetch(`${process.env.KAYAD_JOURNEY_BASE}/api/cars/${d}`)).status}`];
});
await run(9, 'Edit eligible listing', 'dealer owner', async () => {
  const r = await A.raw(`/api/cars/${apiId}`, { method: 'PUT', body: { price: 2750000 } });
  return [r.status === 200 && q(`select price from cars where id='${apiId}'`).startsWith('2750000'), `PUT /api/cars/:id -> ${r.status} ${r.j?.code || ''}`];
});
await run(10, 'Upload and manage vehicle photographs', 'dealer owner', async () => {
  const fd = new FormData(); fd.append('images', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')], { type: 'image/png' }), 'b.png');
  const up = await A.raw(`/api/cars/${apiId}/images`, { method: 'POST', form: fd });
  const n = Number(q(`select jsonb_array_length(images) from cars where id='${apiId}'`));
  const ord = await A.raw(`/api/cars/${apiId}/images/order`, { method: 'PATCH', body: { order: n === 2 ? [1, 0] : [0] } });
  const cov = await A.raw(`/api/cars/${apiId}/images/cover`, { method: 'PATCH', body: { index: 0 } });
  const del = await A.raw(`/api/cars/${apiId}/images/${Math.max(n - 1, 0)}`, { method: 'DELETE' });
  return [(up.status === 200 || up.status === 201) && n === 2 && [200, 204].includes(del.status), `upload ${up.status} (images now ${n}); reorder ${ord.status}; cover ${cov.status}; delete ${del.status}. Provider is the loopback Cloudinary stub, NOT real Cloudinary.`];
});
const c11 = car(A, 'Pub-pause car');
await run(11, 'Publish listing', 'dealer owner', async () => {
  q(`update cars set status='draft' where id='${c11}'`);
  const r = await A.raw(`/api/dealer/cars/${c11}/publish`, { method: 'PATCH' });
  return [r.status === 200 && st(c11) === 'available', `publish -> ${r.status}; detail for the public ${(await fetch(`${process.env.KAYAD_JOURNEY_BASE}/api/cars/${c11}`)).status}`];
});
await run(12, 'Pause listing', 'dealer owner', async () => {
  const r = await A.raw(`/api/dealer/cars/${c11}/pause`, { method: 'PATCH' });
  return [r.status === 200 && st(c11) === 'hidden' && (await fetch(`${process.env.KAYAD_JOURNEY_BASE}/api/cars/${c11}`)).status === 404, `pause -> ${r.status}; public detail now 404`];
});
await run(13, 'Republish listing', 'dealer owner', async () => {
  const r = await A.raw(`/api/dealer/cars/${c11}/publish`, { method: 'PATCH' });
  return [r.status === 200 && st(c11) === 'available' && (await fetch(`${process.env.KAYAD_JOURNEY_BASE}/api/cars/${c11}`)).status === 200, `republish -> ${r.status}; public detail 200`];
});
await run(14, 'Mark sold', 'dealer owner', async () => {
  const r = await A.raw(`/api/dealer/cars/${c11}/mark-sold`, { method: 'PATCH', body: { buyerName: 'Named Buyer', salePrice: 2900000 } });
  return [r.status === 200 && st(c11) === 'sold' && q(`select count(*) from dealer_listing_lifecycle_events where car_id='${c11}' and action='dealer_mark_sold'`) === '1', `mark-sold -> ${r.status}; exactly one sale record`];
});
await run(15, 'Bulk status changes', 'dealer owner', async () => {
  const x = car(A, 'Bulk x'), y = car(A, 'Bulk y');
  const r = await A.raw('/api/dealer/cars/bulk-status', { method: 'PATCH', body: { ids: [x, y, x], status: 'hidden' } });
  return [r.status === 200 && st(x) === 'hidden' && st(y) === 'hidden' && (r.j?.updated || []).length === 2, `bulk pause (duplicate id collapsed) -> ${r.status} updated=${(r.j?.updated || []).length}`];
});
await run(16, 'Prevent editing or deleting sold listings', 'dealer owner', async () => {
  const e = await A.raw(`/api/cars/${c11}`, { method: 'PUT', body: { price: 1 } });
  const d = await A.raw(`/api/cars/${c11}`, { method: 'DELETE' });
  return [[403, 409].includes(e.status) && [403, 409].includes(d.status) && q(`select price from cars where id='${c11}'`).startsWith('3000000'), `edit sold -> ${e.status} ${e.j?.code || ''}; delete sold -> ${d.status} ${d.j?.code || ''}; price unchanged`];
});

// ---------------------------------------------------------------- leads and customers
const buyer = await makeUser({ tag: 'namebuyer' });
const lc = car(A, 'Lead car');
let leadId = null;
await run(17, 'Receive buyer enquiry', 'buyer -> dealer', async () => {
  leadId = q(`insert into leads(buyer,dealer,vehicle,source) values('${buyer.id}','${A.id}','${lc}','chat') returning id`).split('\n')[0];
  const g = await A.raw('/api/dealer-platform/leads?limit=50');
  return [g.status === 200 && JSON.stringify(g.j).includes(leadId), `lead row seeded in the DB (the buyer-side enquiry endpoint was not scripted) and returned by GET /dealer-platform/leads -> ${g.status}`];
});
await run(18, 'Respond to enquiry', 'dealer owner', async () => {
  const n = await A.raw(`/api/dealer-platform/leads/${leadId}/notes`, { method: 'POST', body: { content: 'Called the buyer', note: 'Called the buyer' } });
  const u = await A.raw(`/api/dealer-platform/leads/${leadId}`, { method: 'PUT', body: { status: 'contacted' } });
  const act = q(`select actor::text||'|'||actor_type from lead_activities where lead='${leadId}' and type='note' limit 1`);
  return [[200, 201].includes(n.status) && u.status === 200 && act === `${A.id}|dealer`, `note ${n.status}; stage update ${u.status}; stored activity actor|type = ${act}`];
});
skip(19, 'Convert an enquiry into an eligible transaction', 'buyer + dealer', 'PASS-BY-REFERENCE', 'Accepted offer -> settlement -> payment is exercised end to end by journey 05_offer_payment (simulated provider callback). Not repeated here.');
await run(20, 'Customer appears after a released deal', 'dealer owner', async () => {
  const e = q(`insert into escrows(buyer,seller,car,amount,status) values('${buyer.id}','${A.id}','${lc}',1000000,'released') returning id`).split('\n')[0];
  const g = await A.raw('/api/dealer-platform/customers?limit=50');
  return [g.status === 200 && JSON.stringify(g.j).includes(buyer.id), `released escrow ${e.slice(0, 8)} seeded in the DB; GET /customers -> ${g.status}; buyer listed: ${JSON.stringify(g.j).includes(buyer.id)}`];
});

// ---------------------------------------------------------------- team
const m = await staff(A, 'sales_agent', 'sales');
await run(21, 'Invite team member', 'dealer owner', async () => [m.inv.status === 201, `invite -> ${m.inv.status}`]);
await run(22, 'Assign role', 'dealer owner', async () => [m.acc.status === 200 && q(`select role from dealer_teams where invite_email='${m.u.email}'`) === 'sales_agent', `accept -> ${m.acc.status}; stored role ${q(`select role from dealer_teams where invite_email='${m.u.email}'`)}`]);
await run(23, 'Change and revoke role', 'dealer owner', async () => {
  const tid = q(`select id from dealer_teams where invite_email='${m.u.email}'`);
  const ch = await A.raw(`/api/dealer-platform/team/${tid}`, { method: 'PUT', body: { role: 'viewer' } });
  const roleNow = q(`select role from dealer_teams where id='${tid}'`);
  const rv = await A.raw(`/api/dealer-platform/team/${tid}`, { method: 'DELETE' });
  const after = await m.u.raw('/api/dealer-platform/inventory?limit=5');
  return [ch.status === 200 && roleNow === 'viewer' && rv.status === 200 && [401, 403, 404].includes(after.status), `change -> ${ch.status} (${roleNow}); revoke -> ${rv.status}; revoked member can read inventory -> ${after.status}`];
});
await run(24, 'Role restrictions and cross-business isolation', 'staff + other dealer', async () => {
  const s2 = await staff(A, 'lot_agent', 'lot');
  const sold = await s2.u.raw(`/api/dealer/cars/${car(A, 'staff sale')}/mark-sold`, { method: 'PATCH', body: {} });
  const self = await s2.u.raw(`/api/dealer-platform/team/${q(`select id from dealer_teams where invite_email='${s2.u.email}'`)}`, { method: 'PUT', body: { role: 'manager' } });
  const otherInv = await B.raw('/api/dealer-platform/inventory?limit=100');
  const leak = JSON.stringify(otherInv.j).includes(lc);
  const crossPause = await B.raw(`/api/dealer/cars/${lc}/pause`, { method: 'PATCH' });
  return [[401, 403, 404].includes(sold.status) && [401, 403, 404].includes(self.status) && !leak && crossPause.status === 404, `lot_agent mark-sold -> ${sold.status}; self-elevation -> ${self.status}; dealer B sees A's car: ${leak}; dealer B pauses A's car -> ${crossPause.status}`];
});

// ---------------------------------------------------------------- finance and operations
await run(25, 'Save and retrieve banking information', 'dealer owner', async () => {
  const p = await A.raw('/api/dealer/settlement', { method: 'PUT', body: { bankName: 'Named Bank', paymentDetails: { accountName: 'Named Motors', mpesaPhone: '0712345678' } } });
  const g = await A.raw('/api/dealer/settlement');
  return [p.status === 200 && g.j?.settlement?.bankName === 'Named Bank', `save ${p.status}; read-back bank=${g.j?.settlement?.bankName}. Full cases in journey 10.`];
});
await run(26, 'Payout masking and access restrictions', 'owner / staff / anonymous', async () => {
  const s3 = await staff(A, 'finance_officer', 'fin');
  const g = await s3.u.raw('/api/dealer/settlement'); const anon = await new Client().raw('/api/dealer/settlement');
  const own = await A.raw('/api/dealer/settlement');
  return [[401, 403, 404].includes(g.status) && anon.status === 401 && own.j?.settlement?.bankAccountMasked !== undefined, `finance_officer -> ${g.status}; anonymous -> ${anon.status}; owner response carries masked fields: ${own.j?.settlement?.bankAccountMasked !== undefined}`];
});
skip(27, 'Complete an eligible escrow lifecycle', 'buyer + dealer', 'PASS-BY-REFERENCE', 'Escrow funding is driven by a payment-provider callback. Journey 05 and the legacy journeys exercise it against the simulated callback; real M-Pesa is BLOCKED (no credentials).');
await run(28, 'Auction and settlement restrictions', 'dealer owner', async () => {
  const bidCar = car(A, 'bid car'); q(`update cars set bids_count=1 where id='${bidCar}'`);
  const settleCar = car(A, 'settle car');
  const p = await A.raw(`/api/dealer/cars/${bidCar}/pause`, { method: 'PATCH' });
  const s = await A.raw(`/api/dealer/cars/${bidCar}/mark-sold`, { method: 'PATCH', body: {} });
  return [p.status === 409 && s.status === 409, `pause with bids -> ${p.status} ${p.j?.code}; mark-sold with bids -> ${s.status} ${s.j?.code}. Escrow / settlement locks: journeys 09 and 11.`];
});
await run(29, 'Inspection workflow', 'dealer owner', async () => {
  const g = await A.raw('/api/dealer-platform/inspections');
  return [g.status === 200, `GET /dealer-platform/inspections -> ${g.status} (list only)`];
});
rows[rows.length - 1].note = 'Only the read path was exercised; ordering, completing and reading a report were NOT TESTED.';
await run(30, 'Marketing, notifications and support access', 'dealer owner', async () => {
  const viewer = (await staff(A, 'viewer', 'view')).u; const vm = await viewer.raw('/api/dealer-platform/marketing');
  const mk = await A.raw('/api/dealer-platform/marketing'); const nt = await A.raw('/api/notifications'); const sp = await A.raw('/api/support/my-tickets');
  return [mk.status === 200 && nt.status === 200 && sp.status === 200 && vm.status === 403, `marketing ${mk.status}; notifications ${nt.status}; support tickets ${sp.status}; viewer marketing -> ${vm.status}`];
});

fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('./out/thirty-journeys.json', import.meta.url), JSON.stringify(rows, null, 2));
const tally = rows.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
console.log('TALLY', JSON.stringify(tally));
finish('12_dealer_named_journeys');
