const { chromium } = require('playwright'); const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const routes = JSON.parse(fs.readFileSync('/home/claude/work/pw/routes.json', 'utf8'));
const WIDTHS = [390, 1440];
(async () => {
  const b = await chromium.launch(); const out = [];
  for (const [route, role] of routes) {
    const row = { route, role, vp: {} };
    for (const w of WIDTHS) {
      const ctx = await b.newContext({ viewport: { width: w, height: 800 }, hasTouch: w < 768 });
      const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
      let http = null, finalUrl = null, overflow = null, h1 = '', len = 0, err = null;
      try {
        const r = await p.goto(BASE + route, { waitUntil: 'load', timeout: 30000 }); http = r && r.status();
        await p.waitForTimeout(1500);
        const u = new URL(p.url()); finalUrl = u.pathname + u.search;
        const m = await p.evaluate(() => ({ o: document.documentElement.scrollWidth > window.innerWidth + 1, h: (document.querySelector('h1,h2') || {}).textContent || '', n: document.body.innerText.trim().length }));
        overflow = m.o; h1 = (m.h || '').trim().slice(0, 50); len = m.n;
      } catch (e) { err = e.message.slice(0, 100); }
      row.vp[w] = { http, finalUrl, overflow, h1, len, pageErrors: errs.slice(0, 2), err };
      await ctx.close();
    }
    out.push(row); process.stdout.write('.');
  }
  await b.close(); fs.writeFileSync('/home/claude/work/evidence/route-smoke.json', JSON.stringify(out, null, 1)); console.log('\nrows', out.length);
})();
