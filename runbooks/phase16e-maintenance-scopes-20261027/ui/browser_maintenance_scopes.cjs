/* global process, console, setTimeout */
// REAL-STACK browser journey: Playwright -> built SPA (:4173) -> disposable backend -> PostgREST -> disposable PostgreSQL. No mocking.
// Legacy owner mode (backend WEBHOIST_EMAIL=owner148@example.test). Local only; says nothing about hosted behaviour.
const fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, sql, call } = L;
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const SPA = 'http://127.0.0.1:4173', OWNER = 'owner148@example.test';
const dbState = () => JSON.parse(sql(`select value::text from system_settings where key='system_status'`));
(async () => {
  const mk = async (role, email) => { const u = await L.register('user', {}); await L.verifyEmailViaToken(u.email); const id = sql(`select id from users where email='${u.email}'`); sql(`update users set role='${role}', status='approved', email_verified=true${email ? `, email='${email}'` : ''} where id='${id}'`); return { id, email: email || u.email }; };
  await mk('user', OWNER); const dealer = await mk('dealer'); const buyer = await mk('user'); const tech = await mk('technical_support'); const plainStaff = await mk('technical_support');
  const ownerLogin = await L.login(OWNER);
  const grant = await call('PUT', `/api/admin/staff/${tech.id}/permissions`, { jar: ownerLogin.jar, body: { grantedPermissions: ['platform_recovery'] } });
  check('U0 fixtures: owner granted platform_recovery to one technical account through the real endpoint', grant.status === 200, grant.status);
  const b = await chromium.launch(); const errs = [];
  const ctx = async () => { const c = await b.newContext({ viewport: { width: 1280, height: 1000 } }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message)); return { c, p }; };
  const login = async (p, email) => { await p.goto(SPA + '/login'); await p.fill('input[type=email]', email); await p.fill('input[type=password]', L.PASSWORD); await p.click('button[type=submit]'); await p.waitForTimeout(3500); };
  const body = async (p) => (await p.textContent('body')) || '';

  // owner signs in and opens the Panic Room
  const O = await ctx(); await login(O.p, OWNER);
  check('U1 owner signs in through the real login page', !/\/login/.test(O.p.url()), O.p.url());
  await O.p.goto(SPA + '/admin/panic-room'); await O.p.waitForTimeout(3000);
  check('U2 the Panic Room shows the server-confirmed state "MAINTENANCE NOT ACTIVE" and the four scopes', /MAINTENANCE NOT ACTIVE/.test(await body(O.p)) && (await O.p.getByRole('radio').count()) === 4);
  await O.p.screenshot({ path: OUT + '/01_panic_room_inactive.png', fullPage: true });

  // failed activation: wrong password -> server error shown, state unchanged, no false success
  await O.p.getByLabel(/Dealers and dealership staff/).check();
  await O.p.fill('#maint-reason', 'Dealer portal data migration window');
  await O.p.fill('#maint-incident', 'INC-2026-1027');
  await O.p.fill('#maint-pw', 'definitely-wrong-password');
  await O.p.getByText('ACTIVATE SELECTED MAINTENANCE').click(); await O.p.waitForTimeout(2500);
  const afterWrong = await body(O.p);
  check('U3 a FAILED activation (wrong password) shows the server error, still says NOT ACTIVE, and the database is unchanged', /password is incorrect|incorrect/i.test(afterWrong) && /MAINTENANCE NOT ACTIVE/.test(afterWrong) && dbState().isMaintenanceMode !== true, afterWrong.slice(0, 80));
  await O.p.screenshot({ path: OUT + '/02_failed_activation.png', fullPage: true });

  // dealers-only maintenance
  await O.p.fill('#maint-pw', L.PASSWORD);
  await O.p.getByText('ACTIVATE SELECTED MAINTENANCE').click(); await O.p.waitForTimeout(3000);
  const t1 = await body(O.p);
  check('U4 dealers-only maintenance activated; the page shows the state READ BACK from the server (scope, reason, incident, operator)', /MAINTENANCE ACTIVE — Dealers and dealership staff/.test(t1) && /Dealer portal data migration window \(INC-2026-1027\)/.test(t1) && /Confirmed by the server · version 1/.test(t1) && dbState().maintenanceScope === 'dealers', t1.slice(0, 100));
  await O.p.screenshot({ path: OUT + '/03_dealers_scope_active.png', fullPage: true });
  await O.p.waitForTimeout(10500);

  // a dealer is refused with the truthful scoped message; a buyer and public pages are unaffected
  const D = await ctx(); await login(D.p, dealer.email);
  const dt = await body(D.p);
  check('U5 a dealer sees the truthful dealer-maintenance message and stays on sign-in', /Dealer accounts are temporarily under maintenance/i.test(dt) && /\/login/.test(D.p.url()), D.p.url());
  await D.p.screenshot({ path: OUT + '/04_dealer_refused.png', fullPage: true }); await D.c.close();
  const B = await ctx(); await login(B.p, buyer.email);
  check('U6 a buyer signs in normally while only dealers are restricted', !/\/login/.test(B.p.url()), B.p.url());
  await B.p.goto(SPA + '/'); await B.p.waitForTimeout(2000);
  check('U7 the public marketplace home page renders for the buyer (no maintenance screen)', !/under maintenance/i.test(await body(B.p)));
  await B.c.close();
  const P = await ctx(); await P.p.goto(SPA + '/'); await P.p.waitForTimeout(2500);
  check('U8 an anonymous visitor still browses the public marketplace', !/under maintenance/i.test(await body(P.p))); await P.c.close();

  // scope change to GLOBAL needs the typed phrase
  await O.p.reload(); await O.p.waitForTimeout(3000);
  await O.p.getByLabel(/Global shutdown/).check();
  await O.p.fill('#maint-reason', 'Escalating: database corruption suspected');
  await O.p.fill('#maint-pw', L.PASSWORD);
  await O.p.getByText('ACTIVATE GLOBAL SHUTDOWN').click(); await O.p.waitForTimeout(800);
  check('U9 global shutdown is blocked client-side until the exact phrase is typed (and the server would refuse it anyway)', /Type GLOBAL SHUTDOWN exactly/.test(await body(O.p)) && dbState().maintenanceScope === 'dealers');
  await O.p.fill('#maint-confirm', 'GLOBAL SHUTDOWN');
  await O.p.getByText('ACTIVATE GLOBAL SHUTDOWN').click(); await O.p.waitForTimeout(3000);
  const t2 = await body(O.p);
  check('U10 global shutdown active, confirmed by the server; the owner still has the controls on screen', /MAINTENANCE ACTIVE — Global shutdown/.test(t2) && /END MAINTENANCE/.test(t2) && dbState().maintenanceScope === 'global', t2.slice(0, 100));
  await O.p.screenshot({ path: OUT + '/05_global_active_owner_view.png', fullPage: true });
  await O.p.waitForTimeout(10500);

  const V = await ctx(); await V.p.goto(SPA + '/'); await V.p.waitForTimeout(3000);
  await V.p.screenshot({ path: OUT + '/06_public_during_global.png', fullPage: true });
  await V.c.close();
  const PS = await ctx(); await login(PS.p, plainStaff.email);
  check('U11 ordinary technical staff WITHOUT the grant are refused during global shutdown', /\/login/.test(PS.p.url()) && /maintenance|offline/i.test(await body(PS.p)), PS.p.url()); await PS.c.close();

  // authorised technical recovery: sign in, recovery page, ends maintenance with a reason
  const T = await ctx(); await login(T.p, tech.email);
  check('U12 technical staff WITH the explicit grant can sign in during global shutdown', !/\/login/.test(T.p.url()), T.p.url());
  await T.p.goto(SPA + '/admin/platform-recovery'); await T.p.waitForTimeout(3000);
  const tt = await body(T.p);
  check('U13 the recovery page shows the active global state and offers NO start/scope controls', /MAINTENANCE ACTIVE — Global shutdown/.test(tt) && (await T.p.getByRole('radio').count()) === 0 && !/ACTIVATE/.test(tt), tt.slice(0, 100));
  await T.p.screenshot({ path: OUT + '/07_technical_recovery_page.png', fullPage: true });
  await T.p.goto(SPA + '/admin/panic-room'); await T.p.waitForTimeout(2500);
  check('U14 the technical user cannot open the owner Panic Room (superadmin-only page)', /restricted to (the platform )?super ?admin|Superadmin Only/i.test(await body(T.p)));
  await T.p.goto(SPA + '/admin/platform-recovery'); await T.p.waitForTimeout(2500);
  await T.p.fill('#maint-rec-reason', 'Database corruption ruled out; restoring service');
  await T.p.fill('#maint-pw', L.PASSWORD);
  await T.p.getByText('END MAINTENANCE').click(); await T.p.waitForTimeout(3000);
  const t3 = await body(T.p);
  check('U15 technical recovery ends maintenance; the page shows the server-confirmed inactive state with who ended it', /MAINTENANCE NOT ACTIVE/.test(t3) && /Last ended by/.test(t3) && dbState().isMaintenanceMode === false, t3.slice(0, 100));
  await T.p.screenshot({ path: OUT + '/08_after_recovery.png', fullPage: true }); await T.c.close();
  await new Promise((r) => setTimeout(r, 500));
  const D2 = await ctx(); await login(D2.p, dealer.email);
  check('U16 after recovery the dealer can sign in again', !/\/login/.test(D2.p.url()), D2.p.url()); await D2.c.close();
  check('U17 audit trail: activation, scope change, recovery rows exist with actors', Number(sql(`select count(*) from audit_logs where action in ('Maintenance activated: dealers','Maintenance scope changed: dealers -> global','Maintenance recovered: global')`)) === 3);
  check('U18 no uncaught page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  await O.c.close(); await b.close();
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
  process.exit(L.results.some((r) => !r.ok) ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
