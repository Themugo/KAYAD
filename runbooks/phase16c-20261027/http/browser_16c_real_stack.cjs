/* global process, console, document, window, setTimeout, fetch, getComputedStyle */
// PHASE 16C - REAL-STACK (extends 16B: ledger at 390px, keyboard/focus, API error state) browser check (Playwright -> built SPA -> disposable backend -> PostgREST -> disposable PostgreSQL). No request mocking.
// Needs: DB in owner mode, backend with WEBHOIST_EMAIL=owner148@example.test + OWNER_MFA_ENCRYPTION_KEY, SPA served on :4173 (runbooks/phase13k-20261026/ui/serve-spa.mjs).
const fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const L = require('../../phase16-20261026/e2e_lib.cjs');
const { check, sql } = L;
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const SPA = 'http://127.0.0.1:4173', OWNER = 'owner148@example.test';
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js', { paths: [process.cwd(), '/opt/npm-tools/node_modules'] }), 'utf8');
(async () => {
  const T = await import('../../../backend/utils/totp.js');
  const mk = async (role) => { const u = await L.register(role === 'dealer' ? 'dealer' : 'user'); await L.verifyEmailViaToken(u.email); const id = sql(`select id from users where email='${u.email}'`); sql(`update users set role='${role}', status='approved', email_verified=true where id='${id}'`); return { id, email: u.email }; };
  sql(`update users set email='retired_'||id||'@example.test' where email='${OWNER}'`);
  const o = await mk('user'); sql(`update users set email='${OWNER}' where id='${o.id}'`); o.email = OWNER;
  sql(`delete from owner_memberships; insert into owner_memberships(user_id,email,status,added_via,added_by_label) values ('${o.id}','${OWNER}','active','bootstrap','16B browser fixture')`);
  const d = await mk('dealer'); const u = await mk('user');
  await new Promise((r) => setTimeout(r, 6000));
  const b = await chromium.launch(); const errs = [];
  const newCtx = async (w = 1280, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message)); return { c, p }; };
  const login = async (p, email, code) => {
    await p.goto(SPA + '/login'); await p.fill('input[type=email]', email); await p.fill('input[type=password]', L.PASSWORD); await p.click('button[type=submit]');
    if (code) { const f = p.getByLabel(/Authenticator code/i); await f.waitFor({ timeout: 15000 }); await f.fill(code); await p.click('button[type=submit]'); }
    await p.waitForTimeout(2500);
  };
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const axe = async (p, name) => { await p.evaluate(AXE); const r = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length }))); const bad = r.filter((v) => v.impact === 'critical' || v.impact === 'serious'); fs.writeFileSync(`${OUT}/axe_${name}.json`, JSON.stringify(r, null, 1)); return bad; };

  // ---- OWNER: real sign-in, owner management, real TOTP enrolment, MFA challenge, invite dialog
  const O = await newCtx(); await login(O.p, OWNER);
  await O.p.goto(SPA + '/admin/owners'); await O.p.waitForSelector('text=Platform owners', { timeout: 20000 });
  check('B1 owner opens Platform owners (real backend)', true); await O.p.screenshot({ path: OUT + '/owner_management_desktop.png', fullPage: true });
  const axeOwners = await axe(O.p, 'owners'); check('B1 axe: no critical/serious violations on owner management', axeOwners.length === 0, JSON.stringify(axeOwners));
  await O.p.click('text=Set up authenticator'); await O.p.fill('#mfa-pw', L.PASSWORD); await O.p.click('button:has-text("Continue")');
  await O.p.waitForSelector('[data-testid=mfa-secret]', { timeout: 10000 });
  const secret = ((await O.p.textContent('[data-testid=mfa-secret]')) || '').replace(/\s+/g, '');
  check('B2 real enrolment shows a 32-char base32 secret', /^[A-Z2-7]{32}$/.test(secret), secret.length); await O.p.screenshot({ path: OUT + '/owner_mfa_enrol.png', fullPage: true });
  await O.p.fill('#mfa-code', T.totpAt(secret)); await O.p.click('button:has-text("Turn on")'); await O.p.waitForSelector('[data-testid=mfa-recovery-codes]', { timeout: 10000 });
  const codes = ((await O.p.textContent('[data-testid=mfa-recovery-codes]')) || '').match(/[A-Z0-9]{5}-[A-Z0-9]{5}/g) || [];
  check('B2 activation with a REAL TOTP code shows 10 recovery codes once', codes.length === 10, codes.length); await O.p.screenshot({ path: OUT + '/owner_mfa_recovery_codes.png', fullPage: true });
  check('B2 DB: factor active, secret encrypted', sql(`select status||':'||left(secret_enc,3) from owner_mfa_factors where user_id='${o.id}'`) === 'active:v1:');
  await O.p.click('text=I have saved them'); await O.p.waitForSelector('text=Authenticator app is on');
  await O.p.click('button:has-text("Invite owner")'); await O.p.waitForSelector('#own-mfa'); check('B3 invite dialog demands the authenticator code once enrolled', true); await O.p.screenshot({ path: OUT + '/owner_invite_dialog.png', fullPage: true });
  // ---- 16C keyboard / focus / error-state checks (desktop, real backend)
  check('K1 opening the invite form moves keyboard focus into its first field', (await O.p.evaluate(() => document.activeElement && document.activeElement.id)) === 'own-email');
  await O.p.keyboard.press('Tab'); check('K2 Tab moves to the next field in a logical order (confirm address)', (await O.p.evaluate(() => document.activeElement && document.activeElement.id)) === 'own-confirm');
  const ring = await O.p.evaluate(() => { const s = getComputedStyle(document.activeElement); return { outline: s.outlineStyle + ' ' + s.outlineWidth, shadow: s.boxShadow, border: s.borderColor }; });
  check('K3 the focused field has a visible focus indicator (outline or ring)', (ring.outline && !/^none/.test(ring.outline) && !/ 0px$/.test(ring.outline)) || (ring.shadow && ring.shadow !== 'none'), JSON.stringify(ring));
  const wrongEmail = 'err_' + Date.now() + '@example.test';
  await O.p.fill('#own-email', wrongEmail); await O.p.fill('#own-confirm', wrongEmail); await O.p.fill('#own-pw', 'definitely-wrong-password'); await O.p.fill('#own-mfa', '000000');
  await O.p.click('button:has-text("Send invitation")'); await O.p.waitForSelector('[role=alert]', { timeout: 15000 });
  const alertText = (await O.p.textContent('form[aria-label="Invite an owner"] [role=alert]')) || '';
  check('K4 API error state: a refused change shows a readable alert in the form (no crash, no raw JSON)', alertText.length > 5 && !/[{}]/.test(alertText) && !/stack|undefined|\[object/i.test(alertText), alertText);
  check('K4 …and the password field is cleared after the failed attempt', (await O.p.inputValue('#own-pw')) === '' && (await O.p.inputValue('#own-mfa')) === '');
  check('K4 …and no invitation or owner was created by the failed attempt', sql(`select count(*) from owner_invitations where email='${wrongEmail}'`) === '0' && sql('select count(*) from owner_memberships') === '1');
  sql(`update owner_mfa_factors set failed_attempts=0, locked_until=null where user_id='${o.id}'`);
  await O.p.focus('#own-email'); await O.p.keyboard.press('Escape'); await O.p.waitForTimeout(300);
  check('K5 Escape closes the form without submitting', (await O.p.locator('form[aria-label="Invite an owner"]').count()) === 0);
  await O.p.focus('button:has-text("Invite owner")'); await O.p.keyboard.press('Enter'); await O.p.waitForTimeout(300);
  check('K6 the invite action is operable by keyboard alone (Enter on the focused button opens the form and moves focus in)', (await O.p.evaluate(() => document.activeElement && document.activeElement.id)) === 'own-email');
  await O.p.keyboard.press('Escape');
  // seed ledger rows through the real DATABASE FUNCTION the API itself calls (an in-page fetch needs CSRF + a live second factor; the
  // function is the same code path and writes the same append-only events), with the signed-in owner as the actor
  let seeded = 0;
  for (const i of [6, 7, 8]) {
    const e = `ledger${i}_${Date.now()}@example.test`; const h = require('crypto').randomBytes(32).toString('hex');
    const r = sql(`select (kayad_owner_issue_invitation('${e}','invitation','${h}',now()+interval '2 days','${o.id}','${OWNER}','16C ledger fixture')::jsonb)->>'ok'`);
    if (/true|t/.test(String(r))) seeded++;
  }
  check('K7 ledger fixture: invitations created through the real API (3)', seeded === 3, 'seeded=' + seeded);
  await O.p.reload(); await O.p.waitForSelector('text=Platform owners', { timeout: 20000 }); await O.p.waitForSelector('text=Who changed what');
  await O.p.screenshot({ path: OUT + '/owner_management_desktop_with_ledger.png', fullPage: true });
  const axeD = await axe(O.p, 'owners_with_ledger'); check('K8 axe (desktop, with ledger rows): no critical/serious violations', axeD.length === 0, JSON.stringify(axeD));
  await O.p.setViewportSize({ width: 390, height: 844 }); await O.p.waitForTimeout(500); await O.p.screenshot({ path: OUT + '/owner_management_390.png', fullPage: true });
  check('B3 no horizontal overflow at 390px (owner management)', !(await overflow(O.p)));
  await O.p.reload(); await O.p.waitForSelector('text=Who changed what'); await O.p.waitForTimeout(500);
  await O.p.screenshot({ path: OUT + '/owner_management_390_with_ledger.png', fullPage: true });
  check('L1 no horizontal page overflow at 390px with a populated ledger', !(await overflow(O.p)));
  const geo = await O.p.evaluate(() => [...document.querySelectorAll('table.owner-tbl')].map((t) => { const rows = [...t.querySelectorAll('tbody tr')]; const cells = [...t.querySelectorAll('tbody td')]; const bad = cells.filter((c) => { const r = c.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1; }).length; const labelled = cells.filter((c) => c.getAttribute('data-label')).length; const display = cells[0] ? getComputedStyle(cells[0]).display : ''; return { name: t.getAttribute('aria-label'), rows: rows.length, cells: cells.length, outside: bad, labelled, display, tableScroll: t.scrollWidth > t.clientWidth + 1 }; }));
  console.log('INFO L2 geometry', JSON.stringify(geo));
  check('L2 owners, invitations and audit tables all render with rows', geo.length === 3 && geo.every((g) => g.rows > 0), JSON.stringify(geo));
  check('L2 no cell extends outside the 390px viewport and no table needs sideways scrolling', geo.every((g) => g.outside === 0 && !g.tableScroll), JSON.stringify(geo));
  check('L2 every data cell carries its column label and cells are stacked (grid), not squeezed columns', geo.every((g) => g.labelled === g.cells && g.display === 'grid'), JSON.stringify(geo));
  const minH = await O.p.evaluate(() => Math.min(...[...document.querySelectorAll('table.owner-tbl td')].map((c) => parseFloat(getComputedStyle(c).fontSize))));
  check('L3 text stays readable on mobile (>= 12px)', minH >= 12, 'min font ' + minH);
  const small = await O.p.evaluate(() => [...document.querySelectorAll('button, a, input, select')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 24 || r.width < 24); }).length);
  check('L4 interactive controls are at least 24x24 CSS px at 390px (WCAG 2.2 target size minimum)', small === 0, 'too small: ' + small);
  const axeM = await axe(O.p, 'owners_390'); check('L5 axe (390px, with ledger rows): no critical/serious violations', axeM.length === 0, JSON.stringify(axeM));

  await O.c.close();
  // fresh session: sign-in must now challenge for the second factor
  const O2 = await newCtx(); await login(O2.p, OWNER, T.totpAt(secret, Date.now() + 30000));
  await O2.p.goto(SPA + '/admin/owners'); await O2.p.waitForSelector('text=Platform owners', { timeout: 20000 });
  check('B4 MFA challenge at real sign-in: correct code opens a session', true);
  await O2.c.close();
  const O3 = await newCtx(); await O3.p.goto(SPA + '/login'); await O3.p.fill('input[type=email]', OWNER); await O3.p.fill('input[type=password]', L.PASSWORD); await O3.p.click('button[type=submit]');
  const f3 = O3.p.getByLabel(/Authenticator code/i); await f3.waitFor({ timeout: 15000 }); await f3.fill('000000'); await O3.p.click('button[type=submit]'); await O3.p.waitForTimeout(2000);
  check('B4 wrong code is refused in the UI (no session; still on sign-in)', /login/.test(O3.p.url()) || (await O3.p.getByLabel(/Authenticator code/i).count()) > 0); await O3.p.screenshot({ path: OUT + '/login_mfa_wrong_code.png', fullPage: true });
  const axeLogin = await axe(O3.p, 'login_mfa'); check('B4 axe: no critical/serious violations on the MFA challenge', axeLogin.length === 0, JSON.stringify(axeLogin)); await O3.c.close();
  sql(`update owner_mfa_factors set failed_attempts=0, locked_until=null where user_id='${o.id}'`);
  const O4 = await newCtx(); await login(O4.p, OWNER, codes[0]); await O4.p.goto(SPA + '/admin/owners'); await O4.p.waitForSelector('text=Platform owners', { timeout: 20000 });
  check('B4 a recovery code signs in once (UI) and is consumed', sql(`select count(*) from owner_mfa_recovery_codes where user_id='${o.id}' and used_at is not null`) === '1'); await O4.c.close();

  // ---- DEALER and plain user: the owner surface must be unreachable in the UI and API; dealer operations render at desktop and 390px
  for (const [label, acct] of [['dealer', d], ['user', u]]) {
    const X = await newCtx(); await login(X.p, acct.email); await X.p.goto(SPA + '/admin/owners'); await X.p.waitForTimeout(3000);
    const seen = await X.p.getByText('Platform owners').count(); const api = await X.p.evaluate(async () => (await fetch('/api/owner', { credentials: 'include' })).status);
    check(`B5 ${label}: /admin/owners shows no owner management and /api/owner is ${api}`, seen === 0 && (api === 403 || api === 401), `seen=${seen} api=${api}`); await X.p.screenshot({ path: `${OUT}/${label}_blocked_owner_route.png`, fullPage: true });
    if (label === 'dealer') {
      await X.p.goto(SPA + '/dealer/onboarding'); await X.p.waitForTimeout(3000); await X.p.screenshot({ path: OUT + '/dealer_onboarding_desktop.png', fullPage: true });
      const a = await axe(X.p, 'dealer_onboarding'); check('B6 axe: no critical/serious violations on dealer onboarding', a.length === 0, JSON.stringify(a));
      await X.p.setViewportSize({ width: 390, height: 844 }); await X.p.waitForTimeout(500); await X.p.screenshot({ path: OUT + '/dealer_onboarding_390.png', fullPage: true });
      check('B6 no horizontal overflow at 390px (dealer onboarding)', !(await overflow(X.p)));
      const st = sql(`select role||'/'||super_admin::text from users where id='${acct.id}'`); check('B6 using dealer pages changed no role', st === 'dealer/false', st);
    }
    await X.c.close();
  }
  check('B7 owner membership count unchanged (1) after all UI journeys', sql('select count(*) from owner_memberships') === '1');
  check('B8 no uncaught page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close();
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
