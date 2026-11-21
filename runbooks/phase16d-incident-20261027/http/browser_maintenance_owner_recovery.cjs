/* global process, console, document, window, setTimeout */
// INCIDENT 20261027 - REAL-STACK browser check (Playwright -> built SPA -> disposable backend -> PostgREST -> disposable PostgreSQL; no mocking).
// DB legacy owner mode, backend WEBHOIST_EMAIL=owner148@example.test, SPA on :4173 (runbooks/phase13k-20261026/ui/serve-spa.mjs).
const fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, sql } = L;
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const SPA = 'http://127.0.0.1:4173', OWNER = 'owner148@example.test';
const flag = () => sql(`select value->>'isMaintenanceMode' from system_settings where key='system_status'`);
(async () => {
  const mk = async (email) => { const u = await L.register('user', {}); await L.verifyEmailViaToken(u.email); const id = sql(`select id from users where email='${u.email}'`); sql(`update users set status='approved', email_verified=true${email ? `, email='${email}'` : ''} where id='${id}'`); return { id, email: email || u.email }; };
  const owner = await mk(OWNER); const user = await mk();
  sql(`update system_settings set value = jsonb_set(value,'{isMaintenanceMode}','true'::jsonb) where key='system_status'`);
  await new Promise((r) => setTimeout(r, 11500));
  check('U0 fixture: maintenance is ON in the database (the hosted state)', flag() === 'true');
  const b = await chromium.launch(); const errs = [];
  const ctx = async () => { const c = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message)); return { c, p }; };
  const login = async (p, email) => { await p.goto(SPA + '/login'); await p.fill('input[type=email]', email); await p.fill('input[type=password]', L.PASSWORD); await p.click('button[type=submit]'); await p.waitForTimeout(3500); };
  // ordinary user: truthful maintenance message, no session
  const U = await ctx(); await login(U.p, user.email);
  const txt = (await U.p.textContent('body')) || '';
  check('U1 ordinary user sees the maintenance message (truthful, from the server) and stays on sign-in', /maintenance/i.test(txt) && /login/.test(U.p.url()), U.p.url());
  await U.p.screenshot({ path: OUT + '/user_login_during_maintenance.png', fullPage: true }); await U.c.close();
  // owner: signs in, reaches Panic Room, ends maintenance
  const O = await ctx(); await login(O.p, OWNER);
  check('U2 INCIDENT FIX: the owner signs in through the real login page while maintenance is on', !/\/login/.test(O.p.url()), O.p.url());
  await O.p.goto(SPA + '/admin/panic-room'); await O.p.waitForTimeout(3000);
  await O.p.screenshot({ path: OUT + '/owner_panic_room_during_maintenance.png', fullPage: true });
  const hasBtn = await O.p.getByText('END MAINTENANCE').count();
  check('U3 the owner reaches the Panic Room and sees END MAINTENANCE', hasBtn > 0, O.p.url());
  let dialogText = ''; O.p.on('dialog', async (d) => { dialogText = d.message(); await d.accept(); });
  await O.p.getByText('END MAINTENANCE').click(); await O.p.waitForTimeout(2500);
  check('U4 the owner ends maintenance from the UI: database flag is false', flag() === 'false', flag());
  await O.c.close();
  // after recovery: ordinary sign-in works again
  const U2 = await ctx(); await login(U2.p, user.email);
  check('U5 after recovery an ordinary user can sign in again', !/\/login/.test(U2.p.url()), U2.p.url()); await U2.c.close();
  // the warning wording when activating (without confirming)
  const O2 = await ctx(); await login(O2.p, OWNER); await O2.p.goto(SPA + '/admin/panic-room'); await O2.p.waitForTimeout(2500);
  let warn = ''; O2.p.on('dialog', async (d) => { warn = d.message(); await d.dismiss(); });
  await O2.p.getByText('ACTIVATE GLOBAL MAINTENANCE').click(); await O2.p.waitForTimeout(800);
  check('U6 activating total maintenance first shows the specific warning and, when dismissed, changes nothing', /TOTAL MAINTENANCE/.test(warn) && flag() === 'false', warn.slice(0, 60)); await O2.c.close();
  check('U7 no uncaught page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  await b.close();
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
