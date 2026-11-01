import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import fs from 'fs';
const W = Number(process.argv[2] || 390);
const BASE = 'http://127.0.0.1:4173';
const routes = JSON.parse(fs.readFileSync('/home/claude/logs/route-candidates.json', 'utf8')).map(([p]) => p);
const OUT = '/home/claude/w2/KAYAD/reports/remediation-20261029/route-shots';
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !/single-process|no-zygote/.test(a)).concat(['--disable-dev-shm-usage']), headless: true });
const ctx = await browser.newContext({ viewport: { width: W, height: 800 } });
const cors = { 'access-control-allow-origin': BASE, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
await ctx.route((u) => !/^(127\.|localhost)/.test(u.hostname), (r) => r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204 }) : r.fulfill({ status: 200, contentType: /\.js/.test(r.request().url()) ? 'application/javascript' : 'text/plain', body: '' }));
await ctx.route('**/api/**', (route) => {
  const u = route.request().url(), m = route.request().method();
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const j = (s, b) => route.fulfill({ status: s, headers: cors, contentType: 'application/json', body: JSON.stringify(b) });
  if (/csrf/i.test(u)) return j(200, { success: true, csrfToken: 'a1b2c3d4'.repeat(8) });
  if (/auth\/(me|session|refresh)/.test(u)) return j(401, { success: false, message: 'Not authenticated' });
  if (/public\/config/.test(u)) return j(200, { success: true, config: {} });
  return j(401, { success: false, message: 'Not authenticated' });
});
const page = await ctx.newPage();
const res = [];
let errs = [];
page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 140)));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|401|Not authenticated/.test(m.text())) errs.push(m.text().slice(0, 140)); });
for (const r of routes) {
  errs = [];
  const path = r.replace(/:[A-Za-z]+/g, 'test-id');
  let status = 'ok';
  try { await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20000 }); } catch (e) { status = 'nav-timeout'; }
  await page.waitForTimeout(350);
  const m = await page.evaluate(() => ({
    finalPath: location.pathname + location.search,
    bodyTextLen: (document.body.innerText || '').trim().length,
    h1: (document.querySelector('h1')?.textContent || '').trim().slice(0, 60),
    mains: document.querySelectorAll('main, [role=main]').length,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    rootEmpty: !document.getElementById('root') || document.getElementById('root').children.length === 0,
  }));
  const gated = /^\/(login|admin\/login)/.test(m.finalPath) && !/^\/(login|admin\/login)/.test(path);
  const verdict = m.rootEmpty || m.bodyTextLen < 20 ? 'BLANK' : errs.length ? 'JS-ERROR' : status !== 'ok' ? 'NAV-TIMEOUT' : m.overflow ? 'OVERFLOW' : gated ? 'AUTH-GATED' : 'RENDERED';
  res.push({ route: r, width: W, verdict, finalPath: m.finalPath, h1: m.h1, mains: m.mains, overflow: m.overflow, errors: errs.slice(0, 2) });
  if (W === 390) await page.screenshot({ path: `${OUT}/${r.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}.jpg`, type: 'jpeg', quality: 45 }).catch(() => {});
}
await browser.close();
fs.writeFileSync(`/home/claude/w2/KAYAD/reports/remediation-20261029/ROUTE_BROWSER_SMOKE_${W}.json`, JSON.stringify(res, null, 1));
const c = {}; for (const r of res) c[r.verdict] = (c[r.verdict] || 0) + 1;
console.log('width', W, 'routes', res.length, c);
for (const r of res.filter((x) => !['RENDERED', 'AUTH-GATED'].includes(x.verdict)).slice(0, 14)) console.log(' !', r.verdict, r.route, '->', r.finalPath, r.errors[0] || '');
console.log('multiple main landmarks:', res.filter((r) => r.mains > 1).map((r) => r.route).slice(0, 8));
