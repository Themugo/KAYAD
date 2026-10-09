// Support & Resolution Center — real-browser journeys (TEST-ONLY mocked backend).
// The customer page and the staff workspace are driven for real; backend responses are a small stateful fake that
// mimics the server projections (the real projection/authorization is covered by Jest + the migration-built PostgreSQL proof).
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const out = []; let fails = 0;
const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`); if (!c) fails++; };
const USER = { id: 'u1', _id: 'u1', name: 'Amina Buyer', email: 'amina@example.test', role: 'user', emailVerified: true, status: 'approved' };
const ADMIN = { id: 'a1', _id: 'a1', name: 'Ada Support', email: 'ada@example.test', role: 'technical_support', emailVerified: true, status: 'approved' };
const ADM = { id: 'ad1', _id: 'ad1', name: 'Ad Min', email: 'admin@example.test', role: 'admin', emailVerified: true, status: 'approved' };
const MKT = { id: 'm1', _id: 'm1', name: 'Mo Marketing', email: 'mo@example.test', role: 'marketing', emailVerified: true, status: 'approved' };
const json = (r, body, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const API = (p) => new RegExp(`^https?://[^/]+/api/${p}`);
const ESCROW = '55555555-5555-4555-8555-555555555555';

const mkCase = (st, over = {}) => ({
  id: over.id || `c${st.cases.length + 1}-0000-4000-8000-000000000000`.replace(/^c(\d)-/, '1111111$1-'),
  ticketNumber: `SUP-20261009-00000${st.cases.length + 1}`, category: 'escrow', subject: 'Escrow stuck', status: 'open',
  createdAt: '2026-10-09T07:00:00Z', updatedAt: '2026-10-09T07:00:00Z', resolvedAt: null, rated: false, messageCount: 0,
  description: 'My escrow has not moved', references: [], rating: null, ratingComment: null, canReply: true, canRate: false,
  expectations: { firstResponseMinutes: null, resolutionMinutes: null }, messages: [], ...over,
});
const summary = (c) => { const { description, references, messages, rating, ratingComment, canReply, canRate, expectations, ...s } = c; return s; };

async function install(page, st) {
  const who = () => ({ customer: USER, staff: ADMIN, marketing: MKT, oversight: ADM }[st.who]);
  await page.route('**/api/v1/auth/me', (r) => st.who ? json(r, { success: true, user: who() }) : json(r, { success: false, message: 'Unauthenticated' }, 401));
  await page.route(/\/v1\/auth\/csrf/, (r) => json(r, { success: true, csrfToken: 'test-csrf-token-0123456789abcdef0123456789' }));
  await page.route(API('favorites'), (r) => json(r, { success: true, data: [] }));
  await page.route(API('notifications'), (r) => json(r, { success: true, data: [], unreadCount: 0 }));
  await page.route(API('cars(\\?.*)?$'), (r) => json(r, { success: true, data: [], pagination: { page: 1, limit: 24, total: 0, pages: 1 } }));
  await page.route(API('admin/(stats|users|cars|audit)'), (r) => json(r, { success: true, data: {}, users: [], cars: [], logs: [], stats: {} }));
  await page.route(API('support'), async (r) => {
    const url = new URL(r.request().url()); const path = url.pathname.replace('/api/support', '') || '/'; const m = r.request().method();
    const body = r.request().postData() ? JSON.parse(r.request().postData()) : {};
    st.calls.push({ m, path, body });
    if (st.who === 'marketing' && path.startsWith('/staff')) return json(r, { success: false, message: 'Support staff access only' }, 403);
    if (path === '/' && m === 'POST') {
      if (st.failNext) { st.failNext = false; return r.abort('failed'); }
      const dup = st.cases.find((c) => c._key === body.idempotencyKey);
      if (dup) return json(r, { success: true, case: dup, referenceLinked: null, deduplicated: true });
      const c = mkCase(st, { subject: body.subject, description: body.description, category: body.category }); c._key = body.idempotencyKey; st.cases.unshift(c);
      return json(r, { success: true, case: c, referenceLinked: body.reference ? body.reference.id === ESCROW : null, deduplicated: false }, 201);
    }
    if (path === '/my-tickets') return json(r, { success: true, cases: st.cases.map(summary), total: st.cases.length });
    if (path === '/staff/queue') return json(r, { success: true, cases: st.cases.map((c) => ({ ...summary(c), priority: 'medium', customer: { id: 'u1', name: 'Amina Buyer', role: 'user' }, assignedTo: null, escalatedTo: null, firstResponseAt: null, rowVersion: 1, awaitingStaff: true })), total: st.cases.length, limit: 50, offset: 0, capability: st.who === 'oversight' ? 'oversight' : 'agent' });
    if (path === '/staff/metrics') return json(r, { success: true, metrics: { total: st.cases.length, windowDays: 30, slaConfigured: false, byStatus: {}, byCategory: {}, openBacklog: st.cases.length, unassignedOpen: st.cases.length, awaitingFirstResponse: st.cases.length, medianFirstResponseMinutes: null, medianResolutionMinutes: null, firstResponseWithinTarget: null, resolutionWithinTarget: null, averageRating: null, ratedCount: 0 } });
    if (path === '/staff/team') return json(r, { success: true, staff: [{ id: 'a1', name: 'Ada Support', role: 'technical_support' }] });
    let mm;
    if ((mm = path.match(/^\/staff\/([^/]+)\/messages$/)) && m === 'POST') { st.staffMsgs.push(body); return json(r, { success: true, case: staffDetail(st, mm[1]) }); }
    if ((mm = path.match(/^\/staff\/([^/]+)$/))) {
      if (st.who === 'oversight') {
        if (m !== 'GET') return json(r, { success: false, message: 'Only support agents can work on cases' }, 403);
        const why = url.searchParams.get('reason') || ''; if (why.trim().length < 10) return json(r, { success: false, code: 'SUPPORT_REASON_REQUIRED', message: 'Give a reason' }, 400);
        st.oversightReasons.push(why); const d = staffDetail(st, mm[1]);
        return json(r, { success: true, capability: 'oversight', case: { ...d, readOnly: true, messages: d.messages.filter((x) => !x.internal) } });
      }
      if (m === 'PATCH') { st.patches.push(body); const c = st.cases.find((x) => x.id === mm[1]); if (body.status) c.status = body.status; }
      return json(r, { success: true, case: staffDetail(st, mm[1]) });
    }
    if ((mm = path.match(/^\/([^/]+)\/messages$/)) && m === 'POST') { const c = st.cases.find((x) => x.id === mm[1]); c.messages.push({ id: `m${c.messages.length}`, from: 'you', content: body.content, createdAt: '2026-10-09T09:00:00Z' }); return json(r, { success: true, case: c, reopened: false }); }
    if ((mm = path.match(/^\/([^/]+)\/rate$/)) && m === 'POST') { st.ratings.push(body); const c = st.cases.find((x) => x.id === mm[1]); c.rating = body.rating; c.canRate = false; return json(r, { success: true, case: c }); }
    if ((mm = path.match(/^\/([^/]+)$/)) && m === 'GET') { const c = st.cases.find((x) => x.id === mm[1]); return c ? json(r, { success: true, case: c }) : json(r, { success: false, message: 'Case not found.' }, 404); }
    return json(r, { success: false, message: 'unmocked ' + path }, 500);
  });
}
function staffDetail(st, id) {
  const c = st.cases.find((x) => x.id === id);
  return { ...summary(c), priority: 'medium', customer: { id: 'u1', name: 'Amina Buyer', role: 'user' }, assignedTo: null, escalatedTo: null, firstResponseAt: null, rowVersion: 1, awaitingStaff: true,
    description: c.description, references: [], reopenCount: 0, resolutionNote: null, rating: null, ratingComment: null,
    messages: [{ id: 'x1', kind: 'customer', internal: false, senderName: 'Amina Buyer', content: 'Please help', createdAt: null }, { id: 'x2', kind: 'staff', internal: true, senderName: 'Ada Support', content: 'INTERNAL: check ledger', createdAt: null }] };
}
const fresh = (over = {}) => ({ who: null, cases: [], calls: [], staffMsgs: [], patches: [], oversightReasons: [], ratings: [], failNext: false, ...over });
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const text = (page) => page.evaluate(() => document.body.innerText);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const open = async (viewport, st) => {
    const ctx = await browser.newContext({ viewport }); const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message)); await install(page, st); return { ctx, page, errors };
  };
  const goSupport = async (page) => { await page.goto(BASE + '/?nav=support', { waitUntil: 'networkidle' }); await page.getByRole('heading', { name: /Help that follows/ }).waitFor({ timeout: 20000 }); };

  for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 375, height: 800 }]]) {
    // Guest
    { const st = fresh(); const { ctx, page, errors } = await open(vp, st); await goSupport(page);
      const t = await text(page);
      ok(`${label} guest: sign-in prompt, no case form`, /Sign in to create and track a case/.test(t) && !(await page.getByLabel('Short summary').count()));
      ok(`${label} guest: no response/resolution time promises`, !/1h first-response|1 hour|24 hours|24-hour|24\/7/i.test(t));
      ok(`${label} guest: no support API call`, st.calls.length === 0);
      ok(`${label} guest: no horizontal scroll`, await noHScroll(page)); ok(`${label} guest: no page errors`, errors.length === 0, errors.join('|')); await ctx.close(); }

    // Customer journey
    { const st = fresh({ who: 'customer' }); const { ctx, page, errors } = await open(vp, st); await goSupport(page);
      const opts = await page.getByLabel('What is the issue about?').locator('option').allTextContents();
      ok(`${label} customer: topics include service providers + something else, no insurance`, opts.includes('Automotive service providers') && opts.includes('Something else') && !opts.some((o) => /insurance|broker/i.test(o)), opts.join(','));
      await page.getByLabel('What is the issue about?').selectOption('escrow');
      ok(`${label} customer: escrow topic shows an Escrow ID field`, (await page.getByLabel(/Escrow ID/).count()) === 1);
      ok(`${label} customer: submit disabled until valid`, await page.getByRole('button', { name: /create support case/i }).isDisabled());
      await page.getByLabel('Short summary').fill('Escrow stuck'); await page.getByLabel(/Escrow ID/).fill(ESCROW); await page.getByLabel('What happened?').fill('My escrow has not moved for three days');
      // network failure then retry -> same idempotency key, no duplicate
      st.failNext = true; await page.getByRole('button', { name: /create support case/i }).click();
      await page.getByText(/will not be duplicated/).waitFor();
      ok(`${label} customer: draft preserved after a network failure`, (await page.getByLabel('What happened?').inputValue()).includes('three days'));
      await page.getByRole('button', { name: /create support case/i }).click(); await page.getByText('Case created').waitFor();
      const posts = st.calls.filter((c) => c.m === 'POST' && c.path === '/');
      ok(`${label} customer: retry reused the same idempotency key`, posts.length === 2 && posts[0].body.idempotencyKey === posts[1].body.idempotencyKey && !!posts[0].body.idempotencyKey);
      ok(`${label} customer: reference sent as a linked field, description untouched`, posts[1].body.reference?.kind === 'escrow' && posts[1].body.reference.id === ESCROW && !posts[1].body.description.includes('Reference:'));
      ok(`${label} customer: payload carries no priority/status/assignment`, !('priority' in posts[1].body) && !('status' in posts[1].body) && !('assignedTo' in posts[1].body));
      ok(`${label} customer: exactly one case exists`, st.cases.length === 1);
      ok(`${label} customer: confirmation shows reference, no invented SLA`, /SUP-20261009-000001/.test(await text(page)) && !/1-hour|24-hour/.test(await text(page)));
      await page.getByRole('button', { name: 'View case' }).click(); await page.getByText('Original request').waitFor();
      await page.getByPlaceholder(/Add information or reply/).fill('Any update please?'); await page.getByRole('button', { name: /send reply/i }).click();
      await page.getByText('Any update please?').first().waitFor({ timeout: 10000 });
      ok(`${label} customer: reply appears in thread`, true);
      // resolved + rate
      st.cases[0].status = 'resolved'; st.cases[0].canRate = true; st.cases[0].canReply = true;
      await page.getByRole('button', { name: /Refresh support cases/ }).click(); await page.locator('#my-cases').getByText('Escrow stuck').click();
      await page.getByText('How was the resolution?').waitFor(); await page.getByRole('button', { name: '4', exact: true }).click(); await page.getByRole('button', { name: 'Save feedback' }).click();
      await page.getByText(/You rated this case/).waitFor();
      ok(`${label} customer: rating sent once as {rating, comment} and form disappears`, st.ratings.length === 1 && st.ratings[0].rating === 4 && !('resolutionNotes' in st.ratings[0]) && (await page.getByText('Save feedback').count()) === 0);
      // closed => no reply box
      st.cases[0].status = 'closed'; st.cases[0].canReply = false; st.cases[0].canRate = false;
      await page.getByRole('button', { name: /Refresh support cases/ }).click(); await page.locator('#my-cases').getByText('Escrow stuck').click();
      await page.getByText(/This case is closed/).waitFor();
      ok(`${label} customer: closed case offers no reply box`, (await page.getByPlaceholder(/Add information or reply/).count()) === 0);
      ok(`${label} customer: no horizontal scroll`, await noHScroll(page)); ok(`${label} customer: no page errors`, errors.length === 0, errors.join('|')); await ctx.close(); }

    // Staff workspace
    { const st = fresh({ who: 'staff', cases: [] }); st.cases.push(mkCase(st)); const { ctx, page, errors } = await open(vp, st);
      await page.goto(BASE + '/?nav=admin', { waitUntil: 'networkidle' }); await page.getByRole('button', { name: 'Support', exact: true }).click();
      await page.getByText('SUP-20261009-000001').first().waitFor({ timeout: 15000 });
      ok(`${label} staff: no target compliance claimed when none configured`, /No response targets are configured/.test(await text(page)));
      await page.getByText('Escrow stuck').first().click(); await page.getByText('Internal note', { exact: true }).first().waitFor();
      await page.getByLabel(/Internal note only/).check(); await page.getByLabel('Reply').fill('checking ledger'); await page.getByRole('button', { name: /add note/i }).click();
      await page.waitForFunction(() => true); await page.waitForTimeout(300);
      ok(`${label} staff: internal note sent with isInternal=true`, st.staffMsgs.length === 1 && st.staffMsgs[0].isInternal === true);
      await page.getByLabel('Change status').selectOption('resolved');
      ok(`${label} staff: resolve blocked without a note`, await page.getByRole('button', { name: /apply status change/i }).isDisabled());
      await page.getByLabel(/Resolution note/).fill('Guided customer'); await page.getByRole('button', { name: /apply status change/i }).click(); await page.waitForTimeout(300);
      ok(`${label} staff: status change carries note + expected version`, st.patches.length === 1 && st.patches[0].status === 'resolved' && st.patches[0].resolutionNote === 'Guided customer' && st.patches[0].expectedVersion === 1);
      ok(`${label} staff: no horizontal scroll`, await noHScroll(page)); ok(`${label} staff: no page errors`, errors.length === 0, errors.join('|')); await ctx.close(); }
  }

  // Non-support staff
  { const st = fresh({ who: 'marketing' }); const { ctx, page } = await open({ width: 1440, height: 900 }, st);
    await page.goto(BASE + '/?nav=admin', { waitUntil: 'networkidle' }); await page.getByRole('button', { name: 'Support', exact: true }).click();
    await page.getByText(/does not include customer support access/).waitFor({ timeout: 15000 });
    ok('marketing staff: told they have no support access (server 403), sees no cases', true); await ctx.close(); }

  // Oversight (admin): read-only, reason required, no internal notes, no write controls
  { const st = fresh({ who: 'oversight' }); st.cases.push(mkCase(st)); const { ctx, page, errors } = await open({ width: 1440, height: 900 }, st);
    await page.goto(BASE + '/?nav=admin', { waitUntil: 'networkidle' }); await page.getByRole('button', { name: 'Support', exact: true }).click();
    await page.getByText('SUP-20261009-000001').first().waitFor({ timeout: 15000 });
    await page.getByText('Escrow stuck').first().click();
    const openBtn = page.getByRole('button', { name: /open case read-only/i }); await openBtn.waitFor();
    ok('oversight: case is not fetched before a reason is given', !st.calls.some((c) => c.path.startsWith('/staff/1') ) && st.oversightReasons.length === 0 && await openBtn.isDisabled());
    await page.getByLabel(/Reason for opening/).fill('Quality review of a complaint'); await openBtn.click(); await page.getByText('Please help').waitFor();
    const t = await text(page);
    ok('oversight: reason sent to the server', st.oversightReasons[0] === 'Quality review of a complaint');
    ok('oversight: internal notes absent', !/INTERNAL: check ledger/.test(t) && (await page.getByText('Internal note', { exact: true }).count()) === 0);
    ok('oversight: no reply or status controls', (await page.getByLabel('Reply').count()) === 0 && (await page.getByLabel('Change status').count()) === 0);
    ok('oversight: no page errors', errors.length === 0, errors.join('|')); await ctx.close(); }

  await browser.close();
  console.log(out.join('\n')); console.log(`\n${out.length - fails}/${out.length} PASS`); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log(out.join('\n')); console.error('JOURNEY CRASH', e); process.exit(2); });
