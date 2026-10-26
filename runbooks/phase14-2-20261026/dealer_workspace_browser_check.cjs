// Browser check of the REAL frontend bundle (vite dev) with MOCKED API responses shaped like the backend's
// { success: true, data: ... } contract. It is not a live-backend or staging test.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3100';
const OUT = process.env.OUT || 'evidence/phase14-2-20261026';
const user = { id: 'd1', _id: 'd1', name: 'Amani Motors', email: 'dealer@example.test', role: 'dealer', status: 'approved', emailVerified: true };
const items = (arr) => ({ success: true, data: { items: arr } });
const handlers = [
  [/\/auth\/me/, () => ({ success: true, user })],
  [/\/auth\/csrf/, () => ({ success: true, csrfToken: 'test-token' })],
  [/dealer-platform\/dashboard/, () => ({ success: true, data: { overview: { totalListings: 4, activeListings: 3, totalViews: 1200, leads: { total: 6, new: 2, contacted: 1, negotiating: 1, reserved: 0 }, revenue: { total: 0 } }, topPerformers: { vehicles: [{ id: 'c1', title: 'Toyota Prado 2018', views: 800, price: 5200000 }] } } })],
  [/dealer-platform\/leads/, () => items([{ id: 'l1', buyer: { name: 'Wanjiru K', email: 'wk@example.test' }, vehicle: { title: 'Toyota Prado 2018' }, stage: 'new', status: 'new', createdAt: '2026-10-20T10:00:00Z' }])],
  [/dealer-platform\/customers/, () => items([{ id: 'u9', name: 'Wanjiru K', email: 'w@example.test' }])],
  [/dealer-platform\/(auctions|auction)/, () => items([{ id: 'a1', title: 'Subaru Forester', bidsCount: 3, views: 40, startingBid: 1000000, status: 'live' }])],
  [/dealer-platform\/inspections/, () => items([{ id: 'i1', vehicle: 'Prado', status: 'scheduled' }])],
  [/dealer-platform\/finance/, () => items([{ id: 'f1', vehicle: 'Prado', applicantName: 'W K', status: 'pending' }])],
  [/dealer-platform\/team/, () => ({ success: true, data: [] })],
  [/dealer-platform\/reputation/, () => ({ success: true, data: { rating: 4.5, reviewCount: 2, reviews: [] } })],
  [/dealer-platform\/marketing/, () => items([])],
  [/dealer-platform\/analytics/, () => ({ success: true, data: { overview: { totalRevenue: 0, totalSales: 0, totalViews: 1200 }, performance: {}, topVehicles: [] } })],
  [/\/cars\/dealer\/my-cars|my-listings/, () => ({ success: true, data: [], cars: [] })],
];
(async () => {
  const log = [];
  const browser = await chromium.launch();
  const sections = ['overview','inventory','leads','pipeline','customers','finance','analytics','reputation','auctions','inspections','escrow','marketing','team','settings'];
  const results = [];
  for (const [label, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const consoleErrors = []; const unhandled = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + String(e).slice(0, 200)));
    await page.route((u) => u.pathname.startsWith('/api/'), (route) => {
      const url = route.request().url();
      const h = handlers.find(([re]) => re.test(url));
      if (!h) { unhandled.push(url.replace(/^https?:\/\/[^/]+/, '')); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h[1]()) });
    });
    await page.goto(`${BASE}/?nav=dealer-dashboard`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('navigation', { name: 'Dealer workspace' }).waitFor({ timeout: 30000 });
    for (const id of sections) {
      const name = id === 'overview' ? 'Overview' : id[0].toUpperCase() + id.slice(1);
      await page.getByRole('navigation', { name: 'Dealer workspace' }).getByRole('button', { name }).click();
      await page.waitForTimeout(500);
      const url = page.url();
      const h2 = await page.locator('#main-content h2').first().innerText();
      const current = await page.locator('nav[aria-label="Dealer workspace"] [aria-current="page"]').innerText();
      const errText = await page.locator('#main-content').innerText();
      // Page-level horizontal scroll as a user would see it (body is overflow-x: clip app-wide, so body.scrollWidth is the honest measure).
      const scrollW = await page.evaluate(() => document.body.scrollWidth - document.documentElement.clientWidth);
      const navScrolls = await page.evaluate(() => { const n = document.querySelector('nav[aria-label="Dealer workspace"]'); return n ? n.scrollWidth > n.clientWidth : null; });
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') }).catch(() => {});
      const axeRes = await page.evaluate(async () => (window.axe ? (await window.axe.run(document.querySelector('#main-content') || document, { resultTypes: ['violations'] })).violations.filter((v) => ['serious','critical'].includes(v.impact)).map((v) => v.id + ':' + v.nodes.length) : ['axe-unavailable'])).catch((e) => ['axe-error']);
      const unavailable = /Could not load|Try Again/.test(errText);
      results.push({ viewport: label, section: id, url: url.replace(BASE, ''), h2, current: current.replace(/\s+/g, ' ').trim(), loadFailureShown: unavailable, horizontalOverflowPx: scrollW, navScrolls, axeSeriousCritical: axeRes });
      await page.screenshot({ path: `${OUT}/screenshots/${label}-${id}.png`, fullPage: false });
    }
    // Back / Forward
    await page.getByRole('navigation', { name: 'Dealer workspace' }).getByRole('button', { name: 'Overview' }).click();
    await page.getByRole('navigation', { name: 'Dealer workspace' }).getByRole('button', { name: 'Team' }).click();
    await page.goBack(); await page.waitForTimeout(300);
    const afterBack = await page.locator('#main-content h2').first().innerText();
    await page.goForward(); await page.waitForTimeout(300);
    const afterFwd = await page.locator('#main-content h2').first().innerText();
    // Refresh + direct link
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('navigation', { name: 'Dealer workspace' }).waitFor({ timeout: 30000 });
    const afterReload = await page.locator('#main-content h2').first().innerText();
    await page.goto(`${BASE}/?nav=dealer-dashboard&section=reputation`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('navigation', { name: 'Dealer workspace' }).waitFor({ timeout: 30000 });
    const direct = await page.locator('#main-content h2').first().innerText();
    // Keyboard: Tab to a nav item and activate with Enter
    await page.getByRole('navigation', { name: 'Dealer workspace' }).getByRole('button', { name: 'Customers' }).focus();
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const kb = await page.locator('#main-content h2').first().innerText();
    log.push({ viewport: label, afterBack, afterFwd, afterReload, direct, keyboardEnter: kb, consoleErrors: [...new Set(consoleErrors)], unhandledApiCalls: [...new Set(unhandled)] });
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/browser-results.json`, JSON.stringify({ results, log }, null, 2));
  console.log(JSON.stringify({ log }, null, 1));
  console.log(results.map((r) => `${r.viewport} ${r.section} -> ${r.h2} | current=${r.current} | fail=${r.loadFailureShown} | overflow=${r.horizontalOverflowPx} | navScrolls=${r.navScrolls} | axe=${r.axeSeriousCritical.join(',') || 'none'}`).join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
