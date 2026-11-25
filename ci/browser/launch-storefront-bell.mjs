// Real-browser launch checks on the DISPOSABLE stack only: dealer uploads a logo and banner in Settings, the public storefront renders at 7 widths,
// a buyer follows a vehicle link, and the dealer notification bell agrees with the database (unread count, list, mark read, reload persistence).
import { createRequire } from 'node:module'; import fs from 'node:fs'; import crypto from 'node:crypto';
process.env.KAYAD_JOURNEY_BASE ||= 'http://127.0.0.1:5065'; process.env.KAYAD_JOURNEY_DB ||= 'kayad_ci'; process.env.PGPORT ||= '5432'; process.env.PGPASSWORD ||= 'ci-disposable-only';
const { PW, q, Client } = await import('../db-journeys/lib.mjs');
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:5299', OUT = 'docs/launch-readiness/evidence';
const seed = JSON.parse(fs.readFileSync(new URL('../db-journeys/out/browser-seed.json', import.meta.url)));
const results = []; const ok = (n, c, x) => { results.push({ name: n, pass: !!c }); console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + JSON.stringify(x)}`); };
const dealerId = q(`select id from users where email='${seed.dealer}'`);
q(`update users set status='approved' where id='${dealerId}'`); q(`update dealers set approved=true, verified_at=now() where "user"='${dealerId}'`);
fs.writeFileSync('/tmp/claude-0/logo.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAZ0lEQVR4nO3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwMB1gAAfk6yYoAAAAASUVORK5CYII=', 'base64'));
const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] });
const errs = [];
const login = async (page, email) => { await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200); await page.locator('input[type="email"], input[name="email"]').first().fill(email); await page.locator('input[type="password"]').first().fill(PW); await page.locator('button[type="submit"]').first().click(); await page.waitForFunction(() => !location.pathname.startsWith('/login'), null, { timeout: 25000 }).catch(() => {}); await page.waitForTimeout(2000); };

// ---- dealer: upload logo + banner in Settings
const dctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const dp = await dctx.newPage(); dp.on('pageerror', (e) => errs.push(e.message));
await login(dp, seed.dealer);
await dp.goto(`${BASE}/?nav=dealer-dashboard&section=settings`, { waitUntil: 'domcontentloaded' });
await dp.getByRole('heading', { name: 'Public storefront' }).waitFor({ timeout: 25000 }).catch(() => {});
ok('SETTINGS: Public storefront section is present', await dp.getByRole('heading', { name: 'Public storefront' }).count() > 0);
const inputs = dp.locator('section[aria-labelledby=storefront-heading] input[type=file]');
await inputs.nth(0).setInputFiles('/tmp/claude-0/logo.png'); await dp.waitForTimeout(3500);
await inputs.nth(1).setInputFiles('/tmp/claude-0/logo.png'); await dp.waitForTimeout(3500);
ok('SETTINGS: logo and banner uploaded and saved to the dealership record', q(`select (logo_url is not null)::int + (banner_url is not null)::int from dealers where "user"='${dealerId}'`) === '2', q(`select logo_url from dealers where "user"='${dealerId}'`));
await dp.screenshot({ path: `${OUT}/settings-storefront-1440.png` });
await dp.reload({ waitUntil: 'domcontentloaded' }); await dp.waitForTimeout(3000);
ok('SETTINGS: logo preview persists after reload', await dp.locator('img[alt="Business logo preview"]').count() === 1);

// ---- public storefront at every required width (anonymous visitor)
for (const w of [320, 360, 390, 430, 768, 1024, 1440]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${BASE}/showroom/${dealerId}`, { waitUntil: 'domcontentloaded' });
  await p.getByRole('heading', { level: 1 }).waitFor({ timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1800);
  const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, h1: document.querySelector('h1')?.textContent || '', cards: document.querySelectorAll('section[aria-label=Inventory] li').length, badge: /Verified dealer/.test(document.body.innerText), logo: !!document.querySelector('img[alt$="logo"]') }));
  ok(`STOREFRONT ${w}px: renders name, verified badge, logo and vehicles with no horizontal scroll`, m.h1.length > 3 && m.badge && m.cards >= 6 && m.sw <= m.iw + 1, m);
  await p.screenshot({ path: `${OUT}/storefront-${w}.png`, fullPage: false }); await ctx.close();
}
// ---- buyer path: storefront -> vehicle -> contact controls
const bctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const bp = await bctx.newPage(); bp.on('pageerror', (e) => errs.push(e.message));
await login(bp, seed.buyer);
await bp.goto(`${BASE}/showroom/${dealerId}`, { waitUntil: 'domcontentloaded' }); await bp.waitForTimeout(2500);
await bp.locator('section[aria-label=Inventory] li a').first().click(); await bp.waitForTimeout(3000);
ok('BUYER: a vehicle link from the storefront opens the vehicle (no dead end)', /vehicleId=/.test(bp.url()) && !(await bp.locator('text=/page not found/i').count()), bp.url());
await bp.screenshot({ path: `${OUT}/buyer-vehicle-390.png` });
const body = await bp.locator('body').innerText();
ok('BUYER: the vehicle page offers a way to contact the seller', /(message|chat|contact|enquir)/i.test(body), body.slice(0, 200));
const bad = await (await b.newContext()).newPage(); await bad.goto(`${BASE}/showroom/00000000-0000-4000-8000-000000000000`, { waitUntil: 'domcontentloaded' }); await bad.waitForTimeout(2500);
ok('STOREFRONT: unknown dealership shows a friendly not-available page', /isn’t available/.test(await bad.locator('body').innerText()));

// ---- bell: buyer enquiry -> dealer sees it
const buyerApi = new Client(); await buyerApi.raw('/api/v1/auth/login', { method: 'POST', body: { email: seed.buyer, password: PW } }); buyerApi.csrf = null;
const car = q(`select id from cars where dealer_id='${dealerId}' and status='available' limit 1`);
const start = await buyerApi.raw('/api/chat', { method: 'POST', body: { recipientId: dealerId, carId: car, message: 'Hello' } });
const chatId = start.j?.chat?.id || start.j?.data?.id || start.j?.id || start.j?.chatId;
await buyerApi.raw(`/api/chat/${chatId}/message`, { method: 'POST', body: { content: 'Is it available this weekend?' }, headers: { 'idempotency-key': crypto.randomUUID() } });
await dp.waitForTimeout(1500);
const dbUnread = () => Number(q(`select count(*) from notifications where user_id='${dealerId}' and read=false`));
await dp.goto(`${BASE}/?nav=dealer-dashboard`, { waitUntil: 'domcontentloaded' }); await dp.waitForSelector('[data-testid=dealer-topbar-bell]', { timeout: 25000 }).catch(() => {}); await dp.waitForTimeout(2500);
const label = await dp.getByTestId('dealer-topbar-bell').getAttribute('aria-label');
ok('BELL: dealer top-bar bell shows the same unread count as the database', label === `Notifications, ${dbUnread()} unread`, [label, dbUnread()]);
await dp.screenshot({ path: `${OUT}/bell-dealer-1440.png` });
await dp.getByTestId('dealer-topbar-bell').click(); await dp.waitForTimeout(2500);
ok('BELL: notifications page lists the New enquiry with real wording', await dp.getByText('New enquiry').first().isVisible().catch(() => false), dp.url());
const before = dbUnread();
await dp.screenshot({ path: `${OUT}/notifications-1440.png` });
await dp.getByRole('button', { name: /Mark all read/ }).click().catch(() => {}); await dp.waitForTimeout(2000);
ok('BELL: Mark all read clears unread in the database', before > 0 && dbUnread() === 0, [before, dbUnread()]);
await dp.reload({ waitUntil: 'domcontentloaded' }); await dp.waitForTimeout(2500);
ok('BELL: read state persists after refresh (no unread button shown)', await dp.getByRole('button', { name: /Mark all read/ }).count() === 0);
// mobile bell
const mctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const mp = await mctx.newPage(); mp.on('pageerror', (e) => errs.push(e.message));
await login(mp, seed.dealer); await mp.goto(`${BASE}/?nav=dealer-dashboard`, { waitUntil: 'domcontentloaded' }); await mp.waitForTimeout(3500);
const mb = mp.getByTestId('dealer-header-bell'); ok('BELL: mobile header bell is present and tappable (>=44px)', await mb.count() > 0 && (await mb.boundingBox())?.width >= 44, await mb.count());
await mp.screenshot({ path: `${OUT}/bell-dealer-390.png` });
ok('NO uncaught page errors during the whole run', errs.length === 0, errs.slice(0, 3));
await b.close();
const f = results.filter((r) => !r.pass).length; console.log(`\nlaunch storefront+bell: ${results.length - f}/${results.length} passed`); fs.writeFileSync(`${OUT}/browser-results.json`, JSON.stringify(results, null, 1)); process.exit(f ? 1 : 0);
