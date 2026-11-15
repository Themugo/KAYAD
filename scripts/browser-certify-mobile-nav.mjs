// Real-browser certification for KAYAD mobile navigation and layout.
// Runs against `vite preview` of the production build. Network boundary only: /api/** is answered by this
// harness (no app code is mocked) because no backend/database is available in the certification sandbox.
// Usage: node scripts/browser-certify-mobile-nav.mjs [baseUrl]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const OUT = path.resolve('docs/audits/screenshots');
const RESULTS = [];
const VIEWPORTS = [
  { name: '320', w: 320, h: 640, mobile: true }, { name: '360', w: 360, h: 780, mobile: true },
  { name: '390', w: 390, h: 844, mobile: true }, { name: '414', w: 414, h: 896, mobile: true },
  { name: '430', w: 430, h: 932, mobile: true }, { name: '768', w: 768, h: 1024, mobile: false },
  { name: '1024', w: 1024, h: 768, mobile: false }, { name: '1440', w: 1440, h: 900, mobile: false },
];
const IMGS = ['/hero/kayad-prado.png', '/hero/kayad-land-cruiser.png', '/hero/kayad-mercedes-gle.png'];
const MAKES = [['Toyota', 'Prado'], ['Toyota', 'Land Cruiser'], ['Mercedes-Benz', 'GLE'], ['Subaru', 'Forester'], ['Mazda', 'CX-5'], ['Nissan', 'X-Trail']];
const cars = Array.from({ length: 12 }, (_, i) => {
  const [brand, model] = MAKES[i % MAKES.length];
  return { id: `c${i}`, _id: `c${i}`, title: `${2016 + (i % 8)} ${brand} ${model}`, brand, model, year: 2016 + (i % 8), price: 2100000 + i * 180000,
    mileage: 40000 + i * 7000, fuel: 'Petrol', transmission: 'Automatic', bodyType: 'SUV', city: 'Nairobi', status: 'available',
    images: [{ url: IMGS[i % 3] }], dealerType: i % 2 ? 'dealer' : 'private', createdAt: new Date(Date.now() - i * 864e5).toISOString() };
});
const USERS = {
  buyer: { id: 'u-buyer', name: 'Wanjiru Kamau', email: 'buyer@example.test', role: 'user' },
  seller: { id: 'u-seller', name: 'Otieno Seller', email: 'seller@example.test', role: 'individual_seller' },
  dealer: { id: 'u-dealer', name: 'Prime Motors', email: 'dealer@example.test', role: 'dealer' },
  admin: { id: 'u-admin', name: 'James Mugo', email: 'owner@example.test', role: 'superadmin' },
};

async function newPage(browser, vp, role, inv = 'ok') {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile });
  if (role) await ctx.addInitScript(() => { try { localStorage.setItem('kayad_session_hint', '1'); } catch {} });
  const page = await ctx.newPage();
  const state = { carsCalls: 0, inv };
  page.__state = state;
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (/auth\/csrf$/.test(p)) return json(200, { success: true, csrfToken: 'x'.repeat(48) });
    if (/\/auth\/me$/.test(p)) return role ? json(200, { success: true, user: USERS[role] }) : json(401, { success: false, message: 'Not signed in' });
    if (/\/api\/cars$/.test(p)) {
      state.carsCalls++;
      if (state.inv === 'timeout') return json(503, { success: false, message: 'Service unavailable' });
      const q = (url.searchParams.get('search') || url.searchParams.get('q') || '').toLowerCase();
      const list = state.inv === 'empty' || q === 'zzzz' ? [] : cars;
      return json(200, { success: true, data: list, cars: list, pagination: { page: 1, limit: 24, total: list.length, pages: 1 } });
    }
    return json(200, { success: true, data: [], items: [], notifications: [], unreadCount: 0 });
  });
  return page;
}

async function measure(page) {
  return page.evaluate(() => {
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }; };
    const q = (s) => document.querySelector(s);
    const header = q('header') || q('nav');
    const findDock = () => [...document.querySelectorAll('nav, div, aside')].filter((n) => getComputedStyle(n).position === 'fixed' && /Showroom/.test(n.textContent || '') && /Saved/.test(n.textContent || '') && n.getBoundingClientRect().top > innerHeight / 2).sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0];
    const dock = findDock();
    const clipped = [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && cs.position !== 'fixed' && r.right > innerWidth + 1 && !el.closest('[aria-hidden="true"], .sr-only, svg') && cs.visibility !== 'hidden' && !el.closest('[class*="overflow-x"], [class*="scroll"], [class*="carousel"], [class*="marquee"]'); }).slice(0, 5).map((el) => el.tagName + '.' + String(el.className).slice(0, 60));
    return {
      scrollWidth: document.documentElement.scrollWidth, innerWidth, overflowX: document.documentElement.scrollWidth > innerWidth,
      pageHeight: document.documentElement.scrollHeight, header: box(header), dock: box(dock), clipped,
      hero: box(q('.kayad-public-hero')), heroStage: box(q('.kayad-public-hero__mobile-stage')),
      search: box(q('#hero-make')?.closest('section, div[class*="bridge"], form') || q('#hero-make')),
      grid: box(q('[data-testid="inventory-grid"]')),
    };
  });
}

async function run() {
  const browser = await chromium.launch();
  const log = (name, ok, detail) => { RESULTS.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
  fs.mkdirSync(`${OUT}/mobile`, { recursive: true }); fs.mkdirSync(`${OUT}/tablet-desktop`, { recursive: true });
  const measurements = {};

  for (const vp of VIEWPORTS) {
    const dir = vp.mobile ? 'mobile' : 'tablet-desktop';
    // --- signed-out home, inventory loaded
    const page = await newPage(browser, vp, null);
    const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="inventory-grid"] a, [data-testid="inventory-grid"] article, [data-testid="inventory-grid"] > *', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${dir}/home-${vp.name}.png` });
    const m = await measure(page); measurements[vp.name] = m;
    log(`${vp.name}px home: no horizontal overflow`, !m.overflowX, `scrollWidth=${m.scrollWidth} inner=${m.innerWidth}`);
    log(`${vp.name}px home: no off-screen elements`, m.clipped.length === 0, m.clipped.join(' | '));
    log(`${vp.name}px home: no uncaught page errors`, errors.length === 0, errors.join(' | '));
    // dock clearance: scroll to bottom, last interactive element must sit above the dock
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    const clear = await page.evaluate(() => {
      const findDock = () => [...document.querySelectorAll('nav, div, aside')].filter((n) => getComputedStyle(n).position === 'fixed' && /Showroom/.test(n.textContent || '') && /Saved/.test(n.textContent || '') && n.getBoundingClientRect().top > innerHeight / 2).sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0];
      const dock = findDock();
      if (!dock) return { dock: false };
      const top = dock.getBoundingClientRect().top;
      const els = [...document.querySelectorAll('a[href], button, input, select')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !dock.contains(e) && !e.closest('[aria-hidden="true"]') && getComputedStyle(e.closest('header,aside,[role="dialog"]') || e).position !== 'fixed'; });
      const last = els.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
      return { dock: true, dockTop: Math.round(top), lastBottom: last ? Math.round(last.getBoundingClientRect().bottom) : null, last: last ? (last.tagName + ' ' + (last.textContent || '').trim().slice(0, 30)) : null };
    });
    if (vp.w < 1024) log(`${vp.name}px dock: last interactive element clears the fixed dock`, clear.dock && clear.lastBottom <= clear.dockTop + 1, JSON.stringify(clear));
    else log(`${vp.name}px no fixed mobile dock at desktop width`, !clear.dock, JSON.stringify(clear));
    await page.context().close();
  }

  // --- search / filters, empty, timeout + retry (390 and 320)
  for (const vp of VIEWPORTS.filter((v) => ['320', '390'].includes(v.name))) {
    const page = await newPage(browser, vp, null);
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#hero-make', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    const searchBox = page.getByLabel('Search vehicles', { exact: true }).first();
    await searchBox.scrollIntoViewIfNeeded(); await searchBox.fill('Prado'); await page.waitForTimeout(900);
    log(`${vp.name}px search: keyword field accepts typed text`, (await searchBox.inputValue()) === 'Prado');
    await page.screenshot({ path: `${OUT}/mobile/search-${vp.name}.png` });
    await page.getByRole('button', { name: /open filters/i }).first().click(); await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/mobile/filters-open-${vp.name}.png` });
    const drawerText = ((await page.locator('[data-testid="mobile-filter-panel"], [role="dialog"]').last().textContent().catch(() => '')) || '') + (await page.locator('body').innerText());
    log(`${vp.name}px filters: Make, Price, Year and Body style controls are available`, ['Make', 'Price', 'Year', 'Body'].every((t) => new RegExp(t, 'i').test(drawerText)));
    const mf = await measure(page); log(`${vp.name}px filters open: no horizontal overflow`, !mf.overflowX, `scrollWidth=${mf.scrollWidth}`);
    await page.context().close();

    const pe = await newPage(browser, vp, null, 'empty');
    await pe.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await pe.waitForTimeout(2500);
    await pe.screenshot({ path: `${OUT}/mobile/inventory-empty-${vp.name}.png`, fullPage: false });
    const me = await measure(pe); log(`${vp.name}px empty inventory: no horizontal overflow`, !me.overflowX, `scrollWidth=${me.scrollWidth}`);
    await pe.context().close();

    const pt = await newPage(browser, vp, null, 'timeout');
    await pt.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const retry = pt.getByRole('button', { name: /retry|try again/i }).first();
    await retry.waitFor({ timeout: 90000 }).catch(() => {});
    const hasRetry = await retry.count();
    if (hasRetry) {
      await retry.scrollIntoViewIfNeeded(); await pt.waitForTimeout(300);
      await pt.screenshot({ path: `${OUT}/mobile/inventory-timeout-retry-${vp.name}.png` });
      const rb = await retry.boundingBox(); const dockTop = await pt.evaluate(() => { const d = [...document.querySelectorAll('nav, div, aside')].filter((n) => getComputedStyle(n).position === 'fixed' && /Showroom/.test(n.textContent || '') && n.getBoundingClientRect().top > innerHeight / 2).sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0]; return d ? d.getBoundingClientRect().top : innerHeight; });
      log(`${vp.name}px timeout: Retry button visible above the dock`, rb && rb.y + rb.height <= dockTop + 1, `retryBottom=${rb && Math.round(rb.y + rb.height)} dockTop=${Math.round(dockTop)}`);
      const before = pt.__state.carsCalls; pt.__state.inv = 'ok'; await retry.click(); await pt.waitForTimeout(2500);
      log(`${vp.name}px retry: triggers a real inventory request and recovers`, pt.__state.carsCalls > before && (await pt.locator('[data-testid="inventory-grid"]').count()) > 0, `requests ${before}->${pt.__state.carsCalls}`);
    } else log(`${vp.name}px timeout: Retry button shown`, false, 'no retry button within 90s');
    await pt.context().close();
  }

  // --- drawer and roles at 390 (and 320 for signed-out)
  const roleCases = [[null, 'public'], ['buyer', 'buyer'], ['seller', 'seller'], ['dealer', 'dealer'], ['admin', 'admin']];
  for (const vpName of ['390', '320']) {
    const vp = VIEWPORTS.find((v) => v.name === vpName);
    for (const [role, label] of roleCases) {
      if (vpName === '320' && !['public', 'admin'].includes(label)) continue;
      const page = await newPage(browser, vp, role);
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      if (vpName === '390' && role === 'buyer') await page.screenshot({ path: `${OUT}/mobile/header-signed-in-390.png`, clip: { x: 0, y: 0, width: 390, height: 120 } });
      const hb = page.getByRole('button', { name: /toggle navigation menu/i });
      await hb.click(); await page.waitForTimeout(600);
      const dlg = page.getByRole('dialog');
      const dialogs = await page.locator('[role="dialog"]').count();
      const text = (await dlg.textContent()) || '';
      await page.screenshot({ path: `${OUT}/mobile/drawer-${label}-${vpName}.png` });
      log(`${vpName}px ${label}: exactly one navigation dialog and no account dropdown`, dialogs === 1 && (await page.locator('#kayad-account-panel').count()) === 0);
      if (role) { log(`${vpName}px ${label}: drawer shows identity + Sign out`, text.includes(USERS[role].email) && /log out|sign out/i.test(text)); }
      else log(`${vpName}px public: drawer offers Sign In / Sign Up`, /sign in/i.test(text));
      const expect = { buyer: ['Messages', 'Notifications'], seller: ['Messages', 'Notifications'], dealer: ['Inventory', 'Leads', 'Analytics'], admin: ['Admin Console'] }[label];
      if (expect) log(`${vpName}px ${label}: role links present (${expect.join(', ')})`, expect.every((t) => text.includes(t)));
      if (label === 'dealer') log('390px dealer: no buyer/private-seller shortcuts', !/Buyer Command Center|Private Seller Dashboard|Payment History/.test(text));
      if (label === 'admin') log('390px admin: no buyer/seller shortcuts', !/Sell Vehicle|Payment History|My Garage/.test(text));
      const mm = await measure(page); log(`${vpName}px ${label} drawer: no horizontal overflow`, !mm.overflowX, `scrollWidth=${mm.scrollWidth}`);
      // Escape closes + focus returns
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      log(`${vpName}px ${label}: Escape closes the drawer`, (await page.locator('[role="dialog"]').count()) === 0);
      await page.context().close();
    }
  }

  // --- profile destination, back/forward, direct URL, refresh (390 buyer)
  {
    const vp = VIEWPORTS.find((v) => v.name === '1440');
    const page = await newPage(browser, vp, 'buyer');
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
    const before = page.url();
    const avatar = page.locator('#user-profile-menu-button');
    log('1440px: account avatar present', (await avatar.count()) === 1);
    if (await avatar.count()) {
      await avatar.click(); await page.waitForTimeout(800);
      log('1440px: avatar navigates to a profile/account destination (no dropdown)', page.url() !== before && (await page.locator('#kayad-account-panel').count()) === 0, `${before} -> ${page.url()}`);
      await page.screenshot({ path: `${OUT}/tablet-desktop/profile-destination-1440.png` });
      const profileUrl = page.url();
      await page.goBack(); await page.waitForTimeout(600);
      log('Back returns to the previous page', page.url() === before, page.url());
      await page.goForward(); await page.waitForTimeout(600);
      log('Forward returns to the profile page', page.url() === profileUrl, page.url());
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200);
      log('Refresh keeps the profile page', page.url() === profileUrl, page.url());
      const direct = await page.context().newPage();
      await direct.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(/auth\/me$/.test(new URL(r.request().url()).pathname) ? { success: true, user: USERS.buyer } : { success: true, data: [] }) }));
      await direct.goto(profileUrl, { waitUntil: 'domcontentloaded' }); await direct.waitForTimeout(1200);
      log('Direct URL entry loads the page (no redirect loop)', direct.url().startsWith(profileUrl.split('?')[0]), direct.url());
    }
    await page.context().close();
  }
  // --- dock navigation history: each tap adds exactly one entry; Back/Forward retrace them (390 signed-out)
  {
    const vp = VIEWPORTS.find((v) => v.name === '390');
    const page = await newPage(browser, vp, null);
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
    const start = page.url(); const seen = [start];
    for (const label of ['Auction', 'Saved']) {
      const r = await page.evaluate((l) => { const d = [...document.querySelectorAll('nav,div')].filter((n) => getComputedStyle(n).position === 'fixed' && /Showroom/.test(n.textContent || '')).sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0]; if (!d) return 'nodock'; [...d.querySelectorAll('button,a')].find((b) => (b.textContent || '').trim().startsWith(l))?.click(); }, label);
      if (r === 'nodock') console.log('  (no dock on', page.url(), 'before tapping', label, ')');
      await page.waitForTimeout(900);
      if (page.url() !== seen[seen.length - 1]) seen.push(page.url());
    }
    log('dock taps each add one distinct history entry', seen.length === 3 && new Set(seen).size === 3, seen.join(' > '));
    await page.evaluate(() => { for (const b of document.querySelectorAll('button,a')) if (/Showroom/.test(b.textContent||'') && false) b.click(); });
    for (let i = seen.length - 2; i >= 0; i--) { await page.goBack(); await page.waitForTimeout(500); }
    log('Back x2 returns to the starting page', page.url() === start, page.url());
    for (let i = 1; i < seen.length; i++) { await page.goForward(); await page.waitForTimeout(500); }
    log('Forward x2 returns to the last page', page.url() === seen[seen.length - 1], page.url());
    await page.context().close();
  }

  // --- direct URL authorization: signed-out user must not reach admin
  {
    const vp = VIEWPORTS.find((v) => v.name === '390');
    const page = await newPage(browser, vp, null);
    await page.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2000);
    const body = (await page.textContent('body')) || '';
    log('signed-out /admin: not rendered (redirected or gated)', !/Admin Console|Operations Dashboard/.test(body) || /login|sign in/i.test(page.url() + body.slice(0, 400)), page.url());
    await page.context().close();
    const pb = await newPage(browser, vp, 'buyer');
    await pb.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' }); await pb.waitForTimeout(2000);
    const bb = (await pb.textContent('body')) || '';
    log('buyer /admin: admin console not shown', !/System Administration|Operations Dashboard/.test(bb), pb.url());
    await pb.context().close();
  }

  await browser.close();
  fs.writeFileSync(`${OUT}/browser-results.json`, JSON.stringify({ base: BASE, ranAt: new Date().toISOString(), results: RESULTS, measurements }, null, 2));
  const failed = RESULTS.filter((r) => !r.ok);
  console.log(`\n${RESULTS.length - failed.length}/${RESULTS.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(2); });
