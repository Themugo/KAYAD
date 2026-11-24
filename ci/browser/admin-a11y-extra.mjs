// Accessible-name / dialog focus / history-control probes (disposable stack only). Automated + keyboard evidence; NOT a screen-reader test.
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'docs/admin-console-closure/evidence/a11y';
const seed = JSON.parse(fs.readFileSync(new URL('../db-journeys/out/browser-seed.json', import.meta.url)));
const surface = fs.readFileSync(new URL('../../src/components/admin/AdminRouteSurface.tsx', import.meta.url), 'utf8');
const routes = ['/admin', ...[...surface.matchAll(/'((?:\/admin)[^']*)': \{ component:/g)].map((m) => m[1])];
const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p0 = await ctx.newPage();
await p0.goto(`${BASE}/login`); await p0.waitForSelector('input[type=email]'); await p0.fill('input[type=email]', seed.platform.superadmin); await p0.fill('input[type=password]', seed.password); await p0.locator('button[type=submit]').first().click();
await p0.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 25000 }).catch(() => {}); await p0.close();
const res = { unnamed: [], history: null, dialog: null, live: [] };
const nameProbe = () => [...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=switch],[role=checkbox]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }).filter((e) => {
  const lb = e.getAttribute('aria-labelledby'); const byId = lb ? lb.split(' ').map((i) => document.getElementById(i)?.textContent || '').join('').trim() : '';
  const lab = e.labels && e.labels.length ? [...e.labels].map((l) => l.textContent).join('').trim() : '';
  const txt = (e.getAttribute('aria-label') || byId || lab || e.textContent || e.getAttribute('title') || e.getAttribute('placeholder') || e.querySelector('img[alt]')?.getAttribute('alt') || e.querySelector('svg title')?.textContent || '').trim();
  return !txt; }).map((e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''}`);
for (const route of routes) {
  const p = await ctx.newPage(); await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('.kayad-admin-shell', { state: 'attached', timeout: 25000 }).catch(() => {}); await p.waitForTimeout(1500);
  const u = await p.evaluate(nameProbe); if (u.length) res.unnamed.push({ route, controls: u.slice(0, 8), count: u.length }); await p.close();
}
{ // Back / Forward / Dashboard by keyboard
  const p = await ctx.newPage(); await p.goto(`${BASE}/admin/users`); await p.waitForSelector('.kayad-admin-shell', { state: 'attached' }); await p.waitForTimeout(1200);
  await p.goto(`${BASE}/admin/cars`); await p.waitForTimeout(1200);
  const back = p.locator('button[aria-label="Go to previous page"]').first(); const fwd = p.locator('[aria-label="Go forward to next page"]').first();
  const h = { backPresent: await back.count() > 0, forwardPresent: await fwd.count() > 0 };
  if (h.backPresent) { await back.focus(); const before = p.url(); await p.keyboard.press('Enter'); await p.waitForTimeout(1000); h.backWorks = p.url() !== before; h.afterBack = new URL(p.url()).pathname; }
  if (h.forwardPresent) { const dis = await fwd.isDisabled(); h.forwardEnabledAfterBack = !dis; if (!dis) { await fwd.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(1000); h.afterForward = new URL(p.url()).pathname; } }
  const dash = p.locator('a[href="/admin"], [aria-label*="Dashboard" i]').first(); h.dashboardLink = await dash.count() > 0;
  if (h.dashboardLink) { await dash.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(1000); h.afterDashboard = new URL(p.url()).pathname; }
  res.history = h; await p.close();
}
{ // modal focus management on dealer verifications
  const p = await ctx.newPage(); await p.goto(`${BASE}/admin/dealer-verifications`); await p.waitForSelector('.kayad-admin-shell', { state: 'attached' }); await p.waitForTimeout(2500);
  const opener = p.locator('button').filter({ hasText: /Suspend|Request suspension|Request reinstatement|Reinstate/ }).first();
  const d = { openerFound: await opener.count() > 0 };
  if (d.openerFound) {
    await opener.focus(); const label = (await opener.textContent())?.trim(); d.opener = label; await p.keyboard.press('Enter'); await p.waitForTimeout(600);
    const dlg = p.locator('[role=dialog]').first(); d.dialog = await dlg.count() > 0;
    if (d.dialog) {
      d.modal = await dlg.getAttribute('aria-modal'); d.labelled = !!(await dlg.getAttribute('aria-labelledby'));
      d.focusInside = await p.evaluate(() => !!document.activeElement?.closest('[role=dialog]'));
      const seen = new Set(); let escaped = false; for (let i = 0; i < 25; i++) { await p.keyboard.press('Tab'); const inside = await p.evaluate(() => !!document.activeElement?.closest('[role=dialog]')); if (!inside) escaped = true; seen.add(await p.evaluate(() => document.activeElement?.tagName + (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '').slice(0, 20))); }
      d.tabTrapped = !escaped; await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      d.closedByEscape = (await p.locator('[role=dialog]').count()) === 0;
      d.focusReturned = await p.evaluate((l) => (document.activeElement?.textContent || '').trim() === l, label);
    }
  }
  res.dialog = d; await p.close();
}
{ // status / error announcements present on key routes (role=status|alert|aria-live regions in the DOM)
  for (const route of ['/admin/dealer-verifications', '/admin/settings', '/admin/reviews']) { const p = await ctx.newPage(); await p.goto(`${BASE}${route}`); await p.waitForTimeout(2500); res.live.push({ route, regions: await p.evaluate(() => document.querySelectorAll('[role=status],[role=alert],[aria-live]').length) }); await p.close(); }
}
{ const p = await ctx.newPage(); await p.goto(`${BASE}/admin/users`); await p.waitForSelector('.kayad-admin-shell', { state: 'attached' }); await p.waitForTimeout(1500); res.navSnapshot = await p.locator('nav').first().ariaSnapshot().catch(() => null); await p.close(); }
await b.close(); fs.writeFileSync(`${OUT}/a11y-extra.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify({ unnamedRoutes: res.unnamed.length, history: res.history, dialog: res.dialog, live: res.live }, null, 1));
