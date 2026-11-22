// Homepage hero harness: geometry (vehicle fully inside hero, no overlap, hero height), overflow, interactions, screenshots.
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'reports/HERO/evidence', TAG = process.env.TAG || 'after';
const widths = (process.env.WIDTHS || '320,340,360,375,390,412,430,600,768,1024,1280,1440,1920').split(',').map(Number);
fs.mkdirSync(`${OUT}/${TAG}`, { recursive: true });
const b = await chromium.launch(); const rows = [];
for (const w of widths) {
  const c = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, isMobile: w < 700, hasTouch: w < 700 });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const broken = []; p.on('response', (r) => { if (r.request().resourceType() === 'image' && r.status() >= 400) broken.push(r.url()); });
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  const m = await p.evaluate(() => {
    const R = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top + scrollY, w: b.width, h: b.height, r: b.right, b: b.bottom + scrollY }; };
    const hero = document.querySelector('.kayad-public-hero'); const img = document.querySelector('.kk-hero__img'); const cap = document.querySelector('.kk-hero__caption'); const ctl = document.querySelector('.kk-hero__controls'); const sc = document.querySelector('.kk-hero__shortcuts');
    const chips = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'All');
    const H = R(hero), I = R(img), C = R(cap), K = R(ctl), S = R(sc);
    const ov = (a, b) => a && b && a.x < b.r && a.r > b.x && a.y < b.b && a.b > b.y;
    return { hero: H, img: I, natural: img ? [img.naturalWidth, img.naturalHeight] : null, fit: img && getComputedStyle(img).objectFit, imgInsideHero: I && H && I.x >= H.x - 1 && I.r <= H.r + 1 && I.y >= H.y - 1 && I.b <= H.b + 1,
      overlapImgCaption: !!ov(I, C), overlapImgControls: !!ov(I, K), overlapCaptionControls: !!ov(C, K), overlapShortcutsImg: !!ov(S, I), pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, heroOverflowX: hero.scrollWidth > hero.clientWidth + 1,
      chipsTop: chips ? chips.getBoundingClientRect().top + scrollY : null, text: ['Drive Your', 'Find, compare and buy verified vehicles', 'Find a car', 'Sell a car', 'Auctions', 'Verified', 'ILLUSTRATIVE', '2026 Toyota Land Cruiser 300', 'showroom artwork'].map((t) => hero.innerText.toLowerCase().includes(t.toLowerCase()) || [...hero.querySelectorAll('[aria-label]')].some((e) => e.getAttribute('aria-label').toLowerCase().includes(t.toLowerCase()))) };
  });
  rows.push({ w, ...m, errs: errs.length, broken: broken.length });
  if ([320, 360, 390, 430, 600, 768, 1024, 1440, 1920].includes(w)) await p.screenshot({ path: `${OUT}/${TAG}/hero-${w}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(1100, Math.round(m.chipsTop + 60)) }, fullPage: true });
  if (process.env.INTERACT && w === 390) {
    const t = async () => (await p.locator('.kk-hero__caption-title').first().textContent());
    const t0 = await t(); await p.locator('[aria-label="Next featured vehicle"]').click(); await p.waitForTimeout(700); const t1 = await t();
    await p.locator('[aria-label="Previous featured vehicle"]').click(); await p.waitForTimeout(700); const t2 = await t();
    await p.locator('.kk-hero__dot').nth(1).click(); await p.waitForTimeout(700); const t3 = await t();
    const pb = p.locator('.kk-hero__ctl[aria-label*="automatic"]').first(); const l0 = await pb.getAttribute('aria-label'); await pb.click(); await p.waitForTimeout(300); const l1 = await pb.getAttribute('aria-label');
    rows.at(-1).interact = { t0, t1, t2, t3, pause: [l0, l1] };
    const dest = []; for (const name of ['Find a car', 'Sell a car', 'Auctions', 'Verified vehicles']) { await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200); await p.locator(`.kk-hero__shortcut[aria-label^="${name}"]`).click(); await p.waitForTimeout(1200); dest.push([name, p.url().replace(BASE, '')]); }
    rows.at(-1).interact.shortcuts = dest;
  }
  await c.close();
}
fs.writeFileSync(`${OUT}/${TAG}/metrics.json`, JSON.stringify(rows, null, 1)); await b.close();
for (const r of rows) console.log(r.w, 'hero', Math.round(r.hero.h), 'img', Math.round(r.img.w) + 'x' + Math.round(r.img.h), 'inside', r.imgInsideHero, 'ovl', r.overlapImgCaption || r.overlapImgControls || r.overlapCaptionControls || r.overlapShortcutsImg, 'pageOvf', r.pageOverflow, 'errs', r.errs, 'broken', r.broken, 'content', r.text.every(Boolean));
