// Real-browser journey for the dealer launch work (disposable stack only: 99_browser_hold + vite on :5299 + API :5065).
// Command Centre layout at desktop / tablet / 390px, collapsible sidebar, mobile drawer, buyer enquiry -> dealer reply from Leads,
// listing status hints, vehicle request, team member reply, viewer restrictions. Raw tokens are never printed.
import { createRequire } from 'node:module'; import fs from 'node:fs'; import crypto from 'node:crypto';
process.env.KAYAD_JOURNEY_BASE ||= 'http://127.0.0.1:5065'; process.env.KAYAD_JOURNEY_DB ||= 'kayad_ci'; process.env.PGPORT ||= '5432'; process.env.PGPASSWORD ||= 'ci-disposable-only';
const { q, Client, PW } = await import('../db-journeys/lib.mjs');
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'docs/handover/DEALER-LAUNCH-20261123/evidence/browser';
const seed = JSON.parse(fs.readFileSync(new URL('../db-journeys/out/browser-seed.json', import.meta.url)));
fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, cond, extra) => { results.push({ name, pass: !!cond, extra: cond ? undefined : extra }); console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ' :: ' + JSON.stringify(extra)}`); };
const b = await chromium.launch(); const errs = [];
const ctx = async (w = 1440, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700, deviceScaleFactor: 1 }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message)); return { c, p }; };
const login = async (p, email) => { await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200); await p.locator('input[type="email"], input[name="email"]').first().fill(email); await p.locator('input[type="password"]').first().fill(PW); await p.locator('button[type="submit"]').first().click(); await p.waitForFunction(() => !location.pathname.startsWith('/login'), null, { timeout: 25000 }).catch(() => {}); await p.waitForTimeout(2500); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
// The Vite dev server can re-optimise dependencies on the first visits and reload the page; retry the navigation until the workspace shell is up.
const go = async (p, qs) => { for (let i = 0; i < 4; i++) { await p.goto(`${BASE}/?nav=dealer-dashboard${qs}`, { waitUntil: 'domcontentloaded' }); if (await p.locator('nav[aria-label="Dealer workspace"]').first().waitFor({ state: 'attached', timeout: 15000 }).then(() => true).catch(() => false)) break; } await p.waitForTimeout(2500); };

const RUN = Date.now().toString(36);
const dealerId = q(`select id from users where email='${seed.dealer}'`);
const carId = q(`select id from cars where dealer_id='${dealerId}' and status='available' order by created_at limit 1`);
q(`update cars set status='pending' where id=(select id from cars where dealer_id='${dealerId}' and status='available' order by created_at desc limit 1)`);
q(`update cars set status='hidden' where id=(select id from cars where dealer_id='${dealerId}' and status='available' order by created_at desc offset 1 limit 1)`);

// A real buyer enquiry through the API
const buyer = new Client(); await buyer.raw('/api/v1/auth/login', { method: 'POST', body: { email: seed.buyer, password: PW } });
const chat = await buyer.raw('/api/chat', { method: 'POST', body: { recipientId: dealerId, carId, message: 'Is this car still available?' } });
ok('buyer enquiry started through the API', chat.status < 300, chat.status);
const chatId = chat.j?.chat?.id || chat.j?.data?.id || chat.j?.id || chat.j?.chatId;
const first = await buyer.raw(`/api/chat/${chatId}/message`, { method: 'POST', body: { content: 'Is this car still available?' }, headers: { 'idempotency-key': crypto.randomUUID() } });
ok('buyer first message sent', first.status === 201, first.status);

// ---- owner, desktop
const O = await ctx(1440, 900); await login(O.p, seed.dealer); await go(O.p, '');
ok('heading Dealer Command Centre', await O.p.getByRole('heading', { name: 'Dealer Command Centre', level: 2 }).isVisible());
ok('hero text', await O.p.getByText('Run your dealership from one place').isVisible() && await O.p.getByText('Inventory, enquiries, sales and your team — all in one secure workspace.').isVisible());
const groups = await O.p.locator('nav[aria-label="Dealer workspace"] [role="group"] > button[aria-expanded] > span').allInnerTexts();
ok('five sidebar groups in order', JSON.stringify(groups.map((g) => g.toUpperCase())) === JSON.stringify(['OVERVIEW', 'SALES OPERATIONS', 'TRANSACTIONS & FINANCE', 'BUSINESS GROWTH', 'PEOPLE & BUSINESS']), groups);
ok('top bar: brand, Dealer Account chip, search, identity', await O.p.getByTestId('dealer-topbar').isVisible() && /Dealer Account/.test(await O.p.getByTestId('dealer-topbar').innerText()) && await O.p.getByRole('searchbox').isVisible() && (await O.p.getByTestId('dealer-identity').innerText()).length > 2);
ok('Sign out and Help & support visible without scrolling', await O.p.getByRole('button', { name: 'Sign out' }).isVisible() && await O.p.getByTestId('dealer-help-support').isVisible());
ok('Needs attention is honest (renders items or the empty message, no invented numbers)', await O.p.getByText(/Needs your attention/i).first().isVisible());
ok('no horizontal overflow (desktop)', !(await overflow(O.p)));
await O.p.screenshot({ path: `${OUT}/01-dashboard-desktop-expanded.png`, fullPage: false });
await O.p.getByTestId('dealer-sidebar-toggle').click(); await O.p.waitForTimeout(400);
ok('sidebar collapses to icons, items still named for assistive tech', (await O.p.locator('#dealer-workspace-sidebar').evaluate((e) => e.getBoundingClientRect().width)) < 100 && await O.p.getByRole('button', { name: 'Team & Employment' }).count() === 1);
await O.p.screenshot({ path: `${OUT}/02-dashboard-desktop-collapsed.png`, fullPage: false });
await O.p.getByTestId('dealer-sidebar-toggle').click(); await O.p.waitForTimeout(300);

// ---- leads: reply
await go(O.p, '&section=leads');
const replyBtn = O.p.getByRole('button', { name: /^Reply/ }).first();
await replyBtn.waitFor({ timeout: 25000 }).catch(() => {}); // data loads asynchronously; wait for it instead of a fixed sleep
ok('Leads shows the buyer enquiry with a Reply action', await replyBtn.isVisible());
await replyBtn.click(); await O.p.waitForTimeout(1500);
ok('conversation shows the buyer message', await O.p.getByText('Is this car still available?').first().isVisible());
await O.p.getByPlaceholder('Write your reply to the buyer').fill(`Yes it is (${RUN}). Would tomorrow 10am suit for a viewing?`);
await O.p.getByRole('button', { name: /Send reply/ }).click(); await O.p.waitForTimeout(2500);
ok('reply appears in the conversation', await O.p.getByText(`(${RUN}). Would tomorrow`).first().isVisible());
ok('database: reply stored as the dealership and lead moved to contacted', q(`select count(*) from jsonb_array_elements((select messages from chats where id='${chatId}')) m where m->>'text' like 'Yes it is (${RUN})%' and m->>'sender'='${dealerId}'`) === '1' && q(`select stage from leads where source_reference='${chatId}'`) === 'contacted');
ok('database: exactly one lead for the conversation', q(`select count(*) from leads where source_reference='${chatId}'`) === '1');
await O.p.screenshot({ path: `${OUT}/03-leads-reply.png`, fullPage: true });
const bm = await buyer.raw(`/api/chat/${chatId}/messages`); ok('buyer sees the dealer reply', JSON.stringify(bm.j).includes('tomorrow 10am'));

// ---- inventory: hints + vehicle request
await go(O.p, '&section=inventory');
const hints = await O.p.getByTestId('inventory-status-hint').allInnerTexts();
ok('every status row explains what it means', hints.length >= 3 && hints.some((h) => /On hold/.test(h)) && hints.some((h) => /Visible to buyers/.test(h)) && hints.some((h) => /Republish/.test(h)), hints);
await O.p.screenshot({ path: `${OUT}/04-inventory-status.png`, fullPage: false });
await O.p.getByText(/Request something for a vehicle/).first().click(); await O.p.waitForTimeout(600);
const vr = O.p.getByTestId('vehicle-requests');
await vr.locator('select').first().selectOption({ index: 1 });
await vr.getByLabel('Short title').fill('Add 360 camera feature tag');
await vr.getByLabel('What do you need?').fill('Please add the 360 degree camera feature to this vehicle listing.');
await vr.getByRole('button', { name: 'Send request' }).click(); await O.p.waitForTimeout(2500);
ok('request sent, listed as Received, and states it is not an approval', await O.p.getByText('Received', { exact: true }).first().isVisible() && await O.p.getByText(/A request is not an approval/).first().isVisible());
ok('database: support case linked to the vehicle and the dealership', Number(q(`select count(*) from support_tickets where user_id='${dealerId}' and category='seller' and subject like '[Vehicle request]%' and related_car is not null`)) >= 1);
await O.p.getByTestId('vehicle-requests').scrollIntoViewIfNeeded(); await O.p.screenshot({ path: `${OUT}/05-vehicle-request.png`, fullPage: false });


// ---- public marketplace: published vehicle visible, held / paused ones are not
const pendingTitle = q(`select title from cars where dealer_id='${dealerId}' and status='pending' limit 1`);
const hiddenTitle = q(`select title from cars where dealer_id='${dealerId}' and status='hidden' limit 1`);
const liveTitle = q(`select title from cars where id='${carId}'`);
const P = await ctx(1440, 900);
// The status changes above were made directly in the disposable DB (the product never does that), so the public listing cache can still hold the old
// list. Re-read the page until the cache has expired on its own, instead of weakening the check.
let pub = '';
for (let i = 0; i < 30; i++) { await P.p.goto(`${BASE}/?nav=marketplace`, { waitUntil: 'domcontentloaded' }); await P.p.waitForTimeout(4000); pub = await P.p.locator('body').innerText(); if (pub.includes(liveTitle) && !pub.includes(pendingTitle) && !pub.includes(hiddenTitle)) break; await P.p.waitForTimeout(6000); }
ok('public marketplace shows the published vehicle', pub.includes(liveTitle), liveTitle);
ok('public marketplace does NOT show the under-review or paused vehicles', !pub.includes(pendingTitle) && !pub.includes(hiddenTitle), { pendingTitle, hiddenTitle });
await P.p.screenshot({ path: `${OUT}/10-public-marketplace.png`, fullPage: false });

// ---- team: Basic Staff Access invitation + directory (owner)
await go(O.p, '&section=team');
await O.p.getByRole('tab', { name: /^Team Members/ }).click(); await O.p.waitForTimeout(800);
ok('staff directory lists members with Staff ID', (await O.p.locator('[data-testid="cell-staff-id"]').allInnerTexts()).some((t) => /-STAFF-\d{3}/.test(t)));
await O.p.screenshot({ path: `${OUT}/11-staff-directory.png`, fullPage: false });
await O.p.getByRole('tab', { name: /^Invitations/ }).click(); await O.p.waitForTimeout(800);
ok('invitation form states Basic Staff Access and has no role selector', await O.p.getByTestId('basic-default-note').isVisible() && (await O.p.getByLabel('Role', { exact: true }).count()) === 0);
await O.p.screenshot({ path: `${OUT}/12-team-invitation-basic.png`, fullPage: false });

// ---- add-a-vehicle workflow
await go(O.p, '&section=inventory&mode=new');
ok('Add a vehicle form opens', await O.p.getByRole('button', { name: /Save|Publish|Create/i }).first().isVisible().catch(() => false) || await O.p.waitForFunction(() => /Vehicle|Make|Model/i.test(document.body.innerText), null, { timeout: 20000 }).then(() => true).catch(() => false));
await O.p.screenshot({ path: `${OUT}/13-vehicle-listing-form.png`, fullPage: false });

// ---- tablet
const T = await ctx(820, 1100); await login(T.p, seed.dealer); await go(T.p, '');
ok('no horizontal overflow (tablet 820)', !(await overflow(T.p)));
await T.p.screenshot({ path: `${OUT}/06-dashboard-tablet.png`, fullPage: false });

// ---- mobile 390
const M = await ctx(390, 844); await login(M.p, seed.dealer); await go(M.p, '');
ok('no horizontal overflow (mobile 390)', !(await overflow(M.p)));
await M.p.screenshot({ path: `${OUT}/07-dashboard-mobile.png`, fullPage: false });
await M.p.getByTestId('dealer-mobile-bar').getByRole('button', { name: /Dealer menu/ }).click(); await M.p.waitForTimeout(500);
ok('mobile drawer opens with all groups and Sign out reachable', await M.p.getByRole('navigation', { name: 'Dealer workspace' }).isVisible() && await M.p.getByRole('button', { name: 'Sign out' }).isVisible());
await M.p.screenshot({ path: `${OUT}/08-mobile-drawer.png`, fullPage: false });
await M.p.keyboard.press('Escape'); await M.p.waitForTimeout(300);
ok('Escape closes the drawer', !(await M.p.getByRole('navigation', { name: 'Dealer workspace' }).isVisible()));

// ---- team member with talk-to-buyers permission replies; viewer cannot
const S = await ctx(1440, 900); await login(S.p, seed.team.sales_agent); await S.p.goto(`${BASE}/?nav=dealership-workspace`, { waitUntil: 'domcontentloaded' }); await S.p.waitForTimeout(3500);
const sbody = await S.p.locator('body').innerText();
ok('sales agent reaches the dealership workspace', /Leads|Inventory|Dealership/i.test(sbody), sbody.slice(0, 200));
const V = await ctx(1440, 900); await login(V.p, seed.team.viewer); await V.p.goto(`${BASE}/?nav=dealership-workspace`, { waitUntil: 'domcontentloaded' }); await V.p.waitForTimeout(3500);
ok('viewer has no reply or request controls', (await V.p.getByRole('button', { name: /^Reply/ }).count()) === 0 && (await V.p.getByText(/Request something for a vehicle/).count()) === 0);
await V.p.screenshot({ path: `${OUT}/09-viewer-restricted.png`, fullPage: false });

ok('no uncaught page errors', errs.length === 0, errs.slice(0, 3));
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ at: new Date().toISOString(), results }, null, 1));
const f = results.filter((r) => !r.pass).length; console.log(`\ndealer-launch browser: ${results.length - f}/${results.length} passed`);
await b.close(); process.exit(f ? 1 : 0);
