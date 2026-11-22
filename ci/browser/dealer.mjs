// Dealer workspace browser harness (disposable stack): logs in through the real UI and records overflow + screenshots for Team, Banking, Settings.
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'reports/DEALER-TEAM/evidence', TAG = process.env.TAG || 'after';
const seed = JSON.parse(fs.readFileSync(new URL('../db-journeys/out/browser-seed.json', import.meta.url)));
const widths = (process.env.WIDTHS || '320,340,360,375,390,414,430,600,768,1024,1280,1440,1920').split(',').map(Number);
const sections = ['overview', 'team', 'banking', 'settings'];
fs.mkdirSync(`${OUT}/${TAG}`, { recursive: true });
const b = await chromium.launch(); const rows = [];
for (const w of widths) {
  const c = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, isMobile: w < 700, hasTouch: w < 700 });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500);
  await p.locator('input[type="email"], input[name="email"]').first().fill(seed.dealer);
  await p.locator('input[type="password"]').first().fill(seed.password);
  await p.locator('button[type="submit"]').first().click(); await p.waitForTimeout(3500);
  for (const s of sections) {
    await p.goto(`${BASE}/?nav=dealer-dashboard${s === 'overview' ? '' : '&section=' + s}`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
    const m = await p.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, h1: document.querySelector('h1,h2')?.textContent?.trim().slice(0, 40), tabs: [...document.querySelectorAll('[role=tab]')].map((t) => t.textContent.trim()), navLinks: [...document.querySelectorAll('nav[aria-label="Dealer workspace"] button, nav[aria-label="Dealer workspace"] a')].map((e) => e.textContent.trim()).length }));
    rows.push({ w, s, ...m, errs: errs.length });
    if ([320, 390, 768, 1280].includes(w)) await p.screenshot({ path: `${OUT}/${TAG}/${s}-${w}.png` });
  }
  await c.close();
}
fs.writeFileSync(`${OUT}/${TAG}/metrics.json`, JSON.stringify(rows, null, 1)); await b.close();
console.log('runs', rows.length, 'overflow', rows.filter((r) => r.overflow).length, 'errors', rows.filter((r) => r.errs).length);
