/* global process, console, setTimeout, fetch */
// REAL-STACK browser journey for the PRIMARY OWNER with an enrolled authenticator, during a global shutdown, on the final built SPA:
// sign in with MFA -> session verified -> Panic Room -> end maintenance (password + authenticator code) -> platform back.
// Owner-governance mode: DB has owner_memberships + owner MFA tables; backend started with WEBHOIST_EMAIL=owner148@example.test and OWNER_MFA_ENCRYPTION_KEY.
// Disposable local stack only. Authenticator codes come from KAYAD's own RFC 6238 implementation (no physical authenticator app).
const fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, sql, call } = L;
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const SPA = 'http://127.0.0.1:4173', OWNER = 'owner148@example.test';
const dbState = () => JSON.parse(sql(`select value::text from system_settings where key='system_status'`));
(async () => {
  const T = await import('../../../backend/utils/totp.js');
  sql(`update users set email='retired_'||id||'@example.test' where email='${OWNER}'`);
  const u = await L.register('user', {}); await L.verifyEmailViaToken(u.email);
  const id = sql(`select id from users where email='${u.email}'`);
  sql(`update users set status='approved', email_verified=true, email='${OWNER}' where id='${id}'`);
  sql(`delete from owner_memberships; insert into owner_memberships(user_id,email,status,added_via,added_by_label) values ('${id}','${OWNER}','active','bootstrap','browser fixture')`);
  await new Promise((r) => setTimeout(r, 6000));
  const lg = await L.login(OWNER); const A = { jar: lg.jar, token: lg.res.body?.token || lg.res.body?.accessToken };
  const en = await call('POST', '/api/owner/mfa/enroll', { ...A, body: { password: L.PASSWORD } }); const secret = en.body.secret;
  const act = await call('POST', '/api/owner/mfa/activate', { ...A, body: { code: T.totpAt(secret, Date.now()) } }); const rc = act.body.recoveryCodes || [];
  check('B0 fixture: the primary owner has an ACTIVE authenticator', en.status === 201 && act.status === 200 && (act.body.recoveryCodes || []).length === 10, `${en.status}/${act.status}`);
  // the incident: owner starts a global shutdown (API, with password + code, exactly what the Panic Room sends)
  const on = await call('POST', '/api/admin/system/maintenance/activate', { ...A, body: { scope: 'global', reason: 'Browser MFA recovery rehearsal', incidentRef: 'INC-B', password: L.PASSWORD, confirmation: 'GLOBAL SHUTDOWN', mfaCode: rc[0] } });
  check('B1 global shutdown is active', on.status === 200 && dbState().maintenanceScope === 'global', on.status + ' ' + on.body?.code);

  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  const body = async (pg) => (await pg.textContent('body')) || '';
  // a visitor sees the maintenance state
  const V = await b.newContext(); const vp = await V.newPage(); await vp.goto(SPA + '/'); await vp.waitForTimeout(3000);
  check('B2 a public visitor is told the platform is under maintenance (not a blank or broken page)', /maintenance|offline|temporarily/i.test(await body(vp)), (await body(vp)).slice(0, 100));
  await vp.screenshot({ path: OUT + '/mfa_01_visitor_during_global.png' });

  // owner: password first
  await p.goto(SPA + '/login'); await p.fill('input[type=email]', OWNER); await p.fill('input[type=password]', L.PASSWORD); await p.click('button[type=submit]'); await p.waitForTimeout(3000);
  const needCode = (await p.locator('input[name=mfaCode]').count()) > 0 && /\/login/.test(p.url());
  check('B3 MFA IS ENFORCED: after the password the form asks for the authenticator code and the owner is NOT signed in', needCode);
  await p.screenshot({ path: OUT + '/mfa_02_code_prompt_during_global.png' });
  // wrong code first
  await p.fill('input[name=mfaCode]', '000000'); await p.click('button[type=submit]'); await p.waitForTimeout(2500);
  check('B4 a wrong code is rejected and the owner stays on the sign-in form', /\/login/.test(p.url()));
  sql(`update owner_mfa_factors set failed_attempts=0, locked_until=null where user_id='${id}'`);
  await p.fill('input[name=mfaCode]', T.totpAt(secret, Date.now() + 30000)); await p.click('button[type=submit]'); await p.waitForTimeout(4000);
  check('B5 the owner signs in with the correct authenticator code during the global shutdown', !/\/login/.test(p.url()), p.url());
  const me = await p.evaluate(async () => { const r = await fetch('/api/v1/auth/me', { credentials: 'include' }); const j = await r.json().catch(() => ({})); return { s: r.status, email: j?.user?.email || j?.data?.email || j?.email }; });
  check('B6 the session is verified by the server (/auth/me 200 as the owner)', me.s === 200 && /owner148/.test(String(me.email)), JSON.stringify(me));
  const adminProbe = await p.evaluate(async () => (await fetch('/api/admin/users', { credentials: 'include' })).status);
  check('B7 exempt is not authorised: an admin data route is still refused during the shutdown (503)', adminProbe === 503, adminProbe);

  await p.goto(SPA + '/admin/panic-room'); await p.waitForTimeout(3500);
  const t = await body(p);
  check('B8 the owner reaches the Panic Room and sees the server-confirmed ACTIVE global state with the end-maintenance action', /MAINTENANCE ACTIVE — Global shutdown/.test(t) && /END MAINTENANCE/.test(t), t.slice(0, 120));
  await p.screenshot({ path: OUT + '/mfa_03_panic_room_global_active.png', fullPage: true });

  // end maintenance: wrong code first (must change nothing), then the right one
  await p.fill('#maint-pw', L.PASSWORD); await p.fill('#maint-mfa', '000000'); await p.getByRole('button', { name: 'END MAINTENANCE' }).click(); await p.waitForTimeout(2500);
  const t2 = await body(p);
  check('B9 a wrong authenticator code does NOT end maintenance; the page still shows ACTIVE and the database is unchanged', /MAINTENANCE ACTIVE/.test(t2) && dbState().isMaintenanceMode === true, t2.slice(0, 100));
  sql(`update owner_mfa_factors set failed_attempts=0, locked_until=null where user_id='${id}'`);
  await p.waitForTimeout(31000); // authenticator codes are single-use per 30s step; wait for the next one
  await p.fill('#maint-pw', L.PASSWORD); await p.fill('#maint-mfa', T.totpAt(secret, Date.now() + 30000)); await p.getByRole('button', { name: 'END MAINTENANCE' }).click(); await p.waitForTimeout(3500);
  const t3 = await body(p);
  check('B10 with password + a valid code the owner ends maintenance; the page shows the server-confirmed INACTIVE state', /MAINTENANCE NOT ACTIVE/.test(t3) && dbState().isMaintenanceMode === false, t3.slice(0, 100));
  await p.screenshot({ path: OUT + '/mfa_04_after_recovery.png', fullPage: true });
  await vp.goto(SPA + '/'); await vp.waitForTimeout(3000);
  check('B11 the public marketplace is back for visitors', !/under maintenance|emergency maintenance/i.test(await body(vp)), (await body(vp)).slice(0, 100));
  check('B12 no uncaught page errors', errs.length === 0, errs.join(' | '));
  await b.close();
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
  process.exit(L.results.some((r) => !r.ok) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
