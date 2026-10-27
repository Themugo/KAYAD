/* global process, URL, window, document, console */
// Phase 15 browser verification. Tier [B]: REAL production bundle (vite preview), MOCKED API. Not a live backend, not staging.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE; const OUT = process.env.OUT;
const user = { id: 's1', _id: 's1', name: 'Owner', email: 'owner@example.test', role: 'superadmin', status: 'approved', emailVerified: true };
const pay = (id, status, rec, extra = {}) => ({ _id: id, id, amount: 250000, type: 'purchase', status, createdAt: '2026-10-25T10:00:00Z', phoneMasked: '*********678', user: { name: 'Amina', email: 'amina@example.test' }, car: { title: 'Prado TX' }, reconciliation: rec, ...extra });
let banState = false; const captured = [];
function respond(req) {
  const p = new URL(req.url()).pathname; const m = req.method();
  if (m !== 'GET') captured.push({ method: m, path: p, body: (req.postData() || '').slice(0, 200) });
  if (/auth\/me/.test(p)) return { body: { success: true, user } };
  if (/auth\/csrf/.test(p)) return { body: { success: true, csrfToken: 'x'.repeat(48) } };
  if (/admin\/payments/.test(p)) return { body: { success: true, payments: [pay('1', 'success', { state: 'settled', reasons: [] }), pay('2', 'pending', { state: 'pending', reasons: ['AWAITING_PROVIDER_CONFIRMATION'] }), pay('3', 'failed', { state: 'needs_reconciliation', reasons: ['AMOUNT_MISMATCH_PROVIDER_RECEIPT_RECORDED'] }), pay('4', 'failed', { state: 'evidence_unavailable', reasons: [] })], summary: { totalCollected: 250000, totalTransactions: 4 }, pagination: { total: 4 } } };
  if (/admin\/users\/.+\/toggle-ban/.test(p)) { const b = JSON.parse(req.postData() || '{}'); banState = typeof b.banned === 'boolean' ? b.banned : !banState; return { body: { success: true, isBanned: banState, changed: true } }; }
  if (/admin\/users/.test(p)) return { body: { success: true, users: [{ _id: 'u1', name: 'Buyer One', email: 'b1@example.test', role: 'user', approved: true, isBanned: banState, createdAt: '2026-10-01T00:00:00Z' }], total: 1 } };
  if (/admin\/system\/health/.test(p)) return { body: { success: true, status: 'no_critical_alerts', basis: 'Based on alerts and queue counters only; provider telemetry not measured', checks: [] } };
  return { body: { success: true, data: [], items: [], alerts: [], unreadCount: 0 } };
}
async function axeOf(page) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') }).catch(() => {});
  return page.evaluate(async () => window.axe ? (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id + ':' + v.nodes.length) : ['axe-unavailable']);
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(); const rows = [];
  for (const [vname, vp] of [['desktop', { width: 1280, height: 900 }], ['tablet', { width: 768, height: 1024 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await page.route('**/api/**', (route) => { const r = respond(route.request()); route.fulfill({ status: r.status || 200, contentType: 'application/json', body: JSON.stringify(r.body) }); });
    page.on('dialog', (d) => d.accept());
    // Transactions
    await page.goto(BASE + '/admin/transactions', { waitUntil: 'domcontentloaded' });
    await page.getByText('Successful collections').waitFor({ timeout: 20000 });
    const tx = await page.evaluate(() => document.body.innerText);
    const overflowTx = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    await page.screenshot({ path: `${OUT}/${vname}-transactions.png`, fullPage: true });
    rows.push({ viewport: vname, view: 'transactions', hasCollectionsLabel: /Successful collections/.test(tx), noTotalRevenue: !/Total Revenue/i.test(tx), showsReconciliation: /Needs reconciliation/.test(tx) && /evidence unavailable/i.test(tx), showsPending: /awaiting provider confirmation/i.test(tx), fullPhoneVisible: /2547\d{8}/.test(tx), horizontalPageScroll: overflowTx, axeSeriousCritical: await axeOf(page) });
    // Users: ban flow adopts server-confirmed state
    await page.goto(BASE + '/admin/users', { waitUntil: 'domcontentloaded' });
    await page.getByText('Buyer One').first().waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: /^Ban$/ }).first().click().catch(() => {});
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => document.body.innerText);
    await page.screenshot({ path: `${OUT}/${vname}-users.png`, fullPage: true });
    const sent = captured.filter((c) => /toggle-ban/.test(c.path)).slice(-1)[0];
    rows.push({ viewport: vname, view: 'users-ban', requestBody: sent && sent.body, uiShowsBanned: /banned/i.test(after), horizontalPageScroll: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), axeSeriousCritical: await axeOf(page) });
    banState = false;
    rows.push({ viewport: vname, view: 'pageerrors', errors: errs });
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(rows, null, 2));
  console.log(JSON.stringify(rows, null, 1));
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(2); });
