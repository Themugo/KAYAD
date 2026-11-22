// Mobile/desktop screenshot + metrics harness for the homepage catalogue, vehicle details and shells.
// Usage: BASE=http://127.0.0.1:5299 TAG=before OUT=reports/MOBILE-EXPERIENCE/evidence node ci/browser/responsive.mjs
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299'; const TAG = process.env.TAG || 'run';
const OUT = path.join(process.env.OUT || 'reports/MOBILE-EXPERIENCE/evidence', TAG); fs.mkdirSync(OUT, { recursive: true });
const seed = JSON.parse(fs.readFileSync(process.env.SEED || 'ci/db-journeys/out/browser-seed.json', 'utf8'));
const WIDTHS = (process.env.WIDTHS || '320,340,360,375,390,393,412,430,480,600,768,1024,1280,1440,1920').split(',').map(Number);
const SHOT = new Set((process.env.SHOT || '320,360,390,430,768,1024,1280,1440,1920').split(',').map(Number));
const LAND = (process.env.LANDSCAPE || '1') === '1';
const FULL = new Set((process.env.FULL || '390,1280').split(',').map(Number));
const results = []; const browser = await chromium.launch();
async function run(w, h, label, view, auth) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 800, hasTouch: w < 800 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 }); await page.waitForTimeout(3500);
    if (view === 'list') { const b = page.locator('[aria-label="Inventory view"] button').nth(1); if (await b.count()) { await b.click(); await page.waitForTimeout(800); } }
    const m = await page.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
      const hero = document.querySelector('[class*="hero"], [data-testid*="hero"], section'); const cards = [...document.querySelectorAll('article')];
      const nav = document.querySelector('nav[aria-label*="obile" i], [data-testid*="bottom-nav"], .kayad-mobile-nav, nav.fixed');
      const navRect = nav ? nav.getBoundingClientRect() : null;
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, cards: cards.length, cardW: cards[0] ? Math.round(cards[0].getBoundingClientRect().width) : null, cols: cards.length ? new Set(cards.map((c) => Math.round(c.getBoundingClientRect().x))).size : 0, nav: navRect ? { top: Math.round(navRect.top), h: Math.round(navRect.height), pos: getComputedStyle(nav).position } : null, h1: document.querySelector('h1')?.textContent?.trim().slice(0, 50) || null, ih: innerHeight, docH: document.documentElement.scrollHeight };
    });
    const rec = { label, w, h, view, overflow: m.sw > m.iw + 1, ...m, errs };
    if (SHOT.has(w) || label === 'landscape') { const f = `${label}-${view}-${w}x${h}.png`; await page.screenshot({ path: path.join(OUT, f), fullPage: FULL.has(w) && label === 'portrait' }); rec.shot = f; }
    results.push(rec);
  } catch (e) { results.push({ label, w, h, view, error: String(e.message).slice(0, 160) }); }
  await ctx.close();
}
for (const w of WIDTHS) for (const view of ['grid', 'list']) await run(w, w < 800 ? 844 : 900, 'portrait', view);
if (LAND) for (const [w, h] of [[667, 375], [844, 390], [915, 412], [932, 430]]) await run(w, h, 'landscape', 'grid');
await browser.close();
fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(results, null, 1));
console.log(`runs=${results.length} overflow=${results.filter((r) => r.overflow).length} errors=${results.filter((r) => r.error).length}`);
for (const r of results.filter((x) => x.overflow || x.error)) console.log(r.overflow ? 'OVERFLOW' : 'ERROR', r.label, r.view, r.w, r.sw ?? r.error);
