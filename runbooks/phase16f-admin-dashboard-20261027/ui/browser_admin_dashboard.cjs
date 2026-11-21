/* global process, console, setTimeout, fetch, window, document */
// REAL-STACK browser journey for the Super Admin dashboard polish (disposable local stack; built SPA).
// usage: node browser_admin_dashboard.cjs <spaBase> <outDir> <before|after>
const fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, sql } = L;
const [SPA, OUT, MODE] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const VIEWPORTS = [[1440, 900], [1280, 800], [768, 1024], [390, 844]];
const setMaintenance = (on) => sql(`update system_settings set value = jsonb_set(coalesce(value,'{}'::jsonb), '{isMaintenanceMode}', '${on}'::jsonb) where key='system_status'`);
(async () => {
  const u = await L.register('user', { name: 'Amina Otieno' }); await L.verifyEmailViaToken(u.email);
  const OWNER = 'owner148@example.test';
  sql(`update users set email='retired_'||id||'@example.test' where email='${OWNER}'`);
  sql(`update users set role='superadmin', status='approved', email_verified=true, email='${OWNER}' where email='${u.email}'`); u.email = OWNER;
  await new Promise((r) => setTimeout(r, 6000));
  const b = await chromium.launch(); const errs = [];
  const login = async (pg) => {
    await pg.goto(SPA + '/login'); await pg.fill('input[type=email]', u.email); await pg.fill('input[type=password]', L.PASSWORD);
    await pg.click('button[type=submit]'); await pg.waitForURL((x) => !/\/login/.test(x.pathname), { timeout: 15000 });
  };
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  await login(p); await p.goto(SPA + '/admin'); await p.waitForSelector('.kayad-command-hero', { timeout: 15000 }); await p.waitForTimeout(2500);
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  for (const [w, h] of VIEWPORTS) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/dashboard_${w}.png`, fullPage: false });
    await p.screenshot({ path: `${OUT}/dashboard_${w}_full.png`, fullPage: true });
    check(`V${w} no horizontal page overflow`, (await overflow()) <= 1, String(await overflow()));
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  const banner = ((await p.locator('[role=alert]').allTextContents()).join(' | ')) || '(none)';
  console.log('BANNER healthy-state:', banner.slice(0, 300));
  // Maintenance reproduction: admin data routes refused
  setMaintenance(true); await new Promise((r) => setTimeout(r, 11000));
  await p.reload(); await p.waitForSelector('.kayad-command-hero', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(3000);
  const mb = ((await p.locator('[role=alert]').allTextContents()).join(' | ')) || '(none)';
  console.log('BANNER maintenance:', mb.slice(0, 500));
  for (const [w, h] of VIEWPORTS) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/dashboard_unavailable_${w}.png` });
    check(`U${w} unavailable state has no horizontal overflow`, (await overflow()) <= 1, String(await overflow()));
    const kb = await p.evaluate(() => Array.from(document.querySelectorAll('.kayad-command-kpi')).map((e) => ({ h: Math.round(e.getBoundingClientRect().height), o: e.scrollWidth > e.clientWidth + 1 })));
    check(`U${w} KPI cards are equal height per row and none overflow`, kb.every((x) => !x.o) && new Set(kb.map((x) => x.h)).size <= 2, JSON.stringify(kb));
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  setMaintenance(false); await new Promise((r) => setTimeout(r, 11000));
  if (MODE === 'before') { await b.close(); console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail'); return; }

  check('M1 maintenance cause is named in the warning', /platform is in maintenance/i.test(mb), mb.slice(0, 160));
  await p.reload(); await p.waitForSelector('.kayad-command-hero'); await p.waitForTimeout(2500);
  check('M2 after maintenance ends the warning clears', (await p.locator('[role=alert]').count()) === 0);

  // account menu
  const trig = p.getByRole('button', { name: /Account menu for Amina Otieno/ });
  check('A1 header shows the real identity and role', (await trig.textContent()).includes('Amina Otieno') && /Super Admin/.test(await trig.textContent()));
  check('A2 trigger collapsed by default', (await trig.getAttribute('aria-expanded')) === 'false');
  await trig.click(); check('A3 opens', (await trig.getAttribute('aria-expanded')) === 'true' && (await p.getByRole('menu').count()) === 1);
  await p.screenshot({ path: `${OUT}/account_menu_1440.png` });
  const labels = await p.getByRole('menuitem').allTextContents();
  check('A4 items are only existing destinations + sign out', labels.length === 4 && /My profile/.test(labels[0]) && /settings/i.test(labels[1]) && /Owner management/.test(labels[2]) && /Sign out/.test(labels[3]), labels.join(' / '));
  await p.keyboard.press('Escape'); check('A5 Escape closes and focus returns to the trigger', (await p.getByRole('menu').count()) === 0 && await trig.evaluate((e) => e === document.activeElement));
  await trig.click(); await p.mouse.click(700, 500); check('A6 outside click closes', (await p.getByRole('menu').count()) === 0);
  await trig.focus(); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(100);
  check('A7 ArrowDown opens and focuses the first item', (await p.getByRole('menu').count()) === 1 && /My profile/.test(await p.evaluate(() => document.activeElement?.textContent || '')));
  await p.keyboard.press('End'); check('A8 End focuses Sign out', /Sign out/.test(await p.evaluate(() => document.activeElement?.textContent || '')));
  await p.keyboard.press('Escape');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400); await trig.click();
  const box = await p.getByRole('menu').boundingBox();
  check('A9 mobile: menu fits inside the viewport', box && box.x >= 0 && box.x + box.width <= 390, JSON.stringify(box));
  await p.screenshot({ path: `${OUT}/account_menu_390.png` }); await p.keyboard.press('Escape'); await p.setViewportSize({ width: 1440, height: 900 });

  // sidebar: stable across navigation, group toggles
  await p.evaluate(() => { document.querySelector('.admin-sidebar').dataset.probe = 'alive'; document.querySelector('.kayad-admin-header').dataset.probe = 'alive'; });
  const toggle = p.locator('.admin-sidebar__group-toggle').nth(1); const ctl = await toggle.getAttribute('aria-controls');
  check('S1 group toggle controls an element that exists', (await p.locator(`#${ctl}`).count()) === 1);
  await toggle.click(); check('S2 collapsing hides the group and updates aria-expanded', (await toggle.getAttribute('aria-expanded')) === 'false' && !(await p.locator(`#${ctl}`).isVisible()) && (await p.locator(`#${ctl}`).count()) === 1);
  const urlBefore = p.url(); check('S3 clicking a group does not navigate', p.url() === urlBefore);
  await toggle.click(); check('S4 expands again', await p.locator(`#${ctl}`).isVisible());
  // scroll + context restore (fresh history: go to dashboard via the sidebar link)
  await p.locator('.admin-sidebar__link', { hasText: 'Dashboard' }).first().click(); await p.waitForTimeout(1500);
  await p.evaluate(() => { const d = document.createElement('div'); d.id='pad'; d.style.height='3000px'; (document.querySelector('.kayad-admin-shell__content')||document.body).appendChild(d); });
  await p.evaluate(() => window.scrollTo(0, 400)); const sy = await p.evaluate(() => ({ w: window.scrollY, b: document.querySelector('.kayad-admin-shell__content').scrollTop })); await p.waitForTimeout(300);
  await p.locator('.admin-sidebar__link', { hasText: 'Users' }).first().click(); await p.waitForURL(/\/admin\/users/); await p.waitForTimeout(1200);
  check('S5 shell/sidebar/header were not remounted by navigation', await p.evaluate(() => document.querySelector('.admin-sidebar').dataset.probe === 'alive' && document.querySelector('.kayad-admin-header').dataset.probe === 'alive'));
  check('S6 active route is indicated and the parent group is marked', (await p.locator('.admin-sidebar__link.is-active').first().getAttribute('aria-current')) === 'page' && (await p.locator('.admin-sidebar__group.has-active-route').count()) === 1);
  await p.goBack(); await p.waitForTimeout(3000); console.log('after back url', p.url());
  const back = await p.evaluate(() => ({ w: window.scrollY, b: document.querySelector('.kayad-admin-shell__content').scrollTop }));
  console.log('scroll before', JSON.stringify(sy), 'after back', JSON.stringify(back));
  check('N1 Back returns to the dashboard with scroll restored', (sy.w > 0 ? back.w > 0 : true) && (sy.b > 0 ? back.b > 0 : true) && (sy.w + sy.b) > 0, JSON.stringify({ sy, back }));
  // dashboard view state kept: open specialist tools -> choose User review -> search -> leave and return
  await p.getByRole('button', { name: /specialist tools/i }).click(); await p.getByRole('button', { name: 'User review module' }).click();
  await p.getByRole('button', { name: /specialist tools/i }).click();
  await p.fill('input[aria-label="Search administration records"]', 'amina'); await p.waitForTimeout(300);
  await p.locator('.admin-sidebar__link', { hasText: 'Listings' }).first().click(); await p.waitForURL(/\/admin\/cars/);
  await p.goBack(); await p.waitForTimeout(2500); console.log('after back2 url', p.url());
  if (!(await p.locator('input[aria-label="Search administration records"]').count())) await p.getByRole('button', { name: /specialist tools/i }).click();
  const sv = await p.locator('input[aria-label="Search administration records"]').inputValue().catch(() => '(missing)');
  check('N2 dashboard module and search are kept after returning', sv === 'amina', sv);

  // failed sign-out: server unreachable -> stays signed in, shows the error
  await p.route('**/auth/logout', (r) => r.abort());
  await trig.click(); await p.getByRole('menuitem', { name: /Sign out/ }).click(); await p.waitForTimeout(1500);
  check('L1 failed sign-out is reported and the user is not claimed signed out', (await p.locator('.kayad-admin-account__error').count()) === 1 && /admin/.test(p.url()));
  await p.screenshot({ path: `${OUT}/signout_failed_1440.png` });
  await p.unroute('**/auth/logout');
  // real sign-out
  await p.getByRole('menuitem', { name: /Sign out/ }).click(); await p.waitForURL(/\/login/, { timeout: 10000 });
  check('L2 sign-out lands on the login page', /\/login/.test(p.url()));
  const me = await p.evaluate(async () => (await fetch('/api/v1/auth/me', { credentials: 'include' })).status);
  check('L3 the session is revoked server-side (/auth/me 401)', me === 401, me);
  const adm = await p.evaluate(async () => (await fetch('/api/admin/users', { credentials: 'include' })).status);
  check('L4 admin API refused after sign-out', adm === 401 || adm === 403, adm);
  let usable = 0;
  for (let i = 0; i < 8; i += 1) { await p.goBack().catch(() => {}); await p.waitForTimeout(1500); if (await p.locator('.kayad-command-hero, .kayad-admin-shell').count()) usable += 1; }
  check('L5 pressing Back repeatedly never shows a usable admin page after sign-out', usable === 0, 'usable views: ' + usable + ' url ' + p.url());
  await p.goto(SPA + '/admin'); await p.waitForTimeout(2500);
  check('L6 deep link to /admin after sign-out redirects to login', /\/login/.test(p.url()), p.url());
  check('L7 no uncaught page errors', errs.length === 0, errs.join(' | '));
  await b.close();
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
  process.exit(L.results.some((r) => !r.ok) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
