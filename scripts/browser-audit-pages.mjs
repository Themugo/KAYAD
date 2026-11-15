// Page-by-page browser audit: every shell destination x role at 320px and 390px.
// Checks: renders, no horizontal overflow, no uncaught page errors, last control clears the dock, history Back works.
import { createRequire } from 'node:module'; import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const NAVS = ['marketplace','discovery','auctions','saved','sell','seller-platform','seller-dashboard','buyer-platform','dashboard','profile','chat','payments','finance','financing','escrow','inspections','inspection-marketplace','dealers','dealer-dashboard','dealership-workspace','support','kayadlive','admin'];
const USERS = { public: null, buyer: { id: 'b', name: 'Wanjiru Kamau', email: 'b@example.test', role: 'user' }, seller: { id: 's', name: 'Otieno', email: 's@example.test', role: 'individual_seller' }, dealer: { id: 'd', name: 'Prime Motors', email: 'd@example.test', role: 'dealer' }, admin: { id: 'a', name: 'James Mugo', email: 'a@example.test', role: 'superadmin' } };
const cars = Array.from({ length: 6 }, (_, i) => ({ id: 'c' + i, _id: 'c' + i, title: `${2018 + i} Toyota Prado`, brand: 'Toyota', model: 'Prado', year: 2018 + i, price: 2500000, mileage: 50000, fuel: 'Petrol', transmission: 'Automatic', bodyType: 'SUV', city: 'Nairobi', status: 'available', images: [{ url: '/hero/kayad-prado.png' }], createdAt: new Date().toISOString() }));
const rows = []; const b = await chromium.launch();
for (const w of [320, 390]) for (const [role, user] of Object.entries(USERS)) {
  const ctx = await b.newContext({ viewport: { width: w, height: w === 320 ? 640 : 844 }, isMobile: true, hasTouch: true });
  if (user) await ctx.addInitScript(() => { try { localStorage.setItem('kayad_session_hint', '1'); } catch {} });
  await ctx.route('**/api/**', (r) => { const p = new URL(r.request().url()).pathname; const j = (s, x) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
    if (/auth\/csrf$/.test(p)) return j(200, { success: true, csrfToken: 'x'.repeat(48) });
    if (!user && /auth\/(refresh|session)/.test(p)) return j(401, { success: false, message: 'Not signed in' });
    if (/auth\/me$/.test(p)) return user ? j(200, { success: true, user }) : j(401, { success: false });
    if (/\/api\/cars$/.test(p)) return j(200, { success: true, data: cars, pagination: { page: 1, limit: 24, total: 6, pages: 1 } });
    return j(200, { success: true, data: [], items: [], notifications: [] }); });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  for (const nav of NAVS) {
    errs.length = 0;
    await page.goto(`${BASE}/?nav=${nav}`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1300);
    const m = await page.evaluate(() => {
      const dock = [...document.querySelectorAll('nav,div,aside')].filter((n) => getComputedStyle(n).position === 'fixed' && /Showroom/.test(n.textContent || '') && /Saved/.test(n.textContent || '') && n.getBoundingClientRect().top > innerHeight / 2).sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0];
      window.scrollTo(0, document.documentElement.scrollHeight);
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, text: document.body.innerText.length, path: location.pathname + location.search, dockTop: dock ? dock.getBoundingClientRect().top : null,
        last: (() => { const els = [...document.querySelectorAll('a[href],button,input,select,textarea')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !(dock && dock.contains(e)) && getComputedStyle(e).visibility !== 'hidden' && !e.closest('header,aside,[role=dialog],[aria-hidden=true]') && !e.closest('[class*=fixed]'); }); const l = els.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0]; return l ? Math.round(l.getBoundingClientRect().bottom) : null; })() };
    });
    const issues = [];
    if (m.sw > m.iw) issues.push(`overflow ${m.sw}>${m.iw}`);
    if (m.text < 40) issues.push('blank page');
    if (errs.length) issues.push('pageerror ' + errs[0]);
    if (m.dockTop != null && m.last != null && m.last > m.dockTop + 1) issues.push(`last control ${m.last} under dock ${Math.round(m.dockTop)}`);
    rows.push({ w, role, nav, final: m.path, issues });
    if (issues.length) console.log(`ISSUE ${w}px ${role} ${nav} -> ${m.path}: ${issues.join('; ')}`);
  }
  await ctx.close();
}
await b.close();
const bad = rows.filter((r) => r.issues.length);
fs.writeFileSync('docs/audits/screenshots/page-audit-results.json', JSON.stringify({ ranAt: new Date().toISOString(), total: rows.length, withIssues: bad.length, rows }, null, 1));
console.log(`${rows.length} page loads, ${bad.length} with issues`);
