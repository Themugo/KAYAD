// Escrow experience — real-browser journeys. TEST-ONLY mocked HTTP backend (stateful fake).
// Proves the UI against the response contract; real RLS/ledger/M-Pesa behaviour is covered by Jest + the PostgreSQL proofs.
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const out = []; let fails = 0;
const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`); if (!c) fails++; };
const json = (r, body, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const U = { buyer: { id: 'b1', _id: 'b1', name: 'Amina Buyer', email: 'a@x.test', role: 'buyer', emailVerified: true }, admin: { id: 'a1', _id: 'a1', name: 'Ada Admin', email: 'ada@x.test', role: 'admin', emailVerified: true } };
const now = new Date().toISOString();
const deal = (o = {}) => ({ id: 'e1', buyer: { id: 'b1', name: 'Amina Buyer' }, seller: { id: 's1', name: 'Sam Seller' }, car: { id: 'c1', title: 'Toyota Prado 2019' }, amount: 4200000, currency: 'KES', status: 'funded', viewerRole: 'buyer', availableActions: ['confirm_vehicle', 'open_dispute'], createdAt: now, updatedAt: now, fundedAt: now, autoReleaseEligibleAt: new Date(Date.now() + 3 * 864e5).toISOString(), ...o });
const sum = (n = 1) => ({ scope: 'participant', currency: 'KES', totalDeals: n, heldAmount: 4200000, heldCount: 1, pendingFundingCount: 0, activeCount: 1, settledCount: 0, needsActionCount: 1 });
const CAN = { view: true, operate: true, reconcile: true, release: true, refund: true, settle: true, completeRefund: true, close: true };

async function install(page, st) {
  await page.route('**/api/v1/auth/me', (r) => st.user ? json(r, { success: true, user: U[st.user] }) : json(r, { success: false, message: 'Unauthenticated' }, 401));
  await page.route(/\/v1\/auth\/csrf/, (r) => json(r, { success: true, csrfToken: 'test-csrf-token-0123456789abcdef0123456789' }));
  await page.route(/^https?:\/\/[^/]+\/api\/favorites/, (r) => json(r, { success: true, data: [] }));
  await page.route(/^https?:\/\/[^/]+\/api\/notifications/, (r) => json(r, { success: true, data: [], unreadCount: 0 }));
  await page.route(/^https?:\/\/[^/]+\/api\/cars(\?.*)?$/, (r) => json(r, { success: true, data: [], pagination: { page: 1, limit: 24, total: 0, pages: 1 } }));
  await page.route(/^https?:\/\/[^/]+\/api\/escrow\/program$/, (r) => { st.calls.push('program'); st.programFail ? json(r, { success: false }, 500) : json(r, { success: true, data: { enabled: true, fundingMethods: ['bank_transfer'], releaseDays: 3, minimumAmount: 0, maximumAmount: null, currency: 'KES' } }); });
  await page.route(/^https?:\/\/[^/]+\/api\/escrow\/my(\?.*)?$/, (r) => { st.calls.push('my'); if (st.myFail) return json(r, { success: false, message: 'down' }, 500); json(r, { success: true, data: st.deals, summary: sum(st.deals.length) }); });
  await page.route(/^https?:\/\/[^/]+\/api\/escrow\/e1\/confirm-vehicle$/, (r) => { st.calls.push('confirm-vehicle'); st.deals = [deal({ status: 'vehicle_confirmed', vehicleConfirmedAt: now, availableActions: ['request_release', 'open_dispute'] })]; json(r, { success: true, data: {} }); });
  await page.route(/^https?:\/\/[^/]+\/api\/escrow\/operations\/dashboard$/, (r) => { st.calls.push('ops-dashboard'); json(r, { success: true, data: { queues: { funded: { count: 1, items: [{ id: 'e1', status: 'funded', amount: 4200000, commission: 210000, sellerAmount: 3990000, buyer: { id: 'b1', name: 'Amina Buyer' }, seller: { id: 's1', name: 'Sam Seller' }, car: { id: 'c1', title: 'Toyota Prado 2019' } }] }, vehicleConfirmed: { count: 0, items: [] }, delivered: { count: 0, items: [] }, released: { count: 0, items: [] }, disputed: { count: 0, items: [] }, refunds: { count: 0, items: [] }, reconciliation: { count: 0, items: [] }, anomalies: { count: 0, items: [] } }, totals: { scope: 'platform', currency: 'KES', heldAmount: 4200000, heldCount: 1 }, operator: { can: CAN, role: 'admin' }, generatedAt: now } }); });
  await page.route(/^https?:\/\/[^/]+\/api\/escrow\?status=pending.*/, (r) => json(r, { success: true, data: [] }));
  await page.route(/^https?:\/\/[^/]+\/api\/escrow\/operations\/case\/e1$/, (r) => json(r, { success: true, data: { escrow: { id: 'e1', status: 'funded', amount: 4200000, commission: 210000, sellerAmount: 3990000, buyer: { id: 'b1', name: 'Amina Buyer' }, seller: { id: 's1', name: 'Sam Seller' }, car: { id: 'c1', title: 'Toyota Prado 2019' }, staffActions: ['release', 'refund'] }, timeline: [{ id: 't1', action: 'funded', actor: 'x', timestamp: now }], anomalies: [], reconciliation: [] } }));
}
const fresh = (o = {}) => ({ user: null, deals: [deal()], calls: [], ...o });
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const run = async (name, viewport, st, fn, ctxOpts = {}) => {
    const ctx = await browser.newContext({ viewport, ...ctxOpts }); const page = await ctx.newPage(); await install(page, st);
    try { await fn(page, st); } catch (e) { ok(`${name}: journey threw`, false, String(e.message).split('\n')[0]); }
    await ctx.close();
  };
  const DESK = { width: 1280, height: 900 }, MOB = { width: 390, height: 844 };

  for (const [label, vp] of [['desktop', DESK], ['mobile', MOB]]) {
    await run(`visitor ${label}`, vp, fresh(), async (page, st) => {
      await page.goto(BASE + '/?nav=escrow', { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Escrow', level: 1 }).waitFor({ timeout: 20000 });
      ok(`visitor ${label}: explainer + programme status`, await page.getByText('Escrow is switched on').isVisible());
      const body = await page.locator('body').innerText();
      ok(`visitor ${label}: no unsupported claims`, !/CBK|money-back|100% protect|insured|multi-?sig/i.test(body));
      ok(`visitor ${label}: no deal/ops requests`, !st.calls.includes('my') && !st.calls.includes('ops-dashboard'));
      ok(`visitor ${label}: no Operations tab`, (await page.getByRole('tab', { name: 'Operations' }).count()) === 0);
      ok(`visitor ${label}: no horizontal scroll`, await noHScroll(page));
      await page.getByRole('tab', { name: 'My escrow deals' }).click();
      ok(`visitor ${label}: sign-in prompt, still no deal request`, (await page.getByText('Sign in to see your escrow deals').isVisible()) && !st.calls.includes('my'));
    });
    await run(`buyer ${label}`, vp, fresh({ user: 'buyer' }), async (page, st) => {
      await page.goto(BASE + '/?nav=escrow', { waitUntil: 'networkidle' });
      await page.getByRole('tab', { name: 'My escrow deals' }).click();
      await page.getByTestId('escrow-summary').waitFor({ timeout: 15000 });
      ok(`buyer ${label}: scoped summary shown`, (await page.getByTestId('escrow-summary').innerText()).includes('only deals you are part of'));
      await page.getByRole('button', { name: /Toyota Prado 2019/ }).click();
      ok(`buyer ${label}: server-driven action button`, await page.getByRole('button', { name: /inspected and accept/ }).isVisible());
      ok(`buyer ${label}: no commission/vault wording`, !/commission|vault|locked/i.test(await page.locator('#escrow-panel-deals').innerText()));
      await page.getByRole('button', { name: /inspected and accept/ }).click();
      const dlg = page.getByRole('dialog'); await dlg.waitFor();
      ok(`buyer ${label}: dialog focus inside`, await page.evaluate(() => !!document.activeElement.closest('[role=dialog]')));
      await page.keyboard.press('Escape');
      ok(`buyer ${label}: Escape closes + focus returns`, (await dlg.count()) === 0 && await page.evaluate(() => document.activeElement && document.activeElement.textContent.includes('inspected and accept')));
      await page.getByRole('button', { name: /inspected and accept/ }).click();
      await dlg.getByRole('button', { name: /inspected and accept/ }).click();
      await page.getByRole('button', { name: /Ask KAYAD to release/ }).waitFor({ timeout: 10000 });
      ok(`buyer ${label}: action posted then state refetched`, st.calls.includes('confirm-vehicle') && st.calls.filter((c) => c === 'my').length >= 2);
      ok(`buyer ${label}: no horizontal scroll`, await noHScroll(page));
    });
  }
  await run('buyer errors', DESK, fresh({ user: 'buyer', myFail: true }), async (page) => {
    await page.goto(BASE + '/?nav=escrow', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'My escrow deals' }).click();
    await page.getByRole('alert').waitFor({ timeout: 15000 });
    ok('buyer error: alert, no KES 0', !/KES 0\b/.test(await page.locator('body').innerText()));
  });
  await run('buyer empty', DESK, fresh({ user: 'buyer', deals: [] }), async (page) => {
    await page.goto(BASE + '/?nav=escrow', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'My escrow deals' }).click();
    await page.getByTestId('escrow-empty').waitFor({ timeout: 15000 });
    ok('buyer empty: honest empty state, no totals', (await page.getByTestId('escrow-summary').count()) === 0);
  });
  await run('programme outage', DESK, fresh({ programFail: true }), async (page) => {
    await page.goto(BASE + '/?nav=escrow', { waitUntil: 'networkidle' });
    await page.getByText(/couldn’t check whether escrow is switched on/).waitFor({ timeout: 15000 });
    ok('outage: says it cannot tell, not "off"', true);
  });
  await run('staff', DESK, fresh({ user: 'admin' }), async (page, st) => {
    await page.goto(BASE + '/?nav=escrow', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Operations' }).click();
    await page.getByTestId('ops-totals').waitFor({ timeout: 15000 });
    ok('staff: totals labelled platform-wide', /platform-wide/i.test(await page.getByTestId('ops-totals').innerText()));
    await page.getByRole('button', { name: /Toyota Prado 2019/ }).click();
    await page.getByRole('button', { name: 'Approve refund' }).waitFor();
    ok('staff: only server staffActions offered', (await page.getByRole('button', { name: 'Close escrow' }).count()) === 0 && await page.getByRole('button', { name: 'Release' }).isVisible());
  });
  await run('reduced motion', DESK, fresh({ user: 'buyer' }), async (page) => {
    await page.goto(BASE + '/?nav=escrow', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Escrow', level: 1 }).waitFor({ timeout: 15000 });
    const anim = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).length);
    ok('reduced motion: no infinite animations on the escrow page', anim === 0, `running=${anim}`);
  }, { reducedMotion: 'reduce' });
  await run('keyboard tabs', DESK, fresh({ user: 'buyer' }), async (page) => {
    await page.goto(BASE + '/?nav=escrow', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'How escrow works' }).focus();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    ok('keyboard: arrow keys move through tabs', (await page.getByRole('tab', { name: 'My escrow deals' }).getAttribute('aria-selected')) === 'true');
  });
  await browser.close();
  console.log(out.join('\n')); console.log(`\n${out.length - fails}/${out.length} PASS`); process.exit(fails ? 1 : 0);
})();
