/* global console, document, getComputedStyle, process */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  for (const w of process.argv.slice(3).map(Number)) {
    const c = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
    const p = await c.newPage();
    await p.goto(process.argv[2] + '/', { waitUntil: 'networkidle' }).catch(() => {});
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const q = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), fs: cs.fontSize, ls: cs.letterSpacing }; };
      return { notice: q('[class*="TopNotice"], .kayad-notice, body > div > div:first-child'), header: q('.kayad-header'), bar: q('.kayad-header__bar'), brand: q('.kayad-brand'), img: q('.kayad-brand__image'), word: q('.kayad-brand__word'), tag: q('.kayad-brand__tag'), cta: q('.kayad-cta'), ham: q('.kayad-hamburger'), journey: q('#market-journey'), eyebrow: q('[aria-label="KAYAD mobile hero"] span.inline-flex') };
    });
    console.log(w, JSON.stringify(r));
    await c.close();
  }
  await b.close();
})();
