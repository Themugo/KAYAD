// Mobile dock obstruction audit: at the bottom of every dock-bearing page, the last content must clear the dock,
// and no other fixed/sticky element may overlap it. Usage: node scripts/browser-audit-dock-clearance.mjs [baseUrl]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const PAGES = ['/', '/?nav=marketplace', '/?nav=discovery', '/?nav=inspections', '/?nav=saved', '/?nav=support', '/?nav=financing', '/?nav=dealers', '/?nav=seller-platform'];
const cars = Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, _id: `c${i}`, title: `2019 Toyota Prado ${i}`, brand: 'Toyota', model: 'Prado', year: 2019, price: 4e6, mileage: 40000, fuel: 'Petrol', transmission: 'Automatic', bodyType: 'SUV', city: 'Nairobi', status: 'available', images: [{ url: '/hero/kayad-prado.png' }], createdAt: new Date().toISOString() }));
const b = await chromium.launch(); let fails = 0, checked = 0;
for (const w of [320, 360, 390, 430]) for (const role of [null, 'user']) for (const path of PAGES) {
  const ctx = await b.newContext({ viewport: { width: w, height: 760 }, isMobile: true, hasTouch: true });
  if (role) await ctx.addInitScript(() => localStorage.setItem('kayad_session_hint', '1'));
  const page = await ctx.newPage();
  await page.route('**/api/**', (r) => { const p = new URL(r.request().url()).pathname; const j = (s, x) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
    if (/csrf$/.test(p)) return j(200, { success: true, csrfToken: 'x'.repeat(48) });
    if (/auth\/me$/.test(p)) return role ? j(200, { success: true, user: { id: 'u', name: 'W K', email: 'a@b.c', role, emailVerified: true } }) : j(401, { success: false });
    if (/\/api\/cars$/.test(p)) return j(200, { success: true, data: cars, cars, pagination: { page: 1, limit: 24, total: 12, pages: 1 } });
    return j(200, { success: true, data: [], items: [] }); });
  await page.goto(BASE + path); await page.waitForTimeout(1200);
  await page.evaluate(async () => { for (let i = 0; i < 12; i++) { scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => setTimeout(r, 120)); } });
  const m = await page.evaluate(() => {
    const dock = document.querySelector('.kayad-mobile-bottom-nav');
    if (!dock || getComputedStyle(dock).display === 'none') return { dock: false };
    const d = dock.getBoundingClientRect();
    // last visible content element in flow (footer text, buttons, cards)
    const els = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.height > 0 && r.width > 0 && cs.position !== 'fixed' && cs.visibility !== 'hidden' && !dock.contains(e) && !e.closest('[aria-hidden="true"], .sr-only') && (e.children.length === 0 || e.matches('button,a,input')); });
    const lastBottom = Math.max(...els.map((e) => e.getBoundingClientRect().bottom));
    const atBottom = Math.abs(scrollY + innerHeight - document.documentElement.scrollHeight) < 3;
    const overlay = [...document.querySelectorAll('body *')].filter((e) => { if (dock.contains(e) || e === dock) return false; const cs = getComputedStyle(e); if (cs.position !== 'fixed' && cs.position !== 'sticky') return false; const r = e.getBoundingClientRect(); if (!r.width || !r.height || cs.pointerEvents === 'none' || cs.visibility === 'hidden') return false; if (e.contains(dock)) return false; return r.bottom > d.top + 1 && r.top < d.bottom - 1 && r.right > d.left && r.left < d.right && getComputedStyle(e).display !== 'none'; }).map((e) => (e.tagName + '.' + String(e.className).slice(0, 50)));
    return { dock: true, dockTop: Math.round(d.top), lastBottom: Math.round(lastBottom), atBottom, overlay };
  });
  if (m.dock) { checked++; const bad = m.lastBottom > m.dockTop - 4 || m.overlay.length; if (bad) { fails++; console.log(`FAIL ${role || 'anon'} ${path}@${w}`, JSON.stringify(m)); } }
  await ctx.close();
}
await b.close(); console.log(`${checked} dock pages checked;`, fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
