// Identity / onboarding - real-browser journeys (TEST-ONLY mocked backend).
// UI, routing, validation, return-path handling are real. Backend responses are a small fake;
// real backend behaviour is covered by Jest and the migration-built PostgreSQL proof.
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const out = []; let fails = 0;
const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`); if (!c) fails++; };
const json = (r, body, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const BUYER = { id: 'u1', _id: 'u1', name: 'Amina Buyer', email: 'amina@example.test', role: 'user', emailVerified: true, status: 'approved' };
const STRONG = 'Str0ng!Passw0rd';

async function install(page, st) {
  await page.route(/\/v1\/auth\/csrf/, (r) => json(r, { success: true, csrfToken: 'test-csrf-token-0123456789abcdef0123456789' }));
  await page.route('**/api/v1/auth/me', (r) => st.user ? json(r, { success: true, user: st.user }) : json(r, { success: false, message: 'Unauthenticated' }, 401));
  await page.route('**/api/v1/auth/login', (r) => { st.logins.push(JSON.parse(r.request().postData() || '{}')); st.user = BUYER; json(r, { success: true, user: BUYER }); });
  await page.route('**/api/v1/auth/register', (r) => {
    const b = JSON.parse(r.request().postData() || '{}'); st.registers.push(b);
    if (st.regStatus === 409) return json(r, { success: false, message: 'An account with that email already exists' }, 409);
    json(r, { success: true, message: 'Account created. Verify your email.', user: { id: 'n1', email: b.email, role: b.role, emailVerified: false } }, 201);
  });
  await page.route('**/api/v1/auth/resend-verification', (r) => { st.resends++; json(r, { success: true }, 202); });
  await page.route(/^https?:\/\/[^/]+\/api\/(favorites|notifications|cars|config|inspection|ads|cms|public)/, (r) => json(r, { success: true, data: [], items: [] }));
}
const fresh = () => ({ user: null, logins: [], registers: [], resends: 0, regStatus: 201 });
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const mk = async (vp = { width: 1280, height: 800 }, st = fresh()) => { const ctx = await browser.newContext({ viewport: vp }); const page = await ctx.newPage(); await install(page, st); return { ctx, page, st }; };

  // 1. open-redirect next is ignored
  { const { ctx, page, st } = await mk();
    await page.goto(BASE + '/login?next=' + encodeURIComponent('https://evil.example/steal'), { waitUntil: 'networkidle' });
    await page.getByLabel('Email address').fill('amina@example.test'); await page.getByLabel('Password').fill(STRONG);
    await page.getByRole('button', { name: /continue to kayad/i }).click();
    await page.waitForURL((u) => u.origin === new URL(BASE).origin && !u.pathname.startsWith('/login'), { timeout: 15000 });
    ok('open-redirect next is ignored; user stays on the app origin', new URL(page.url()).origin === new URL(BASE).origin, page.url());
    await ctx.close(); }

  // 2. return path honoured after login
  { const { ctx, page, st } = await mk();
    await page.goto(BASE + '/login?next=' + encodeURIComponent('/?nav=inspections'), { waitUntil: 'networkidle' });
    await page.getByLabel('Email address').fill('amina@example.test'); await page.getByLabel('Password').fill(STRONG);
    await page.getByRole('button', { name: /continue to kayad/i }).click();
    await page.waitForURL(/nav=inspections/, { timeout: 15000 });
    ok('safe next is honoured after sign-in', /nav=inspections/.test(page.url()), page.url());
    ok('login sent exactly email+password (no role)', st.logins.length === 1 && Object.keys(st.logins[0]).sort().join() === 'email,password');
    await ctx.close(); }

  // 3. login <-> register carry intent
  { const { ctx, page } = await mk();
    await page.goto(BASE + '/login?next=' + encodeURIComponent('/?nav=inspections') + '&intent=provider', { waitUntil: 'networkidle' });
    const href = await page.getByRole('link', { name: /create your kayad account/i }).getAttribute('href');
    ok('login -> register link carries next+intent', /next=%2F%3Fnav%3Dinspections/.test(href) && /intent=provider/.test(href), href);
    await ctx.close(); }

  // 4. dealer registration: validation, one POST, explicit verify, no session
  { const { ctx, page, st } = await mk();
    await page.goto(BASE + '/register?intent=dealer', { waitUntil: 'networkidle' });
    await page.getByLabel('Full name').fill('Dan Dealer'); await page.getByLabel(/^Email/).fill('dan@example.test');
    await page.getByLabel(/^Phone/).fill('0712345678'); await page.getByLabel('Password', { exact: true }).fill(STRONG);
    await page.getByRole('button', { name: /create account/i }).click();
    ok('dealer: missing business fields blocks submit with field errors', st.registers.length === 0 && await page.getByText(/business name/i).first().isVisible());
    await page.getByLabel(/Dealership business name/).fill('Dan Motors'); await page.getByLabel(/City or location/).fill('Nairobi');
    await page.getByRole('button', { name: /create account/i }).click();
    await page.getByText(/We sent a verification link/).waitFor({ timeout: 10000 });
    ok('dealer: exactly one register POST with role dealer', st.registers.length === 1 && st.registers[0].role === 'dealer');
    ok('dealer: no session after registration (still signed out)', st.user === null && !(await page.evaluate(() => document.cookie)).includes('token'));
    const dump = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    ok('no password or email in browser storage', !dump.includes(STRONG) && !dump.includes('dan@example.test'), dump.slice(0, 120));
    ok('dealer: next step is business verification, dealer tools stay locked', await page.getByText(/taken to business verification/i).isVisible());
    ok('dealer: sign-in link returns to /dealer/onboarding', (await page.getByRole('link', { name: 'Sign in' }).last().getAttribute('href')).includes('next=%2Fdealer%2Fonboarding'));
    await ctx.close(); }

  // 5. role cannot be escalated by URL
  { const { ctx, page, st } = await mk();
    await page.goto(BASE + '/register?intent=admin&role=admin', { waitUntil: 'networkidle' });
    ok('unknown intent shows the picker with 5 public roles only', (await page.getByRole('radio').count()) === 5);
    await page.getByRole('radio', { name: /buyer/i }).click();
    await page.getByLabel('Full name').fill('Eve Evil'); await page.getByLabel(/^Email/).fill('eve@example.test'); await page.getByLabel('Password', { exact: true }).fill(STRONG);
    await page.getByRole('button', { name: /create account/i }).click();
    await page.getByText(/We sent a verification link/).waitFor({ timeout: 10000 });
    ok('role sent is user despite ?role=admin', st.registers[0].role === 'user');
    await ctx.close(); }

  // 6. duplicate email
  { const st = fresh(); st.regStatus = 409; const { ctx, page } = await mk({ width: 1280, height: 800 }, st);
    await page.goto(BASE + '/register?intent=buyer', { waitUntil: 'networkidle' });
    await page.getByLabel('Full name').fill('Amina B'); await page.getByLabel(/^Email/).fill('amina@example.test'); await page.getByLabel('Password', { exact: true }).fill(STRONG);
    await page.getByRole('button', { name: /create account/i }).click();
    await page.getByText(/already has an account/i).waitFor({ timeout: 10000 });
    ok('duplicate email: recovery actions (sign in / reset password)', await page.getByRole('link', { name: 'Reset password' }).isVisible());
    await ctx.close(); }

  // 7. guarded route -> login carries path
  { const { ctx, page } = await mk();
    await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
    await page.waitForURL(/\/login/, { timeout: 15000 });
    ok('guarded route redirects to /login with next', /next=%2Fdashboard/.test(page.url()), page.url());
    await ctx.close(); }

  // 8. verify banner on login
  { const { ctx, page } = await mk();
    await page.goto(BASE + '/login?verify=required', { waitUntil: 'networkidle' });
    ok('verify=required shows banner with resend', await page.getByText('Email verification required').isVisible());
    await ctx.close(); }

  // 9. mobile: no horizontal scroll, 44px targets, keyboard reachability on every auth surface
  for (const path of ['/login', '/register', '/register?intent=dealer', '/forgot-password', '/reset-password?token=abc', '/verify-email']) {
    const { ctx, page } = await mk({ width: 375, height: 740 });
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const h1 = await page.locator('h1').count();
    const small = await page.evaluate(() => [...document.querySelectorAll('main button, main a.kayad-auth-submit, main input')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 40; }).length);
    ok(`mobile ${path}: no horizontal scroll, one h1, no tiny controls`, (await noHScroll(page)) && h1 === 1 && small === 0, `h1=${h1} small=${small}`);
    await ctx.close(); }

  // 10. keyboard: tab order reaches submit; focus visible
  { const { ctx, page } = await mk();
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
    let reached = false;
    for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement?.textContent?.match(/Continue to KAYAD/))) { reached = true; break; } }
    ok('keyboard-only: Tab reaches the sign-in button', reached);
    await ctx.close(); }

  // 11. reduced motion
  { const ctx = await browser.newContext({ reducedMotion: 'reduce' }); const page = await ctx.newPage(); await install(page, fresh());
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
    const anim = await page.evaluate(() => [...document.querySelectorAll('.kayad-auth-page *')].filter((e) => getComputedStyle(e).animationName !== 'none' && !e.classList.contains('kayad-auth-spinner')).length);
    ok('reduced motion: no running decorative animation on the login page', anim === 0, `animated=${anim}`);
    await ctx.close(); }

  // 12. provider application deep link, signed-out
  { const { ctx, page } = await mk();
    await page.goto(BASE + '/?nav=inspections&action=apply-provider', { waitUntil: 'networkidle' });
    const dlg = page.getByRole('dialog');
    await dlg.waitFor({ timeout: 15000 });
    ok('provider deep link opens the application, signed-out users get sign-in/create actions', await dlg.getByRole('button', { name: /sign in to apply/i }).isVisible() && await dlg.getByRole('button', { name: /create a business account/i }).isVisible());
    await dlg.getByRole('button', { name: /create a business account/i }).click();
    await page.waitForURL(/\/register/, { timeout: 10000 });
    ok('create business account -> /register?intent=provider with return to the application', /intent=provider/.test(page.url()) && /action%3Dapply-provider/.test(page.url()), page.url());
    await page.getByRole('heading', { name: /Create your account/ }).waitFor({ timeout: 10000 }).catch(() => {});
    const heading = await page.getByRole('heading', { level: 1 }).innerText();
    ok('and the provider role is preselected (account form, no role picker)', /Create your account/.test(heading) && (await page.getByRole('radio').count()) === 0 && (await page.getByLabel('Full name').isVisible()), heading);
    await ctx.close(); }

  await browser.close();
  console.log(out.join('\n')); console.log(`\n${out.length - fails}/${out.length} PASS`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log(out.join('\n')); console.error(e); process.exit(2); });
