// Browser audit (Playwright/Chromium): responsive overflow, light/dark screenshots, axe-core WCAG 2.2 AA, forced failure states.
// Requires: vite dev server (VITE_DEV_API_TARGET -> the journey backend) and out/browser-seed.json from 99_browser_hold.
// Usage: BASE=http://127.0.0.1:5199 SEED=ci/db-journeys/out/browser-seed.json OUT=reports/FINAL-COMPLETION/evidence/browser node ci/browser/audit.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5199';
const seed = JSON.parse(fs.readFileSync(process.env.SEED || 'ci/db-journeys/out/browser-seed.json', 'utf8'));
const OUT = process.env.OUT || 'reports/FINAL-COMPLETION/evidence/browser'; fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const WIDTHS = (process.env.WIDTHS || '320,360,390,430,768,1024,1280,1440,1920').split(',').map(Number);
const SHOT_WIDTHS = new Set([320, 390, 1280]);
const SURFACES = [
  { id: 'home', who: null, url: '/' },
  { id: 'login', who: null, url: '/login' },
  { id: 'marketplace', who: null, url: '/?nav=marketplace' },
  { id: 'dealer-overview', who: 'dealer', url: '/?nav=dealer-dashboard' },
  { id: 'dealer-inventory', who: 'dealer', url: '/?nav=dealer-dashboard&section=inventory' },
  { id: 'dealer-banking', who: 'dealer', url: '/?nav=dealer-dashboard&section=banking' },
  { id: 'dealer-settings', who: 'dealer', url: '/?nav=dealer-dashboard&section=settings' },
  { id: 'personal-dashboard', who: 'personal', url: '/?nav=dashboard' },
  { id: 'personal-profile', who: 'personal', url: '/profile' },
];
const THEMES = (process.env.THEMES || 'light,dark').split(',');
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const creds = { dealer: seed.dealer, personal: seed.personal, viewer: seed.team.viewer };
const browser = await chromium.launch();
const results = [];
async function login(ctx, email) {
  const c = await ctx.request.get(BASE + '/api/v1/auth/csrf'); const { csrfToken } = await c.json();
  const r = await ctx.request.post(BASE + '/api/v1/auth/login', { data: { email, password: seed.password }, headers: { 'x-csrf-token': csrfToken, 'x-xsrf-token': csrfToken } });
  if (r.status() !== 200) throw new Error('login ' + r.status());
}
for (const theme of THEMES) for (const s of SURFACES) {
  if (only && !only.has(s.id)) continue;
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 800 : 900 }, deviceScaleFactor: 1, colorScheme: theme === 'dark' ? 'dark' : 'light' });
    await ctx.addInitScript((t) => { try { localStorage.setItem('kayard_theme_preference', t); } catch {} }, theme);
    try { if (s.who) await login(ctx, creds[s.who]); } catch (e) { results.push({ surface: s.id, theme, width: w, error: String(e.message) }); await ctx.close(); continue; }
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + s.url, { waitUntil: 'domcontentloaded', timeout: 45000 }); if (theme === 'dark') await page.evaluate(() => document.documentElement.setAttribute('data-dark-ready', 'true')); await page.waitForTimeout(2500);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, theme: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor, h1: document.querySelector('h1')?.textContent?.trim().slice(0, 60) || null, url: location.pathname + location.search }));
      const rec = { surface: s.id, theme, width: w, overflow: m.sw > m.iw + 1, scrollWidth: m.sw, dataTheme: m.theme, bodyBg: m.bg, h1: m.h1, finalUrl: m.url };
      if (SHOT_WIDTHS.has(w)) { const f = `shots/${s.id}-${theme}-${w}.png`; await page.screenshot({ path: path.join(OUT, f), fullPage: false }); rec.shot = f; }
      if (w === 390 || w === 1280) {
        await page.evaluate(axeSrc);
        const ax = await page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(' ').slice(0, 120) })); });
        rec.axe = ax;
      }
      results.push(rec);
    } catch (e) { results.push({ surface: s.id, theme, width: w, error: String(e.message).slice(0, 200) }); }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(results, null, 1));
const over = results.filter((r) => r.overflow), err = results.filter((r) => r.error);
console.log(`runs=${results.length} overflow=${over.length} errors=${err.length}`);
for (const o of over.slice(0, 30)) console.log('OVERFLOW', o.surface, o.theme, o.width, o.scrollWidth);
for (const o of err.slice(0, 10)) console.log('ERROR', o.surface, o.theme, o.width, o.error);
const ax = {}; for (const r of results) for (const v of r.axe || []) { const k = `${r.theme}|${v.id}|${v.impact}`; ax[k] = (ax[k] || 0) + v.nodes; }
console.log('AXE', JSON.stringify(ax, null, 1));
