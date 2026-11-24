// Accessibility / keyboard / responsive evidence against the disposable stack (never hosted). Automated checks are EVIDENCE, not a compliance claim.
// axe-core (wcag2a, wcag2aa, wcag21a/aa, wcag22aa tags) on every admin route at 390 and 1440; horizontal-overflow at 7 widths on key routes; keyboard probes.
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'docs/admin-console-closure/evidence/a11y';
const seed = JSON.parse(fs.readFileSync(new URL('../db-journeys/out/browser-seed.json', import.meta.url))); fs.mkdirSync(OUT, { recursive: true });
const surface = fs.readFileSync(new URL('../../src/components/admin/AdminRouteSurface.tsx', import.meta.url), 'utf8');
const routes = ['/admin', ...[...surface.matchAll(/'((?:\/admin)[^']*)': \{ component:/g)].map((m) => m[1])];
const KEY = ['/admin', '/admin/users', '/admin/private-seller-applications', '/admin/dealer-verifications', '/admin/settings', '/admin/reviews', '/admin/support-tickets', '/admin/cars', '/admin/escrows', '/admin/security-log'];
const WIDTHS = [[320, 640], [360, 740], [390, 844], [430, 932], [768, 1024], [1280, 800], [1920, 1080]];
const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] });
async function login(w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700 }); const p = await ctx.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('input[type=email]', { timeout: 20000 });
  await p.fill('input[type=email]', seed.platform.superadmin); await p.fill('input[type=password]', seed.password); await p.locator('button[type=submit]').first().click();
  await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 25000 }).catch(() => {}); await p.close(); return ctx;
}
const out = { axe: [], overflow: [], keyboard: [] };
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await login(w, h);
  for (const route of routes) {
    const p = await ctx.newPage();
    try {
      await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await p.waitForSelector('.kayad-admin-shell', { state: 'attached', timeout: 25000 }).catch(() => {}); await p.waitForTimeout(1800);
      await p.evaluate(axeSrc);
      const r = await p.evaluate(async (tags) => { const x = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] }); return x.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help.slice(0, 90) })); }, TAGS);
      out.axe.push({ width: w, route, violations: r });
    } catch (e) { out.axe.push({ width: w, route, error: String(e.message).slice(0, 120) }); }
    await p.close();
  }
  await ctx.close();
}
for (const [w, h] of WIDTHS) {
  const ctx = await login(w, h);
  for (const route of KEY) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('.kayad-admin-shell', { state: 'attached', timeout: 25000 }).catch(() => {}); await p.waitForTimeout(1500);
    const m = await p.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, smallTargets: [...document.querySelectorAll('button,a[href],input,select,[role=button]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24) && getComputedStyle(e).visibility !== 'hidden'; }).length }));
    out.overflow.push({ width: w, route, ...m });
    if ((w === 320 || w === 1280) && ['/admin', '/admin/users', '/admin/private-seller-applications'].includes(route)) await p.screenshot({ path: `${OUT}/${w}${route.replace(/\//g, '_')}.png` }).catch(() => {});
    await p.close();
  }
  await ctx.close();
}
{ // keyboard probes (desktop)
  const ctx = await login(1440, 900);
  for (const route of ['/admin', '/admin/users', '/admin/dealer-verifications', '/admin/private-seller-applications', '/admin/settings']) {
    const p = await ctx.newPage(); await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('.kayad-admin-shell', { state: 'attached', timeout: 25000 }).catch(() => {}); await p.waitForTimeout(1500);
    const info = await p.evaluate(() => ({ main: !!document.querySelector('main,#main-content,[role=main]'), nav: !!document.querySelector('nav,[role=navigation]'), h1: document.querySelectorAll('h1').length, skip: !!document.querySelector('a[href="#main-content"],.skip-link,[data-skip-link]'), lang: document.documentElement.lang }));
    const seen = []; let focusVisible = 0, noIndicator = 0, trapped = false;
    for (let i = 0; i < 45; i++) {
      await p.keyboard.press('Tab');
      const f = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none'); return { k: `${e.tagName}|${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30)}|${e.getAttribute('href') || ''}`, ring: !!ring }; });
      if (!f) continue; seen.push(f.k); f.ring ? focusVisible++ : noIndicator++;
    }
    trapped = new Set(seen).size < Math.min(8, seen.length);
    out.keyboard.push({ route, ...info, tabStops: seen.length, distinct: new Set(seen).size, focusVisible, noIndicator, trapped });
    await p.close();
  }
  await ctx.close();
}
await b.close();
const sev = (r) => r.violations?.filter((v) => ['serious', 'critical'].includes(v.impact)) || [];
const summary = { routes: routes.length, axeSeriousOrCritical: out.axe.filter((r) => sev(r).length).map((r) => ({ width: r.width, route: r.route, v: sev(r).map((v) => `${v.id}x${v.nodes}`) })), axeErrors: out.axe.filter((r) => r.error).length, overflow: out.overflow.filter((r) => r.overflow > 1), keyboard: out.keyboard };
fs.writeFileSync(`${OUT}/a11y.json`, JSON.stringify({ summary, ...out }, null, 1));
console.log(JSON.stringify({ routes: routes.length, seriousOrCriticalPages: summary.axeSeriousOrCritical.length, axeErrors: summary.axeErrors, overflowRows: summary.overflow.length, keyboard: out.keyboard.map((k) => `${k.route} stops=${k.tabStops} distinct=${k.distinct} noRing=${k.noIndicator} trapped=${k.trapped} main=${k.main} h1=${k.h1} skip=${k.skip}`) }, null, 1));
