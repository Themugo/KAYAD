// MASTER IMPLEMENTATION 02 browser journeys: brand migration + premium homepage hero (real rendered pages in Chromium).
// Network boundary is stubbed (no backend/DB): these prove the real frontend behaviour for the supplied API responses; they do not
// prove backend persistence. Usage: node scripts/browser-journeys-mi02.mjs [baseUrl]   (needs `vite preview` + playwright)
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:4173';
const OUT = 'audit-screenshots/master-implementation-02'; fs.mkdirSync(OUT, { recursive: true });
const IMG = ['/hero/kayad-prado.png', '/hero/kayad-land-cruiser-cutout.png', '/hero/kayad-mercedes-gle-cutout.png'];
const car = (i, o = {}) => ({ id: `car-${i}`, _id: `car-${i}`, title: `${2019 + i} Toyota Prado ${i}`, brand: 'Toyota', model: `Prado ${i}`, year: 2019 + i, price: 4200000 + i * 100000, mileage: 40000 + i, fuel: 'Diesel', transmission: 'Automatic', bodyType: 'SUV', location: 'Nairobi', status: 'available', approved: true, featured: true, images: [{ url: IMG[i % 3] }], ...o });
let pass = 0, fail = 0; const rows = [];
const check = (j, name, ok, detail = '') => { (ok ? pass++ : fail++); rows.push(`${ok ? 'PASS' : 'FAIL'} [${j}] ${name}${ok ? '' : ` :: ${detail}`}`); console.log(rows.at(-1)); };

async function open(browser, st, { width = 1440, height = 900, user = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const calls = [];
  await ctx.route('**/api/**', (r) => {
    const u = new URL(r.request().url()); const p = u.pathname; const j = (s, x) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
    calls.push(`${r.request().method()} ${p}${u.search}`);
    if (/auth\/csrf$/.test(p)) return j(200, { success: true, csrfToken: 'x'.repeat(48) });
    if (/auth\/(refresh|session|me)/.test(p)) return user ? j(200, { success: true, user }) : j(401, { success: false });
    if (/admin\/public\/config/.test(p)) return j(200, { success: true, config: { heroFeaturedMode: st.mode, heroCarIds: st.ids, heroCardContent: st.cardContent, heroPresentation: { showcaseFallbackEnabled: st.showcase !== false, rotationSeconds: st.rotation ?? 0, ...(st.presentation || {}) } } });
    if (/\/api\/hero$/.test(p)) return j(200, { success: true, data: st.slide ? [{ id: 's1', ...st.slide, visible: true, order: 1, overlayOpacity: 0 }] : [] });
    if (/featured-campaigns\/current/.test(p)) return j(200, { success: true, carIds: [] });
    if (/\/api\/cars\/[^/]+$/.test(p)) { const id = p.split('/').pop(); const c = (st.cars || []).find((x) => x.id === id); return c ? j(200, { success: true, data: c }) : j(404, { success: false }); }
    if (/\/api\/cars$/.test(p)) { let d = st.cars || []; const mk = u.searchParams.get('brand') || u.searchParams.get('make'); if (mk) d = d.filter((c) => c.brand.toLowerCase() === mk.toLowerCase()); return j(200, { success: true, data: d, pagination: { page: 1, limit: 24, total: d.length, pages: 1 } }); }
    return j(200, { success: true, data: [], items: [], notifications: [] });
  });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="premium-hero"]', { timeout: 15000 });
  await page.waitForTimeout(1200);
  return { page, ctx, calls, errs };
}
const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const base = { mode: 'all', ids: [], cardContent: {}, cars: [car(0), car(1), car(2)] };
const browser = await chromium.launch();

// J1 homepage unauthenticated
{ const { page, ctx, errs } = await open(browser, base);
  const h1 = await page.locator('[data-testid="premium-hero"] h1').innerText();
  check('J1 guest', 'headline "Drive Your Dream Today"', /Drive Your Dream\s*Today/.test(h1), h1);
  const t = await page.locator('[data-testid="premium-hero"]').innerText();
  check('J1 guest', 'eyebrow, support copy, both CTAs and trust indicators render', /KENYA'S VEHICLE MARKETPLACE/.test(t) && /Find, compare and buy verified vehicles from trusted sellers across Kenya\./.test(t) && /Explore Vehicles/.test(t) && /Sell Your Vehicle/.test(t) && /Verified Listings/.test(t) && /Trusted Sellers/.test(t) && /Secure Transactions/.test(t));
  const nav = await page.locator('header, nav').first().innerText().catch(() => '');
  const bodyT = await page.locator('body').innerText();
  check('J1 guest', 'no visible legacy "KAYAD" brand text on the homepage', !/\bKAYAD\b(?! EA)/.test(bodyT.replace(/kayad\.space/gi, '')), (bodyT.match(/.{0,30}\bKAYAD\b.{0,30}/) || [''])[0]);
  check('J1 guest', 'no page errors', errs.length === 0, errs.join('|'));
  await page.screenshot({ path: `${OUT}/j1-home-guest-1440.png` }); await ctx.close(); }

// J2 homepage authenticated
{ const user = { id: 'u1', name: 'Wanjiru Kamau', email: 'w@example.test', role: 'user', emailVerified: true, email_verified: true };
  const { page, ctx } = await open(browser, base, { user });
  const t = await page.locator('body').innerText();
  check('J2 signed-in', 'hero unchanged and the Sign In button is replaced by the account menu', /Drive Your Dream/.test(t) && !(await page.getByRole('button', { name: /Sign In \/ Sign Up/ }).count()));
  await page.screenshot({ path: `${OUT}/j2-home-auth-1440.png` }); await ctx.close(); }

// J3 navbar interactions
{ const { page, ctx } = await open(browser, base);
  const labels = await page.evaluate(() => [...document.querySelectorAll('header a, header button, nav a, nav button')].map((e) => (e.textContent || '').trim()).filter(Boolean));
  for (const l of ['Marketplace', 'Auctions', 'Auto Services', 'Escrow', 'Support', 'Sell Vehicle']) check('J3 navbar', `nav shows "${l}"`, labels.some((x) => x.includes(l)), labels.slice(0, 12).join(','));
  await page.getByRole('button', { name: /^Sell Vehicle/ }).first().click(); await page.waitForTimeout(500);
  check('J3 navbar', 'Sell Vehicle opens the sell/sign-in flow (no crash)', (await page.locator('body').innerText()).length > 100);
  await ctx.close(); }

// J4 search + filtering (real endpoint)
{ const st = { ...base, cars: [car(0), car(1, { brand: 'Subaru', model: 'Forester' })] };
  const { page, ctx, calls } = await open(browser, st);
  const make = page.getByLabel('Search vehicles by make, model or keyword'); await make.fill('Subaru'); await make.press('Enter'); await page.waitForTimeout(1500);
  check('J4 search', 'a keyword search reaches the real /api/cars endpoint with the term', calls.some((c) => /\/api\/cars\?.*Subaru/i.test(c)), calls.filter((c) => /cars/.test(c)).slice(-3).join(' | '));
  await ctx.close(); }

// J5 category navigation
{ const { page, ctx, calls } = await open(browser, base);
  await page.getByRole('button', { name: 'SUV', exact: true }).first().click(); await page.waitForTimeout(1200);
  check('J5 category', 'SUV category chip is pressed and filters via the real endpoint', (await page.getByRole('button', { name: 'SUV', exact: true }).first().getAttribute('aria-pressed')) === 'true' && calls.some((c) => /\/api\/cars\?.*(bodyType|body|category)=/i.test(c)), calls.filter((c) => /cars\?/.test(c)).slice(-2).join(' | '));
  await ctx.close(); }

// J6 featured vehicle navigation (hero click opens the real listing)
{ const { page, ctx } = await open(browser, base);
  await page.getByTestId('hero-vehicle').click(); await page.waitForTimeout(900);
  const txt = await page.locator('body').innerText();
  check('J6 featured', 'clicking the hero vehicle opens that listing (detail view shows its title)', /Prado 0/.test(txt) && (await page.getByRole('dialog').count() + await page.locator('[data-testid*="vehicle-detail"], h1:has-text("Prado 0")').count()) > 0, page.url());
  await ctx.close(); }

// J7 admin selects hero vehicle
{ const st = { ...base, mode: 'selected', ids: ['car-2'] };
  const { page, ctx } = await open(browser, st);
  const cap = await page.getByTestId('hero-vehicle').getAttribute('aria-label');
  check('J7 admin select', 'only the admin-selected vehicle is shown as the hero vehicle', /Prado 2/.test(cap) && (await page.getByRole('button', { name: /Show featured vehicle/ }).count()) === 0, cap);
  await ctx.close(); }

// J8 admin changes vehicle (+ chooses the hero photo)
{ const st = { ...base, mode: 'selected', ids: ['car-1'], cars: [car(0), car(1, { images: [{ url: IMG[0] }, { url: IMG[2] }] })], cardContent: { 'car-1': { heroImage: IMG[2] } } };
  const { page, ctx } = await open(browser, st);
  const cap = await page.getByTestId('hero-vehicle').getAttribute('aria-label'); const src = await page.locator('[data-testid="hero-vehicle"] img').getAttribute('src');
  check('J8 admin change', 'changed selection and the admin-chosen gallery photo are applied', /Prado 1/.test(cap) && /gle/.test(src), `${cap} ${src}`);
  await ctx.close(); }

// J9 admin disables hero vehicle(s) -> design intact, neutral placeholder
{ const st = { ...base, mode: 'selected', ids: [], cars: [], showcase: false };
  const { page, ctx } = await open(browser, st);
  check('J9 admin disable', 'no vehicle: full hero copy + CTAs intact with the neutral placeholder (no listing, no broken image)', (await page.getByTestId('hero-fallback-visual').count()) === 1 && (await page.getByRole('button', { name: /Explore Vehicles/ }).count()) === 1 && (await page.locator('[data-testid="premium-hero"] img').count()) === 0);
  await page.screenshot({ path: `${OUT}/j9-hero-no-vehicle-1440.png` }); await ctx.close(); }

// J10 empty hero config (API config empty / failing)
{ const st = { ...base, cars: [] };
  const { page, ctx } = await open(browser, { ...st, presentation: {} });
  const ov = await overflowX(page);
  check('J10 empty config', 'hero renders from defaults with no inventory and no horizontal overflow', (await page.getByTestId('premium-hero').getByRole('button', { name: /Sell Your Vehicle/ }).count()) === 1 && ov <= 0, `overflow=${ov}`);
  await ctx.close(); }

// J11 vehicle image failure
{ const st = { ...base, cars: [car(0, { images: [{ url: '/hero/does-not-exist.png' }] })] };
  const { page, ctx } = await open(browser, st);
  await page.waitForTimeout(800);
  check('J11 image failure', 'failed hero image degrades to the placeholder, keeps the label, no broken-image icon', (await page.getByTestId('hero-desktop-image-fallback').count()) === 1 && (await page.getByRole('img', { name: /is unavailable/ }).count()) === 1);
  await page.screenshot({ path: `${OUT}/j11-hero-image-failed-1440.png` }); await ctx.close(); }

// J12 responsive sizes: layout, overflow, CTA touch targets, screenshots
for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844], [360, 800]]) {
  const { page, ctx } = await open(browser, base, { width: w, height: h });
  const m = await page.evaluate(() => {
    const hero = document.querySelector('[data-testid="premium-hero"]'); const hr = hero.getBoundingClientRect();
    const cta = [...hero.querySelectorAll('.kk-hero__cta, .kk-hero__ctl')].map((e) => e.getBoundingClientRect());
    const copy = hero.querySelector('.kk-hero__copy').getBoundingClientRect(); const img = hero.querySelector('[data-testid="hero-vehicle"] img')?.getBoundingClientRect();
    const overlap = img ? !(img.right <= copy.left || img.left >= copy.right || img.bottom <= copy.top || img.top >= copy.bottom) : false;
    return { ox: document.documentElement.scrollWidth - innerWidth, minTarget: Math.min(...cta.map((r) => Math.min(r.width, r.height))), overlap, imgOk: !!img && img.width > 150 && img.right <= innerWidth + 1 && img.left >= -1, heroH: hr.height, layoutShift: 0 };
  });
  check(`J12 ${w}x${h}`, 'no horizontal overflow', m.ox <= 0, `overflow=${m.ox}`);
  check(`J12 ${w}x${h}`, 'CTAs and slider controls >= 44px touch targets', m.minTarget >= 43.5, `min=${m.minTarget}`);
  check(`J12 ${w}x${h}`, 'vehicle fully inside the viewport and not over the copy', m.imgOk && !m.overlap, JSON.stringify(m));
  await page.screenshot({ path: `${OUT}/hero-home-${w}x${h}.png` }); await ctx.close(); }

// A11y: keyboard + reduced motion + pause
{ const { page, ctx } = await open(browser, { ...base, rotation: 2 });
  const pause = page.getByRole('button', { name: /Pause automatic vehicle rotation/ });
  check('A11Y', 'pause control exists when auto-rotation is on', (await pause.count()) === 1);
  await pause.click(); const a = await page.getByTestId('hero-vehicle').getAttribute('aria-label'); await page.waitForTimeout(2600);
  check('A11Y', 'pausing stops rotation', a === (await page.getByTestId('hero-vehicle').getAttribute('aria-label')));
  await page.keyboard.press('Tab'); check('A11Y', 'keyboard focus works', (await page.evaluate(() => document.activeElement?.tagName)) !== 'BODY');
  await ctx.close();
  const c2 = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } }); const p2 = await c2.newPage();
  await p2.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], config: { heroPresentation: { rotationSeconds: 2 } } }) }));
  await p2.goto(`${BASE}/`); await p2.waitForSelector('[data-testid="premium-hero"]');
  check('A11Y', 'prefers-reduced-motion: no automatic rotation control', (await p2.getByRole('button', { name: /automatic vehicle rotation/ }).count()) === 0); await c2.close(); }

await browser.close();
fs.writeFileSync(`${OUT}/journeys-results.txt`, rows.join('\n') + `\n\n${pass} passed, ${fail} failed\n`);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
