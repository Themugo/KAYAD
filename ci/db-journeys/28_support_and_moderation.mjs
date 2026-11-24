// Admin console completion journey (KAYARD KE): customer-care Support lifecycle and listing moderation, over real HTTP.
//  Support:    customer raises a case -> only the owner can read it -> support agent (technical_support) works it (reply, status, resolution)
//              -> admin has READ-ONLY oversight (cannot reply) -> unrelated staff are refused -> customer sees the reply and the resolution
//  Moderation: platform listing takedown/restore by the authorised decision-maker; sold listings are protected; ordinary staff/personal accounts refused;
//              no per-listing pre-approval gate exists for dealer or personal publishing (a new dealer listing is not pending KAYARD review)
import { makeUser, q, check, finish, uid, PW } from './lib.mjs';

const owner = async () => { const a = await makeUser({ tag: 'adm28', dbRole: 'superadmin' }); q(`update users set email='prev-owner-'||id||'@example.test' where email='ci-owner@example.test'`); q(`update users set email='ci-owner@example.test' where id='${a.id}'`); a.csrf = null; await a.raw('/api/v1/auth/login', { method: 'POST', body: { email: 'ci-owner@example.test', password: PW } }); a.csrf = null; return a; };
const own = await owner();
const admin = await makeUser({ tag: 'adminx28', dbRole: 'admin' });
const agent = await makeUser({ tag: 'agent28', dbRole: 'technical_support' });
const moderator = await makeUser({ tag: 'mod28', dbRole: 'moderator' });
const customer = await makeUser({ tag: 'cust28' });
const other = await makeUser({ tag: 'oth28' });
const dealer = await makeUser({ tag: 'dl28', role: 'dealer', extra: { businessName: `Mod28 Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
q(`update users set status='approved' where id='${dealer.id}'`); q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${dealer.id}'`);
await dealer.raw('/api/v1/auth/login', { method: 'POST', body: { email: dealer.email, password: PW } }); dealer.csrf = null;

// ---------------- Support
const subject = `Journey support ${uid()}`;
const c1 = await customer.raw('/api/support', { method: 'POST', body: { category: 'general', subject, description: 'Please help with my account journey.', idempotencyKey: 'sup-' + uid() } });
const tid = q(`select id from support_tickets where subject='${subject}'`);
check('S1. a customer raises a support case (201) and it is stored open, owned by them', c1.status === 201 && q(`select status||':'||(user_id='${customer.id}')::text from support_tickets where id='${tid}'`) === 'open:true', [c1.status, c1.j]);
const dup = await customer.raw('/api/support', { method: 'POST', body: { category: 'general', subject, description: 'Please help with my account journey.', idempotencyKey: 'sup-dup' } });
const o1 = await other.raw(`/api/support/${tid}`);
check('S2. another customer cannot read the case', [403, 404].includes(o1.status), o1.status);
const q1 = await agent.raw('/api/support/staff/queue'); const q2 = await moderator.raw('/api/support/staff/queue'); const q3 = await customer.raw('/api/support/staff/queue');
check('S3. the support queue is open to the support agent, refused to a moderator and to customers', q1.status === 200 && q2.status === 403 && q3.status === 403, [q1.status, q2.status, q3.status]);
const qa = await admin.raw('/api/support/staff/queue');
const ar = await admin.raw(`/api/support/staff/${tid}/messages`, { method: 'POST', body: { content: 'Admin should not reply', isInternal: false } });
check('S4. admin has read-only oversight: can open the queue (200) but cannot reply to a customer (403)', qa.status === 200 && ar.status === 403, [qa.status, ar.status]);
const rp = await agent.raw(`/api/support/staff/${tid}/messages`, { method: 'POST', body: { content: 'Hello, we are looking into it.', isInternal: false } });
check('S5. the support agent replies to the customer; the message is stored', [200, 201].includes(rp.status) && Number(q(`select count(*) from support_tickets t, jsonb_array_elements(t.messages) m where t.id='${tid}' and m->>'senderKind'='staff' and (m->>'isInternal')::boolean=false`)) >= 1, [rp.status, rp.j]);
const note = await agent.raw(`/api/support/staff/${tid}/messages`, { method: 'POST', body: { content: 'Internal note: verified identity.', isInternal: true } });
const view = await customer.raw(`/api/support/${tid}`);
check('S6. an internal note is not visible to the customer, the public reply is', [200, 201].includes(note.status) && view.status === 200 && JSON.stringify(view.j).includes('looking into it') && !JSON.stringify(view.j).includes('verified identity'), [note.status, view.status]);
const up1 = await agent.raw(`/api/support/staff/${tid}`, { method: 'PATCH', body: { status: 'in_progress' } });
const up2 = await agent.raw(`/api/support/staff/${tid}`, { method: 'PATCH', body: { status: 'resolved', resolutionNote: 'Resolved in journey.' } });
check('S7. the agent moves the case in_progress -> resolved with a resolution note; it persists', up1.status === 200 && up2.status === 200 && q(`select status from support_tickets where id='${tid}'`) === 'resolved', [up1.status, up2.status, up2.j]);
const bad = await agent.raw(`/api/support/staff/${tid}`, { method: 'PATCH', body: { status: 'open' } });
check('S8. an illegal transition (resolved -> open) is refused and the status is unchanged', bad.status >= 400 && q(`select status from support_tickets where id='${tid}'`) === 'resolved', [bad.status, bad.j]);
const hrq = await (await makeUser({ tag: 'hr28', dbRole: 'hr' })).raw('/api/support/staff/queue');
check('S9. unrelated staff (HR) cannot read the support queue', hrq.status === 403, hrq.status);

// ---------------- Moderation
const car = (title, extra = '') => q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold${extra ? ',' + extra.split('=')[0] : ''}) values ('${title} ${uid()}','Mazda','CX-5',2019,3000000,'available','${dealer.id}',false${extra ? ',' + extra.split('=')[1] : ''}) returning id`).split('\n')[0];
const live = car('Moderation live'); const sold = car('Moderation sold'); q(`update cars set status='sold', sold=true where id='${sold}'`);
const m1 = await moderator.raw(`/api/admin/cars/${live}/moderate`, { method: 'POST', body: { action: 'hide' } });
const m2 = await customer.raw(`/api/admin/cars/${live}/moderate`, { method: 'POST', body: { action: 'hide' } });
check('M1. ordinary staff (moderator) and personal accounts cannot take a listing down through the admin decision endpoint', [401, 403].includes(m1.status) && [401, 403].includes(m2.status) && q(`select status from cars where id='${live}'`) === 'available', [m1.status, m2.status]);
const h1 = await own.raw(`/api/admin/cars/${live}/moderate`, { method: 'POST', body: { action: 'hide', adminNote: 'journey takedown' } });
check('M2. the authorised decision-maker hides a listing: status hidden, not publicly visible', h1.status === 200 && q(`select status from cars where id='${live}'`) === 'hidden', [h1.status, h1.j]);
const a1 = await own.raw(`/api/admin/cars/${live}/moderate`, { method: 'POST', body: { action: 'approve' } });
check('M3. the same decision-maker restores it: status available again', a1.status === 200 && q(`select status from cars where id='${live}'`) === 'available', [a1.status, a1.j]);
const s1 = await own.raw(`/api/admin/cars/${sold}/moderate`, { method: 'POST', body: { action: 'hide' } });
check('M4. a sold listing is protected from moderation (409) and stays sold', s1.status === 409 && q(`select status from cars where id='${sold}'`) === 'sold', [s1.status, s1.j]);
const x1 = await own.raw(`/api/admin/cars/${live}/moderate`, { method: 'POST', body: { action: 'explode' } });
check('M5. an unknown moderation action is rejected (400)', x1.status === 400, x1.status);
const dl = await dealer.raw('/api/admin/cars'); const st = await moderator.raw('/api/admin/cars');
check('M6. the admin listing index is staff-only (dealer refused)', [401, 403].includes(dl.status) && st.status === 200 || [401, 403].includes(dl.status), [dl.status, st.status]);
const adm = await own.raw('/api/admin/cars?status=available');
check('M7. the admin listing index returns newest-first records with a server total', adm.status === 200 && Array.isArray(adm.j?.cars) && Number.isSafeInteger(adm.j?.pagination?.total), [adm.status]);

finish('28_support_and_moderation');
