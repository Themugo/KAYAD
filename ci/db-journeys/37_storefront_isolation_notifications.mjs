// Launch certification: public storefront (allowlist, visibility, media), dealer A/B isolation, and exact notification recipients
// for Dealer A owner, staff WITH lead permission, staff WITHOUT, Dealer B owner, personal buyer/seller, admin and an anonymous visitor.
import crypto from 'node:crypto';
import { makeUser, q, check, finish, uid, PW, listingForm } from './lib.mjs';
const B = process.env.KAYAD_JOURNEY_BASE || 'http://127.0.0.1:5055';
const idem = () => ({ 'idempotency-key': crypto.randomUUID() });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const n = (id, where = 'true') => Number(q(`select count(*) from notifications where user_id='${id}' and ${where}`));
const phone = () => '254711000' + Math.floor(100 + Math.random() * 899);
const anon = async (path) => { const r = await fetch(`${B}${path}`); return { status: r.status, j: await r.json().catch(() => ({})), text: '' }; };
const mkDealer = (tag) => makeUser({ tag, role: 'dealer', extra: { businessName: `${tag} Motors ${uid()}`, phone: phone(), location: 'Nairobi', city: 'Nairobi' } });

const adm = await makeUser({ tag: 'sadm', dbRole: 'superadmin' });
q(`update users set email='prev-'||id||'@example.test' where email='ci-owner@example.test' and id<>'${adm.id}'`); q(`update users set email='ci-owner@example.test' where id='${adm.id}'`);
adm.csrf = null; await adm.raw('/api/v1/auth/login', { method: 'POST', body: { email: 'ci-owner@example.test', password: PW } });

const A = await mkDealer('sa'); const Bd = await mkDealer('sb'); const C = await mkDealer('sc');
for (const d of [A, Bd]) {
  await d.raw('/api/verification/submit', { method: 'POST', body: { documents: {} }, headers: idem() });
  await adm.raw(`/api/admin/users/${d.id}/approve-dealer`, { method: 'POST', body: { reason: 'storefront journey' } });
  await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: PW } }); d.csrf = null;
}
const buyer = await makeUser({ tag: 'sbuyer' }); const seller = await makeUser({ tag: 'sseller' }); const mod = await makeUser({ tag: 'smod', dbRole: 'admin' });
check('SETUP: Dealer A and B approved, C left pending', q(`select string_agg(status,',' order by email) from users where id in ('${A.id}','${Bd.id}')`) === 'approved,approved' && q(`select status from users where id='${C.id}'`) === 'pending', q(`select status from users where id='${C.id}'`));

// ---- listings
const la = await A.raw('/api/cars', { method: 'POST', form: listingForm('A Toyota Prado') }); const carA = la.j?.data?.id;
const la2 = await A.raw('/api/cars', { method: 'POST', form: listingForm('A Draft Hilux') }); const carA2 = la2.j?.data?.id;
q(`update cars set status='draft' where id='${carA2}'`);
const lb = await Bd.raw('/api/cars', { method: 'POST', form: listingForm('B Honda Fit') }); const carB = lb.j?.data?.id;
check('LISTING: A and B each publish a vehicle', !!carA && !!carB && la.status === 201 && lb.status === 201, [la.status, lb.status]);

// ---- storefront profile: allowlist + visibility
const pa = await anon(`/api/dealer-platform/profile/${A.id}`);
const ALLOWED = new Set(['id', 'businessName', 'bio', 'location', 'logoUrl', 'bannerUrl', 'approved', 'verified', 'publiclyVisible', 'memberSince', 'stats']);
const extra = Object.keys(pa.j?.data || {}).filter((k) => !ALLOWED.has(k));
check('STOREFRONT: anonymous visitor can open an approved dealer profile', pa.status === 200 && pa.j?.data?.businessName, pa);
check('STOREFRONT: response contains ONLY allowlisted fields (no phone, email, personal name, status, documents)', extra.length === 0 && !/phone|email|documents|admin_notes|rejection|password/i.test(JSON.stringify(pa.j)), extra);
check('STOREFRONT: verified indicator shown only for an approved dealer', pa.j?.data?.verified === true && pa.j?.data?.stats?.activeListings === 1, pa.j?.data);
const pc = await anon(`/api/dealer-platform/profile/${C.id}`);
check('STOREFRONT: a PENDING dealer has no public page (404, same as unknown id)', pc.status === 404, pc.status);
const pcOwner = await C.raw(`/api/dealer-platform/profile/${C.id}`);
check('STOREFRONT: the pending dealer can still preview their own page', pcOwner.status === 200 && pcOwner.j?.data?.publiclyVisible === false, pcOwner.status);
const pBuyer = await buyer.raw(`/api/dealer-platform/profile/${C.id}`);
check('STOREFRONT: another signed-in user cannot see the pending dealer page', pBuyer.status === 404, pBuyer.status);
const pA_owner = await A.raw(`/api/dealer-platform/profile/${A.id}`);
check('STOREFRONT: only the owner receives the private phone number', pA_owner.j?.data?.phone && !pa.j?.data?.phone && !(await buyer.raw(`/api/dealer-platform/profile/${A.id}`)).j?.data?.phone, 'phone leak');

// ---- media
const okLogo = 'https://res.cloudinary.com/demo/image/upload/v1/kayad/dealers/logo_a.png';
const m1 = await A.raw(`/api/dealer-platform/profile/${A.id}`, { method: 'PUT', body: { logoUrl: okLogo } });
check('MEDIA: owner saves a logo (Cloudinary https URL)', m1.status === 200 && m1.j?.data?.logoUrl === okLogo, m1);
const bad = await A.raw(`/api/dealer-platform/profile/${A.id}`, { method: 'PUT', body: { logoUrl: 'javascript:alert(1)' } });
const bad2 = await A.raw(`/api/dealer-platform/profile/${A.id}`, { method: 'PUT', body: { bannerUrl: 'https://evil.example/x.png' } });
check('MEDIA: non-Cloudinary / script URLs are refused', bad.status === 400 && bad2.status === 400, [bad.status, bad2.status]);
check('MEDIA: public page now carries the logo', (await anon(`/api/dealer-platform/profile/${A.id}`)).j?.data?.logoUrl === okLogo, 'no logo');
const cross = await Bd.raw(`/api/dealer-platform/profile/${A.id}`, { method: 'PUT', body: { bio: 'hijack' } });
check('ISOLATION: Dealer B cannot edit Dealer A\'s profile', cross.status === 403 && q(`select coalesce(bio,'') from users where id='${A.id}'`) !== 'hijack', cross.status);
const own = await A.raw(`/api/dealer-platform/profile/${A.id}`, { method: 'PUT', body: { bio: 'Family-run showroom in Nairobi.', location: 'Westlands, Nairobi' } });
check('PROFILE: owner edits description and location, public page reflects it', own.status === 200 && (await anon(`/api/dealer-platform/profile/${A.id}`)).j?.data?.bio === 'Family-run showroom in Nairobi.', own.status);

// ---- public inventory
const inv = await anon(`/api/cars?dealer=${A.id}&limit=50`);
const ids = (inv.j?.data || inv.j?.cars || []).map((c) => c.id || c._id);
check('INVENTORY: storefront shows A\'s published vehicle', ids.includes(carA), ids);
check('INVENTORY: A\'s draft vehicle is NOT public', !ids.includes(carA2), ids);
check('INVENTORY: Dealer B\'s vehicle never appears on A\'s storefront', !ids.includes(carB), ids);
const privateLeak = JSON.stringify(inv.j);
check('INVENTORY: public vehicle rows hold no reserve/VIN/owner contact fields', !/reservePrice|reserve_price|"vin"|chassis|highestBidder/i.test(privateLeak), 'leak');
q(`update dealers set is_suspended=true where "user"='${A.id}'`);
check('STOREFRONT: a SUSPENDED dealer page disappears for the public', (await anon(`/api/dealer-platform/profile/${A.id}`)).status === 404, 'still public');
q(`update dealers set is_suspended=false where "user"='${A.id}'`);
check('STOREFRONT: reinstatement restores it', (await anon(`/api/dealer-platform/profile/${A.id}`)).status === 200, 'not restored');

// ---- staff: A1 with lead permission, A2 without
const A1 = await makeUser({ tag: 'sa1' }); const A2 = await makeUser({ tag: 'sa2' });
const mkStaff = async (u, role) => {
  const inv = await A.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: u.email }, headers: idem() });
  const id = q(`select id from dealer_teams where dealer='${A.id}' and invite_email='${u.email}' limit 1`);
  q(`update dealer_teams set member='${u.id}', status='active', employment_status='active' where id='${id}'`);
  const set = await A.raw(`/api/dealer-platform/team/${id}`, { method: 'PUT', body: { role } });
  return { id, inv: inv.status, set: set.status };
};
const s1 = await mkStaff(A1, 'sales_agent'); const s2 = await mkStaff(A2, 'viewer');
check('STAFF: invite + role for staff with and without lead permission', s1.inv === 201 && s2.inv === 201 && s1.set === 200 && s2.set === 200, [s1, s2]);
await sleep(800);

// ---- enquiry: who is notified
const start = await buyer.raw('/api/chat', { method: 'POST', body: { recipientId: A.id, carId: carA, message: 'Hello' } });
const chatId = start.j?.chat?.id || start.j?.data?.id || start.j?.id || start.j?.chatId;
await buyer.raw(`/api/chat/${chatId}/message`, { method: 'POST', body: { content: 'Is the Prado still available?' }, headers: idem() });
await sleep(1500);
const enq = (id) => n(id, `title='New enquiry'`);
check('NOTIFY: Dealer A owner receives exactly one New enquiry', enq(A.id) === 1, enq(A.id));
check('NOTIFY: A staff WITH lead permission receives exactly one', enq(A1.id) === 1, enq(A1.id));
check('NOTIFY: A staff WITHOUT lead permission receives none', enq(A2.id) === 0, enq(A2.id));
check('NOTIFY: Dealer B owner receives nothing about it', n(Bd.id, `(title='New enquiry' or message ilike '%Prado%')`) === 0, n(Bd.id));
check('NOTIFY: personal seller, platform moderator and super admin receive nothing about it', enq(seller.id) + enq(mod.id) + enq(adm.id) === 0, [enq(seller.id), enq(mod.id), enq(adm.id)]);
check('NOTIFY: the buyer is not sent the dealer\'s enquiry notice', enq(buyer.id) === 0, enq(buyer.id));
const anonN = await anon('/api/notifications');
check('NOTIFY: an anonymous visitor cannot read notifications', anonN.status === 401, anonN.status);
const aList = await A.raw('/api/notifications?limit=50'); const bList = await Bd.raw('/api/notifications?limit=50');
check('ISOLATION: Dealer B\'s notification list contains nothing of Dealer A\'s', !JSON.stringify(bList.j).includes('Prado') && !JSON.stringify(bList.j).includes('enquiry'), 'leak');
check('BELL: A\'s list includes the enquiry with a dashboard deep link', (aList.j?.notifications || []).some((x) => x.title === 'New enquiry' && String(x.link || '').startsWith('/')), (aList.j?.notifications || []).map((x) => `${x.title}|${x.link}`));

// ---- bell state: unread, mark one, mark all
const rows = aList.j?.notifications || []; const unread0 = aList.j?.unreadCount;
check('BELL: unread count equals unread rows in the database', Number(unread0) === n(A.id, 'read=false'), [unread0, n(A.id, 'read=false')]);
const one = rows.find((x) => x.read === false);
const r1 = await A.raw(`/api/notifications/${one._id || one.id}/read`, { method: 'POST', headers: idem() });
check('BELL: marking one as read lowers unread by exactly one, persistently', r1.status === 200 && Number((await A.raw('/api/notifications?limit=50')).j?.unreadCount) === Number(unread0) - 1, r1.status);
const strangerRead = await Bd.raw(`/api/notifications/${rows[0]._id || rows[0].id}/read`, { method: 'POST', headers: idem() });
check('ISOLATION: Dealer B cannot mark Dealer A\'s notification read', strangerRead.status >= 400 || n(A.id, `id='${rows[0]._id || rows[0].id}' and read=true`) === (rows[0].read ? 1 : 0), strangerRead.status);
const ra = await A.raw('/api/notifications/read-all', { method: 'POST', headers: idem() });
check('BELL: mark-all-read clears unread for A only', ra.status === 200 && n(A.id, 'read=false') === 0, ra.status);
check('BELL: Dealer B\'s unread rows were not touched by A', n(Bd.id, 'read=false') === Number((await Bd.raw('/api/notifications?limit=50')).j?.unreadCount), 'count mismatch');

// ---- direct access attempts
const bLeads = await Bd.raw('/api/dealer-platform/leads?limit=20', { headers: { 'x-dealer-org': A.id } });
check('ISOLATION: Dealer B cannot read Dealer A\'s leads via the org header', bLeads.status === 403 || (bLeads.status === 200 && !JSON.stringify(bLeads.j).includes('Prado')), bLeads.status);
const a2Leads = await A2.raw('/api/dealer-platform/leads?limit=20', { headers: { 'x-dealer-org': A.id } });
check('PERMISSION: staff without lead permission is refused A\'s leads by the backend', a2Leads.status === 403, a2Leads.status);
const a1Leads = await A1.raw('/api/dealer-platform/leads?limit=20', { headers: { 'x-dealer-org': A.id } });
check('PERMISSION: staff with lead permission can read them', a1Leads.status === 200, a1Leads.status);
const a2Invite = await A2.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: `x-${uid()}@example.test` }, headers: { ...idem(), 'x-dealer-org': A.id } });
check('PERMISSION: staff without team permission cannot invite', a2Invite.status === 403, a2Invite.status);
const bEdit = await Bd.raw(`/api/cars/${carA}`, { method: 'PUT', body: { price: 1 } });
check('ISOLATION: Dealer B cannot edit Dealer A\'s vehicle', bEdit.status >= 400 && !q(`select price from cars where id='${carA}'`).startsWith('1.'), bEdit.status);
const bTeam = await Bd.raw('/api/dealer-platform/team', { headers: { 'x-dealer-org': A.id } });
check('ISOLATION: Dealer B cannot list Dealer A\'s staff', !JSON.stringify(bTeam.j).includes(A1.email), bTeam.status);

// ---- revocation
const rev = await A.raw(`/api/dealer-platform/team/${s1.id}`, { method: 'PUT', body: { status: 'suspended' } });
await sleep(500);
const after = await A1.raw('/api/dealer-platform/leads?limit=20', { headers: { 'x-dealer-org': A.id } });
check('STAFF: after deactivation the former staff member is refused', rev.status === 200 && after.status === 403, [rev.status, after.status]);
const b2 = await makeUser({ tag: 'sbuyer2' });
const st = await b2.raw('/api/chat', { method: 'POST', body: { recipientId: A.id, carId: carA, message: 'Hi' } });
const ch2 = st.j?.chat?.id || st.j?.data?.id || st.j?.id || st.j?.chatId;
await b2.raw(`/api/chat/${ch2}/message`, { method: 'POST', body: { content: 'Second enquiry' }, headers: idem() });
await sleep(1500);
check('NOTIFY: deactivated staff receive no further enquiries; owner receives the new one', enq(A1.id) === 1 && enq(A.id) === 2, [enq(A1.id), enq(A.id)]);
finish('storefront, isolation and notifications');
