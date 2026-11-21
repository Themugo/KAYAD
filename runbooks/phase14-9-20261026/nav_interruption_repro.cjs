/* global process, URL, console */
// Reproduces / bounds the earlier "page.goto interrupted by another navigation" failure. Mocked API, real app.
// Usage: BASE=<origin> N=<iterations> node nav_interruption_repro.cjs   (run with and without CPU stress; see 14.6 browser report)
const { chromium } = require('playwright');
const BASE = process.env.BASE; const N = Number(process.env.N || 20);
(async () => {
  const browser = await chromium.launch(); const results = { iterations: N, interrupted: 0, ok: 0, mainFrameNavigationsPerLoad: [] };
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage(); let navs = 0;
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) navs++; });
    await page.route((u) => u.pathname.startsWith('/api/'), (r) => {
      const p = new URL(r.request().url()).pathname; const body = /auth\/me/.test(p) ? { success: true, user: { id: 'd1', name: 'A', role: 'dealer', email: 'd@x.test' } } : /csrf/.test(p) ? { success: true, csrfToken: 'x'.repeat(48) } : { success: true, data: { items: [], stats: {} } };
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    try { await page.goto(BASE + '/?nav=dealer-dashboard&section=customers', { waitUntil: 'domcontentloaded' }); results.ok++; }
    catch (e) { if (/interrupted by another navigation/i.test(String(e))) results.interrupted++; else throw e; }
    await page.waitForLoadState('networkidle').catch(() => {});
    results.mainFrameNavigationsPerLoad.push(navs);
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(results));
})().catch((e) => { console.error('REPRO FAIL', e); process.exit(1); });
