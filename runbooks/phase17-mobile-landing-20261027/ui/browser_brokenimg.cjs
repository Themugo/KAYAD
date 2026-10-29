/* global console, document, process */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true }); const p = await c.newPage();
 await p.route('**/hero/kayad-land-cruiser-*', r => r.abort()); // MOCK: simulate a failed image for one featured card
 await p.goto(process.argv[2] + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
 console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('[aria-label="Featured vehicle pair"] button')].map(b => b.innerText.replace(/\n/g, ' | ') + ' :: ' + [...b.querySelectorAll('[role=img],img')].map(e => e.getAttribute('aria-label') || e.alt).join(',')))));
 await p.screenshot({ path: process.argv[3] }); await b.close(); })();
