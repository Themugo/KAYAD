// Real frontend bundle, MOCKED API. Not a live backend. Checks every existing dealer route at 3 widths, plus buyer access denial.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE; const OUT = process.env.OUT || 'evidence/phase14-3-20261026';
const mk = (role) => ({ id: 'u1', _id: 'u1', name: role === 'dealer' ? 'Amani Motors' : 'Test Buyer', email: 'u@example.test', role, status: 'approved', emailVerified: true });
const body = (u, role) => {
  if (/auth\/me/.test(u)) return { success: true, user: mk(role) };
  if (/auth\/csrf/.test(u)) return { success: true, csrfToken: 't' };
  if (/dealer-platform\/dashboard/.test(u)) return { success: true, data: { overview: { totalListings: 4, totalViews: 90, leads: { total: 2, new: 1 }, revenue: { total: 0 } }, topPerformers: { vehicles: [] } } };
  if (/dealer-platform\/reputation/.test(u)) return { success: true, data: { overall: { rating: 4.5, totalReviews: 2 }, recentReviews: [] } };
  if (/my-listings/.test(u)) return { success: true, data: [] };
  if (/auctions\/operations/.test(u)) return { success: true, data: [] };
  return { success: true, data: { items: [], stats: {} } };
};
const routes = [
  ['dashboard', '/?nav=dealer-dashboard'], ['onboarding', '/dealer/onboarding'], ['auction-setup', '/dealer/auction-setup'],
  ['auction-operations', '/dealer/auction-operations'], ['notifications', '/notifications'],
];
(async () => {
  const browser = await chromium.launch(); const rows = [];
  for (const [vname, vp] of [['desktop', { width: 1280, height: 900 }], ['tablet', { width: 768, height: 1024 }], ['mobile', { width: 390, height: 844 }]]) {
    for (const role of ['dealer', 'buyer']) {
      const ctx = await browser.newContext({ viewport: vp }); const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
      await page.route((u) => u.pathname.startsWith('/api/'), (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body(r.request().url(), role)) }));
      for (const [name, path] of routes) {
        if (role === 'buyer' && name === 'notifications') continue;
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3500);
        const finalUrl = page.url().replace(BASE, '');
        const heading = (await page.locator('h1, h2').first().innerText().catch(() => '')).slice(0, 70);
        const text = (await page.locator('body').innerText()).slice(0, 4000);
        const crashed = /Something went wrong/.test(text);
        const overflow = await page.evaluate(() => document.body.scrollWidth - document.documentElement.clientWidth);
        await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') }).catch(() => {});
        const axe = await page.evaluate(async () => window.axe ? (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id + ':' + v.nodes.length) : ['axe-unavailable']).catch(() => ['axe-error']);
        if (role === 'dealer') await page.screenshot({ path: `${OUT}/screenshots/${vname}-route-${name}.png` });
        rows.push({ viewport: vname, role, route: name, finalUrl, heading, crashed, overflowPx: overflow, axeSeriousCritical: axe, pageErrors: [...new Set(errs)] });
      }
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/route-browser-results.json`, JSON.stringify(rows, null, 2));
  for (const r of rows) console.log(`${r.viewport} ${r.role} ${r.route} -> ${r.finalUrl} | h="${r.heading}" crash=${r.crashed} overflow=${r.overflowPx} axe=${r.axeSeriousCritical.join(',') || 'none'} errs=${r.pageErrors.length}`);
})();
