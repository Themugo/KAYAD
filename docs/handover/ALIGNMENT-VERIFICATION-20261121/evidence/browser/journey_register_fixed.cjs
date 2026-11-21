/* global require, process, document, console */
// Real-stack registration journeys (mobile). usage: node journey_register.cjs <base> <outdir> <label>
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const [base, out, label] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const q = s => execSync(`psql -h 127.0.0.1 -p 54329 -U postgres -d kayad_t -tAc "${s}"`).toString().trim();
const res = [];
async function fill(p, email, pw = 'Str0ng!Passw0rd', role = 'Personal account') {
  await p.goto(base + '/register', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  await p.getByRole('radio', { name: new RegExp(role, 'i') }).first().click();
  await p.getByLabel('Full name').fill('Test Person'); await p.getByLabel('Email').fill(email); await p.getByLabel('Password', { exact: false }).first().fill(pw);
  const ph = p.getByLabel('Phone'); if (await ph.count()) await ph.fill('0712345678');
}
const screen = async p => (await p.locator('h1, h2').allInnerTexts()).join(' | ').slice(0, 120);
(async () => {
  const b = await chromium.launch();
  const mk = async () => { const c = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true }); return { c, p: await c.newPage() }; };
  // 1 happy path
  { const { c, p } = await mk(); await fill(p, 'happy1@example.test'); await p.getByRole('button', { name: /Create account/i }).click(); await p.waitForTimeout(2500);
    res.push({ s: '1-happy-buyer', screen: await screen(p), users: q("select count(*) from users where email='happy1@example.test'") }); await p.screenshot({ path: `${out}/${label}-1-happy.png` }); await c.close(); }
  // 2 lost response: server processes, client never hears back
  { const { c, p } = await mk(); let posts = 0; let ik = [];
    await p.route('**/auth/register', async r => { posts++; ik.push(r.request().headers()['idempotency-key'] || null); if (posts === 1) { await r.fetch(); await r.abort('connectionreset'); } else await r.continue(); });
    await fill(p, 'lost1@example.test'); await p.getByRole('button', { name: /Create account/i }).click(); await p.waitForTimeout(2500);
    const s1 = await screen(p); const u1 = q("select count(*) from users where email='lost1@example.test'"); await p.screenshot({ path: `${out}/${label}-2a-unknown.png` });
    await p.getByRole('button', { name: /Go back and try again/i }).click(); await p.waitForTimeout(400);
    const formKept = await p.getByLabel('Email').inputValue().catch(() => null);
    const pwKept = await p.getByLabel('Password', { exact: false }).first().inputValue().catch(() => null);
    await p.getByRole('button', { name: /Create account/i }).click(); await p.waitForTimeout(2500);
    const s2 = await screen(p); await p.screenshot({ path: `${out}/${label}-2b-after-retry.png` });
    res.push({ s: '2-lost-response-then-retry', afterLost: s1, usersAfterLost: u1, formEmailKept: formKept, pwKept: pwKept ? 'yes' : 'no', afterRetry: s2, usersAfterRetry: q("select count(*) from users where email='lost1@example.test'"), posts, idempotencyKeys: ik }); await c.close(); }
  // 3 already-have-account action destination
  { const { c, p } = await mk(); await p.route('**/auth/register', r => r.abort('connectionreset')); await fill(p, 'noserver@example.test'); await p.getByRole('button', { name: /Create account/i }).click(); await p.waitForTimeout(1500);
    const s = await screen(p); await p.getByRole('link', { name: /I may already have an account/i }).click(); await p.waitForTimeout(1200);
    res.push({ s: '3-pure-network-failure + already-have-account', screen: s, landed: p.url().replace(base, ''), landedScreen: await screen(p), emailPrefilled: await p.getByLabel('Email').inputValue().catch(() => null) }); await p.screenshot({ path: `${out}/${label}-3-signin-landing.png` }); await c.close(); }
  // 4 CSRF bootstrap blocked
  { const { c, p } = await mk(); await p.route('**/auth/csrf', r => r.abort('connectionreset')); await fill(p, 'csrf1@example.test'); await p.getByRole('button', { name: /Create account/i }).click(); await p.waitForTimeout(2500);
    res.push({ s: '4-csrf-bootstrap-unreachable (INCONCLUSIVE: cookie already set by /me, bootstrap never requested)', screen: await screen(p), users: q("select count(*) from users where email='csrf1@example.test'") }); await c.close(); }
  // 5 double tap
  { const { c, p } = await mk(); let posts = 0; await p.route('**/auth/register', r => { posts++; r.continue(); }); await fill(p, 'dbl1@example.test'); const btn = p.getByRole('button', { name: /Create account/i }); await btn.dblclick(); await p.waitForTimeout(2500);
    res.push({ s: '5-double-tap', posts, users: q("select count(*) from users where email='dbl1@example.test'"), screen: await screen(p) }); await c.close(); }
  // 6 private seller + duplicate normalised email (case/space)
  { const { c, p } = await mk(); await fill(p, 'seller1@example.test', 'Str0ng!Passw0rd', 'Personal account'); await p.getByRole('button', { name: /Create account/i }).click(); await p.waitForTimeout(2500);
    const a = await screen(p); const role = q("select role from users where email='seller1@example.test'"); await c.close();
    const o = await mk(); await fill(o.p, ' SELLER1@Example.Test '); await o.p.getByRole('button', { name: /Create account/i }).click(); await o.p.waitForTimeout(2500);
    res.push({ s: '6-personal account (the former private-seller path) then duplicate w/ different case', sellerScreen: a, sellerRole: role, dupScreen: await screen(o.p), usersForEmail: q("select count(*) from users where lower(email)='seller1@example.test'") }); await o.c.close(); }
  fs.writeFileSync(`${out}/${label}-register-journeys.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
