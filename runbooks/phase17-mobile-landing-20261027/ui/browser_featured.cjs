/* global console, document, location, process */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true }); const p = await c.newPage();
  await p.goto(process.argv[2] + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const cards = await p.evaluate(() => [...document.querySelectorAll('[aria-label="Featured vehicle pair"] button')].map(b => ({ label: b.getAttribute('aria-label'), text: b.innerText.replace(/\n/g, ' | '), img: (b.querySelector('img') || {}).alt, src: (b.querySelector('img') || {}).currentSrc.replace(location.origin, ''), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) })));
  console.log(JSON.stringify(cards, null, 1));
  await p.screenshot({ path: process.argv[3] });
  const n = cards.length; for (let i = 0; i < n; i++) { await p.goto(process.argv[2] + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200); await p.locator('[aria-label="Featured vehicle pair"] button').nth(i).click(); await p.waitForTimeout(1200); console.log('click', i, p.url().replace(process.argv[2], ''), '|', (await p.locator('h1').first().innerText().catch(() => '')).slice(0, 60)); }
  await b.close();
})();
