// Responsive audit of KAYAD auth screens against the production build served by `vite preview`.
// Run from outside the project directory. Output: screenshots + JSON findings.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const OUT = process.env.OUT || '/home/claude/work/evidence/screens';
const WIDTHS = [320, 360, 390, 412, 430, 768, 1024, 1440];
const PAGES = [
  ['signin', '/login'],
  ['register', '/register'],
  ['forgot-password', '/forgot-password'],
  ['reset-password', '/reset-password'],
  ['verify-email', '/verify-email'],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const findings = [];
  for (const [name, route] of PAGES) {
    for (const w of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: w < 768 ? 800 : 900 }, deviceScaleFactor: 1, hasTouch: w < 768 });
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 160)));
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
      let status = null;
      try {
        const resp = await page.goto(BASE + route, { waitUntil: 'load', timeout: 30000 });
        status = resp && resp.status();
        await page.waitForTimeout(1200);
      } catch (e) { findings.push({ page: name, width: w, error: 'navigation: ' + e.message.slice(0, 120) }); await ctx.close(); continue; }

      const m = await page.evaluate(() => {
        const de = document.documentElement;
        const vw = window.innerWidth;
        const overflowX = de.scrollWidth > vw + 1;
        const wide = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
            const cs = getComputedStyle(el);
            if (cs.position !== 'fixed' && cs.visibility !== 'hidden') wide.push((el.tagName + '.' + (el.className && el.className.baseVal === undefined ? String(el.className).split(' ')[0] : '')).slice(0, 60));
          }
          if (wide.length > 5) break;
        }
        const controls = [...document.querySelectorAll('input:not([type=hidden]), button, a[href], select, textarea')].filter((e) => e.getBoundingClientRect().width > 0);
        const unnamed = controls.filter((e) => {
          const label = e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || (e.labels && e.labels.length) || (e.textContent || '').trim() || e.getAttribute('title') || e.getAttribute('placeholder');
          return !label;
        }).map((e) => e.tagName + (e.type ? ':' + e.type : '')).slice(0, 8);
        const small = controls.filter((e) => { const r = e.getBoundingClientRect(); return (e.tagName === 'BUTTON' || e.tagName === 'INPUT') && r.height < 40; }).map((e) => (e.tagName + ':' + (e.type || '') + ':' + Math.round(e.getBoundingClientRect().height))).slice(0, 8);
        const inputs = [...document.querySelectorAll('input:not([type=hidden])')].map((i) => ({ type: i.type, name: i.name || i.id, h: Math.round(i.getBoundingClientRect().height), fontSize: parseFloat(getComputedStyle(i).fontSize) }));
        const smallFont = inputs.filter((i) => i.fontSize < 16 && ['text', 'email', 'password', 'tel'].includes(i.type)).length; // iOS zoom-on-focus risk
        const h1 = [...document.querySelectorAll('h1,h2')].map((h) => h.textContent.trim().slice(0, 50)).slice(0, 2);
        const authPage = document.querySelector('.kayad-auth-page');
        return { overflowX, scrollWidth: de.scrollWidth, vw, wide, unnamed, small, inputs: inputs.length, smallFont, h1, mode: authPage && authPage.getAttribute('data-mode'), bodyText: document.body.innerText.trim().length };
      });
      const file = path.join(OUT, `${name}-${w}.png`);
      await page.screenshot({ path: file, fullPage: true });
      findings.push({ page: name, route, width: w, http: status, ...m, consoleErrors: consoleErrors.slice(0, 4) });
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, '..', 'auth-audit.json'), JSON.stringify(findings, null, 1));
  const bad = findings.filter((f) => f.overflowX || f.error);
  console.log('captured', findings.length, 'screens; overflow/errors:', bad.length);
  for (const f of findings) console.log(`${f.page.padEnd(16)} ${String(f.width).padStart(4)} http=${f.http} overflow=${f.overflowX ? 'YES' : 'no'} mode=${f.mode} inputs=${f.inputs} smallH=${(f.small || []).length} unnamed=${(f.unnamed || []).length} iosZoom=${f.smallFont} text=${f.bodyText} errs=${(f.consoleErrors || []).length}`);
})();
