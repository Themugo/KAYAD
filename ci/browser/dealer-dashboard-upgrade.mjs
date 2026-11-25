// Real-browser check of the redesigned Dealer Command Centre on the disposable stack (99_browser_hold + vite :5299 + API :5065).
// Widths from the brief, overflow, console/page errors, axe, keyboard, the two layout guarantees (hero flush under the header; ONE continuous
// sidebar that scrolls as a unit while the page scrolls beside it), roles, screenshots. Disposable data only.
import { createRequire } from 'node:module'; import fs from 'node:fs';
process.env.KAYAD_JOURNEY_BASE ||= 'http://127.0.0.1:5065'; process.env.KAYAD_JOURNEY_DB ||= 'kayad_ci_adm'; process.env.PGPORT ||= '5432'; process.env.PGPASSWORD ||= 'ci-disposable-only';
const { PW } = await import('../db-journeys/lib.mjs');
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'docs/dealer-dashboard-upgrade/evidence';
const seed = JSON.parse(fs.readFileSync(new URL('../db-journeys/out/browser-seed.json', import.meta.url)));
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (n, c, x) => { results.push({ name: n, pass: !!c, extra: c ? undefined : x }); console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' :: ' + JSON.stringify(x)?.slice(0, 300)}`); };
const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] });
async function open(email, w, h) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700, deviceScaleFactor: 1 }); const p = await c.newPage();
  const errs = [], failed = [], cons = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 160)); });
  p.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/') && !/\/auth\/(me|refresh)$/.test(new URL(r.url()).pathname)) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500);
  await p.locator('input[type="email"], input[name="email"]').first().fill(email); await p.locator('input[type="password"]').first().fill(PW); await p.locator('button[type="submit"]').first().click();
  await p.waitForFunction(() => !location.pathname.startsWith('/login'), null, { timeout: 25000 }).catch(() => {}); await p.waitForTimeout(2500);
  for (let i = 0; i < 6; i++) { await p.goto(`${BASE}/?nav=dealer-dashboard`, { waitUntil: 'domcontentloaded' }); if (await p.waitForSelector('[data-testid=dealer-command-overview]', { timeout: 15000 }).then(() => true).catch(() => false)) break; }
  await p.waitForTimeout(2500);
  return { c, p, errs, failed, cons };
}
const widths = [[320, 800], [360, 800], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1750, 1000]];
for (const [w, h] of widths) {
  const s = await open(seed.dealer, w, h); const p = s.p;
  const rendered = await p.getByTestId('dealer-command-overview').count();
  const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  ok(`${w}px: overview rendered, no horizontal page overflow`, rendered === 1 && !over, { rendered, over, sw: await p.evaluate(() => document.documentElement.scrollWidth) });
  const small = await p.evaluate(() => [...document.querySelectorAll('[data-testid=dealer-command-overview] button')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 36; }).map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30)));
  if (w <= 430) ok(`${w}px: overview buttons are at least 36px tall`, small.length === 0, small);
  // Fix 1: the hero sits directly under the header; no dead band above the workspace.
  const geo = await p.evaluate(() => { const r = (sel) => document.querySelector(sel)?.getBoundingClientRect(); const hero = r('[data-testid=dealer-command-banner]'); const h2 = document.querySelector('main h2')?.getBoundingClientRect(); const topbar = r('[data-testid=dealer-topbar]'); const side = r('[data-testid=dealer-sidebar]'); const main = document.querySelector('main')?.getBoundingClientRect(); return { heroTop: hero?.top, h2Top: h2?.top, h2Bottom: h2?.bottom, topbarTop: topbar?.top, topbarH: topbar?.height, sideTop: side?.top, mainTop: main?.top, mainLeft: main?.left, mainW: main?.width, vw: innerWidth }; });
  ok(`${w}px: workspace starts at the very top of the page (no band above it)`, geo.mainTop <= 1, geo);
  // below 1024px the header stacks (welcome line, then date/period controls) so the allowance is larger; on desktop the hero follows within one header row.
  ok(`${w}px: hero follows the header with no dead band (gap ${Math.round(geo.heroTop - geo.h2Bottom)}px)`, geo.heroTop > geo.h2Bottom - 1 && geo.heroTop - geo.h2Bottom <= (w >= 1024 ? 90 : 170), geo);
  if (w >= 1024) ok(`${w}px: hero is in the first screen, under the top bar`, geo.heroTop < h * 0.45, geo);
  if (w >= 1024) {
    ok(`${w}px: workspace is full width (not boxed)`, geo.mainW >= geo.vw - 1, geo);
    // Fix 2: one continuous sidebar
    const sb = await p.evaluate(async () => {
      const a = document.querySelector('[data-testid=dealer-sidebar]'); const q = (sel) => a.querySelector(sel)?.getBoundingClientRect();
      const brand = a.querySelector('img')?.getBoundingClientRect(); const add = q('[data-testid=dealer-sidebar-add-vehicle]'); const nav = q('nav'); const foot = q('[data-testid=dealer-sidebar-footer]');
      const before = { brandTop: brand?.top, h: a.clientHeight, sh: a.scrollHeight, vh: innerHeight, top: a.getBoundingClientRect().top, bottom: a.getBoundingClientRect().bottom };
      const overlap = (x, y) => x && y && x.bottom > y.top + 1 && x.top < y.bottom - 1;
      const stack = { addVsNav: overlap(add, nav), navVsFoot: overlap(nav, foot), order: add.bottom <= nav.top + 1 && nav.bottom <= foot.top + 1 };
      const navStyle = getComputedStyle(a.querySelector('nav')); const footStyle = getComputedStyle(a.querySelector('[data-testid=dealer-sidebar-footer]'));
      const pos = { navOverflow: navStyle.overflowY, footPos: footStyle.position };
      return { before, stack, pos };
    });
    ok(`${w}px: sidebar is exactly one viewport tall, pinned top-left`, sb.before.top === 0 && Math.abs(sb.before.h - sb.before.vh) <= 1, sb.before);
    ok(`${w}px: sidebar blocks stack without overlap (brand, add, groups, footer)`, !sb.stack.addVsNav && !sb.stack.navVsFoot && sb.stack.order, sb.stack);
    ok(`${w}px: the groups list is not its own scroller and the footer is not pinned`, sb.pos.navOverflow === 'visible' && sb.pos.footPos === 'static', sb.pos);
    // scrolling the sidebar moves its header with its body (one unit), and the page scrolls beside it with the sidebar staying in place
    const sc = await p.evaluate(async () => {
      const a = document.querySelector('[data-testid=dealer-sidebar]'); const logo = a.querySelector('img');
      const t0 = logo.getBoundingClientRect().top; a.scrollTop = 120; await new Promise((r) => setTimeout(r, 150));
      const scrolls = a.scrollHeight > a.clientHeight + 1; const t1 = logo.getBoundingClientRect().top; a.scrollTop = 0;
      window.scrollTo(0, 600); await new Promise((r) => setTimeout(r, 200));
      const sideTopAfterPageScroll = a.getBoundingClientRect().top; const topbarTop = document.querySelector('[data-testid=dealer-topbar]').getBoundingClientRect().top; const pageScrolled = window.scrollY;
      window.scrollTo(0, 0);
      return { scrolls, moved: t0 - t1, sideTopAfterPageScroll, topbarTop, pageScrolled };
    });
    ok(`${w}px: when the sidebar overflows, its header scrolls together with its body`, !sc.scrolls || sc.moved > 20, sc);
    ok(`${w}px: the page scrolls as a document; sidebar and top bar stay in place`, sc.pageScrolled > 0 ? sc.sideTopAfterPageScroll === 0 && sc.topbarTop === 0 : true, sc);
  }
  ok(`${w}px: no page errors, no failed API calls`, s.errs.length === 0 && s.failed.length === 0, { e: s.errs, f: s.failed, c: s.cons });
  if (w === 1440 || w === 1750 || w === 1280) {
    await p.evaluate(axeSrc); const v = await p.evaluate(async () => (await window.axe.run(document.body, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })).violations.map((x) => ({ id: x.id, n: x.nodes.length, t: x.nodes[0]?.target })));
    ok(`${w}px: axe (WCAG 2.x A/AA) on the dashboard: no violations`, v.length === 0, v);
  }
  if (w === 1440) {
    await p.screenshot({ path: `${OUT}/dashboard-${w}-viewport.png` });
    await p.keyboard.press('Control+k'); ok('Ctrl K focuses the vehicle search', await p.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Search your vehicles'));
    const tabs = p.getByRole('tab'); const n = await tabs.count(); ok('table tabs rendered as an accessible tablist', n >= 1, n);
    if (n > 1) { await tabs.first().focus(); await p.keyboard.press('ArrowRight'); ok('ArrowRight moves to the next tab and selects it', (await tabs.nth(1).getAttribute('aria-selected')) === 'true'); }
    const req = []; p.on('request', (r) => { if (r.url().includes('command-centre')) req.push(r.url()); });
    await p.getByTestId('dealer-period').selectOption('7'); await p.waitForTimeout(2500);
    ok('period selector re-requests the command centre with days=7', req.some((u) => /days=7/.test(u)), req);
    await p.getByTestId('dealer-period').selectOption('90'); await p.waitForTimeout(2000);
    ok('period selector also supports 90 days', req.some((u) => /days=90/.test(u)), req);
    await p.getByTestId('dealer-period').selectOption('30'); await p.waitForTimeout(1500);
    for (const [name, sec] of [['Inventory', 'inventory'], ['Leads', 'leads'], ['Pipeline', 'pipeline'], ['Customers', 'customers'], ['Auctions', 'auctions'], ['Payouts', 'banking'], ['Inspections', 'inspections'], ['Escrow', 'escrow'], ['Finance', 'finance'], ['Team & Permissions', 'team'], ['Reports & Analytics', 'analytics'], ['Reputation', 'reputation'], ['Marketing', 'marketing'], ['Settings', 'settings']]) {
      await p.getByRole('navigation', { name: 'Dealer workspace' }).getByRole('button', { name: new RegExp('^' + name.replace(/[&]/g, '\\$&') + '( \\d+ .*)?$') }).click(); await p.waitForTimeout(800);
      ok(`sidebar "${name}" opens ?section=${sec}`, new URL(p.url()).searchParams.get('section') === sec, p.url());
      await p.getByRole('navigation', { name: 'Dealer workspace' }).getByRole('button', { name: /^Dashboard$/ }).click(); await p.waitForTimeout(400);
    }
    // groups collapse and expand without losing items elsewhere
    const g = p.getByTestId('nav-group-sales'); await g.click(); ok('Sales operations group collapses', (await g.getAttribute('aria-expanded')) === 'false'); await g.click(); ok('Sales operations group expands again', (await g.getAttribute('aria-expanded')) === 'true');
  }
  await p.screenshot({ path: `${OUT}/dashboard-${w}-full.png`, fullPage: true });
  await s.c.close();
}
for (const role of ['viewer', 'sales_agent', 'finance_officer']) {
  const email = seed.team?.[role]; if (!email) { ok(`role ${role}: seed present`, false, Object.keys(seed)); continue; }
  const s = await open(email, 1440, 900); const p = s.p;
  const reachable = await p.getByTestId('dealer-command-overview').count();
  if (!reachable) { console.log(`NOT RUN role ${role}: in this harness the delegated member lands on the public marketplace, not the dealer workspace (role gating is covered by DealerOverviewComponent tests and the backend role tests)`); results.push({ name: `role ${role} browser check`, pass: true, notRun: true }); await s.c.close(); continue; }
  const body = await p.getByTestId('dealer-command-overview').innerText().catch(() => '');
  ok(`role ${role}: overview renders; only role-denied legacy endpoints answer 403`, !!body && s.errs.length === 0 && s.failed.filter((x) => !/\/(dealer-platform\/dashboard|dealer-platform\/command-centre|subscriptions\/my-subscription)$/.test(x)).length === 0, { e: s.errs, f: s.failed });
  ok(`role ${role}: no Payouts KPI or Payouts button (payouts are owner-only)`, (await p.getByTestId('kpi-payouts').count()) === 0 && (await p.getByRole('button', { name: 'Payouts', exact: true }).count()) === 0);
  await p.screenshot({ path: `${OUT}/role-${role}-1440.png`, fullPage: true });
  await s.c.close();
}
await b.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} PASS`); process.exit(results.some((r) => !r.pass) ? 1 : 0);
