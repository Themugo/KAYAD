// Width sweep: 18 viewport widths (320-1920) x key surfaces x roles. Fails on horizontal overflow, uncaught errors, or an empty page.
// Usage: node scripts/browser-audit-width-sweep.mjs [baseUrl]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const WIDTHS = [320, 340, 360, 375, 390, 412, 430, 480, 600, 768, 820, 900, 1024, 1180, 1280, 1440, 1680, 1920];
const SURFACES = [['/', null], ['/?nav=discovery', null], ['/?nav=inspections', null], ['/?nav=dashboard', 'user'], ['/?nav=seller-platform', 'individual_seller'], ['/?nav=dealer-dashboard', 'dealer'], ['/login', null]];
const cars = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, _id: `c${i}`, title: `2019 Toyota Prado ${i}`, brand: 'Toyota', model: 'Prado', year: 2019, price: 4e6, mileage: 40000, fuel: 'Petrol', transmission: 'Automatic', bodyType: 'SUV', city: 'Nairobi', status: 'available', images: [{ url: '/hero/kayad-prado.png' }], createdAt: new Date().toISOString() }));
const b = await chromium.launch(); let n = 0, bad = 0;
for (const w of WIDTHS) for (const [path, role] of SURFACES) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 800 : 900 }, isMobile: w < 700, hasTouch: w < 700 });
  if (role) await ctx.addInitScript(() => localStorage.setItem('kayad_session_hint', '1'));
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.route('**/api/**', (r) => { const p = new URL(r.request().url()).pathname; const j = (s, x) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
    if (/csrf$/.test(p)) return j(200, { success: true, csrfToken: 'x'.repeat(48) });
    if (/auth\/me$/.test(p)) return role ? j(200, { success: true, user: { id: 'u', name: 'Wanjiru K', email: 'a@b.c', role, status: 'approved', emailVerified: true } }) : j(401, { success: false });
    if (/\/api\/cars$/.test(p)) return j(200, { success: true, data: cars, cars, pagination: { page: 1, limit: 24, total: 8, pages: 1 } });
    return j(200, { success: true, data: [], items: [] }); });
  await page.goto(BASE + path); await page.waitForTimeout(1000);
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, text: document.body.innerText.trim().length, h1: !!document.querySelector('h1,h2') }));
  n++; const ok = m.sw <= m.iw && m.text > 40 && errs.length === 0;
  if (!ok) { bad++; console.log(`FAIL ${role || 'anon'} ${path}@${w}`, JSON.stringify({ ...m, errs: errs.slice(0, 1) })); }
  await ctx.close();
}
await b.close(); console.log(`${n} loads across ${WIDTHS.length} widths, ${bad} with issues`); process.exit(bad ? 1 : 0);
