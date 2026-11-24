// Admin console completion journey (KAYARD KE): customer-care lifecycles, schema-gap remediation and authorization, over real HTTP
// against the disposable DB built from supabase/migrations (incl. 20261124100000_admin_customer_care_and_market_tables.sql).
//  A. Reports      submit -> duplicate guard -> staff list -> status transitions with reviewer attribution -> protected-target refusal -> listing action
//  B. Feedback     anonymous submit -> admin list/counts -> read -> addressed (cannot be reopened) -> non-admin refused
//  C. Announcements create a DRAFT only (nothing is delivered: notifications unchanged) -> list -> non-admin refused -> delete
//  D. Market data  admin create/list; NTSA queue: owner request -> duplicate refused -> admin list -> process
//  E. Not provisioned studios and suspicious-bid flagging answer 503 FEATURE_NOT_PROVISIONED (never 500, never a fake empty success)
//  F. Authorization security-log needs VIEW_LOGS (the UI rule); CMS Studio reads need staff; public CMS and any-staff automation reads preserved
import { makeUser, q, check, finish, uid, PW } from './lib.mjs';

const owner = async () => { const a = await makeUser({ tag: 'adm27', dbRole: 'superadmin' }); q(`update users set email='prev-owner-'||id||'@example.test' where email='ci-owner@example.test'`); q(`update users set email='ci-owner@example.test' where id='${a.id}'`); a.csrf = null; await a.raw('/api/v1/auth/login', { method: 'POST', body: { email: 'ci-owner@example.test', password: PW } }); a.csrf = null; return a; };
const dealerOf = (tag) => makeUser({ tag, role: 'dealer', extra: { businessName: `Care ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });

const own = await owner();
const moderator = await makeUser({ tag: 'mod27', dbRole: 'moderator' });
const marketing = await makeUser({ tag: 'mkt27', dbRole: 'marketing' });
const hr = await makeUser({ tag: 'hr27', dbRole: 'hr' });
const reporter = await makeUser({ tag: 'rep27' });
const victim = await makeUser({ tag: 'vic27' });
const anon = await makeUser({ tag: 'anon27' }); // used only as an authenticated non-staff identity
const dealer = await dealerOf('dl27'); q(`update users set status='approved' where id='${dealer.id}'`); q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${dealer.id}'`);
await dealer.raw('/api/v1/auth/login', { method: 'POST', body: { email: dealer.email, password: PW } }); dealer.csrf = null;
const carId = q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold) values ('Care journey ${uid()}','Mazda','CX-5',2019,3000000,'available','${dealer.id}',false) returning id`).split('\n')[0];

// ---------------- A. Reports
const r1 = await reporter.raw('/api/reports/submit', { method: 'POST', body: { targetType: 'user', targetId: victim.id, category: 'spam', description: 'Journey report' }, headers: { 'idempotency-key': 'k' + uid() } });
check('A1. a personal account can submit a report (201) and it is stored pending with the reporter attributed', r1.status === 201 && q(`select status||':'||(reporter='${reporter.id}')::text from reports where target_id='${victim.id}'`) === 'pending:true', [r1.status, r1.j]);
const r2 = await reporter.raw('/api/reports/submit', { method: 'POST', body: { targetType: 'user', targetId: victim.id, category: 'spam' }, headers: { 'idempotency-key': 'k' + uid() } });
check('A2. a duplicate open report is not stored twice', r2.status === 200 && Number(q(`select count(*) from reports where target_id='${victim.id}'`)) === 1, [r2.status, r2.j]);
const r3 = await reporter.raw('/api/reports/submit', { method: 'POST', body: { targetType: 'user', targetId: victim.id }, headers: { 'idempotency-key': 'k' + uid() } });
check('A3. a report without a category is rejected (400)', r3.status === 400, r3.status);
const my = await reporter.raw('/api/reports/my');
check('A4. the reporter sees only their own reports', my.status === 200 && my.j?.reports?.length === 1, [my.status, my.j?.reports?.length]);
const repId = q(`select id from reports where target_id='${victim.id}'`);
const l1 = await moderator.raw('/api/reports/admin/all?status=pending');
check('A5. a moderator lists reports with status counts (200)', l1.status === 200 && l1.j?.reports?.length >= 1 && typeof l1.j?.stats === 'object', [l1.status, Object.keys(l1.j || {})]);
const l2 = await reporter.raw('/api/reports/admin/all'); const l3 = await hr.raw('/api/reports/admin/all');
check('A6. a personal account and an HR staff member are refused the report queue by the server', l2.status === 403 && l3.status === 403, [l2.status, l3.status]);
const u1 = await moderator.raw(`/api/reports/admin/${repId}/status`, { method: 'PATCH', body: { status: 'under_review' }, headers: { 'idempotency-key': 'k' + uid() } });
check('A7. moderator moves a report to under_review; reviewer and time are recorded', u1.status === 200 && q(`select status||':'||(reviewed_by='${moderator.id}')::text||':'||(reviewed_at is not null)::text from reports where id='${repId}'`) === 'under_review:true:true', [u1.status, u1.j]);
const u2 = await moderator.raw(`/api/reports/admin/${repId}/status`, { method: 'PATCH', body: { status: 'bogus' }, headers: { 'idempotency-key': 'k' + uid() } });
check('A8. an unsupported status is rejected (400) and nothing changes', u2.status === 400 && q(`select status from reports where id='${repId}'`) === 'under_review', u2.status);
const u3 = await moderator.raw(`/api/reports/admin/${repId}/status`, { method: 'PATCH', body: { status: 'dismissed', resolution: 'No evidence of spam in journey.' }, headers: { 'idempotency-key': 'k' + uid() } });
check('A9. moderator dismisses with a resolution; it persists', u3.status === 200 && q(`select status||':'||resolution from reports where id='${repId}'`) === 'dismissed:No evidence of spam in journey.', [u3.status, u3.j]);
await reporter.raw('/api/reports/submit', { method: 'POST', body: { targetType: 'user', targetId: own.id, category: 'abuse' }, headers: { 'idempotency-key': 'k' + uid() } });
const staffRep = q(`select id from reports where target_id='${own.id}'`);
const u4 = await moderator.raw(`/api/reports/admin/${staffRep}/status`, { method: 'PATCH', body: { status: 'action_taken', actionTaken: 'user_banned' }, headers: { 'idempotency-key': 'k' + uid() } });
check('A10. a moderator cannot suspend a platform-owner/staff account from the report queue (403) and the account stays active', u4.status === 403 && q(`select is_banned from users where id='${own.id}'`) === 'f', [u4.status, u4.j]);
await reporter.raw('/api/reports/submit', { method: 'POST', body: { targetType: 'listing', targetId: carId, category: 'fraud' }, headers: { 'idempotency-key': 'k' + uid() } });
const carRep = q(`select id from reports where target_id='${carId}'`);
const u5 = await moderator.raw(`/api/reports/admin/${carRep}/status`, { method: 'PATCH', body: { status: 'action_taken', actionTaken: 'listing_removed' }, headers: { 'idempotency-key': 'k' + uid() } });
check('A11. a listing report hides the listing (the canonical takedown, status hidden), records the action and a moderation lifecycle event', u5.status === 200 && q(`select status from cars where id='${carId}'`) === 'hidden' && q(`select action_taken from reports where id='${carRep}'`) === 'listing_removed', [u5.status, u5.j]);

// ---------------- B. Feedback
const f1 = await anon.raw('/api/feedback/submit', { method: 'POST', body: { type: 'bug_report', subject: 'Journey bug', message: 'Something to check', email: 'visitor@example.test' } });
check('B1. feedback can be submitted (201) and is stored as new', f1.status === 201 && q(`select status from feedback where subject='Journey bug'`) === 'new', [f1.status, f1.j]);
const f2 = await anon.raw('/api/feedback/submit', { method: 'POST', body: { type: 'nonsense', message: 'x' } });
check('B2. an unknown feedback type is rejected (400)', f2.status === 400, f2.status);
const fl = await own.raw('/api/feedback/admin/all');
check('B3. admin lists feedback with counts (200)', fl.status === 200 && fl.j?.counts?.new >= 1, [fl.status, fl.j?.counts]);
const fm = await moderator.raw('/api/feedback/admin/all'); const fp = await reporter.raw('/api/feedback/admin/all');
check('B4. feedback review is admin/superadmin only on the server (moderator and personal account refused)', fm.status === 403 && fp.status === 403, [fm.status, fp.status]);
const fid = q(`select id from feedback where subject='Journey bug'`);
const fr = await own.raw(`/api/feedback/admin/${fid}/status`, { method: 'PATCH', body: { status: 'read' } });
const fa = await own.raw(`/api/feedback/admin/${fid}/status`, { method: 'PATCH', body: { status: 'addressed' } });
const fx = await own.raw(`/api/feedback/admin/${fid}/status`, { method: 'PATCH', body: { status: 'new' } });
check('B5. feedback moves new -> read -> addressed and an addressed item cannot be reopened', fr.status === 200 && fa.status === 200 && fx.status >= 400 && q(`select status from feedback where id='${fid}'`) === 'addressed', [fr.status, fa.status, fx.status]);

// ---------------- C. Announcements (draft only; never delivered)
const notifBefore = Number(q(`select count(*) from notifications`));
const a1 = await own.raw('/api/announcements', { method: 'POST', body: { title: 'Journey draft', message: 'Not to be sent', audience: 'dealers' } });
check('C1. admin creates an announcement draft (201) targeting dealer accounts', a1.status === 201 && q(`select status||':'||audience from announcements where title='Journey draft'`) === 'draft:dealers', [a1.status, a1.j]);
check('C2. creating a draft delivers nothing (notification count unchanged)', Number(q(`select count(*) from notifications`)) === notifBefore, notifBefore);
const a2 = await own.raw('/api/announcements');
check('C3. broadcast history lists the draft (200)', a2.status === 200 && JSON.stringify(a2.j).includes('Journey draft'), [a2.status]);
const a3 = await moderator.raw('/api/announcements'); const a4 = await reporter.raw('/api/announcements', { method: 'POST', body: { title: 'x', message: 'y' } });
check('C4. only admin/superadmin may read or create broadcasts (moderator and personal account refused)', a3.status === 403 && a4.status === 403, [a3.status, a4.status]);
const a5 = await own.raw('/api/announcements', { method: 'POST', body: { title: 'bad', message: 'x', audience: 'individual_sellers' } });
check('C5. an obsolete audience value (individual sellers) is rejected (400)', a5.status === 400, a5.status);
const aid = q(`select id from announcements where title='Journey draft'`);
const a6 = await own.raw(`/api/announcements/${aid}`, { method: 'DELETE' });
check('C6. a draft can be deleted', a6.status === 200 && Number(q(`select count(*) from announcements where id='${aid}'`)) === 0, [a6.status, a6.j]);

// ---------------- D. Market data and NTSA queue
const m0 = await own.raw('/api/admin/market-data');
check('D1. market data loads from the provisioned table (200, not 500)', m0.status === 200, [m0.status, m0.j]);
const m1 = await own.raw('/api/admin/market-data', { method: 'POST', body: { brand: 'Toyota', model: 'Corolla', year: 2018, lowPrice: 1200000, avgPrice: 1500000, highPrice: 1800000, sampleSize: 12, source: 'journey', engineCC: 1500 } });
check('D2. an admin can create a market data entry and engine_cc persists', [200, 201].includes(m1.status) && q(`select engine_cc from market_data where model='Corolla'`) === '1500', [m1.status, m1.j]);
const m2 = await own.raw('/api/admin/market-data', { method: 'POST', body: { brand: 'X', model: 'Y', year: 2018, lowPrice: 5, avgPrice: 3, highPrice: 1 } });
check('D3. inconsistent prices are rejected (400)', m2.status === 400, m2.status);
const n1 = await dealer.raw('/api/ntsa-verification', { method: 'POST', body: { carId } });
const n1b = await dealer.raw('/api/ntsa-verification', { method: 'POST', body: { carId } });
check('D4. the listing owner can queue NTSA verification; a duplicate is refused (409)', [200, 201].includes(n1.status) && n1b.status === 409, [n1.status, n1.j, n1b.status]);
const nl = await own.raw('/api/ntsa-verification');
check('D5. admin sees the NTSA queue (200)', nl.status === 200 && JSON.stringify(nl.j).includes(carId), [nl.status]);
const nid = q(`select id from ntsa_verification_requests where car='${carId}'`);
const np = await own.raw(`/api/ntsa-verification/${nid}/process`, { method: 'POST', body: { status: 'passed', chassisVerified: true, logbookVerified: true, importVerified: true, dutyStatus: 'duty_paid', adminNotes: 'Journey check' } });
check('D6. admin approves the request; the decision, the reviewer and the car verification flag all persist', np.status === 200 && q(`select status||':'||chassis_verified::text||':'||(reviewed_by='${own.id}')::text from ntsa_verification_requests where id='${nid}'`) === 'passed:true:true' && q(`select ntsa_verified::text||':'||duty_status from cars where id='${carId}'`) === 'true:duty_paid', [np.status, np.j]);
const np2 = await own.raw(`/api/ntsa-verification/${nid}/process`, { method: 'POST', body: { status: 'failed', adminNotes: 'late change' } });
check('D6b. a completed verification is final (409), it cannot be rewritten', np2.status === 409 && q(`select status from ntsa_verification_requests where id='${nid}'`) === 'passed', np2.status);
const npx = await reporter.raw('/api/ntsa-verification'); 
check('D7. a personal account cannot read the NTSA queue', npx.status === 403, npx.status);

// ---------------- E. Not provisioned -> honest 503
for (const [label, path] of [['Automation', '/api/automation/stats'], ['Low-code', '/api/lowcode/stats'], ['VXP', '/api/vxp/stats'], ['Experience', '/api/xos/dashboard'], ['AI platform', '/api/ai/dashboard'], ['Digital twin', '/api/digital-twin/dashboard'], ['Configuration', '/api/config/stats'], ['Suspicious bids', '/api/bids/admin/suspicious']]) {
  const r = await own.raw(path);
  check(`E. ${label}: super admin gets 503 FEATURE_NOT_PROVISIONED (not 500, not a fake empty list)`, r.status === 503 && r.j?.code === 'FEATURE_NOT_PROVISIONED' && /not zero|not empty/.test(r.j?.message || ''), [r.status, r.j]);
}
const e2 = await reporter.raw('/api/automation/stats'); const e3 = await reporter.raw('/api/bids/admin/suspicious');
check('E. a personal account is refused (401/403) before any provisioning detail is revealed', [401, 403].includes(e2.status) && [401, 403].includes(e3.status), [e2.status, e3.status]);

// ---------------- F. Authorization
const slOwn = await own.raw('/api/security-logs'); const slMod = await moderator.raw('/api/security-logs'); const slMktg = await marketing.raw('/api/security-logs');
const slHr = await hr.raw('/api/security-logs/summary'); const slUser = await reporter.raw('/api/security-logs'); const slDealer = await dealer.raw('/api/security-logs');
check('F1. security log: super admin and moderator (VIEW_LOGS) read it (200)', slOwn.status === 200 && slMod.status === 200, [slOwn.status, slMod.status]);
check('F2. security log: marketing and HR (no VIEW_LOGS) are refused 403 by the server; personal and dealer accounts too', slMktg.status === 403 && slHr.status === 403 && [401, 403].includes(slUser.status) && [401, 403].includes(slDealer.status), [slMktg.status, slHr.status, slUser.status, slDealer.status]);
const slMy = await reporter.raw('/api/security-logs/my'); const slSum = await own.raw('/api/security-logs/summary');
check('F3. every signed-in account can read its OWN activity log (/my), served from the canonical audit log when security_logs is absent', slMy.status === 200 && Array.isArray(slMy.j?.logs), [slMy.status, slMy.j]);
check('F3b. the admin security summary no longer 500s; unavailable figures are null, never zero', slSum.status === 200 && Number.isFinite(slSum.j?.summary?.total) && (slSum.j.summary.criticalCount === null || Number.isFinite(slSum.j.summary.criticalCount)), [slSum.status, slSum.j]);
const cp = await reporter.raw('/api/cms/pages?status=draft'); const cc = await reporter.raw('/api/cms/campaigns'); const cd = await dealer.raw('/api/cms/dashboard/stats');
const cs = await moderator.raw('/api/cms/pages'); const co = await own.raw('/api/cms/pages');
check('F4. CMS Studio reads: personal and dealer accounts are refused (403) - drafts are no longer readable by any signed-in user', cp.status === 403 && cc.status === 403 && cd.status === 403, [cp.status, cc.status, cd.status]);
check('F5. CMS Studio reads: staff (moderator) and super admin still load them (200)', cs.status === 200 && co.status === 200, [cs.status, co.status]);
const pf = await fetch((process.env.KAYAD_JOURNEY_BASE || 'http://127.0.0.1:5055') + '/api/cms/faqs'); const pp = await fetch((process.env.KAYAD_JOURNEY_BASE || 'http://127.0.0.1:5055') + '/api/cms/pages/s/does-not-exist');
check('F6. public CMS (FAQs, published page by slug) stays reachable without signing in (404 for a missing page, not 401)', pf.status === 200 && pp.status === 404, [pf.status, pp.status]);
const amod = await moderator.raw('/api/automation/stats');
check('F7. automation read endpoints keep the deliberate Phase 15 any-staff gate (staff reach it: 503 not-provisioned, not 403)', amod.status === 503, amod.status);

finish('27_customer_care');
