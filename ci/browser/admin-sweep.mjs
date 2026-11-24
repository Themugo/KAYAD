// Visits EVERY registered admin route as Super Admin and as a platform moderator on the disposable stack; records per-page evidence.
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'reports/ADMIN-CONSOLE/evidence/sweep';
const seed = JSON.parse(fs.readFileSync(new URL('../db-journeys/out/browser-seed.json', import.meta.url))); fs.mkdirSync(OUT, { recursive: true });
const surface = fs.readFileSync(new URL('../../src/components/admin/AdminRouteSurface.tsx', import.meta.url), 'utf8');
const routes = ['/admin', ...[...surface.matchAll(/'((?:\/admin)[^']*)': \{ component:/g)].map((m) => m[1])];
const rows = []; const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] });
async function login(email, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700 }); const p = await ctx.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('input[type=email]', { timeout: 20000 });
  await p.fill('input[type=email]', email); await p.fill('input[type=password]', seed.password); await p.locator('button[type=submit]').first().click();
  await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }).catch(() => {}); await p.close(); return { ctx, newPage: () => ctx.newPage() };
}
for (const [who, email] of [['superadmin', seed.platform.superadmin], ['moderator', seed.platform.moderator]]) {
  for (const w of [1440, 390]) {
    const { ctx, newPage } = await login(email, w, w < 700 ? 844 : 900);
    for (const route of routes) {
      const p = await newPage(); // a fresh page per route keeps one heavy studio page from exhausting memory for the rest
      const errs = [], failed = [], cons = [];
      const onErr = (e) => errs.push(e.message.slice(0, 160)); const onCons = (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 140)); };
      const onResp = (r) => { if (r.status() >= 400 && r.url().includes('/api/') && !/\/auth\/(me|refresh)$/.test(new URL(r.url()).pathname)) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); };
      p.on('pageerror', onErr); p.on('console', onCons); p.on('response', onResp);
      let crashed = false;
      try { await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' }); } catch (e) { crashed = true; }
      if (crashed) { rows.push({ who, width: w, route, shell: false, heading: null, overflow: false, restricted: false, errorBoundary: false, textLen: 0, pageErrors: 1, consoleErrors: 0, failedApi: [], crashed: true }); await p.close().catch(() => {}); continue; }
      await p.waitForSelector('.kayad-admin-shell', { state: 'attached', timeout: 25000 }).catch(() => {}); await p.waitForTimeout(w === 1440 ? 2200 : 1600);
      const info = await p.evaluate(() => { const main = document.querySelector('#main-content'); const h = main?.querySelector('h1,h2'); const text = (main?.innerText || '').replace(/\s+/g, ' ').trim(); return { shell: !!document.querySelector('.kayad-admin-shell'), heading: h?.textContent?.trim().slice(0, 70) || null, overflow: document.documentElement.scrollWidth > innerWidth + 1, restricted: /restricted to Super Admin|restricted to the platform superadmin|Superadmin Only|Insufficient Permissions|does not have access to this page|not authori[sz]ed|Access denied/i.test([...(main?.querySelectorAll('h1,h2') || [])].map((e) => e.textContent).join(' ') + ' ' + (main?.querySelector('.kayad-admin-denied,[data-admin-denied]')?.textContent || '')), notFound: /Admin page not found/i.test(text), errorBoundary: /something went wrong|unexpected error/i.test(text), textLen: text.length }; });
      rows.push({ who, width: w, route, ...info, pageErrors: errs.length, consoleErrors: cons.length, failedApi: [...new Set(failed)] });
      if (w === 1440 && who === 'superadmin') await p.screenshot({ path: `${OUT}/${route.replace(/\//g, '_') || '_'}.png` }).catch(() => {});
      p.off('pageerror', onErr); p.off('console', onCons); p.off('response', onResp); await p.close().catch(() => {});
    }
    await ctx.close();
  }
}
await b.close(); fs.writeFileSync(`${OUT}/sweep.json`, JSON.stringify(rows, null, 1));
const bad = rows.filter((r) => r.pageErrors || r.errorBoundary || !r.shell || (r.who === 'superadmin' && (r.restricted || r.overflow)));
console.log(`routes=${routes.length} rows=${rows.length} problems=${bad.length}`); for (const r of bad) console.log(JSON.stringify(r));
