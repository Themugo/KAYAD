/* global console, document, getComputedStyle, process, window */
// Real-stack behaviour + axe checks. usage: node behaviour.cjs <base> <label> <outjson>
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const axeSrc = fs.readFileSync(process.argv[5] || 'node_modules/axe-core/axe.min.js', 'utf8');
const [base, label, outjson] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const res = { label, widths: {} };
  for (const w of [360, 390, 430, 768]) {
    const c = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
    const p = await c.newPage(); const r = {};
    await p.goto(base + '/', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1200);
    // sticky header + bottom clearance
    await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(300);
    r.headerTopAfterScroll = await p.evaluate(() => Math.round(document.querySelector('.kayad-header').getBoundingClientRect().top));
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(500);
    r.endClearance = await p.evaluate(() => { const nav = document.querySelector('.kayad-mobile-bottom-nav'); const f = document.querySelector('footer'); const fb = f.getBoundingClientRect().bottom; const nt = nav.getBoundingClientRect().top; return { footerBottom: Math.round(fb), navTop: Math.round(nt), footerClear: fb <= nt + 1 || fb >= nt }; });
    r.lastContentVisibleAboveNav = await p.evaluate(() => { const nav = document.querySelector('.kayad-mobile-bottom-nav').getBoundingClientRect(); const f = document.querySelector('footer').getBoundingClientRect(); return f.bottom <= nav.top + 1 ? 'footer fully above nav' : `footer bottom ${Math.round(f.bottom)} vs nav top ${Math.round(nav.top)} (body padding ${getComputedStyle(document.body).paddingBottom})`; });
    await p.evaluate(() => window.scrollTo(0, 0));
    // touch targets
    r.smallTargets = await p.evaluate(() => [...document.querySelectorAll('header a, header button, .kayad-mobile-bottom-nav button, #market-journey button, [aria-label="KAYAD mobile hero"] button')].map(e => { const b = e.getBoundingClientRect(); return { n: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), w: Math.round(b.width), h: Math.round(b.height) }; }).filter(t => t.w > 0 && (t.w < 44 || t.h < 44)));
    // axe
    await p.evaluate(axeSrc);
    const ax = await p.evaluate(async () => { const x = await window.axe.run(document, { resultTypes: ['violations'] }); return x.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0].target.join(' ').slice(0, 80) })); });
    r.axe = ax;
    // nav behaviour: Auction -> Back -> Home
    if (w < 1024) {
      const act = () => p.evaluate(() => { const a = document.querySelector('.kayad-mobile-bottom-nav .is-active'); return a ? a.textContent.trim() : null; });
      r.activeInitial = await act();
      await p.locator('.kayad-mobile-bottom-nav button', { hasText: 'Auction' }).click(); await p.waitForTimeout(1200);
      r.urlAfterAuction = p.url().replace(base, ''); r.activeAfterAuction = await act();
      await p.goBack(); await p.waitForTimeout(1200); r.urlAfterBack = p.url().replace(base, ''); r.activeAfterBack = await act();
      await p.goForward(); await p.waitForTimeout(1200); r.urlAfterForward = p.url().replace(base, ''); r.activeAfterForward = await act();
      await p.goto(base + '/?nav=saved', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1000); r.directSaved = { url: p.url().replace(base, ''), active: await act() };
    }
    res.widths[w] = r; await c.close();
  }
  fs.writeFileSync(outjson, JSON.stringify(res, null, 1));
  for (const [w, r] of Object.entries(res.widths)) console.log(w, JSON.stringify({ hdr: r.headerTopAfterScroll, end: r.lastContentVisibleAboveNav, small: r.smallTargets.length, axe: r.axe.map(a => a.id + ':' + a.impact + 'x' + a.n), nav: [r.activeInitial, r.urlAfterAuction, r.activeAfterAuction, r.urlAfterBack, r.activeAfterBack, r.urlAfterForward, r.directSaved] }));
  await b.close();
})();
