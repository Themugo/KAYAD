// Closure browser journeys against the disposable stack (never hosted): role-aware landing, admin Back/Forward/Dashboard,
// moderator direct-URL denial with no avoidable 403, Personal Accounts and Dealer Verifications screens. Writes JSON + screenshots.
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'docs/admin-console-closure/evidence/screens';
const seed = JSON.parse(fs.readFileSync(new URL('../db-journeys/out/browser-seed.json', import.meta.url))); fs.mkdirSync(OUT, { recursive: true });
const results = []; const rec = (name, ok, detail) => { results.push({ name, ok: !!ok, detail: ok ? undefined : detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' :: ' + JSON.stringify(detail)}`); };
const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] });
async function session(email, { width = 1440, height = 900, next } = {}) {
  const ctx = await b.newContext({ viewport: { width, height } }); const p = await ctx.newPage();
  const net = []; p.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/') && !/\/auth\/(me|refresh)$/.test(new URL(r.url()).pathname)) net.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
  await p.goto(`${BASE}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('input[type=email]', { timeout: 20000 });
  await p.fill('input[type=email]', email); await p.fill('input[type=password]', seed.password); await p.locator('button[type=submit]').first().click();
  await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(2500);
  return { ctx, p, net, errs };
}
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` }).catch(() => {});
const path = (p) => new URL(p.url()).pathname + new URL(p.url()).search;

// 1. Landing by role (explicit stale personal 'next' must not win for staff)
{
  const s = await session(seed.platform.superadmin); rec('J1 Super Admin plain login lands on the Admin Dashboard', path(s.p) === '/admin', path(s.p)); await shot(s.p, '01-superadmin-landing'); await s.ctx.close();
  const t = await session(seed.platform.superadmin, { next: '/?nav=dashboard&section=account' }); rec('J2 Super Admin with a stale My Account "next" still lands on /admin (defect fixed)', path(t.p) === '/admin', path(t.p)); await t.ctx.close();
  const m = await session(seed.platform.moderator); rec('J3 Moderator lands on /admin (an authorised destination)', path(m.p) === '/admin', path(m.p)); await m.ctx.close();
  const u = await session(seed.personal, { next: '/admin/staff' }); rec('J4 Personal account with a requested /admin path is NOT sent to Admin', !path(u.p).startsWith('/admin'), path(u.p)); await shot(u.p, '02-personal-landing'); await u.ctx.close();
  const d = await session(seed.dealer); rec('J5 Dealer owner lands in the dealer workspace (app maps /dealer to ?nav=dealer-dashboard)', path(d.p).startsWith('/dealer') || path(d.p).includes('nav=dealer-dashboard'), path(d.p)); await d.ctx.close();
}
// 2. Super Admin navigation + staff return link from My Account
{
  const s = await session(seed.platform.superadmin);
  await s.p.goto(`${BASE}/admin/escrows`, { waitUntil: 'domcontentloaded' }); await s.p.waitForSelector('.kayad-admin-shell', { timeout: 25000 }); await s.p.waitForTimeout(1500);
  const nav = s.p.getByRole('navigation', { name: 'Page navigation' });
  rec('J6 Back, Forward and Dashboard controls are present on an admin page', await nav.getByRole('button', { name: 'Go to previous page' }).count() === 1 && await nav.getByRole('button', { name: 'Go forward to next page' }).count() === 1 && await nav.getByRole('button', { name: 'Go to Admin Dashboard' }).count() === 1);
  await s.p.goto(`${BASE}/admin/users`, { waitUntil: 'domcontentloaded' }); await s.p.waitForTimeout(1800);
  await s.p.getByRole('navigation', { name: 'Page navigation' }).getByRole('button', { name: 'Go to Admin Dashboard' }).click(); await s.p.waitForTimeout(1200);
  rec('J7 Dashboard shortcut returns to /admin', path(s.p) === '/admin', path(s.p));
  await s.p.goto(`${BASE}/admin/escrows`, { waitUntil: 'domcontentloaded' }); await s.p.waitForTimeout(1500);
  await s.p.getByRole('navigation', { name: 'Page navigation' }).getByRole('button', { name: 'Go to Admin Dashboard' }).click(); await s.p.waitForTimeout(800);
  await s.p.getByRole('navigation', { name: 'Page navigation' }).getByRole('button', { name: 'Go to previous page' }).click(); await s.p.waitForTimeout(1200);
  rec('J8 Back from the Dashboard returns to the previous ADMIN page', path(s.p) === '/admin/escrows', path(s.p));
  await s.p.getByRole('navigation', { name: 'Page navigation' }).getByRole('button', { name: 'Go forward to next page' }).click(); await s.p.waitForTimeout(1200);
  rec('J9 Forward uses real history (returns to the Dashboard)', path(s.p) === '/admin', path(s.p));
  // fresh tab on a deep page with no admin history: Back falls back to the Dashboard, never the marketplace
  const deep = await s.ctx.newPage(); await deep.goto(`${BASE}/admin/reviews`, { waitUntil: 'domcontentloaded' }); await deep.waitForTimeout(2000);
  await deep.getByRole('navigation', { name: 'Page navigation' }).getByRole('button', { name: 'Go to previous page' }).click(); await deep.waitForTimeout(1500);
  rec('J10 Back with no admin history falls back to the Admin Dashboard (not marketplace/My Account)', new URL(deep.url()).pathname === '/admin', deep.url());
  await deep.reload({ waitUntil: 'domcontentloaded' }); await deep.waitForTimeout(2000);
  rec('J11 refresh keeps the session and workspace', new URL(deep.url()).pathname === '/admin' && await deep.locator('.kayad-admin-shell').count() === 1, deep.url());
  // keyboard: Tab reaches the Dashboard button
  await deep.goto(`${BASE}/admin/reviews`, { waitUntil: 'domcontentloaded' }); await deep.waitForTimeout(1800);
  const reached = await deep.evaluate(async () => { const btn = document.querySelector('[data-admin-nav="dashboard"]'); btn?.focus(); return document.activeElement === btn; });
  rec('J12 the Dashboard control is keyboard focusable', reached);
  // My Account for staff has a way back to Admin
  await s.p.goto(`${BASE}/?nav=dashboard&section=account`, { waitUntil: 'domcontentloaded' }); await s.p.waitForTimeout(3000); await shot(s.p, '03-superadmin-my-account-with-admin-link');
  const back = s.p.getByRole('button', { name: /Admin Console/ });
  rec('J13 Super Admin on My Account sees an "Admin Console" route back', await back.count() >= 1);
  if (await back.count()) { await back.first().click(); await s.p.waitForTimeout(1500); rec('J14 …and it opens the Admin Dashboard', path(s.p) === '/admin', path(s.p)); }
  rec('J15 no console page errors on the Super Admin journey', s.errs.length === 0, s.errs); await s.ctx.close();
}
// 3. Moderator: restricted direct URLs render no protected content; health tile makes no 403 request
{
  const m = await session(seed.platform.moderator);
  m.net.length = 0;
  await m.p.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' }); await m.p.waitForTimeout(3500); await shot(m.p, '04-moderator-dashboard');
  rec('J16 moderator dashboard makes no /ecp/health request and shows an access boundary instead of an error', !m.net.some((x) => x.includes('/ecp/health')) && /not included in your role/.test(await m.p.locator('body').innerText()), m.net);
  for (const r of ['/admin/users', '/admin/inspector-applications', '/admin/featured-vehicles', '/admin/config', '/admin/communications', '/admin/provider-governance', '/admin/feedback', '/admin/staff']) {
    const before = m.net.length; await m.p.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded' }); await m.p.waitForTimeout(2200);
    const body = await m.p.locator('#main-content').innerText().catch(() => '');
    const denied = /Insufficient Permissions|Superadmin Only|not authori|Access denied|do not have/i.test(body);
    const apiCalls403 = m.net.slice(before).filter((x) => x.startsWith('403'));
    rec(`J17 moderator direct ${r}: denial shown and no protected data requested (403s: ${apiCalls403.length})`, denied && apiCalls403.length === 0, { denied, apiCalls403, body: body.slice(0, 120) });
    if (r === '/admin/users') await shot(m.p, '05-moderator-denied-users');
  }
  for (const r of ['/admin/reports', '/admin/reviews', '/admin/chats', '/admin/security-log']) {
    await m.p.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded' }); await m.p.waitForTimeout(2200);
    const body = await m.p.locator('#main-content').innerText().catch(() => '');
    rec(`J18 moderator still opens ${r}`, !/Insufficient Permissions|Superadmin Only/.test(body) && body.length > 40, body.slice(0, 100));
  }
  await m.ctx.close();
}
// 4. Personal accounts + dealer verifications screens (Super Admin)
{
  const s = await session(seed.platform.superadmin);
  await s.p.goto(`${BASE}/admin/private-seller-applications`, { waitUntil: 'domcontentloaded' }); await s.p.waitForTimeout(3000); await shot(s.p, '06-personal-accounts');
  const body = await s.p.locator('#main-content').innerText();
  rec('J19 Personal Accounts loads real accounts with no server error', /Personal accounts/.test(body) && !/Server error|could not load/i.test(body) && await s.p.locator('table tbody tr').count() >= 1, body.slice(0, 200));
  await s.p.getByRole('tab', { name: 'Historical applications' }).click(); await s.p.waitForTimeout(2000);
  rec('J20 Historical applications tab loads without a server error', !/Server error/.test(await s.p.locator('#main-content').innerText()));
  await s.p.goto(`${BASE}/admin/dealer-verifications`, { waitUntil: 'domcontentloaded' }); await s.p.waitForTimeout(3000); await shot(s.p, '07-dealer-verifications-superadmin');
  rec('J21 Dealer Verifications shows the Super Admin suspension-request queue', /awaiting your decision/.test(await s.p.locator('#main-content').innerText()));
  rec('J22 no failed API calls on those screens', s.net.length === 0, s.net); await s.ctx.close();
}
await b.close(); fs.writeFileSync(`${OUT}/closure-journeys.json`, JSON.stringify(results, null, 1));
const f = results.filter((r) => !r.ok); console.log(`\nclosure browser journeys: ${results.length - f.length}/${results.length} passed`); process.exit(f.length ? 1 : 0);
