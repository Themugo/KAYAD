import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import fs from 'fs';
const BASE = 'http://127.0.0.1:4173';
const OUT = '/home/claude/w2/KAYAD/reports/remediation-20261029/screenshots';
const W = [320, 360, 390, 412, 430, 768, 1024, 1440];
const PAGES = [
  ['login', '/login'], ['register-chooser', '/register'], ['register-buyer', '/register?intent=buyer'],
  ['forgot-password', '/forgot-password'], ['reset-password', '/reset-password?token=stub'], ['verify-email', '/verify-email?token=stub'],
];
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !/single-process|no-zygote/.test(a)).concat(['--disable-dev-shm-usage']), headless: true });
const results = [];
for (const w of W) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1 });
  await ctx.route((u) => !/^(127\.|localhost)/.test(u.hostname), (r) => r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204 }) : r.fulfill({ status: 200, contentType: /\.js/.test(r.request().url()) ? 'application/javascript' : 'text/plain', body: '' }));
  await ctx.route('**/api/**', (route) => {
    const u = route.request().url(); const m = route.request().method();
    const cors = { 'access-control-allow-origin': 'http://127.0.0.1:4173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' };
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const j = (s, b) => route.fulfill({ status: s, headers: cors, contentType: 'application/json', body: JSON.stringify(b) });
    if (/csrf/i.test(u)) return j(200, { success: true, csrfToken: 'a1b2c3d4'.repeat(8), route: '/api/v1/auth/csrf' });
    if (/auth\/(me|session|refresh)/.test(u)) return j(401, { success: false, message: 'Not authenticated' });
    if (/auth\/login/.test(u) && m === 'POST') return j(401, { success: false, message: 'Invalid email or password.' });
    return j(404, { success: false, message: 'stub: not found' });
  });
  for (const [name, path] of PAGES) {
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|stub/.test(m.text())) errs.push(m.text().slice(0, 120)); });
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const de = document.documentElement; const vw = window.innerWidth;
      const main = document.querySelector('.kayad-auth-page');
      const bm = document.querySelector('.kayad-auth-brand-mark')?.getBoundingClientRect();
      const clipped = [...document.querySelectorAll('.kayad-auth-page *')].filter((el) => {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        return r.width > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && (r.right > vw + 1 || r.left < -1);
      }).slice(0, 3).map((el) => el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]);
      const inputs = [...document.querySelectorAll('.kayad-auth-page input:not([type=hidden]):not([type=checkbox]):not([type=radio])')].map((i) => Math.round(i.getBoundingClientRect().height));
      const btns = [...document.querySelectorAll('.kayad-auth-page button, .kayad-auth-page a.kayad-auth-submit')].map((b) => Math.round(b.getBoundingClientRect().height));
      const tog = document.querySelector('.kayad-auth-password-toggle'); let togOk = null;
      if (tog) { const pi = tog.closest('.kayad-auth-password-wrap')?.querySelector('input'); const a = tog.getBoundingClientRect(), b = pi?.getBoundingClientRect(); togOk = !!b && a.left >= b.left && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1; }
      return { mode: main?.getAttribute('data-mode'), hOverflow: de.scrollWidth > vw + 1, scrollW: de.scrollWidth, vw, brand: bm ? [Math.round(bm.width), Math.round(bm.height)] : null, clipped, inputH: inputs, btnH: btns, toggleInsideInput: togOk, h1: (document.querySelector('h1')?.textContent || '').trim().slice(0, 50) };
    });
    await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
    results.push({ page: name, width: w, ...m, errors: errs.slice(0, 2) });
    await page.close();
  }
  // error state: submit invalid login
  const p2 = await ctx.newPage(); await p2.goto(BASE + '/login', { waitUntil: 'networkidle' }).catch(() => {});
  await p2.fill('input[type=email], input[name=email]', 'a@example.com').catch(() => {});
  await p2.fill('input[type=password]', 'WrongPass123!').catch(() => {});
  await p2.click('button[type=submit]').catch(() => {}); await p2.waitForTimeout(900);
  const alertTxt = await p2.evaluate(() => (document.querySelector('[role=alert]')?.textContent || '').trim().slice(0, 80));
  const ov = await p2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await p2.screenshot({ path: `${OUT}/login-error-${w}.png`, fullPage: true });
  results.push({ page: 'login-error-state', width: w, alert: alertTxt, hOverflow: ov });
  await ctx.close();
}
await browser.close();
fs.writeFileSync('/home/claude/w2/KAYAD/reports/remediation-20261029/AUTH_RESPONSIVE_AUDIT.json', JSON.stringify(results, null, 1));
const bad = results.filter((r) => r.hOverflow || (r.clipped && r.clipped.length) || r.toggleInsideInput === false);
console.log('checks:', results.length, '| with overflow/clipping/toggle problems:', bad.length);
for (const b of bad.slice(0, 12)) console.log(' !', b.page, b.width, JSON.stringify({ o: b.hOverflow, c: b.clipped, t: b.toggleInsideInput }));
const modes = {}; for (const r of results) if (r.brand) (modes[r.page] ||= new Set()).add(r.brand.join('x')); console.log('brand mark sizes by page:', Object.fromEntries(Object.entries(modes).map(([k, v]) => [k, [...v]])));
console.log('login error alerts:', [...new Set(results.filter((r) => r.page === 'login-error-state').map((r) => r.alert))]);
console.log('page errors:', results.filter((r) => r.errors?.length).map((r) => r.page + '@' + r.width + ': ' + r.errors[0]).slice(0, 5));
