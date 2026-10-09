// Auction list partial-failure journey (TEST-ONLY mocked HTTP): a failing "Starting soon" request must not blank
// Live/Completed and must not be shown as zero. Run with the Vite dev server on :3000.
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const out = []; let fails = 0; const ok = (n, c, x = '') => { out.push((c ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  ' + x : '')); if (!c) fails++; };
const json = (r, b, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
const auction = (i, st) => ({ id: 'a' + i, carId: 'a' + i, status: st, startingBid: 2000000, highestBid: 2300000, startTime: null, endTime: new Date(Date.now() + (st === 'ended' ? -1 : 1) * 3600e3 * (i + 2)).toISOString(), bidIncrement: 10000, bidCount: i, allowBid: st === 'active', allowBuy: false, car: { title: 'Test Vehicle ' + i, brand: 'Toyota', model: 'T', year: 2020, images: [] } });
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp }); const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/api/v1/auth/me', (r) => json(r, { success: false }, 401));
    await page.route(/\/v1\/auth\/csrf/, (r) => json(r, { success: true, csrfToken: 'x'.repeat(40) }));
    await page.route(/\/api\/(favorites|notifications|cars)(\?.*)?$/, (r) => json(r, { success: true, data: [], pagination: { page: 1, limit: 24, total: 0, pages: 1 } }));
    let healthy = false;
    await page.route(/\/api\/auctions(\?.*)?$/, (r) => { const s = new URL(r.request().url()).searchParams.get('status');
      if (s === 'draft' && !healthy) return json(r, { success: false, message: 'Internal server error' }, 500);
      return json(r, { success: true, auctions: s === 'live' ? [auction(1, 'active')] : s === 'ended' ? [auction(2, 'ended')] : [auction(3, 'draft')], pagination: { page: 1, limit: 100, total: 1, pages: 1 } }); });
    await page.goto(BASE + '/?nav=auctions', { waitUntil: 'networkidle' });
    await page.getByText(/Starting soon could not be loaded/).waitFor({ timeout: 20000 });
    ok(label + ': partial-failure banner names the failed section and the server message', /Internal server error/.test(await page.locator('body').innerText()));
    ok(label + ': live data still rendered', (await page.getByText('Test Vehicle 1').count()) > 0);
    const tab = page.getByRole('tab', { name: /Starting soon/ });
    ok(label + ': failed list shows an em dash, not 0', /—/.test(await tab.innerText()) && !/\b0\b/.test(await tab.innerText()));
    await tab.click(); ok(label + ': failed tab makes no "no auctions scheduled" claim', (await page.getByText('No auctions are scheduled yet.').count()) === 0);
    healthy = true; await page.getByRole('button', { name: /Refresh/ }).click(); await page.waitForTimeout(600);
    ok(label + ': Refresh recovers and clears the banner', (await page.getByText(/could not be loaded/).count()) === 0 && /\b1\b/.test(await page.getByRole('tab', { name: /Starting soon/ }).innerText()));
    ok(label + ': no horizontal scroll', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    ok(label + ': no page errors', errors.length === 0, errors.join('|')); await ctx.close();
  }
  await browser.close(); console.log(out.join('\n')); console.log((out.length - fails) + '/' + out.length + ' PASS'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log(out.join('\n')); console.error('JOURNEY CRASH', e); process.exit(2); });
