// Real-browser check of the Super Admin Console on the disposable stack (99_browser_hold seed). Widths, hero, shell, console errors, API failures.
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'reports/ADMIN-CONSOLE/evidence';
const seed = JSON.parse(fs.readFileSync(new URL('../db-journeys/out/browser-seed.json', import.meta.url)));
const PW = seed.password; fs.mkdirSync(OUT, { recursive: true });
const results = []; const check = (g, n, ok, d) => { results.push({ group: g, name: n, ok: !!ok, detail: d ?? '' }); console.log(ok ? 'PASS' : 'FAIL', `[${g}]`, n, ok ? '' : JSON.stringify(d)?.slice(0, 400)); };
const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] });
async function session(email, width, height) {
  const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 700, hasTouch: width < 700 }); const p = await ctx.newPage();
  const s = { ctx, p, errs: [], failed: [], consoleErrs: [] };
  p.on('pageerror', (e) => s.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') s.consoleErrs.push(m.text().slice(0, 200)); });
  p.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/') && !/\/auth\/(me|refresh)$/.test(new URL(r.url()).pathname)) s.failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('input[type=email]', { timeout: 20000 });
  await p.fill('input[type=email]', email); await p.fill('input[type=password]', PW); await p.locator('button[type=submit]').first().click();
  await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }).catch(() => {});
  return s;
}
const open = async (s, path) => { await s.p.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' }); await s.p.waitForSelector('.kayad-admin-shell', { state: 'attached', timeout: 30000 }).catch(() => {}); await s.p.waitForTimeout(2500); };
const widths = (process.env.WIDTHS || '390,768,1024,1440').split(',').map(Number);
for (const w of widths) {
  const s = await session(seed.platform.superadmin, w, w < 700 ? 844 : 900);
  await open(s, '/admin'); if (!(await s.p.locator('[data-testid=admin-command-centre]').count())) await open(s, '/admin');
  const { p } = s;
  check('layout', `${w}px: command centre rendered`, (await p.locator('[data-testid=admin-command-centre]').count()) === 1);
  check('layout', `${w}px: no horizontal overflow`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  const m = await p.evaluate(() => { const h = document.querySelector('.kayad-command-hero')?.getBoundingClientRect(); const c = document.querySelector('.kayad-admin-shell__content')?.getBoundingClientRect(); const hdr = document.querySelector('.kayad-admin-header')?.getBoundingClientRect(); return { heroTop: h?.top, heroH: h?.height, heroW: h?.width, headerBottom: hdr?.bottom, contentTop: c?.top, visual: !!document.querySelector('[data-testid=hero-visual]') && getComputedStyle(document.querySelector('[data-testid=hero-visual]')).display !== 'none' }; });
  check('hero', `${w}px: hero starts within 40px of the header (no dead space above)`, m.heroTop - m.headerBottom <= 40, m);
  check('hero', `${w}px: hero height is proportionate (<= ${w < 700 ? 520 : w < 1200 ? 440 : 300}px)`, m.heroH <= (w < 700 ? 520 : w < 1200 ? 440 : 300), m);
  check('hero', `${w}px: showroom visual ${w <= 1100 ? 'hidden when stacked' : 'shown'}`, w <= 1100 ? !m.visual : m.visual, m);
  const quick = await p.locator('.kayad-command-actions a').count(); check('hero', `${w}px: Quick Actions present (${quick})`, quick >= 4);
  check('health', `${w}px: no page errors`, s.errs.length === 0, s.errs); check('health', `${w}px: no failed API calls`, s.failed.length === 0, s.failed);
  await p.screenshot({ path: `${OUT}/dashboard-${w}.png`, fullPage: w < 700 }); await s.ctx.close();
}
await b.close(); fs.writeFileSync(`${OUT}/admin-console-results.json`, JSON.stringify(results, null, 1));
const f = results.filter((r) => !r.ok).length; console.log(`\nadmin-console: ${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
