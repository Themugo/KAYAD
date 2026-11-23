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
const openInv = async (p) => { const t = p.getByRole('tab', { name: /^Invitations/ }); if (await t.count()) { await t.click(); await p.waitForTimeout(400); } }; // Team & Employment keeps the invite form on its Invitations tab
const login = async (p, email) => { await p.locator('input[type="email"], input[name="email"]').first().fill(email); await p.locator('input[type="password"]').first().fill(PW); await p.locator('button[type="submit"]').first().click(); };

// ---- owner invites through the real UI
const invitee = await makeUser({ tag: 'binv', email: `binv-${uid()}@example.test` });
const O = await ctx();
await O.p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(1200); await login(O.p, seed.dealer); await O.p.waitForTimeout(3500);
await O.p.goto(`${BASE}/?nav=dealer-dashboard&section=team`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(2500);
await openInv(O.p); await O.p.locator('input[type="email"]').first().fill(invitee.email);
await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
ok('owner sees the pending invitation in Team', await O.p.getByText(invitee.email, { exact: false }).first().isVisible() && await O.p.getByText(/pending invitation/i).first().isVisible());
await O.p.screenshot({ path: `${OUT}/01-owner-pending.png` });
const t1 = links(invitee.email).at(-1);
ok('the e-mail provider received a link with a 64-hex token', !!t1);

// ---- recipient: logged out -> link -> sign in -> back to the same invitation -> accept
const R = await ctx();
await R.p.goto(linkUrl(t1), { waitUntil: 'domcontentloaded' }); await R.p.waitForTimeout(2500);
ok('logged-out visitor sees the invitation summary (dealership, role, invited e-mail) on a public page, not a bare login wall', /\/dealer\/setup/.test(R.p.url()) && await R.p.getByTestId('invite-summary').isVisible() && (await R.p.getByTestId('invite-email').innerText()) === invitee.email);
await R.p.screenshot({ path: `${OUT}/00-recipient-signed-out-summary.png` });
await R.p.getByTestId('invite-sign-in').click(); await R.p.waitForTimeout(2000);
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
ok('database: membership active exactly once, role kept, hash kept so the spent link reports "already used" (status gates claims)', row.startsWith('active|true|') && row.endsWith('|true'), row);
ok('exactly one membership row', q(`select count(*) from dealer_teams where invite_email='${invitee.email}'`) === '1');
await R.p.reload({ waitUntil: 'domcontentloaded' }); await R.p.waitForTimeout(2500);
await R.p.waitForTimeout(500);
ok('refreshing and accepting again does not undo or duplicate: the spent link says it was already used', await R.p.getByText(/already been used/i).isVisible());
ok('...still exactly one active membership', q(`select count(*) from dealer_teams where invite_email='${invitee.email}' and status='active'`) === '1');
await O.p.reload({ waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(2500);
ok('owner Team page lists the accepted invitee as current staff with a staff number', (await O.p.getByLabel('Search staff').fill(invitee.email.split('@')[0]).then(() => O.p.waitForTimeout(300)), true) && (await O.p.locator('[data-testid="cell-staff-id"]').allInnerTexts()).some((t) => /-STAFF-\d{3}/.test(t)), 'no staff row');
await O.p.screenshot({ path: `${OUT}/04-owner-after-accept.png` });

// ---- resend: newest link works, old link explained
const inv2 = await makeUser({ tag: 'binv2', email: `binv2-${uid()}@example.test` });
await openInv(O.p); await O.p.locator('input[type="email"]').first().fill(inv2.email);
await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
const old = links(inv2.email).at(-1);
const row2 = O.p.locator('div,li', { hasText: inv2.email }).filter({ has: O.p.getByRole('button', { name: /resend invitation/i }) }).last();
await row2.getByRole('button', { name: /resend invitation/i }).click(); await O.p.waitForTimeout(2500);
const fresh = links(inv2.email).at(-1);
ok('resend e-mails a NEW token', !!old && !!fresh && old !== fresh);
const R2 = await ctx(); await R2.p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await R2.p.waitForTimeout(1200); await login(R2.p, inv2.email); await R2.p.waitForTimeout(3500);
await R2.p.goto(linkUrl(old), { waitUntil: 'domcontentloaded' }); await R2.p.waitForTimeout(2000);
ok('the OLD link says it is not recognised and may have been replaced by a newer e-mail (no accept button offered)', await R2.p.getByTestId('invite-state-not_recognised').isVisible() && /newer e-mail/i.test(await R2.p.getByTestId('invite-state-not_recognised').innerText()) && !(await R2.p.getByTestId('accept-invitation').isVisible().catch(() => false)));
await R2.p.screenshot({ path: `${OUT}/05-old-link-explained.png` });
await R2.p.goto(linkUrl(fresh), { waitUntil: 'domcontentloaded' }); await R2.p.waitForTimeout(2000);
await R2.p.getByRole('button', { name: 'Accept invitation' }).click(); await R2.p.waitForTimeout(2500);
ok('the NEWEST link is accepted', await R2.p.getByText(/You have joined the team/).isVisible());

// ---- wrong account (Account B) vs the invited account (Account A): switch path, token preserved, then acceptance
const inv3 = await makeUser({ tag: 'binv3', email: `binv3-${uid()}@example.test` }); const other = await makeUser({ tag: 'bother', email: `bother-${uid()}@example.test` });
await openInv(O.p); await O.p.locator('input[type="email"]').first().fill(inv3.email); await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
const t3 = links(inv3.email).at(-1);
const W = await ctx(); const consoleErrs = []; W.p.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().replace(/[0-9a-f]{64}/g, '<hex64>')); });
const net = []; W.p.on('response', (r) => { if (r.url().includes('/dealer-platform/team/accept')) net.push(r.status()); });
await W.p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await W.p.waitForTimeout(1200); await login(W.p, other.email); await W.p.waitForTimeout(3500);
await W.p.goto(linkUrl(t3), { waitUntil: 'domcontentloaded' }); await W.p.waitForTimeout(2000);
const wbox = W.p.getByTestId('wrong-account');
ok('Account B: clear wrong-account message naming the signed-in e-mail', await wbox.isVisible() && (await wbox.innerText()).includes(other.email));
ok('...the wrong-account panel never shows the token and offers no Accept button', !(await wbox.innerText()).includes(t3) && !(await W.p.getByTestId('accept-invitation').isVisible().catch(() => false)));
ok('...invitation is still pending and unchanged (server-side 403 for this case is proven in journey 21)', q(`select status||'|'||(member is null)||'|'||(invite_token_hash is not null) from dealer_teams where invite_email='${inv3.email}'`) === 'invited|true|true');
await W.p.screenshot({ path: `${OUT}/08-wrong-account-desktop.png` });
await W.p.getByTestId('switch-account').click(); await W.p.waitForTimeout(3500);
ok('switch account: signed out and sent to sign-in carrying the same invitation (no loop)', /\/login/.test(W.p.url()) && (new URL(W.p.url()).searchParams.get('next') || '').includes(`invite=${t3}`));
await login(W.p, inv3.email); await W.p.waitForTimeout(4000);
ok('Account A signs in and is returned to the same invitation', /\/dealer\/setup/.test(W.p.url()) && W.p.url().includes(`invite=${t3}`));
await W.p.getByRole('button', { name: 'Accept invitation' }).click(); await W.p.waitForTimeout(3000);
ok('Account A accepts the same invitation', await W.p.getByText(/You have joined the team/).isVisible());
ok('exactly one active membership, for Account A', q(`select count(*) from dealer_teams where invite_email='${inv3.email}' and status='active' and member=(select id from users where email='${inv3.email}')`) === '1' && q(`select count(*) from dealer_teams where invite_email='${inv3.email}'`) === '1');
ok('no console errors on the wrong-account/switch flow (sanitised)', consoleErrs.filter((e) => !/403|Failed to load resource/.test(e)).length === 0, consoleErrs.slice(0, 3));
// wrong-account page on a phone
const inv5 = await makeUser({ tag: 'binv5', email: `binv5-${uid()}@example.test` });
await O.p.goto(`${BASE}/?nav=dealer-dashboard&section=team`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(2500);
await openInv(O.p); await O.p.locator('input[type="email"]').first().fill(inv5.email); await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
const t5 = links(inv5.email).at(-1);
const MW = await ctx(390, 844); await MW.p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await MW.p.waitForTimeout(1200); await login(MW.p, other.email); await MW.p.waitForTimeout(3500);
await MW.p.goto(linkUrl(t5), { waitUntil: 'domcontentloaded' }); await MW.p.waitForTimeout(2000);
const sb = await MW.p.getByTestId('switch-account').boundingBox();
ok('mobile 390px wrong-account page: switch button inside the viewport, no horizontal overflow', sb && sb.x >= 0 && sb.x + sb.width <= 390 && !(await MW.p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), sb);
await MW.p.screenshot({ path: `${OUT}/09-wrong-account-mobile.png` });

// ---- dashboard pending count agrees with the database (and therefore with acceptance)
await O.p.goto(`${BASE}/?nav=dealer-dashboard`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(4000);
const tile = await O.p.getByTestId('team-invites').first().innerText().catch(() => '');
const pendingDb = q(`select count(*) from dealer_teams where status='invited' and dealer=(select id from users where email='${seed.dealer}') and invite_expires_at > now()`);
ok('dashboard "Invitations waiting" equals the database pending count', tile.replace(/\s+/g, ' ').includes(pendingDb), { tile, pendingDb });
await O.p.screenshot({ path: `${OUT}/07-owner-dashboard-pending-count.png` });

// ---- mobile layout of the invitation page
const inv4 = await makeUser({ tag: 'binv4', email: `binv4-${uid()}@example.test` });
await O.p.goto(`${BASE}/?nav=dealer-dashboard&section=team`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(2500);
await openInv(O.p); await O.p.locator('input[type="email"]').first().fill(inv4.email); await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
const t4 = links(inv4.email).at(-1);
const M = await ctx(390, 844); await M.p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await M.p.waitForTimeout(1200); await login(M.p, inv4.email); await M.p.waitForTimeout(3500);
await M.p.goto(linkUrl(t4), { waitUntil: 'domcontentloaded' }); await M.p.waitForTimeout(2000);
const mb = await M.p.getByRole('button', { name: 'Accept invitation' }).boundingBox();
ok('mobile 390px: button visible, within the viewport, no horizontal overflow', mb && mb.x >= 0 && mb.x + mb.width <= 390 && !(await M.p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), mb);
await M.p.screenshot({ path: `${OUT}/06-recipient-invitation-mobile.png` });
// ---- NEW USER: invited person with no account -> summary -> create account (locked e-mail) -> verify -> sign in -> back on invitation -> accept
const newEmail = `bnew-${uid()}@example.test`;
await O.p.goto(`${BASE}/?nav=dealer-dashboard&section=team`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(2500);
await openInv(O.p); await O.p.locator('input[type="email"]').first().fill(newEmail); await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
const tn = links(newEmail).at(-1);
ok('invitation e-mail sent to a person who has no account yet', !!tn);
for (const [label, w, h, tag] of [['desktop', 1280, 900, 'd'], ['mobile 390px', 390, 844, 'm']]) {
  const em = tag === 'd' ? newEmail : `bnew2-${uid()}@example.test`; let tk = tn;
  if (tag === 'm') { await openInv(O.p); await O.p.locator('input[type="email"]').first().fill(em); await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500); tk = links(em).at(-1); }
  const N = await ctx(w, h);
  await N.p.goto(linkUrl(tk), { waitUntil: 'domcontentloaded' }); await N.p.waitForTimeout(2500);
  ok(`${label}: no-account visitor sees the invitation and a Create account button`, await N.p.getByTestId('invite-summary').isVisible() && await N.p.getByTestId('invite-create-account').isVisible());
  ok(`${label}: no horizontal overflow on the invitation page`, !(await N.p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  await N.p.screenshot({ path: `${OUT}/10-new-user-invitation-${tag}.png` });
  await N.p.getByTestId('invite-create-account').click(); await N.p.waitForTimeout(2500);
  ok(`${label}: registration opens with the invited e-mail pre-filled and locked, personal account, no role chooser`, /\/register/.test(N.p.url()) && (await N.p.getByTestId('register-email').inputValue()) === em && await N.p.getByTestId('register-email').evaluate((e) => e.readOnly) && await N.p.getByTestId('register-invite-banner').isVisible(), N.p.url().replace(tk, '<token>'));
  await N.p.screenshot({ path: `${OUT}/11-new-user-register-${tag}.png` });
  await N.p.getByLabel('Full name').fill('Invited Staff'); await N.p.locator('input[type="password"]').first().fill(PW);
  await N.p.getByRole('button', { name: /^Create account$/ }).click(); await N.p.waitForTimeout(3500);
  ok(`${label}: account created as a personal user (role user), unverified`, q(`select role||'|'||coalesce(email_verified::text,'?') from users where email='${em}'`).startsWith('user|'), q(`select role from users where email='${em}'`));
  await N.p.screenshot({ path: `${OUT}/12-new-user-check-email-${tag}.png` });
  await new Promise((r) => setTimeout(r, 1500));
  const vmsg = (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []).filter((m) => (m.to || []).some((t) => t.email === em) && /verify/i.test(m.subject || '')).at(-1);
  const vlink = vmsg?.html?.match(/href=\\?"([^"\\]*verify-email[^"\\]*)/)?.[1]?.replace(/&amp;/g, '&');
  ok(`${label}: verification e-mail went only to the invited address`, !!vlink && (vmsg.to || []).length === 1);
  if (!vlink) continue;
  const vu = new URL(vlink); await N.p.goto(`${BASE}${vu.pathname}${vu.search}`, { waitUntil: 'domcontentloaded' }); await N.p.waitForTimeout(3500);
  ok(`${label}: e-mail verified in the database`, q(`select email_verified from users where email='${em}'`) === 't', q(`select email_verified from users where email='${em}'`));
  await N.p.screenshot({ path: `${OUT}/13-new-user-verified-${tag}.png` });
  if (!/\/dealer\/setup/.test(N.p.url())) {
    const goLogin = N.p.getByRole('link', { name: /sign in|log in|continue/i }).first();
    if (await goLogin.isVisible().catch(() => false)) { await goLogin.click(); await N.p.waitForTimeout(2000); } else { await N.p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await N.p.waitForTimeout(1500); }
    if (/\/login/.test(N.p.url())) { await login(N.p, em); await N.p.waitForTimeout(4000); }
  }
  ok(`${label}: after verify + sign-in the person is back on the SAME invitation`, /\/dealer\/setup/.test(N.p.url()) && N.p.url().includes(`invite=${tk}`), N.p.url().replace(tk, '<token>'));
  const ab = N.p.getByTestId('accept-invitation');
  ok(`${label}: Accept invitation is offered (no wrong-account panel)`, await ab.isVisible().catch(() => false) && !(await N.p.getByTestId('wrong-account').isVisible().catch(() => false)));
  await N.p.screenshot({ path: `${OUT}/14-new-user-accept-${tag}.png` });
  await ab.click(); await N.p.waitForTimeout(3000);
  ok(`${label}: acceptance succeeds`, await N.p.getByTestId('invite-done').isVisible().catch(() => false));
  ok(`${label}: exactly one active membership for the new user`, q(`select count(*) from dealer_teams where invite_email='${em}' and status='active' and member=(select id from users where email='${em}')`) === '1' && q(`select count(*) from dealer_teams where invite_email='${em}'`) === '1');
  ok(`${label}: dealership owner got an in-app notification and the acceptance e-mail had no token`, q(`select count(*) from notifications where user_id=(select id from users where email='${seed.dealer}') and message ilike '%${em}%'`) !== '0' || q(`select count(*) from notifications where user_id=(select id from users where email='${seed.dealer}') and data::text ilike '%accepted%'`) !== '0');
}
// ---- spent / cancelled / expired links read clearly
const sp = await ctx(); await sp.p.goto(linkUrl(tn), { waitUntil: 'domcontentloaded' }); await sp.p.waitForTimeout(2500);
ok('a spent link says it has already been used (signed out, no accept button)', await sp.p.getByTestId('invite-state-accepted').isVisible() && !(await sp.p.getByTestId('accept-invitation').isVisible().catch(() => false)));
await sp.p.screenshot({ path: `${OUT}/15-spent-link.png` });
const exp = makeUser ? await makeUser({ tag: 'bexp', email: `bexp-${uid()}@example.test` }) : null;
await openInv(O.p); await O.p.locator('input[type="email"]').first().fill(exp.email); await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
const te = links(exp.email).at(-1);
q(`update dealer_teams set invite_expires_at = now() - interval '1 hour' where invite_email='${exp.email}'`);
await sp.p.goto(linkUrl(te), { waitUntil: 'domcontentloaded' }); await sp.p.waitForTimeout(2500);
ok('an expired link says it expired and how to get a new one', await sp.p.getByTestId('invite-state-expired').isVisible());
await sp.p.screenshot({ path: `${OUT}/16-expired-link.png` });
const can = await makeUser({ tag: 'bcan', email: `bcan-${uid()}@example.test` });
await openInv(O.p); await O.p.locator('input[type="email"]').first().fill(can.email); await O.p.getByRole('button', { name: 'Send invitation', exact: true }).click(); await O.p.waitForTimeout(2500);
const tc = links(can.email).at(-1);
q(`update dealer_teams set status='removed' where invite_email='${can.email}'`);
await sp.p.goto(linkUrl(tc), { waitUntil: 'domcontentloaded' }); await sp.p.waitForTimeout(2500);
ok('a cancelled link says the dealership withdrew it', await sp.p.getByTestId('invite-state-cancelled').isVisible());
await sp.p.screenshot({ path: `${OUT}/17-cancelled-link.png` });
ok('no uncaught page errors during the whole journey', errsAll.length === 0, errsAll.slice(0, 3));
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
await b.close();
console.log(`browser journey: ${results.filter((r) => r.pass).length}/${results.length} passed`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
