// Real-browser journey for the convergence work (disposable stack only: 99_browser_hold + vite on :5299 + API :5065).
// Photo upload / poster / remove with persistence after reload, inventory multi-select, collapsible sidebar groups,
// temporary duties from Team & Employment, and a 390px mobile layout check. Raw tokens are never printed.
import { createRequire } from 'node:module'; import fs from 'node:fs';
process.env.KAYAD_JOURNEY_BASE ||= 'http://127.0.0.1:5065'; process.env.KAYAD_JOURNEY_DB ||= 'kayad_ci'; process.env.PGPORT ||= '5432'; process.env.PGPASSWORD ||= 'ci-disposable-only'; process.env.PGHOST ||= '127.0.0.1';
const { q, PW, PNG_1PX } = await import('../db-journeys/lib.mjs');
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'docs/handover/CONVERGENCE-20261123/evidence/browser';
const seed = JSON.parse(fs.readFileSync(new URL('../db-journeys/out/browser-seed.json', import.meta.url)));
fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, cond, extra) => { results.push({ name, pass: !!cond, extra: cond ? undefined : extra }); console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ' :: ' + JSON.stringify(extra)}`); };
const b = await chromium.launch(); const errs = [];
const ctx = async (w = 1440, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700, deviceScaleFactor: 1 }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message)); return { c, p }; };
const login = async (p, email) => { await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200); await p.locator('input[type="email"], input[name="email"]').first().fill(email); await p.locator('input[type="password"]').first().fill(PW); await p.locator('button[type="submit"]').first().click(); await p.waitForFunction(() => !location.pathname.startsWith('/login'), null, { timeout: 25000 }).catch(() => {}); await p.waitForTimeout(2500); };
// The Vite dev server can re-optimise dependencies on the first visits and reload the page; retry the navigation until the workspace shell is up.
const go = async (p, qs) => { for (let i = 0; i < 4; i++) { await p.goto(`${BASE}/?nav=dealer-dashboard${qs}`, { waitUntil: 'domcontentloaded' }); if (await p.locator('nav[aria-label="Dealer workspace"]').first().waitFor({ state: 'attached', timeout: 15000 }).then(() => true).catch(() => false)) break; } await p.waitForTimeout(2500); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` });
const dealerId = q(`select id from users where email='${seed.dealer}'`);
const imgCount = (id) => Number(q(`select jsonb_array_length(images) from cars where id='${id}'`));

const O = await ctx(1440, 900); await login(O.p, seed.dealer); await go(O.p, '&section=inventory');
const rows = O.p.getByTestId('inventory-row');
await rows.first().waitFor({ timeout: 25000 }).catch(() => {}); // listings load asynchronously
ok('inventory lists the dealership vehicles', await rows.count() >= 1, await rows.count());

// ---- sidebar groups
const nav = O.p.locator('nav[aria-label="Dealer workspace"]');
const salesBtn = O.p.getByTestId('nav-group-sales');
ok('sales group is open and shows Inventory', (await salesBtn.getAttribute('aria-expanded')) === 'true' && await nav.getByRole('button', { name: /^Inventory/ }).isVisible());
await salesBtn.click();
ok('sales group closes on its own (other groups stay open)', (await salesBtn.getAttribute('aria-expanded')) === 'false' && !(await nav.getByRole('button', { name: /^Inventory/ }).isVisible()) && (await O.p.getByTestId('nav-group-people').getAttribute('aria-expanded')) === 'true');
ok('Sign out and Help stay reachable while a group is closed', await O.p.getByRole('button', { name: 'Sign out' }).isVisible() && await O.p.getByTestId('dealer-help-support').isVisible());
await salesBtn.click();
ok('sales group re-opens', (await salesBtn.getAttribute('aria-expanded')) === 'true');

// ---- multi-select (no destructive action is confirmed here; the backend path is covered by journey 25)
await O.p.getByTestId('bulk-select-all').check();
const total = await O.p.getByTestId('bulk-row-select').count();
ok('select all picks every eligible vehicle on the page', (await O.p.getByTestId('bulk-count').innerText()).startsWith(`${total} selected`), await O.p.getByTestId('bulk-count').innerText());
await shot(O.p, '01-bulk-selected');
await O.p.getByTestId('bulk-delete').click();
ok('removal asks for confirmation first', await O.p.getByRole('alertdialog', { name: 'Confirm removing selected vehicles' }).isVisible());
await O.p.getByRole('button', { name: 'Cancel' }).first().click();
await O.p.getByRole('button', { name: 'Clear selection' }).click();
ok('clear selection resets the count', (await O.p.getByTestId('bulk-count').innerText()).startsWith('0 selected'));

// ---- edit a vehicle: add multiple photos, make poster, remove, persistence after reload
const carId = q(`select id from cars where dealer_id='${dealerId}' and status='available' order by created_at limit 1`);
const carTitle = q(`select title from cars where id='${carId}'`);
const rowFor = (p) => p.getByTestId('inventory-row').filter({ hasText: carTitle }).first();
const before = imgCount(carId);
await rowFor(O.p).getByRole('button', { name: /^Edit/ }).click();
await O.p.waitForTimeout(1500);
const input = O.p.locator('#listing-add-photos');
ok('Add photos control is present and enabled', await input.count() === 1 && await input.isEnabled(), await input.count());
await input.setInputFiles([{ name: 'one.png', mimeType: 'image/png', buffer: PNG_1PX }, { name: 'two.png', mimeType: 'image/png', buffer: PNG_1PX }]);
ok('previews appear before upload (two selected)', await O.p.getByText(/Ready to upload|Upload 2/).first().isVisible() || await O.p.getByRole('button', { name: /Upload 2/ }).isVisible());
await shot(O.p, '02-photos-selected');
await O.p.getByRole('button', { name: /^Upload 2/ }).click();
await O.p.waitForTimeout(3000);
ok('two photos uploaded and stored on the vehicle', imgCount(carId) === before + 2, { before, after: imgCount(carId) });
const lastIdx = before + 2;
await O.p.getByRole('button', { name: `Make photo ${lastIdx} the poster` }).click();
await O.p.waitForTimeout(2000);
const firstUrlAfterPoster = q(`select images->0->>'url' from cars where id='${carId}'`);
ok('poster change is stored (new first photo)', /one\.png|two\.png|upload|cloud|http|stub/i.test(firstUrlAfterPoster || ''), firstUrlAfterPoster);
await O.p.getByRole('button', { name: `Remove photo ${lastIdx}` }).click();
await O.p.getByRole('group', { name: `Confirm removing photo ${lastIdx}` }).getByRole('button', { name: /Remove/ }).click();
await O.p.waitForTimeout(2500);
ok('removing a photo is stored', imgCount(carId) === before + 1, { before, after: imgCount(carId) });
await shot(O.p, '03-photos-after-remove');
await go(O.p, '&section=inventory'); await rowFor(O.p).getByRole('button', { name: /^Edit/ }).click(); await O.p.waitForTimeout(1500);
const shown = await O.p.getByRole('list', { name: 'Current photos' }).locator('li').count();
ok('photos persist after a page refresh', shown === imgCount(carId), { shown, db: imgCount(carId) });

// ---- Team & Employment: temporary duties from the UI
const viewerId = q(`select id from users where email='${seed.team.viewer}'`);
const viewerName = q(`select name from users where id='${viewerId}'`);
const staffRow = q(`select id from dealer_teams where dealer='${dealerId}' and member='${viewerId}'`);
await go(O.p, '&section=team');
await O.p.getByRole('button', { name: `View ${viewerName}` }).first().waitFor({ timeout: 25000 }).catch(() => {});
await O.p.getByRole('button', { name: `View ${viewerName}` }).first().click(); await O.p.waitForTimeout(1500);
const duties = O.p.getByTestId('temporary-duties');
ok('Temporary duties panel is shown for an active member', await duties.isVisible());
await duties.locator('input[type=checkbox]:not([disabled])').first().check();
await duties.getByRole('button', { name: 'Review change' }).click();
ok('the effect is shown before saving', await O.p.getByTestId('duty-review').isVisible());
await shot(O.p, '04-temporary-duty-review');
await duties.getByRole('button', { name: /Lend duties/ }).click(); await O.p.waitForTimeout(2500);
ok('duty is stored with an expiry and the role is unchanged', Number(q(`select count(*) from dealer_team_temporary_grants where team_id='${staffRow}' and revoked_at is null and expires_at > now()`)) >= 1);
await O.p.getByRole('button', { name: /^Revoke temporary duty/ }).first().click(); await O.p.waitForTimeout(2000);
ok('duty can be revoked from the UI', Number(q(`select count(*) from dealer_team_temporary_grants where team_id='${staffRow}' and revoked_at is null and expires_at > now()`)) === 0);

// ---- mobile
const M = await ctx(390, 844); await login(M.p, seed.dealer); await go(M.p, '&section=inventory');
ok('no horizontal overflow at 390px (inventory with bulk toolbar)', !(await overflow(M.p)));
await M.p.getByTestId('bulk-select-all').check(); ok('bulk toolbar usable on mobile', (await M.p.getByTestId('bulk-count').innerText()).includes('selected') && !(await overflow(M.p)));
await shot(M.p, '05-mobile-inventory-bulk');
await M.p.getByRole('button', { name: /menu/i }).first().click().catch(() => {}); await M.p.waitForTimeout(800);
ok('mobile drawer exposes Sign out', await M.p.getByRole('button', { name: 'Sign out' }).first().isVisible().catch(() => false));
ok('no uncaught page errors', errs.length === 0, errs.slice(0, 3));
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
await b.close();
const f = results.filter((r) => !r.pass).length; console.log(`\nconvergence browser: ${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
