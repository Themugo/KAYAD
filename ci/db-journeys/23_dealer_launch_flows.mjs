// Dealer launch flows over real HTTP against the disposable database: buyer enquiry -> lead on the right dealership -> dealer / staff
// reply on the lead -> cross-dealership isolation -> vehicle-specific request to KAYARD admin (support case) -> RBAC.
import crypto from 'node:crypto';
import { makeUser, q, check, finish, uid, PW } from './lib.mjs';

const mkDealer = async (tag) => { const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `Launch ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } }); q(`update users set status='approved' where id='${d.id}'`); q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`); return d; };
const car = (d, title) => q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold,images) values ('${title}','Mazda','CX-5',2019,3000000,'available','${d.id}',false,'[]'::jsonb) returning id`).split('\n')[0];
const join = async (owner, roleKey, tag) => { const u = await makeUser({ tag }); const inv = await owner.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: u.email, role: roleKey } }); if (inv.status >= 300) throw new Error(`invite ${roleKey} ${inv.status}`); const tok = crypto.randomBytes(32).toString('hex'); q(`update dealer_teams set invite_token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}' where invite_email='${u.email}'`); const ac = await u.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } }); if (ac.status >= 300) throw new Error(`accept ${roleKey} ${ac.status}`); return u; };
const idem = () => ({ 'idempotency-key': crypto.randomUUID() });

const A = await mkDealer('la'), Bd = await mkDealer('lb');
const buyer = await makeUser({ tag: 'lbuyer' });
const carA = car(A, 'Launch A Mazda'), carB = car(Bd, 'Launch B Mazda');

// 1. buyer enquiry creates a chat and a lead on the dealership that owns the vehicle
const start = await buyer.raw('/api/chat', { method: 'POST', body: { recipientId: A.id, carId: carA, message: 'Hello' } });
const chatId = start.j?.chat?.id || start.j?.data?.id || start.j?.id || start.j?.chatId;
check('buyer enquiry starts a chat', start.status < 300 && !!chatId, start);
const first = await buyer.raw(`/api/chat/${chatId}/message`, { method: 'POST', body: { content: 'Is the Mazda still available?' }, headers: idem() });
check('buyer first message sent', first.status === 201, first);
const leadRow = q(`select id||'|'||dealer||'|'||buyer||'|'||vehicle||'|'||source from leads where source_reference='${chatId}' limit 1`);
const leadId = leadRow.split('|')[0];
check('lead created for the owning dealership with buyer, vehicle and source chat', leadRow === `${leadId}|${A.id}|${buyer.id}|${carA}|chat`, leadRow);
check('one conversation = exactly one lead (no duplicate lead per message)', Number(q(`select count(*) from leads where source_reference='${chatId}'`)) === 1, q(`select count(*) from leads where source_reference='${chatId}'`));
const list = await A.raw('/api/dealer-platform/leads?limit=50');
const row = (list.j?.data?.items || []).find((l) => l.id === leadId);
check('Leads list names the buyer and the vehicle (not just ids)', row?.buyer?.name === 'Journey lbuyer' && row?.vehicle?.title === 'Launch A Mazda', JSON.stringify({ b: row?.buyer, v: row?.vehicle }));
check('dealer sees the enquiry in Leads', list.status === 200 && JSON.stringify(list.j).includes(leadId), list.status);
const listB = await Bd.raw('/api/dealer-platform/leads?limit=50');
check('other dealership does NOT see it', listB.status === 200 && !JSON.stringify(listB.j).includes(leadId), listB.status);

// 2. dealer reply on the lead
const r1 = await A.raw(`/api/dealer-platform/leads/${leadId}/messages`, { method: 'POST', body: { content: 'Yes, it is available. Viewing tomorrow?' }, headers: idem() });
check('dealer replies from the lead', r1.status === 201, r1);
const thread = await A.raw(`/api/dealer-platform/leads/${leadId}/messages`);
check('dealer reads the conversation', thread.status === 200 && JSON.stringify(thread.j).includes('Viewing tomorrow'), thread.status);
const bt = await buyer.raw(`/api/chat/${chatId}/messages`);
check('buyer sees the dealer reply', bt.status === 200 && JSON.stringify(bt.j).includes('Viewing tomorrow'), bt.status);
check('lead moved to contacted by the dealer reply', q(`select stage from leads where id='${leadId}'`) === 'contacted', q(`select stage from leads where id='${leadId}'`));
check('buyer was notified of the reply', Number(q(`select count(*) from notifications where user_id='${buyer.id}' and type='chat'`)) >= 1, 'no chat notification');
const noKey = await A.raw(`/api/dealer-platform/leads/${leadId}/messages`, { method: 'POST', body: { content: 'x y z' } });
check('reply without an idempotency key is rejected', noKey.status === 400, noKey.status);
const k = crypto.randomUUID(); const d1 = await A.raw(`/api/dealer-platform/leads/${leadId}/messages`, { method: 'POST', body: { content: 'Duplicate guard' }, headers: { 'idempotency-key': k } }); const d2 = await A.raw(`/api/dealer-platform/leads/${leadId}/messages`, { method: 'POST', body: { content: 'Duplicate guard' }, headers: { 'idempotency-key': k } });
check('a retried reply is not stored twice', d1.status === 201 && d2.status === 200 && Number(q(`select count(*) from jsonb_array_elements((select messages from chats where id='${chatId}')) m where m->>'text'='Duplicate guard'`)) === 1, [d1.status, d2.status]);

check('still exactly one lead after several messages from both sides', Number(q(`select count(*) from leads where source_reference='${chatId}'`)) === 1, q(`select count(*) from leads where source_reference='${chatId}'`));

// 3. isolation
const x1 = await Bd.raw(`/api/dealer-platform/leads/${leadId}/messages`, { method: 'POST', body: { content: 'I am another dealer' }, headers: idem() });
const x2 = await Bd.raw(`/api/dealer-platform/leads/${leadId}/messages`);
check('another dealership cannot reply to or read the lead conversation', x1.status === 404 && x2.status === 404, [x1.status, x2.status]);
const x3 = await buyer.raw(`/api/dealer-platform/leads/${leadId}/messages`);
check('a buyer cannot use the dealer endpoint', x3.status >= 400, x3.status);
const anon = await fetch(`${process.env.KAYAD_JOURNEY_BASE || 'http://127.0.0.1:5055'}/api/dealer-platform/leads/${leadId}/messages`);
check('anonymous is rejected', anon.status === 401, anon.status);

// 4. staff: Sales agent (canChatBuyers) can reply; Basic Staff Access and Viewer cannot
const sales = await join(A, 'sales_agent', 'lsales');
const basic = await join(A, 'basic_staff', 'lbasic').catch(() => null);
const viewer = await join(A, 'viewer', 'lviewer');
const fin = await join(A, 'finance_officer', 'lfin');
const s1 = await sales.raw(`/api/dealer-platform/leads/${leadId}/messages`, { method: 'POST', body: { content: 'Staff reply from sales' }, headers: { ...idem() } });
check('sales agent replies on behalf of the dealership', s1.status === 201, s1);
check('staff reply is stored as the dealership sender', q(`select count(*) from jsonb_array_elements((select messages from chats where id='${chatId}')) m where m->>'text'='Staff reply from sales' and m->>'sender'='${A.id}'`) === '1', 'sender mismatch');
check('staff reply audited with the acting member', Number(q(`select count(*) from audit_logs where action='dealer_lead_reply_sent' and actor_id::text='${sales.id}'`)) >= 1, 'no audit row');
const v1 = await viewer.raw(`/api/dealer-platform/leads/${leadId}/messages`, { method: 'POST', body: { content: 'viewer reply' }, headers: idem() });
check('viewer cannot reply', v1.status === 403, v1.status);
if (basic) { const b1 = await basic.raw(`/api/dealer-platform/leads/${leadId}/messages`, { method: 'POST', body: { content: 'basic reply' }, headers: idem() }); check('Basic Staff Access cannot reply', b1.status === 403, b1.status); }

// 5. vehicle-specific request to admin
const vr = await A.raw('/api/dealer-platform/vehicle-requests', { method: 'POST', body: { vehicleId: carA, type: 'feature', title: 'Add 360 camera feature tag', details: 'Please add the 360 degree camera feature to this vehicle listing.' } });
check('dealer submits a vehicle-specific request', vr.status === 201 && !!vr.j?.data?.request?.id, vr);
const caseId = vr.j?.data?.request?.id;
check('request is a support case linked to the vehicle and the dealership', q(`select category||'|'||user_id||'|'||coalesce(related_car::text,'') from support_tickets where id='${caseId}'`) === `seller|${A.id}|${carA}`, q(`select category||'|'||user_id||'|'||coalesce(related_car::text,'') from support_tickets where id='${caseId}'`));
const vl = await A.raw('/api/dealer-platform/vehicle-requests');
check('dealer sees the request and its status', vl.status === 200 && (vl.j?.data?.items || []).some((i) => i.id === caseId && i.status === 'open'), vl.status);
check('request does not change the listing', q(`select status from cars where id='${carA}'`) === 'available', 'listing changed');
const vo = await A.raw('/api/dealer-platform/vehicle-requests', { method: 'POST', body: { vehicleId: carB, title: 'Steal', details: 'This is not my vehicle at all.' } });
check("a dealer cannot raise a request on another dealership's vehicle", vo.status === 404, vo.status);
const vb = await Bd.raw('/api/dealer-platform/vehicle-requests');
check("other dealership cannot see this dealership's requests", vb.status === 200 && !(vb.j?.data?.items || []).some((i) => i.id === caseId), vb.status);
const bad = await A.raw('/api/dealer-platform/vehicle-requests', { method: 'POST', body: { vehicleId: carA, title: 'x', details: 'short' } });
check('invalid request is rejected with a clear message', bad.status === 400, bad.status);
const sv = await sales.raw('/api/dealer-platform/vehicle-requests', { method: 'POST', body: { vehicleId: carA, title: 'Staff request', details: 'Raised by a sales agent for this vehicle.' } });
check('sales agent (can edit vehicles) may raise a request for the dealership', sv.status === 201 && q(`select user_id from support_tickets where id='${sv.j?.data?.request?.id}'`) === A.id, sv.status);
const fv = await fin.raw('/api/dealer-platform/vehicle-requests', { method: 'POST', body: { vehicleId: carA, title: 'Fin request', details: 'Finance officer has no vehicle permission.' } });
check('finance officer without vehicle permission cannot raise a request', fv.status === 403, fv.status);
const vv = await viewer.raw('/api/dealer-platform/vehicle-requests');
check('viewer cannot read vehicle requests', vv.status === 403, vv.status);

// 6. publication visibility and post-publication admin moderation (per-listing pre-approval is retired by owner policy)
const pubList = async () => JSON.stringify((await (await fetch(`${process.env.KAYAD_JOURNEY_BASE || 'http://127.0.0.1:5055'}/api/cars?limit=100`)).json().catch(() => ({}))));
check('published vehicle is publicly visible', (await pubList()).includes(carA), 'not listed');
const adm = await makeUser({ tag: 'ladm', dbRole: 'superadmin' }); q(`update users set email='ci-owner@example.test' where id='${adm.id}'`); adm.csrf = null; await adm.raw('/api/v1/auth/login', { method: 'POST', body: { email: 'ci-owner@example.test', password: PW } }); adm.csrf = null; // the platform owner configured for the disposable stack (WEBHOIST_EMAIL)
const mod = await adm.raw(`/api/admin/cars/${carA}/moderate`, { method: 'POST', body: { action: 'hide', adminNote: 'Photos do not match the description' } });
check('admin can hide a listing with a note', mod.status === 200 && q(`select status from cars where id='${carA}'`) === 'hidden', mod);
check('hidden listing is no longer public', !(await pubList()).includes(carA), 'still listed');
check('dealer is notified with the reason', Number(q(`select count(*) from notifications where user_id='${A.id}' and message like '%Photos do not match%'`)) >= 1, 'no notification');
const inv = await A.raw('/api/dealer-platform/inventory?limit=50');
check('dealer sees the listing as hidden', JSON.stringify(inv.j).includes(carA) && /hidden/.test(JSON.stringify((inv.j?.data?.items || inv.j?.data || []).find?.((c) => c.id === carA) || '')), inv.status);
const dm = await A.raw(`/api/admin/cars/${carA}/moderate`, { method: 'POST', body: { action: 'approve' } });
check('a dealer cannot moderate listings', [401, 403].includes(dm.status), dm.status);
const plainAdmin = await makeUser({ tag: 'lplainadm', dbRole: 'admin' });
const pa = await plainAdmin.raw(`/api/admin/cars/${carA}/moderate`, { method: 'POST', body: { action: 'approve' } });
check('an ordinary admin cannot moderate while listing decisions are owner-reserved', pa.status === 403 && pa.j?.code === 'DECISION_AUTHORITY_REQUIRED', pa);
const ap = await adm.raw(`/api/admin/cars/${carA}/moderate`, { method: 'POST', body: { action: 'approve' } });
check('admin can re-publish and it is public again', ap.status === 200 && (await pubList()).includes(carA), ap.status);
const vm = await A.raw('/api/admin/support', { method: 'GET' });
check('a dealer cannot use the staff support queue to manipulate requests', [401, 403, 404].includes(vm.status), vm.status);

finish('23_dealer_launch_flows');
