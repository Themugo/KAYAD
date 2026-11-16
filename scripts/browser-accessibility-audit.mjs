// Keyboard + contrast/ARIA audit in a real browser (axe-core WCAG 2.0/2.1 A+AA rules and scripted keyboard checks).
// Needs: `npm i --no-save axe-core` (kept out of package.json) and a running `vite preview` build.
// Usage: node scripts/browser-accessibility-audit.mjs [baseUrl]
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axePath = process.env.AXE_PATH || require.resolve('axe-core/axe.min.js');
const AXE = fs.readFileSync(axePath, 'utf8');
const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const USERS = { public: null, buyer: { id: 'b', name: 'Wanjiru Kamau', email: 'b@example.test', role: 'user' }, dealer: { id: 'd', name: 'Prime Motors', email: 'd@example.test', role: 'dealer' }, admin: { id: 'a', name: 'James Mugo', email: 'a@example.test', role: 'superadmin' } };
const cars = Array.from({ length: 6 }, (_, i) => ({ id: 'c' + i, _id: 'c' + i, title: `${2018 + i} Toyota Prado`, brand: 'Toyota', model: 'Prado', year: 2018 + i, price: 2500000, mileage: 50000, fuel: 'Petrol', transmission: 'Automatic', bodyType: 'SUV', city: 'Nairobi', status: 'available', images: [{ url: '/hero/kayad-prado.png' }], createdAt: new Date().toISOString() }));
const out = { ranAt: new Date().toISOString(), axe: [], keyboard: [] }; const b = await chromium.launch();
async function ctxFor(role, w, h) {
  const user = USERS[role]; const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700 });
  if (user) await ctx.addInitScript(() => { try { localStorage.setItem('kayad_session_hint', '1'); } catch {} });
  await ctx.route('**/api/**', (r) => { const p = new URL(r.request().url()).pathname; const j = (s, x) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
    if (/auth\/csrf$/.test(p)) return j(200, { csrfToken: 'x'.repeat(48) });
    if (!user && /auth\/(refresh|session)/.test(p)) return j(401, { success: false, message: 'Not signed in' });
    if (/auth\/me$/.test(p)) return user ? j(200, { success: true, user }) : j(401, { success: false, message: 'Not signed in' });
    if (/\/api\/cars$/.test(p)) return j(200, { success: true, data: cars, pagination: { page: 1, limit: 24, total: 6, pages: 1 } });
    return j(200, { success: true, data: [], items: [], notifications: [] }); });
  return ctx;
}
async function axeRun(page, label) {
  await page.evaluate(AXE);
  const res = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] }));
  const v = res.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, sample: x.nodes.slice(0, 3).map((n) => ({ target: n.target.join(' '), html: (n.html || '').slice(0, 140), summary: (n.failureSummary || '').split('\n').slice(1, 3).join(' ').slice(0, 220) })) }));
  out.axe.push({ label, violations: v }); console.log(`${v.length ? 'VIOLATIONS' : 'CLEAN'}  ${label}${v.length ? '  ' + v.map((x) => `${x.id}(${x.nodes})`).join(', ') : ''}`);
}
const settle = (page, ms = 1500) => page.waitForTimeout(ms);
// ---- axe on key screens
for (const [w, h] of [[390, 844], [1280, 800]]) {
  for (const role of ['public', 'buyer', 'dealer', 'admin']) {
    const ctx = await ctxFor(role, w, h); const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await settle(page, 2200);
    await axeRun(page, `${w}px ${role} home`);
    const hb = page.getByRole('button', { name: /toggle navigation menu/i });
    if (await hb.isVisible().catch(() => false)) { await hb.click(); await settle(page, 700); await axeRun(page, `${w}px ${role} drawer open`); }
    await ctx.close();
  }
}
for (const [label, url, role] of [['login', '/login', 'public'], ['vehicle filters (phone)', '/', 'public']]) {
  const ctx = await ctxFor(role, 390, 844); const page = await ctx.newPage();
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded' }); await settle(page, 2000);
  if (label.includes('filters')) { await page.getByRole('button', { name: /open filters/i }).first().click(); await settle(page, 700); }
  await axeRun(page, `390px ${label}`); await ctx.close();
}
for (const [role, nav] of [['public', 'auctions'], ['public', 'discovery'], ['public', 'support'], ['public', 'dealers'], ['public', 'sell'], ['buyer', 'dashboard'], ['buyer', 'saved'], ['buyer', 'payments'], ['buyer', 'profile'], ['buyer', 'chat'], ['dealer', 'dealer-dashboard'], ['admin', 'admin']]) {
  const ctx = await ctxFor(role, 390, 844); const page = await ctx.newPage();
  await page.goto(`${BASE}/?nav=${nav}`, { waitUntil: 'domcontentloaded' }); await settle(page, 2200);
  await axeRun(page, `390px ${role} ?nav=${nav}`); await ctx.close();
}
// ---- keyboard checks
const kb = (name, ok, detail = '') => { out.keyboard.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
{
  const ctx = await ctxFor('buyer', 390, 844); const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await settle(page, 2000);
  const hb = page.getByRole('button', { name: /toggle navigation menu/i });
  await hb.focus(); await page.keyboard.press('Enter'); await settle(page, 600);
  const dlg = page.getByRole('dialog');
  kb('keyboard: Enter on hamburger opens the drawer', await dlg.count() === 1);
  kb('drawer exposes aria-modal / label', await dlg.evaluate((d) => d.getAttribute('aria-modal') === 'true' && !!(d.getAttribute('aria-label') || d.getAttribute('aria-labelledby'))));
  const focusIn = async () => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
  kb('focus moves into the drawer on open', await focusIn());
  let stayed = true; for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); if (!(await focusIn())) { stayed = false; break; } }
  kb('Tab x40 never leaves the open drawer (focus trap)', stayed);
  let stayed2 = true; for (let i = 0; i < 40; i++) { await page.keyboard.press('Shift+Tab'); if (!(await focusIn())) { stayed2 = false; break; } }
  kb('Shift+Tab x40 never leaves the open drawer', stayed2);
  await page.keyboard.press('Escape'); await settle(page, 500);
  kb('Escape closes the drawer', await page.locator('[role="dialog"]').count() === 0);
  kb('focus returns to the hamburger after closing', await page.evaluate(() => /toggle navigation menu/i.test(document.activeElement?.getAttribute('aria-label') || '')));
  await ctx.close();
}
{
  const ctx = await ctxFor('public', 1280, 800); const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await settle(page, 2200);
  const info = await page.evaluate(async () => {
    const rows = []; const seen = new Set();
    for (let i = 0; i < 25; i++) {
      const el = document.activeElement; if (!el || el === document.body) { /* first tab */ }
      document.dispatchEvent(new Event('noop'));
      rows.push(null); break;
    }
    return rows.length;
  });
  const results = []; await page.evaluate(() => document.body.focus());
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    results.push(await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return null; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      const outlined = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
      return { tag: el.tagName, name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28), outlined, inView: r.bottom > 0 && r.top < innerHeight, onlyVisible: r.width > 0 && r.height > 0 }; }));
  }
  const tabbed = results.filter(Boolean);
  const noRing = tabbed.filter((t) => !t.outlined);
  kb('first 25 Tab stops all land on real, visible controls', tabbed.length >= 20 && tabbed.every((t) => t.onlyVisible), `${tabbed.length} stops`);
  kb('every focused control shows a visible focus indicator', noRing.length === 0, noRing.length ? noRing.map((t) => `${t.tag}:${t.name}`).slice(0, 6).join(' | ') : '');
  const skip = await page.evaluate(() => !!document.querySelector('a[href="#main-content"], a[href="#main"], .skip-link, [data-skip-link]'));
  kb('a skip-to-content link exists', skip);
  await ctx.close();
}
await b.close();
fs.writeFileSync('docs/audits/screenshots/accessibility-audit-results.json', JSON.stringify(out, null, 1));
const nV = out.axe.reduce((a, x) => a + x.violations.length, 0), nF = out.keyboard.filter((k) => !k.ok).length;
console.log(`\naxe: ${out.axe.length} screens, ${nV} violation groups. keyboard: ${out.keyboard.length} checks, ${nF} failing.`);
