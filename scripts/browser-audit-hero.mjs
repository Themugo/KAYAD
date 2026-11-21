// Homepage hero browser audit (real rendered pages, API stubbed at the network boundary).
// Usage: node scripts/browser-audit-hero.mjs [baseUrl] [--shots]   (needs `vite preview` running and playwright installed)
// Checks per state x viewport: renders, no horizontal overflow, no duplicate vehicle, composition matches the vehicle count,
// card/vehicle/controls do not overlap, nothing clipped by the stage, CTA text stays inside its button, touch targets >= 44px,
// pause control works and stops rotation, broken desktop image degrades to the fallback plate, illustrative artwork is labelled.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:4173';
const SHOTS = process.argv.includes('--shots');
const OUT = 'docs/audits/screenshots/hero';
if (SHOTS) fs.mkdirSync(OUT, { recursive: true });

const WIDTHS = [320, 360, 375, 390, 414, 430, 640, 768, 820, 900, 1024, 1100, 1200, 1280, 1366, 1440, 1600, 1920];
const IMG = ['/hero/kayad-prado.png', '/hero/kayad-land-cruiser-cutout.png', '/hero/kayad-mercedes-gle-cutout.png', '/hero/kayad-land-cruiser-clean.png'];
const mkCar = (i, over = {}) => ({ id: `real-${i}`, _id: `real-${i}`, title: `${2019 + i} Toyota Prado ${i}`, brand: 'Toyota', model: `Prado ${i}`, year: 2019 + i, price: 4200000 + i * 100000, mileage: 40000, fuel: 'Diesel', transmission: 'Automatic', bodyType: 'SUV', location: 'Nairobi', status: 'available', approved: true, featured: true, images: [{ url: IMG[i % IMG.length] }], ...over });

const STATES = {
  'real-0': { cars: [], showcase: true },
  'real-1': { cars: [mkCar(0)] },
  'real-2': { cars: [mkCar(0), mkCar(1)] },
  'real-3': { cars: [mkCar(0), mkCar(1), mkCar(2)] },
  'real-dupes': { cars: [mkCar(0), mkCar(0), mkCar(1)] },
  'broken-image': { cars: [mkCar(0, { images: [{ url: '/hero/does-not-exist.png' }] }), mkCar(1, { images: [{ url: '/hero/does-not-exist-2.png' }] })] },
  'long-cta': { cars: [mkCar(0), mkCar(1)], slide: { ctaPrimaryText: 'Browse every single verified vehicle currently listed across the whole of Kenya today', ctaSecondaryText: 'Learn how KAYAD protects buyers, sellers and dealers on every transaction', headline: 'Drive Your Dream Today', eyebrowText: 'KAYAD KE · PREMIUM AUTOMOTIVE MARKETPLACE', subheadline: 'x'.repeat(10) + ' Discover quality vehicles across Kenya with transparent, verified listings.' } },
  'showcase-off': { cars: [], showcase: false },
  'unsafe-admin': { cars: [mkCar(0), mkCar(1)], presentation: { stageHeightPct: 5, cardWidthPct: 5, cardScalePct: 5, backgroundUrl: 'javascript:alert(1)' } },
};
const stateNames = process.argv.find((a) => a.startsWith('--states='))?.slice(9).split(',') || Object.keys(STATES);
const widths = process.argv.find((a) => a.startsWith('--widths='))?.slice(9).split(',').map(Number) || WIDTHS;

const rows = []; const browser = await chromium.launch();
for (const name of stateNames) {
  const st = STATES[name];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route('**/api/**', (r) => {
    const u = new URL(r.request().url()); const p = u.pathname; const j = (s, x) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
    if (/auth\/csrf$/.test(p)) return j(200, { success: true, csrfToken: 'x'.repeat(48) });
    if (/auth\/(refresh|session|me)/.test(p)) return j(401, { success: false, message: 'Not signed in' });
    if (/admin\/public\/config/.test(p)) return j(200, { success: true, config: { heroPresentation: { showcaseFallbackEnabled: st.showcase !== false, rotationSeconds: 3, ...(st.presentation || {}) } } });
    if (/\/api\/hero$/.test(p)) return j(200, { success: true, data: st.slide ? [{ id: 's1', ...st.slide, visible: true, order: 1, overlayOpacity: 0 }] : [] });
    if (/featured-campaigns\/current/.test(p)) return j(200, { success: true, carIds: [] });
    if (/\/api\/cars$/.test(p)) return j(200, { success: true, data: st.cars, pagination: { page: 1, limit: 24, total: st.cars.length, pages: 1 } });
    return j(200, { success: true, data: [], items: [], notifications: [] });
  });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
  for (const w of widths) {
    errs.length = 0;
    await page.setViewportSize({ width: w, height: w < 700 ? 800 : 900 });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.kayad-public-hero', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const hero = document.querySelector('.kayad-public-hero');
      const desktop = innerWidth >= 1024;
      const q = (sel, root = document) => [...root.querySelectorAll(sel)];
      const visible = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
      const rect = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const hit = (a, b) => a && b && a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1;
      if (!hero) return { missing: true };
      const stage = hero.querySelector('[data-testid="hero-stage"]');
      const vehicleEls = desktop ? q('[data-testid^="hero-desktop-vehicle-"]', hero).filter(visible) : q('[data-testid="hero-mobile-stage"] button', hero).filter((b) => b.querySelector('img, [role="img"]')).filter(visible);
      const imgs = vehicleEls.map((el) => el.querySelector('img')?.getAttribute('alt') || el.getAttribute('aria-label') || '');
      const card = desktop ? hero.querySelector('h1')?.closest('.rounded-\\[30px\\]') : hero.querySelector('.kayad-public-hero__mobile-card');
      const cardR = card ? rect(card) : null;
      const vRects = vehicleEls.map(rect);
      const overlapsCard = vRects.some((r) => hit(r, cardR));
      const vehiclesOverlap = vRects.length === 2 && hit(vRects[0], vRects[1]);
      const heroR = rect(hero); const stageR = stage ? rect(stage) : heroR;
      const clipped = [...vRects, ...(cardR ? [cardR] : [])].some((r) => r.l < stageR.l - 1 || r.r > stageR.r + 1);
      const cardTall = cardR && (cardR.b > heroR.b + 1 || cardR.t < heroR.t - 1);
      const ctas = q('.kayad-public-hero__primary-cta, .kayad-public-hero__secondary-cta', hero).filter(visible);
      const ctaBad = ctas.filter((b) => b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1 || b.getBoundingClientRect().height < 43).map((b) => b.textContent.trim().slice(0, 30));
      const ctaOutside = ctas.some((b) => { const r = b.getBoundingClientRect(); return cardR && (r.right > cardR.r + 1 || r.left < cardR.l - 1); });
      const ctl = q('.kayad-hero-ctl, [aria-label^="Previous featured"], [aria-label^="Next featured"], [aria-label*="automatic vehicle rotation"]', hero).filter(visible);
      const smallCtl = ctl.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 43 || r.height < 43; }).map((e) => e.getAttribute('aria-label'));
      const ctlOverlapVehicle = ctl.filter((c) => !/Previous|Next/.test(c.getAttribute('aria-label') || '')).some((c) => vRects.some((r) => hit(rect(c), r)));
      const dots = q('[aria-label="Featured vehicle slides"]', hero).filter(visible);
      const ctlOverlapCard = [...ctl.filter((c) => !/Previous|Next/.test(c.getAttribute('aria-label') || '')), ...dots].some((c) => hit(rect(c), cardR));
      const fallbackPlates = q('[data-testid="hero-desktop-image-fallback"], [role="img"][aria-label$="is unavailable"]', hero).filter(visible).length;
      const brokenIcons = q('img', hero).filter(visible).filter((i) => i.complete && i.naturalWidth === 0).length;
      const labels = q('[data-illustrative="true"]', hero).length;
      const bodyText = hero.innerText;
      return {
        sw: document.documentElement.scrollWidth, iw: innerWidth, desktop, vehicles: vehicleEls.length, imgs, overlapsCard, vehiclesOverlap, clipped, cardTall,
        comp: (hero.querySelector('[data-hero-composition]') || {}).dataset?.heroComposition || null, ctaBad, ctaOutside, smallCtl, ctlOverlapVehicle, ctlOverlapCard, fallbackPlates, brokenIcons,
        illustrativeCount: labels, hasIllustrativeText: /ILLUSTRATIVE|not a listing/i.test(bodyText), emptyNote: /Featured vehicles appear here/.test(bodyText),
        env: hero.getAttribute('data-hero-environment'), pause: q('[aria-label*="automatic vehicle rotation"]', hero).filter(visible).length,
        heroH: Math.round(heroR.height), cardH: cardR ? Math.round(cardR.h) : 0,
      };
    });
    const issues = [];
    const expected = { 'real-0': 1, 'real-1': 1, 'real-2': 1, 'real-3': 1, 'real-dupes': 1, 'broken-image': 1, 'long-cta': 1, 'showcase-off': 0, 'unsafe-admin': 1 }[name];
    if (m.missing) issues.push('hero missing');
    else {
      if (m.sw > m.iw) issues.push(`horizontal overflow ${m.sw}>${m.iw}`);
      if (errs.length) issues.push('pageerror: ' + errs[0]);
      if (m.vehicles !== expected) issues.push(`expected ${expected} visible vehicle(s) got ${m.vehicles}`);
      if (new Set(m.imgs).size !== m.imgs.length) issues.push(`duplicate vehicle shown: ${m.imgs.join(' | ')}`);
      if (m.overlapsCard) issues.push('vehicle overlaps centre card');
      if (m.vehiclesOverlap) issues.push('vehicles overlap each other');
      if (m.clipped) issues.push('content outside stage');
      if (m.cardTall) issues.push('card clipped by hero');
      if (m.ctaBad.length) issues.push('CTA text overflow/short: ' + m.ctaBad.join(','));
      if (m.ctaOutside) issues.push('CTA outside card');
      if (m.smallCtl.length) issues.push('hero control < 44px: ' + m.smallCtl.join(','));
      if (m.ctlOverlapVehicle) issues.push('hero control overlaps vehicle');
      if (m.ctlOverlapCard) issues.push('hero pause/dots control overlaps the centre card');
      if (m.brokenIcons) issues.push('broken image icon visible');
      if (m.env !== 'showroom') issues.push(`environment ${m.env}`);
      if (name === 'broken-image' && m.fallbackPlates < 1) issues.push('no fallback plate for broken images');
      if (name === 'real-0' && (!m.hasIllustrativeText || m.illustrativeCount < 1)) issues.push('showcase not labelled illustrative');
      if (name !== 'real-0' && m.illustrativeCount) issues.push('illustrative artwork shown despite real inventory');
      if (name === 'real-1' && m.comp !== 'single') issues.push(`single vehicle composition expected, got ${m.comp}`);
      if (name === 'showcase-off' && !m.emptyNote) issues.push('empty state note missing');
      if (name === 'real-3' && m.pause < 1 && !(w >= 0 && false)) issues.push('pause control missing');
    }
    rows.push({ state: name, w, issues, heroH: m.heroH, cardH: m.cardH });
    if (issues.length) console.log(`ISSUE ${name} @${w}: ${issues.join('; ')}`);
    if (SHOTS && [320, 390, 768, 1024, 1280, 1920].includes(w) && ['real-0', 'real-1', 'real-2', 'real-3', 'long-cta', 'broken-image', 'showcase-off'].includes(name)) {
      await page.locator('.kayad-public-hero').screenshot({ path: path.join(OUT, `after-${name}-${w}.png`) }).catch(() => {});
    }
  }
  await ctx.close();
}

// Behaviour: pause control stops rotation; hover pauses; reduced motion disables autoplay.
const beh = [];
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const st = STATES['real-3'];
  await ctx.route('**/api/**', (r) => { const p = new URL(r.request().url()).pathname; const j = (s, x) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
    if (/auth\/csrf$/.test(p)) return j(200, { success: true, csrfToken: 'x'.repeat(48) });
    if (/auth\//.test(p)) return j(401, { success: false });
    if (/admin\/public\/config/.test(p)) return j(200, { success: true, config: { heroPresentation: { rotationSeconds: 3 } } });
    if (/\/api\/cars$/.test(p)) return j(200, { success: true, data: [...st.cars, mkCar(3)], pagination: { page: 1, limit: 24, total: 4, pages: 1 } });
    if (/featured-campaigns/.test(p)) return j(200, { carIds: [] });
    return j(200, { success: true, data: [] }); });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('[data-testid="hero-stage"]'); await page.waitForTimeout(800);
  const cur = () => page.evaluate(() => [...document.querySelectorAll('[data-testid^="hero-desktop-vehicle-"] img')].map((i) => i.alt).join('|'));
  const a0 = await cur(); await page.waitForTimeout(4500); const a1 = await cur();
  beh.push({ name: 'autoplay rotates when idle', pass: a0 !== a1, a0, a1 });
  await page.getByRole('button', { name: 'Pause automatic vehicle rotation' }).click();
  const pressed = await page.getByRole('button', { name: 'Resume automatic vehicle rotation' }).getAttribute('aria-pressed');
  const b0 = await cur(); await page.mouse.move(5, 5); await page.waitForTimeout(7000); const b1 = await cur();
  beh.push({ name: 'pause button stops rotation (aria-pressed=true)', pass: b0 === b1 && pressed === 'true' });
  await page.getByRole('button', { name: 'Resume automatic vehicle rotation' }).click();
  await page.mouse.move(640, 400); const c0 = await cur(); await page.waitForTimeout(7000); const c1 = await cur();
  beh.push({ name: 'hover over the hero pauses rotation', pass: c0 === c1 });
  await page.mouse.move(5, 5);
  await page.getByRole('button', { name: 'Next featured vehicle' }).first().focus(); const d0 = await cur(); await page.waitForTimeout(7000); const d1 = await cur();
  beh.push({ name: 'keyboard focus inside the hero pauses rotation', pass: d0 === d1 });
  await ctx.close();
  const rm = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await rm.route('**/api/**', (r) => { const p = new URL(r.request().url()).pathname; const j = (s, x) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
    if (/auth\/csrf$/.test(p)) return j(200, { success: true, csrfToken: 'x'.repeat(48) });
    if (/auth\//.test(p)) return j(401, { success: false });
    if (/admin\/public\/config/.test(p)) return j(200, { success: true, config: { heroPresentation: { rotationSeconds: 3 } } });
    if (/\/api\/cars$/.test(p)) return j(200, { success: true, data: [...st.cars, mkCar(3)], pagination: { page: 1, limit: 24, total: 4, pages: 1 } });
    if (/featured-campaigns/.test(p)) return j(200, { carIds: [] });
    return j(200, { success: true, data: [] }); });
  const rp = await rm.newPage(); await rp.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await rp.waitForSelector('[data-testid="hero-stage"]'); await rp.waitForTimeout(800);
  const cur2 = () => rp.evaluate(() => [...document.querySelectorAll('[data-testid^="hero-desktop-vehicle-"] img')].map((i) => i.alt).join('|'));
  const e0 = await cur2(); await rp.waitForTimeout(6000); const e1 = await cur2();
  beh.push({ name: 'prefers-reduced-motion: no automatic rotation', pass: e0 === e1 });
  await rm.close();
}
await browser.close();
for (const b of beh) console.log(`${b.pass ? 'PASS' : 'FAIL'} behaviour: ${b.name}`);
const bad = rows.filter((r) => r.issues.length);
fs.mkdirSync('docs/audits/screenshots', { recursive: true });
fs.writeFileSync('docs/audits/screenshots/hero-audit-results.json', JSON.stringify({ ranAt: new Date().toISOString(), loads: rows.length, withIssues: bad.length, behaviours: beh, rows }, null, 1));
console.log(`${rows.length} hero loads, ${bad.length} with issues, ${beh.filter((b) => !b.pass).length} behaviour failures`);
process.exit(bad.length || beh.some((b) => !b.pass) ? 1 : 0);
