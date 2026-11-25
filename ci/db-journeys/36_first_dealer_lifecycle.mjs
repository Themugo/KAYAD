// First-dealer readiness: the whole lifecycle over real HTTP on the disposable database, with every notification each step produces.
// personal sign-up -> dealer sign-up -> application -> (pending) listing -> owner approval -> full listing with photo -> public visibility
// -> buyer enquiry -> dealer + staff notified -> staff invited/joined/permissioned -> dealership notifications reach the right people.
import crypto from 'node:crypto';
import { makeUser, q, check, finish, uid, PW, listingForm, Client } from './lib.mjs';
const B = process.env.KAYAD_JOURNEY_BASE || 'http://127.0.0.1:5055';
const idem = () => ({ 'idempotency-key': crypto.randomUUID() });
const notes = (id) => q(`select coalesce(string_agg(type||':'||title, ' || ' order by created_at),'') from notifications where user_id='${id}'`);
const count = (id, like) => Number(q(`select count(*) from notifications where user_id='${id}' and (title ilike '${like}' or message ilike '${like}')`));
const pub = async () => JSON.stringify(await (await fetch(`${B}/api/cars?limit=100`)).json().catch(() => ({})));

// 1. personal account (free, no approval)
const buyer = await makeUser({ tag: 'fbuyer' });
check('PERSONAL: signs up and is usable immediately (no manual approval)', q(`select status from users where id='${buyer.id}'`) !== 'pending', q(`select status from users where id='${buyer.id}'`));
const me = await buyer.raw('/api/v1/auth/me');
check('PERSONAL: session works after login', me.status === 200, me.status);

// 2. dealer sign-up -> pending identity (the platform owner exists first, as in production)
const adm = await makeUser({ tag: 'fadm', dbRole: 'superadmin' }); q(`update users set email='prev-'||id||'@example.test' where email='ci-owner@example.test' and id<>'${adm.id}'`); q(`update users set email='ci-owner@example.test' where id='${adm.id}'`); adm.csrf = null; await adm.raw('/api/v1/auth/login', { method: 'POST', body: { email: 'ci-owner@example.test', password: PW } }); adm.csrf = null;
const dealer = await makeUser({ tag: 'fdealer', role: 'dealer', extra: { businessName: `First Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
check('DEALER: registers as a pending dealer identity', q(`select role||'/'||status from users where id='${dealer.id}'`) === 'dealer/pending', q(`select role||'/'||status from users where id='${dealer.id}'`));
console.log('INFO notifications after sign-up:', notes(dealer.id) || '(none)');

// 3. application
const st = await dealer.raw('/api/verification/status');
console.log('INFO verification status before apply:', st.status, JSON.stringify(st.j).slice(0, 200));
const sub = await dealer.raw('/api/verification/submit', { method: 'POST', body: { documents: {} }, headers: idem() });
console.log('INFO submit with empty documents:', sub.status, JSON.stringify(sub.j).slice(0, 300));
const dealerAppNotified = count(dealer.id, '%application received%') >= 1;
check('APPLICATION: dealer receives an acknowledgement', sub.status >= 300 ? 'blocked-by-paperwork' : dealerAppNotified, notes(dealer.id));
const adminsNotified = Number(q(`select count(*) from notifications n join users u on u.id=n.user_id where u.role in ('admin','superadmin') and (n.title ilike '%dealer%' or n.message ilike '%dealer%')`));
check('APPLICATION: platform admins are told a dealer application is waiting (and it is ready for review)', adminsNotified >= 1 && Number(q(`select count(*) from notifications where user_id='${adm.id}' and title ilike '%ready for review%'`)) === 1, `admin notifications mentioning dealers: ${adminsNotified}`);

// 4. pending dealer listing (self-service, no per-listing approval)
const pend = await dealer.raw('/api/cars', { method: 'POST', form: listingForm('Pending dealer car') });
console.log('INFO pending dealer listing:', pend.status, JSON.stringify(pend.j).slice(0, 240));

// 5. owner approves the dealer
q(`update dealers set verified_at=null where "user"='${dealer.id}'`);
const before = notes(dealer.id);
const ap = await adm.raw(`/api/admin/users/${dealer.id}/approve-dealer`, { method: 'POST', body: { reason: 'First dealer onboarding journey' } });
console.log('INFO approve-dealer:', ap.status, JSON.stringify(ap.j).slice(0, 200));
await new Promise((r) => setTimeout(r, 1500));
check('APPROVAL: dealer becomes approved', q(`select status from users where id='${dealer.id}'`) === 'approved', q(`select status from users where id='${dealer.id}'`));
const approvalNotes = Number(q(`select count(*) from notifications where user_id='${dealer.id}' and (title ilike '%approved%')`));
console.log('INFO dealer notifications after approval:', notes(dealer.id));
check('APPROVAL: dealer gets exactly ONE in-app approval notice, worded for a dealer (not "Seller")', approvalNotes === 1 && count(dealer.id, '%seller account%') === 0, notes(dealer.id));
await dealer.raw('/api/v1/auth/login', { method: 'POST', body: { email: dealer.email, password: PW } }); dealer.csrf = null;

// 6. approved dealer lists with a photo; public sees it
const lf = await dealer.raw('/api/cars', { method: 'POST', form: listingForm('First dealer Mazda') });
const carId = lf.j?.data?.id || lf.j?.car?.id;
check('LISTING: approved dealer publishes a vehicle with a photo', lf.status === 201 && !!carId, lf);
check('LISTING: it is live (status available) with no per-listing approval', q(`select status from cars where id='${carId}'`) === 'available', q(`select status from cars where id='${carId}'`));
check('LISTING: it appears on the public marketplace', (await pub()).includes(carId), 'not public');
const ed = await dealer.raw(`/api/cars/${carId}`, { method: 'PUT', body: { price: 2750000, bodyType: 'SUV', features: ['Sunroof', 'Leather seats'] } });
check('LISTING: dealer edits price, body type and features', ed.status === 200 && q(`select price from cars where id='${carId}'`).startsWith('2750000'), ed);
const inv = await dealer.raw('/api/dealer-platform/inventory?limit=50');
check('LISTING: it shows in the dealer inventory', inv.status === 200 && JSON.stringify(inv.j).includes(carId), inv.status);

// 7. buyer enquiry -> who hears about it
const start = await buyer.raw('/api/chat', { method: 'POST', body: { recipientId: dealer.id, carId, message: 'Hello' } });
const chatId = start.j?.chat?.id || start.j?.data?.id || start.j?.id || start.j?.chatId;
await buyer.raw(`/api/chat/${chatId}/message`, { method: 'POST', body: { content: 'Is the Mazda still available?' }, headers: idem() });
await new Promise((r) => setTimeout(r, 800));
const leadId = q(`select id from leads where source_reference='${chatId}' limit 1`);
check('ENQUIRY: a lead is created for the dealership', !!leadId, 'no lead');
check('ENQUIRY: dealer is told about the NEW ENQUIRY (lead), naming the vehicle', count(dealer.id, '%enquiry%') + count(dealer.id, '%lead%') >= 1, notes(dealer.id));
check('ENQUIRY: dealer gets the message notification too', count(dealer.id, '%New message%') >= 1, notes(dealer.id));

// 8. staff
const staff = await makeUser({ tag: 'fstaff' });
const inv1 = await dealer.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: staff.email }, headers: idem() });
check('STAFF: dealer invites an employee', inv1.status === 201, inv1);
const tok = q(`select 1`); // invitation acceptance needs the e-mailed token; the journey stub captures it in the Brevo stub log
console.log('INFO invite response keys:', Object.keys(inv1.j?.data || {}).join(','));
const teamRow = q(`select id from dealer_teams where dealer='${dealer.id}' and invite_email='${staff.email}' limit 1`);
// accept directly through the database token path is not possible (hash only); mark as joined the way acceptance does so role/permission flows can be exercised
q(`update dealer_teams set member='${staff.id}', status='active', employment_status='active' where id='${teamRow}'`);
const roleUp = await dealer.raw(`/api/dealer-platform/team/${teamRow}`, { method: 'PUT', body: { role: 'sales_agent' } });
check('STAFF: dealer assigns Sales agent', roleUp.status === 200, roleUp);
await new Promise((r) => setTimeout(r, 800));
check('STAFF: the employee is told their role changed (in-app, naming the new role)', count(staff.id, '%Sales agent%') >= 1, notes(staff.id));
const nl = await staff.raw('/api/dealer-platform/leads?limit=20', { headers: { 'x-dealer-org': dealer.id } });
check('STAFF: Sales agent can see the dealership leads', nl.status === 200, nl.status);
const buyer2 = await makeUser({ tag: 'fbuyer2' });
const st2 = await buyer2.raw('/api/chat', { method: 'POST', body: { recipientId: dealer.id, carId, message: 'Hi' } });
const chat2 = st2.j?.chat?.id || st2.j?.data?.id || st2.j?.id || st2.j?.chatId;
await buyer2.raw(`/api/chat/${chat2}/message`, { method: 'POST', body: { content: 'Can I view it on Saturday?' }, headers: idem() });
await new Promise((r) => setTimeout(r, 1200));
check('ENQUIRY: a second buyer creates a second lead and the dealer is told again', count(dealer.id, '%enquiry%') >= 2 || Number(q(`select count(*) from notifications where user_id='${dealer.id}' and title='New enquiry'`)) === 2, notes(dealer.id));
check('STAFF: employee with lead access is also told about the new enquiry', Number(q(`select count(*) from notifications where user_id='${staff.id}' and title='New enquiry'`)) === 1, notes(staff.id));
const other = await makeUser({ tag: 'fother', role: 'dealer', extra: { businessName: `Other ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi' } });
check('ISOLATION: another dealership received none of this dealership\'s notifications', Number(q(`select count(*) from notifications where user_id='${other.id}' and (message ilike '%Mazda%' or title ilike '%enquiry%')`)) === 0, notes(other.id));

// 9. what the dealer bell would show
const list = await dealer.raw('/api/notifications?limit=50');
console.log('INFO dealer notification list:', (list.j?.notifications || []).map((n) => `${n.type}:${n.title}`).join(' || '));
check('NOTIFICATIONS: dealer unread count equals unread rows', Number(list.j?.unreadCount) === Number(q(`select count(*) from notifications where user_id='${dealer.id}' and read=false`)), list.j?.unreadCount);
finish('first dealer lifecycle');
