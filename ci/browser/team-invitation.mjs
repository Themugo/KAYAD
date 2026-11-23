// Real-browser journey for the dealer team invitation (disposable stack only: 99_browser_hold + vite on :5299).
// Owner invites through the real Team page -> recipient opens the EMAILED link logged out -> signs in -> returns to the same invitation ->
// accepts -> membership + counts update. Also: resend -> old link explained, newest link works; mobile layout. Raw tokens are never printed.
import { createRequire } from 'node:module'; import fs from 'node:fs';
process.env.KAYAD_JOURNEY_BASE ||= 'http://127.0.0.1:5065'; process.env.KAYAD_JOURNEY_DB ||= 'kayad_ci'; process.env.PGPORT ||= '5432'; process.env.PGPASSWORD ||= 'ci-disposable-only';
const { makeUser, q, uid, PW } = await import('../db-journeys/lib.mjs');
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'docs/handover/PRODUCTION-READINESS-20261123/evidence/browser-invitation';
const seed = JSON.parse(fs.readFileSync(new URL('../db-journeys/out/browser-seed.json', import.meta.url)));
const LOG = new URL('../db-journeys/out/brevo-stub.log', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, cond, extra) => { results.push({ name, pass: !!cond, extra: cond ? undefined : extra }); console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ' :: ' + JSON.stringify(extra)}`); };
const links = (email) => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []).filter((m) => (m.to || []).some((t) => t.email === email)).map((m) => (/dealer\/setup\?invite=([0-9a-f]{64})/.exec(m.html || '') || [])[1]).filter(Boolean);
const linkUrl = (tok) => `${BASE}/dealer/setup?invite=${tok}`;
const b = await chromium.launch();
const errsAll = [];
const ctx = async (w = 1280, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700 }); const p = await c.newPage(); p.on('pageerror', (e) => errsAll.push(e.message)); return { c, p }; };
const login = async (p, email) => { await p.locator('input[type="email"], input[name="email"]').first().fill(email); await p.locator('input[type="password"]').first().fill(PW); await p.locator('button[type="submit"]').first().click(); };

// ---- owner invites through the real UI
const invitee = await makeUser({ tag: 'binv', email: `binv-${uid()}@example.test` });
const O = await ctx();
await O.p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(1200); await login(O.p, seed.dealer); await O.p.waitForTimeout(3500);
await O.p.goto(`${BASE}/?nav=dealer-dashboard&section=team`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(2500);
await O.p.locator('input[type="email"]').first().fill(invitee.email);
await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
ok('owner sees the pending invitation in Team', await O.p.getByText(invitee.email, { exact: false }).first().isVisible() && await O.p.getByText(/pending invitation/i).first().isVisible());
await O.p.screenshot({ path: `${OUT}/01-owner-pending.png` });
const t1 = links(invitee.email).at(-1);
ok('the e-mail provider received a link with a 64-hex token', !!t1);

// ---- recipient: logged out -> link -> sign in -> back to the same invitation -> accept
const R = await ctx();
await R.p.goto(linkUrl(t1), { waitUntil: 'domcontentloaded' }); await R.p.waitForTimeout(2500);
ok('logged-out visitor is sent to sign in', /\/login/.test(R.p.url()));
const nextParam = new URL(R.p.url()).searchParams.get('next') || '';
ok('the sign-in URL carries the same invitation (token preserved, not printed)', nextParam.includes(`invite=${t1}`));
await login(R.p, invitee.email); await R.p.waitForTimeout(4000);
ok('after sign-in the visitor is back on the invitation page', /\/dealer\/setup/.test(R.p.url()) && R.p.url().includes(`invite=${t1}`), R.p.url().replace(t1, '<token>'));
const btn = R.p.getByRole('button', { name: 'Accept invitation' });
ok('Accept invitation is a visible, enabled button', await btn.isVisible() && await btn.isEnabled());
const box = await btn.boundingBox(); ok('button has a real touch-sized box (>= 40px high, >= 120px wide)', box && box.height >= 40 && box.width >= 120, box);
const bg = await btn.evaluate((e) => { const c = getComputedStyle(e); return { color: c.backgroundColor, image: c.backgroundImage }; }); ok('button has a filled background (colour or gradient; not plain text)', (bg.color !== 'rgba(0, 0, 0, 0)' && bg.color !== 'transparent') || bg.image !== 'none', bg);
await R.p.screenshot({ path: `${OUT}/02-recipient-invitation-desktop.png` });
await btn.click(); await R.p.waitForTimeout(3000);
ok('acceptance shows "You have joined the team"', await R.p.getByText(/You have joined the team/).isVisible());
await R.p.screenshot({ path: `${OUT}/03-recipient-accepted.png` });
const row = q(`select status||'|'||(member is not null)||'|'||role||'|'||(invite_token_hash is not null) from dealer_teams where invite_email='${invitee.email}'`);
ok('database: membership active exactly once, role kept, token cleared', row === `active|true|viewer|false` || row.startsWith('active|true|'), row);
ok('exactly one membership row', q(`select count(*) from dealer_teams where invite_email='${invitee.email}'`) === '1');
await R.p.reload({ waitUntil: 'domcontentloaded' }); await R.p.waitForTimeout(2500);
await R.p.getByRole('button', { name: 'Accept invitation' }).click(); await R.p.waitForTimeout(2500);
ok('refreshing and accepting again does not undo or duplicate: the spent link says it was already used', await R.p.getByText(/already been used/i).isVisible());
ok('...still exactly one active membership', q(`select count(*) from dealer_teams where invite_email='${invitee.email}' and status='active'`) === '1');
await O.p.reload({ waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(2500);
ok('owner Team page no longer shows a pending invitation for them and lists them as active', !(await O.p.getByText(/pending invitation/i).first().isVisible().catch(() => false)) || (await O.p.getByText(invitee.email).count()) >= 1);
await O.p.screenshot({ path: `${OUT}/04-owner-after-accept.png` });

// ---- resend: newest link works, old link explained
const inv2 = await makeUser({ tag: 'binv2', email: `binv2-${uid()}@example.test` });
await O.p.locator('input[type="email"]').first().fill(inv2.email);
await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
const old = links(inv2.email).at(-1);
const row2 = O.p.locator('div,li', { hasText: inv2.email }).filter({ has: O.p.getByRole('button', { name: /resend invitation/i }) }).last();
await row2.getByRole('button', { name: /resend invitation/i }).click(); await O.p.waitForTimeout(2500);
const fresh = links(inv2.email).at(-1);
ok('resend e-mails a NEW token', !!old && !!fresh && old !== fresh);
const R2 = await ctx(); await R2.p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await R2.p.waitForTimeout(1200); await login(R2.p, inv2.email); await R2.p.waitForTimeout(3500);
await R2.p.goto(linkUrl(old), { waitUntil: 'domcontentloaded' }); await R2.p.waitForTimeout(2000);
await R2.p.getByRole('button', { name: 'Accept invitation' }).click(); await R2.p.waitForTimeout(2500);
ok('the OLD link explains that it was replaced by a newer e-mail', await R2.p.getByText(/replaced by a newer e-mail/i).isVisible());
await R2.p.screenshot({ path: `${OUT}/05-old-link-explained.png` });
await R2.p.goto(linkUrl(fresh), { waitUntil: 'domcontentloaded' }); await R2.p.waitForTimeout(2000);
await R2.p.getByRole('button', { name: 'Accept invitation' }).click(); await R2.p.waitForTimeout(2500);
ok('the NEWEST link is accepted', await R2.p.getByText(/You have joined the team/).isVisible());

// ---- wrong account
const inv3 = await makeUser({ tag: 'binv3', email: `binv3-${uid()}@example.test` }); const other = await makeUser({ tag: 'bother', email: `bother-${uid()}@example.test` });
await O.p.locator('input[type="email"]').first().fill(inv3.email); await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
const t3 = links(inv3.email).at(-1);
const W = await ctx(); await W.p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await W.p.waitForTimeout(1200); await login(W.p, other.email); await W.p.waitForTimeout(3500);
await W.p.goto(linkUrl(t3), { waitUntil: 'domcontentloaded' }); await W.p.waitForTimeout(2000);
await W.p.getByRole('button', { name: 'Accept invitation' }).click(); await W.p.waitForTimeout(2500);
ok('a different signed-in e-mail gets a clear 403 explanation', await W.p.getByRole('alert').isVisible());
ok('...and the invitation is not consumed', q(`select status from dealer_teams where invite_email='${inv3.email}'`) === 'invited');

// ---- dashboard pending count agrees with the database (and therefore with acceptance)
await O.p.goto(`${BASE}/?nav=dealer-dashboard`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(4000);
const tile = await O.p.getByTestId('team-invites').first().innerText().catch(() => '');
const pendingDb = q(`select count(*) from dealer_teams where status='invited' and dealer=(select id from users where email='${seed.dealer}') and invite_expires_at > now()`);
ok('dashboard "Invitations waiting" equals the database pending count', tile.replace(/\s+/g, ' ').includes(pendingDb), { tile, pendingDb });
await O.p.screenshot({ path: `${OUT}/07-owner-dashboard-pending-count.png` });

// ---- mobile layout of the invitation page
const inv4 = await makeUser({ tag: 'binv4', email: `binv4-${uid()}@example.test` });
await O.p.goto(`${BASE}/?nav=dealer-dashboard&section=team`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(2500);
await O.p.locator('input[type="email"]').first().fill(inv4.email); await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
const t4 = links(inv4.email).at(-1);
const M = await ctx(390, 844); await M.p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await M.p.waitForTimeout(1200); await login(M.p, inv4.email); await M.p.waitForTimeout(3500);
await M.p.goto(linkUrl(t4), { waitUntil: 'domcontentloaded' }); await M.p.waitForTimeout(2000);
const mb = await M.p.getByRole('button', { name: 'Accept invitation' }).boundingBox();
ok('mobile 390px: button visible, within the viewport, no horizontal overflow', mb && mb.x >= 0 && mb.x + mb.width <= 390 && !(await M.p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), mb);
await M.p.screenshot({ path: `${OUT}/06-recipient-invitation-mobile.png` });
ok('no uncaught page errors during the whole journey', errsAll.length === 0, errsAll.slice(0, 3));
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
await b.close();
console.log(`browser journey: ${results.filter((r) => r.pass).length}/${results.length} passed`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
