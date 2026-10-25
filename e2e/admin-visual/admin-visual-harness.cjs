/*
 * KAYAD Super Admin visual/behaviour harness (TEST HARNESS — not production).
 * Serves nothing itself: point it at a running `vite preview` (or dev) server.
 * Every /api/** request is intercepted and answered from the FIXTURES below, so
 * screenshots show the real built frontend rendering deterministic TEST FIXTURE
 * responses. They are NOT production data and must never be presented as such.
 *
 * Usage:
 *   node admin-visual-harness.cjs --base http://127.0.0.1:4173 --out ./shots \
 *        --scenario populated|empty|error|forbidden|slow \
 *        --viewports 1440x900,390x844 --routes /admin,/admin/users --role superadmin
 */
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://127.0.0.1:4173');
const OUT = path.resolve(arg('out', './shots'));
const SCENARIO = arg('scenario', 'populated');
const ROLE = arg('role', 'superadmin');
const VIEWPORTS = arg('viewports', '1440x900').split(',').map(v => v.split('x').map(Number));
const ROUTES = arg('routes', '/admin').split(',');
const TAG = arg('tag', 'run');
const FULL = arg('full', 'true') === 'true';
const AXE = arg('axe', 'false') === 'true';
const INTERACT = arg('interact', 'false') === 'true';
fs.mkdirSync(OUT, { recursive: true });

const user = { id: 'fixture-admin-1', _id: 'fixture-admin-1', name: 'Test Administrator', email: 'test.admin@fixture.invalid', role: ROLE, isOwner: ROLE === 'superadmin', status: 'approved', emailVerified: true };
const iso = (d) => new Date(Date.now() - d * 60000).toISOString();
const FIXTURES = {
  stats: { stats: { totalUsers: 1280, totalCars: 342, activeAuctions: 7, openEscrows: 12, verifiedDealers: 58, pendingDealers: 3, pendingCars: 5 } },
  users: { users: [
    { id: 'fx-u1', name: 'Fixture Dealer Alpha', email: 'alpha@fixture.invalid', role: 'dealer', status: 'pending', createdAt: iso(120) },
    { id: 'fx-u2', name: 'Fixture Dealer Beta', email: 'beta@fixture.invalid', role: 'dealer', status: 'pending', createdAt: iso(300) },
    { id: 'fx-u3', name: 'Fixture Moderator', email: 'mod@fixture.invalid', role: 'moderator', status: 'approved', createdAt: iso(9000) },
    { id: 'fx-u4', name: 'Fixture Buyer', email: 'buyer@fixture.invalid', role: 'user', status: 'approved', createdAt: iso(5000) },
  ], total: 4, page: 1, pages: 1 },
  cars: { cars: [
    { id: 'fx-c1', title: '2019 Fixture Prado TX', status: 'pending', year: 2019, price: 5200000, auctionStatus: 'none', images: ['http://127.0.0.1:1/nonexistent.jpg'] },
    { id: 'fx-c2', title: '2021 Fixture Mazda CX-5', status: 'available', year: 2021, price: 3650000, auctionStatus: 'live', currentBid: 3400000 },
    { id: 'fx-c3', title: '2018 Fixture Subaru Forester', status: 'pending', year: 2018, price: 2300000 },
    { id: 'fx-c4', title: '2020 Fixture Toyota Axio', status: 'available', year: 2020, price: 1450000 },
  ], total: 4, page: 1, pages: 1 },
  audit: { entries: [
    { id: 'fx-a1', action: 'dealer.approve', module: 'users', actor: { email: 'test.admin@fixture.invalid' }, targetId: 'fx-u9', createdAt: iso(15) },
    { id: 'fx-a2', action: 'car.moderate', module: 'cars', actor: { email: 'mod@fixture.invalid' }, targetId: 'fx-c9', createdAt: iso(55) },
  ] },
  alerts: { alerts: [
    { id: 'fx-al1', title: 'Fixture alert (warning)', severity: 'warning', message: 'Test fixture alert', createdAt: iso(20), read: false },
    { id: 'fx-al2', title: 'Fixture alert (info)', severity: 'info', message: 'Test fixture alert', createdAt: iso(90), read: false },
  ], unreadCount: 2 },
};
const json = (route, status, body, delay = 0) => setTimeout(() => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }), delay);

async function installApi(page, log) {
  await page.route('**/api/**', route => {
    const req = route.request(); const url = new URL(req.url()); const p = url.pathname.replace(/^\/api/, ''); const method = req.method();
    log.requests.push(`${method} ${p}${url.search}`);
    if (/\/v1\/auth\/me$/.test(p)) return json(route, 200, { success: true, user });
    if (/\/csrf/i.test(p)) return json(route, 200, { csrfToken: 'fixture' });
    if (method !== 'GET') return json(route, 200, { success: true });
    if (SCENARIO === 'slow') return json(route, 200, { success: true, data: [] }, 8000);
    if (SCENARIO === 'error') return json(route, 500, { success: false, message: 'Fixture server error' });
    if (SCENARIO === 'forbidden') return json(route, 403, { success: false, message: 'Fixture forbidden' });
    if (SCENARIO === 'empty') {
      if (/\/admin\/stats$/.test(p)) return json(route, 200, { stats: { totalUsers: 0, totalCars: 0, activeAuctions: 0, openEscrows: 0, verifiedDealers: 0, pendingDealers: 0, pendingCars: 0 } });
      if (/\/admin\/alerts$/.test(p)) return json(route, 200, { alerts: [], unreadCount: 0 });
      return json(route, 200, { success: true, data: [], users: [], cars: [], entries: [], logs: [], items: [], total: 0, page: 1, pages: 0 });
    }
    // populated
    if (/\/admin\/stats$/.test(p)) return json(route, 200, FIXTURES.stats);
    if (/\/admin\/users$/.test(p)) return json(route, 200, FIXTURES.users);
    if (/\/admin\/cars$/.test(p)) return json(route, 200, FIXTURES.cars);
    if (/\/admin\/audit-log$/.test(p)) return json(route, 200, FIXTURES.audit);
    if (/\/admin\/alerts$/.test(p)) return json(route, 200, FIXTURES.alerts);
    if (/\/ecp\/health$/.test(p)) return json(route, 200, { data: { health: { checkedAt: iso(2), services: [{ name: 'fixture-api', status: 'healthy', latency: 38 }, { name: 'fixture-database', status: 'degraded', latency: 212 }, { name: 'fixture-storage', status: 'unavailable' }] } } });
    if (/\/ecp\/health$/.test(p)) return json(route, 200, { data: { health: { checkedAt: iso(2), services: [{ name: 'fixture-api', status: 'healthy', latency: 38 }, { name: 'fixture-database', status: 'degraded', latency: 212 }, { name: 'fixture-storage', status: 'unavailable' }] } } });
    return json(route, 200, { success: true, data: [], users: [], cars: [], entries: [], logs: [], items: [], total: 0, page: 1, pages: 0 });
  });
}

(async () => {
  const browser = await chromium.launch();
  const summary = [];
  for (const [w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    for (const route of ROUTES) {
      const page = await ctx.newPage();
      const log = { requests: [], console: [], pageErrors: [], failed: [] };
      page.on('console', m => { if (['error', 'warning'].includes(m.type())) log.console.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
      page.on('pageerror', e => log.pageErrors.push(String(e).slice(0, 300)));
      page.on('requestfailed', r => { if (!/127\.0\.0\.1:1\//.test(r.url())) log.failed.push(r.url().slice(0, 200)); });
      await installApi(page, log);
      const name = `${TAG}-${SCENARIO}-${route.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'root'}-${w}x${h}`;
      try {
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        if (SCENARIO !== 'slow') await page.waitForSelector('.spinner, [aria-busy="true"]', { state: 'detached', timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(SCENARIO === 'slow' ? 1500 : 900);
        const metrics = await page.evaluate(() => {
          const de = document.documentElement; const content = document.querySelector('.kayad-admin-shell__content');
          const over = [];
          document.querySelectorAll('.kayad-admin-shell__content *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.right > window.innerWidth + 1 && getComputedStyle(el).position !== 'fixed') over.push(el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 40)); });
          const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
          const parse = (str) => { const m = str.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
          const bgOf = (el) => { let cur = el; let acc = [255, 255, 255]; const stack = []; while (cur && cur.nodeType === 1) { const c = parse(getComputedStyle(cur).backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } cur = cur.parentElement; } for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i]; acc = [0, 1, 2].map((k) => c[k] * c[3] + acc[k] * (1 - c[3])); } return acc; };
          const lowContrast = [];
          const walker = document.createTreeWalker(content || document.body, NodeFilter.SHOW_TEXT);
          const seen = new Set();
          while (walker.nextNode()) {
            const n = walker.currentNode; const el = n.parentElement; if (!el || seen.has(el) || !n.textContent.trim()) continue; seen.add(el);
            const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
            const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
            const fg = parse(cs.color); if (!fg) continue; const bg = bgOf(el);
            const a = fg[3]; const fgc = [0, 1, 2].map((k) => fg[k] * a + bg[k] * (1 - a));
            const L1 = lum(fgc), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
            const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight, 10) >= 700; const large = size >= 24 || (size >= 18.66 && bold);
            if (ratio < (large ? 3 : 4.5)) lowContrast.push({ t: n.textContent.trim().slice(0, 40), r: Math.round(ratio * 100) / 100, el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') });
          }
          const first = content && content.firstElementChild; const fcs = first ? getComputedStyle(first) : null;
          const firstChild = first ? { tag: first.tagName.toLowerCase(), cls: String(first.className).slice(0, 60), pt: fcs.paddingTop, pl: fcs.paddingLeft, left: Math.round(first.getBoundingClientRect().left - content.getBoundingClientRect().left), top: Math.round(first.getBoundingClientRect().top - content.getBoundingClientRect().top) } : null;
          const boundary = document.body.innerText.includes('Something went wrong');
          const unnamedEls = [...document.querySelectorAll('.kayad-admin-shell__content button, .kayad-admin-shell__content a, .kayad-admin-shell__content input, .kayad-admin-shell__content select')].filter((e) => { const r = e.getBoundingClientRect(); if (!r.width) return false; const n = (e.getAttribute('aria-label') || e.textContent || e.getAttribute('title') || e.getAttribute('placeholder') || '').trim(); const lab = e.id && document.querySelector('label[for="' + e.id + '"]'); const wrapped = e.closest('label'); return !n && !lab && !wrapped && e.getAttribute('aria-labelledby') == null; });
          const unnamed = unnamedEls.length; const unnamedList = unnamedEls.slice(0,12).map((e) => e.outerHTML.slice(0,140))
          return { lowContrast: lowContrast.slice(0, 80), lowContrastCount: lowContrast.length, firstChild, boundary, unnamedControls: unnamed, unnamedList, scrollW: de.scrollWidth, innerW: window.innerWidth, hOverflowPage: de.scrollWidth > window.innerWidth + 1, contentScrollW: content ? content.scrollWidth : null, contentClientW: content ? content.clientWidth : null, overflowing: [...new Set(over)].slice(0, 6), h1: (document.querySelector('h1') || {}).textContent || null, title: document.title };
        });
        if (AXE) {
          await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
          metrics.axe = await page.evaluate(async () => {
            const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
            return r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0] && v.nodes[0].target.join(' ').slice(0, 90), help: v.help, targets: v.nodes.slice(0, 12).map(n => ({ t: n.target.join(' ').slice(0, 110), html: (n.html || '').slice(0, 160), s: (n.any[0] && n.any[0].message || '').slice(0, 140) })) }));
          });
        }
        if (INTERACT) {
          metrics.interact = {};
          const toggle = page.locator('.sidebar-toggle-btn');
          const narrow = w <= 1024;
          if (narrow && await toggle.count()) {
            await toggle.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
            metrics.interact.navOpen = (await toggle.getAttribute('aria-expanded')) === 'true';
            metrics.interact.focusInSidebar = await page.evaluate(() => !!document.activeElement && !!document.activeElement.closest('.admin-sidebar'));
            await page.keyboard.press('Escape'); await page.waitForTimeout(250);
            metrics.interact.navClosedByEscape = (await toggle.getAttribute('aria-expanded')) === 'false';
            metrics.interact.focusReturnedToToggle = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('sidebar-toggle-btn'));
          }
          const seq = [];
          await page.evaluate(() => document.activeElement && document.activeElement.blur());
          for (let k = 0; k < 6; k++) { await page.keyboard.press('Tab'); seq.push(await page.evaluate(() => { const e = document.activeElement; if (!e) return null; const cs = getComputedStyle(e); return { tag: e.tagName.toLowerCase(), name: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, shadow: cs.boxShadow !== 'none' }; })); }
          metrics.interact.tabSequence = seq;
          metrics.interact.focusIndicatorOnAll = seq.filter(x => x && x.tag !== 'body').every(x => x.outline || x.shadow); /* 'body' = Tab wrapped past the last focusable control to browser chrome (pages with few controls); not a focus indicator failure */
          metrics.interact.tabWrapped = seq.some(x => x && x.tag === 'body');
        }
        await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: FULL && !/slow/.test(SCENARIO) });
        summary.push({ name, route, viewport: `${w}x${h}`, scenario: SCENARIO, metrics, consoleErrors: log.console.length, pageErrors: log.pageErrors, failedRequests: log.failed.length, apiRequests: [...new Set(log.requests)].length });
        fs.writeFileSync(path.join(OUT, name + '.log.json'), JSON.stringify({ metrics, ...log, requests: [...new Set(log.requests)] }, null, 1));
      } catch (e) { summary.push({ name, route, viewport: `${w}x${h}`, error: String(e).slice(0, 200) }); }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, `summary-${TAG}-${SCENARIO}.json`), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify(summary.map(s => ({ n: s.name, h1: s.metrics && s.metrics.h1, hov: s.metrics && s.metrics.hOverflowPage, ce: s.consoleErrors, pe: (s.pageErrors || []).length, err: s.error })), null, 0));
})();
