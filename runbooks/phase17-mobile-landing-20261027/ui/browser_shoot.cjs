/* global console, document, getComputedStyle, process */
// usage: node shoot.cjs <baseUrl> <outDir> <label> [widths csv]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const [base, out, label, wcsv] = process.argv.slice(2);
const widths = (wcsv || '360,375,390,412,430,768,1280,1440').split(',').map(Number);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const w of widths) {
    const mobile = w < 768;
    const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 800 : 900 }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile,
      userAgent: mobile ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' : undefined });
    const page = await ctx.newPage();
    const errors = [], failed = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    page.on('requestfailed', r => failed.push(r.url().slice(0, 120)));
    page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().slice(0, 120)); });
    await page.goto(base + '/', { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const hdr = document.querySelector('header, nav');
      const bn = document.querySelector('.kayad-mobile-bottom-nav');
      const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), h: Math.round(b.height), w: Math.round(b.width) }; };
      const over = []; document.querySelectorAll('body *').forEach(e => { const b = e.getBoundingClientRect(); if (b.right > de.clientWidth + 1 && b.width > 0 && getComputedStyle(e).position !== 'fixed') over.push((e.className && e.className.toString().slice(0, 50)) || e.tagName); });
      return { scrollW: de.scrollWidth, clientW: de.clientWidth, header: r(hdr), bottomNav: r(bn), overflowers: over.slice(0, 5), status: [...document.querySelectorAll('#market-journey span')].map(s => s.textContent.trim()).slice(0, 4), h1: (document.querySelector('h1') || {}).textContent, bodyPadBottom: getComputedStyle(document.body).paddingBottom };
    });
    await page.screenshot({ path: `${out}/${label}-${w}-first.png` });
    await page.screenshot({ path: `${out}/${label}-${w}-full.png`, fullPage: true });
    results.push({ w, ...m, errors: errors.slice(0, 5), failed: failed.slice(0, 5) });
    await ctx.close();
  }
  fs.writeFileSync(`${out}/${label}-metrics.json`, JSON.stringify(results, null, 1));
  console.log(JSON.stringify(results.map(r => ({ w: r.w, ovf: r.scrollW - r.clientW, hdr: r.header, bn: r.bottomNav, st: r.status, err: r.errors.length, fail: r.failed.length })), null, 0));
  await browser.close();
})();
