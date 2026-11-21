/* global console, process, window */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true }); const p = await c.newPage();
  await p.goto(process.argv[2] + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  const h0 = await p.evaluate(() => window.history.length);
  for (const t of ['Auction', 'Services', 'Home']) { await p.locator('.kayad-mobile-bottom-nav button', { hasText: t }).click(); await p.waitForTimeout(900); console.log(t, p.url().replace(process.argv[2], ''), 'len', await p.evaluate(() => window.history.length)); }
  console.log('start len', h0);
  await b.close();
})();
