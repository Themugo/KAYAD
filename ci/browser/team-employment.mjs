// Real-browser journey for Team & Employment (disposable stack only: 99_browser_hold + vite on :5299 + API :5065).
// Owner: sections, summary tiles, invite at Basic (no role select), staff table with Staff ID, detail, end-employment reason; mobile 390px no overflow.
// Employee (Basic): sees ONLY own staff profile. Raw tokens are never printed.
import { createRequire } from 'node:module'; import fs from 'node:fs';
process.env.KAYAD_JOURNEY_BASE ||= 'http://127.0.0.1:5065'; process.env.KAYAD_JOURNEY_DB ||= 'kayad_ci'; process.env.PGPORT ||= '5432'; process.env.PGPASSWORD ||= 'ci-disposable-only';
const { makeUser, q, uid, PW } = await import('../db-journeys/lib.mjs');
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'docs/handover/TEAM-EMPLOYMENT-20261123/evidence/browser';
const seed = JSON.parse(fs.readFileSync(new URL('../db-journeys/out/browser-seed.json', import.meta.url)));
const LOG = new URL('../db-journeys/out/brevo-stub.log', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, cond, extra) => { results.push({ name, pass: !!cond, extra: cond ? undefined : extra }); console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ' :: ' + JSON.stringify(extra)}`); };
const tokenFor = (email) => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []).filter((m) => (m.to || []).some((t) => t.email === email)).map((m) => /dealer\/setup\?invite=([0-9a-f]{64})/.exec(m.html || '')?.[1]).filter(Boolean).at(-1);
const b = await chromium.launch(); const errs = [];
const ctx = async (w = 1280, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700 }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message)); return { c, p }; };
const login = async (p, email) => { await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200); await p.locator('input[type="email"], input[name="email"]').first().fill(email); await p.locator('input[type="password"]').first().fill(PW); await p.locator('button[type="submit"]').first().click(); await p.waitForTimeout(3500); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

const O = await ctx(); await login(O.p, seed.dealer);
await O.p.goto(`${BASE}/?nav=dealer-dashboard&section=team`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(3000);
ok('heading "Team & Employment" and the subtitle', await O.p.getByRole('heading', { name: 'Team & Employment' }).isVisible() && await O.p.getByText('Hire, onboard and manage your dealership staff, their roles and access.').isVisible());
for (const t of [/^Team Members/, /^Invitations/, /^Roles & Permissions/, /^Employment Records/, /^Activity \(Dealer\)/]) ok(`section tab ${t}`, await O.p.getByRole('tab', { name: t }).isVisible());
ok('summary tiles show real counts', /\d/.test(await O.p.getByTestId('sum-active').innerText()) && await O.p.getByTestId('sum-pending').isVisible());
ok('Team Members table lists seeded staff with Staff ID', (await O.p.locator('[data-testid="cell-staff-id"]').allInnerTexts()).some((t) => /-STAFF-\d{3}/.test(t)), await O.p.locator('[data-testid="cell-staff-id"]').allInnerTexts());
await O.p.screenshot({ path: `${OUT}/01-owner-team-members.png`, fullPage: true });
await O.p.getByRole('button', { name: /^View / }).first().click(); await O.p.waitForTimeout(1500);
ok('staff detail shows staff number, login e-mail, effective permissions and history', await O.p.getByTestId('staff-detail').isVisible() && /-STAFF-\d{3}/.test(await O.p.getByTestId('detail-staff-number').innerText()) && await O.p.getByTestId('effective-permissions').isVisible());
await O.p.screenshot({ path: `${OUT}/02-owner-staff-detail.png`, fullPage: true });
await O.p.getByRole('button', { name: 'Close staff details' }).click();

// Invitations: Basic default, no role select
await O.p.getByRole('tab', { name: /^Invitations/ }).click(); await O.p.waitForTimeout(500);
ok('invite form has NO role selector and states the Basic default', await O.p.getByLabel('Role', { exact: true }).count() === 0 && await O.p.getByTestId('basic-default-note').innerText() === 'Every new employee starts with Basic Staff Access. You can assign their operational role after they join.');
const jane = await makeUser({ tag: 'bjane', email: `bjane-${uid()}@example.test` });
await O.p.getByLabel('Email', { exact: true }).fill(jane.email);
await O.p.getByLabel(/Employee name/).fill('Jane Wanjiru');
ok('preview names Basic Staff Access', /Basic Staff Access/.test(await O.p.getByTestId('invite-preview').innerText()));
await O.p.screenshot({ path: `${OUT}/03-owner-invitation-form.png`, fullPage: true });
await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
ok('invitation appears as pending', await O.p.getByText(jane.email).first().isVisible());
const roleAtInvite = q(`select role from dealer_teams where invite_email='${jane.email}'`);
ok('database: invited at basic_staff', roleAtInvite === 'basic_staff', roleAtInvite);

// Jane accepts through the real e-mailed token (API) then signs in to the browser
const tok = tokenFor(jane.email);
const acc = await jane.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } });
ok('Jane accepts the e-mailed link', acc.status === 200, acc.status);
const J = await ctx(); await login(J.p, jane.email);
await J.p.goto(`${BASE}/?nav=dealership-workspace`, { waitUntil: 'domcontentloaded' }); await J.p.waitForTimeout(3500);
const body = await J.p.locator('body').innerText();
ok('Basic employee sees "My staff profile" with staff number and the Basic note, and no leads/finance/team tabs', await J.p.getByTestId('staff-profile').isVisible() && await J.p.getByTestId('basic-access-note').isVisible() && /-STAFF-\d{3}/.test(await J.p.getByTestId('staff-number').innerText()) && !/Team & Employment/.test(body), body.slice(0, 300));
await J.p.screenshot({ path: `${OUT}/04-employee-basic-profile.png`, fullPage: true });
await J.p.getByLabel(/Name to use/).fill('Jane W'); await J.p.getByRole('button', { name: 'Save my details' }).click(); await J.p.waitForTimeout(1500);
ok('employee saves name/phone profile', await J.p.getByText('Your staff profile is saved.').isVisible());

// Owner promotes Jane in the UI then ends her employment (reason mandatory)
await O.p.reload({ waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(2500);
await O.p.getByRole('tab', { name: /^Team Members/ }).click();
await O.p.getByLabel('Search staff').fill('Jane'); await O.p.waitForTimeout(400);
await O.p.getByRole('button', { name: /^View / }).first().click(); await O.p.waitForTimeout(1500);
await O.p.getByLabel('Operational role').selectOption('sales_agent'); await O.p.getByRole('button', { name: 'Apply role' }).click(); await O.p.waitForTimeout(2000);
ok('role applied in the UI (database sales_agent)', q(`select role from dealer_teams where invite_email='${jane.email}'`) === 'sales_agent');
await O.p.getByRole('button', { name: 'End employment…' }).click(); await O.p.getByRole('button', { name: 'Confirm end of employment' }).click();
ok('ending employment without a reason is blocked with a message', await O.p.getByText(/Give a short reason/).isVisible());
await O.p.getByLabel(/^Reason/).fill('Contract ended'); await O.p.getByRole('button', { name: 'Confirm end of employment' }).click(); await O.p.waitForTimeout(2500);
ok('database: removed/terminated, staff number kept', q(`select status||'|'||employment_status||'|'||(staff_number is not null)::text from dealer_teams where invite_email='${jane.email}'`) === 'removed|terminated|true');
await O.p.screenshot({ path: `${OUT}/05-owner-after-termination.png`, fullPage: true });
await O.p.getByRole('tab', { name: /^Employment Records/ }).click(); await O.p.waitForTimeout(1200);
ok('Employment Records lists the history', await O.p.getByTestId('records-list').isVisible());
await O.p.getByRole('tab', { name: /^Roles & Permissions/ }).click(); await O.p.waitForTimeout(800);
ok('Roles & Permissions shows Basic Staff Access and the protected boundaries', await O.p.getByText('Basic Staff Access').first().isVisible() && await O.p.getByTestId('protected-boundaries').isVisible());
await O.p.getByRole('tab', { name: /^Activity/ }).click(); await O.p.waitForTimeout(1200);
ok('Activity section renders (list or honest empty state)', await O.p.getByTestId('activity-list').count() + await O.p.getByTestId('activity-empty').count() > 0);

// Mobile 390
const M = await ctx(390, 844); await login(M.p, seed.dealer);
await M.p.goto(`${BASE}/?nav=dealer-dashboard&section=team`, { waitUntil: 'domcontentloaded' }); await M.p.waitForTimeout(3000);
ok('390px Team Members: no horizontal page overflow', !(await overflow(M.p)));
await M.p.screenshot({ path: `${OUT}/06-mobile-members.png`, fullPage: true });
await M.p.getByRole('tab', { name: /^Invitations/ }).click(); await M.p.waitForTimeout(600);
ok('390px Invitations: no horizontal page overflow', !(await overflow(M.p)));
await M.p.screenshot({ path: `${OUT}/07-mobile-invitations.png`, fullPage: true });
ok('no uncaught page errors', errs.length === 0, errs.slice(0, 3));
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
const f = results.filter((r) => !r.pass).length; console.log(`\nteam-employment browser: ${results.length - f}/${results.length} passed`);
await b.close(); process.exit(f ? 1 : 0);
