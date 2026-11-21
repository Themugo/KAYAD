/* global process, console, fetch */
// REAL-STACK: the public Navbar sign-out must be server-confirmed (disposable local stack; built SPA).
// usage: node browser_public_signout.cjs <spaBase> <outDir>
const fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check } = L;
const [SPA, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const u = await L.register('user', { name: 'Wanjiru Kamau' }); await L.verifyEmailViaToken(u.email);
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(SPA + '/login'); await p.fill('input[type=email]', u.email); await p.fill('input[type=password]', L.PASSWORD); await p.click('button[type=submit]');
  await p.waitForURL((x) => !/\/login/.test(x.pathname), { timeout: 15000 }); await p.goto(SPA + '/'); await p.waitForTimeout(3000);
  const meOk = () => p.evaluate(async () => (await fetch('/api/v1/auth/me', { credentials: 'include' })).status);
  check('P0 signed in (/auth/me 200)', (await meOk()) === 200);
  const trigger = p.locator('button[aria-expanded]').filter({ hasText: /Wanjiru|Account|WK/i }).first();
  await trigger.click(); await p.waitForTimeout(400);
  // failed sign-out: endpoint unreachable -> still signed in, visible alert
  await p.route('**/auth/logout', (r) => r.abort());
  await p.getByRole('button', { name: /Log Out/i }).first().click(); await p.waitForTimeout(1800);
  check('P1 failed public sign-out shows a visible alert (never silent)', (await p.getByTestId('signout-failure-notice').count()) === 1);
  check('P2 the session is still valid after the failed sign-out', (await p.unroute('**/auth/logout'), (await meOk()) === 200));
  await p.screenshot({ path: `${OUT}/public_signout_failed.png` });
  await p.getByRole('button', { name: 'Dismiss sign-out message' }).click();
  await trigger.click().catch(() => {}); await p.waitForTimeout(300);
  await p.getByRole('button', { name: /Log Out/i }).first().click(); await p.waitForTimeout(2500);
  check('P3 successful sign-out revokes the session server-side (/auth/me 401)', (await meOk()) === 401);
  check('P4 no alert after a successful sign-out', (await p.getByTestId('signout-failure-notice').count()) === 0);
  await p.goBack().catch(() => {}); await p.waitForTimeout(1500);
  check('P5 Back does not restore an authenticated session', (await meOk()) === 401);
  await p.goto(SPA + '/dashboard'); await p.waitForTimeout(2500);
  check('P6 protected deep link redirects to login', /\/login/.test(p.url()), p.url());
  check('P7 no uncaught page errors', errs.length === 0, errs.join(' | '));
  await b.close();
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
  process.exit(L.results.some((r) => !r.ok) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
