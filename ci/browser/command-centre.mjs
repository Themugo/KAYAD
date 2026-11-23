// Real-browser check of the dealer command centre on the disposable stack: roles, widths, keyboard, axe, UI figure == API figure.
import { createRequire } from 'node:module'; import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5299', OUT = process.env.OUT || 'reports/evidence/command-centre';
const PW = 'Str0ng!Passw0rd'; fs.mkdirSync(OUT, { recursive: true });
const sql = (s) => execFileSync('psql', ['-h', '127.0.0.1', '-U', 'postgres', '-d', 'kayad_ci', '-Atc', s], { encoding: 'utf8', env: { ...process.env, PGPASSWORD: 'localdev' } }).trim();
const email = (prefix) => sql(`select email from users where email like '${prefix}-%' order by created_at desc limit 1`);
const actors = { owner: email('cca'), manager: email('ccmanage'), sales_agent: email('ccsales_'), lot_agent: email('cclot_ag'), finance_officer: email('ccfinanc'), viewer: email('ccviewer'), custom_team_lead: email('cccustom'), empty_dealer: email('ccempty') };
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const results = []; const check = (g, n, ok, d) => { results.push({ group: g, name: n, ok: !!ok, detail: d ?? '' }); console.log(ok ? 'PASS' : 'FAIL', `[${g}]`, n, ok ? '' : JSON.stringify(d)?.slice(0, 300)); };
const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] });
async function session(role, width = 390, height = 844) {
  const ctx = await b.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 }); const p = await ctx.newPage();
  const errs = [], failed = [], consoleErrs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 160)); });
  p.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/') && !/\/auth\/(me|refresh)$/.test(new URL(r.url()).pathname)) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('input[type=email]', { timeout: 15000 });
  await p.fill('input[type=email]', actors[role]); await p.fill('input[type=password]', PW); await p.click('.kayad-auth-submit'); await p.waitForTimeout(3500);
  await p.goto(`${BASE}/?nav=dealer-dashboard`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  return { ctx, p, errs, failed, consoleErrs };
}
const api = (p) => p.evaluate(async () => { const t = (await (await fetch('/api/v1/auth/csrf', { credentials: 'include' })).json()).csrfToken; const r = await fetch('/api/dealer-platform/command-centre', { credentials: 'include', headers: { 'x-csrf-token': t } }); return { status: r.status, j: await r.json().catch(() => null) }; });
const axe = async (p) => { await p.evaluate(axeSrc); return p.evaluate(async () => { const r = await window.axe.run(document.querySelector('[data-testid=command-centre]') || document.body, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.html.slice(0, 120) })); }); };
const ksh = (n) => `Ksh ${n.toLocaleString('en-KE')}`;

// ---------- owner: widths, overflow, UI == API, axe, keyboard
for (const w of [320, 360, 390, 768, 1024, 1280, 1920]) {
  const s = await session('owner', w, w < 700 ? 844 : 900); const { p } = s;
  const present = await p.locator('[data-testid=command-centre]').count();
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  check('owner-layout', `${w}px: command centre rendered, no horizontal overflow`, present === 1 && !overflow, { present, overflow });
  if (w === 1280) {
    const { j } = await api(p); const f = j.data.financial;
    const txt = async (id) => (await p.getByTestId(id).innerText()).replace(/\s+/g, ' ');
    check('owner-figures', 'UI released revenue equals API', (await txt('fin-revenue')).includes(ksh(f.releasedRevenue.amount)), [await txt('fin-revenue'), f.releasedRevenue]);
    check('owner-figures', 'UI pending escrow equals API', (await txt('fin-escrow')).includes(ksh(f.escrowHeld.amount)));
    check('owner-figures', 'UI pending payouts equals API', (await txt('fin-pending-payout')).includes(ksh(f.pendingPayout.amount)));
    check('owner-figures', 'UI completed payouts equals API', (await txt('fin-completed-payout')).includes(ksh(f.completedPayout.amount)));
    check('owner-figures', 'UI active listings / new enquiries / open offers equal API', (await txt('tile-active')).includes(String(j.data.listings.active)) && (await txt('tile-enquiries')).includes(String(j.data.leads.newEnquiries)) && (await txt('tile-offers')).includes(String(j.data.leads.offersAwaitingDecision)));
    const v = await axe(p); check('a11y', 'axe (WCAG 2.x A/AA) on the owner command centre at 1280px: no violations', v.length === 0, v);
    await p.screenshot({ path: `${OUT}/owner-1280.png`, fullPage: true });
    // keyboard: Tab to the first attention item, activate with Enter, the workspace moves to that section
    const first = p.locator('[data-testid=attention-queue] button').first(); const target = await first.getAttribute('data-testid');
    await first.focus(); const focusRing = await first.evaluate((el) => { const cs = getComputedStyle(el); return cs.outlineStyle !== 'none' || cs.boxShadow !== 'none'; });
    await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
    const url = new URL(p.url()); const expected = j.data.attention.find((i) => `attention-${i.id}` === target)?.target.section;
    check('keyboard', `Enter on ${target} opens section "${expected}" (URL ?section=)`, url.searchParams.get('section') === expected, [url.search, expected]);
    check('keyboard', 'focused attention item shows a visible focus indicator', focusRing);
  }
  if (w === 390) {
    const v = await axe(p); check('a11y', 'axe on the owner command centre at 390px: no violations', v.length === 0, v);
    const small = await p.evaluate(() => [...document.querySelectorAll('[data-testid=command-centre] button')].filter((b) => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 40; }).map((b) => b.textContent.trim().slice(0, 30)));
    check('touch', 'command-centre buttons are at least 40px tall on a phone', small.length === 0, small);
    await p.screenshot({ path: `${OUT}/owner-390.png`, fullPage: true });
  }
  if (w === 320) await p.screenshot({ path: `${OUT}/owner-320.png`, fullPage: true });
  if (w === 1920) await p.screenshot({ path: `${OUT}/owner-1920.png` });
  check('owner-health', `${w}px: no page errors, no failed API calls`, s.errs.length === 0 && s.failed.length === 0, { errs: s.errs, failed: s.failed });
  await s.ctx.close();
}

// ---------- team members: the existing team workspace + the permission-aware Overview tab ----------
// Expected per role (information model: reports/DEALER-TEAM-WORKSPACE-OVERVIEW.md). `tiles` are testids that must exist, `absent` must not.
const MEMBER = {
  manager: { overview: true, tiles: ['to-active', 'to-enquiries', 'to-revenue'], tabs: ['Overview', 'Inventory', 'Leads', 'Customers'] },
  lot_agent: { overview: true, tiles: ['to-active', 'to-live-auctions'], absent: ['to-enquiries', 'to-revenue'], tabs: ['Overview', 'Inventory'] },
  finance_officer: { overview: true, tiles: ['to-revenue'], absent: ['to-active', 'to-enquiries'], tabs: ['Overview'] },
  custom_team_lead: { overview: true, tiles: ['to-enquiries'], absent: ['to-active', 'to-revenue'], tabs: ['Overview', 'Leads', 'Customers'] },
  viewer: { overview: false, tabs: [] },
  sales_agent: { overview: false, tabs: [], removed: true },
};
const FIN_WORDS = /pending escrow|pending payout|completed payout|platform fee|refund|settlement|escrow-held|outstanding receivable/i;
for (const [role, exp] of Object.entries(MEMBER)) {
  for (const w of exp.overview ? [320, 390, 1280] : [390]) {
    const s = await session(role, w, w < 700 ? 844 : 900); const { p } = s;
    await p.goto(`${BASE}/?nav=dealership-workspace`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
    const tag = `${role}@${w}`;
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    check('team-layout', `${tag}: no horizontal overflow`, !overflow);
    const wsTabs = p.locator('[role=tablist][aria-label="Dealership sections"]').getByRole('tab'); const tabs = await wsTabs.allInnerTexts(); const names = tabs.map((t) => t.trim());
    check('team-roles', `${tag}: tabs = ${JSON.stringify(exp.tabs)}`, JSON.stringify(names) === JSON.stringify(exp.tabs), names);
    const body = await p.locator('main').innerText().catch(() => '');
    if (exp.overview) {
      check('team-roles', `${tag}: Overview rendered`, (await p.getByTestId('team-overview').count()) === 1);
      for (const t of exp.tiles) check('team-roles', `${tag}: tile ${t} present`, (await p.getByTestId(t).count()) === 1);
      for (const t of exp.absent || []) check('team-roles', `${tag}: tile ${t} absent`, (await p.getByTestId(t).count()) === 0);
      const ov = await p.getByTestId('team-overview').innerText();
      check('team-roles', `${tag}: no escrow/payout/refund/fee/settlement wording in the overview`, !FIN_WORDS.test(ov), ov.slice(0, 200));
      if (w === 1280 || w === 390) {
        const { j } = await p.evaluate(async () => { const t = (await (await fetch('/api/v1/auth/csrf', { credentials: 'include' })).json()).csrfToken; const r = await fetch('/api/dealer-platform/command-centre', { credentials: 'include', headers: { 'x-csrf-token': t } }); return { j: await r.json() }; });
        const d = j.data; const txt = async (id) => (await p.getByTestId(id).innerText()).replace(/\s+/g, ' ');
        if (d.listings) check('team-figures', `${tag}: UI active listings equals API (${d.listings.active})`, (await txt('to-active')).includes(String(d.listings.active)));
        if (d.leads) check('team-figures', `${tag}: UI new enquiries equals API (${d.leads.newEnquiries})`, (await txt('to-enquiries')).includes(String(d.leads.newEnquiries)));
        if (d.financial?.releasedRevenue) check('team-figures', `${tag}: UI released revenue equals API`, (await txt('to-revenue')).includes(`Ksh ${Math.round(d.financial.releasedRevenue.amount).toLocaleString('en-KE')}`));
        check('team-roles', `${tag}: API payload for this member has no escrow/payout/refund/fee keys`, !d.financial || Object.keys(d.financial).join() === 'releasedRevenue', Object.keys(d.financial || {}));
        const vv = await p.evaluate(async (src) => { if (!window.axe) { const sc = document.createElement('script'); sc.textContent = src; document.head.appendChild(sc); } const r = await window.axe.run(document.querySelector('[data-testid=team-overview]'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] }); return r.violations.map((x) => ({ id: x.id, n: x.nodes.length, sample: x.nodes[0]?.html.slice(0, 100) })); }, axeSrc);
        check('a11y', `${tag}: axe (WCAG 2.x A/AA) on the team overview: no violations`, vv.length === 0, vv);
        const small = await p.evaluate(() => [...document.querySelectorAll('[data-testid=team-overview] button')].filter((b) => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 40; }).length);
        if (w === 390) check('touch', `${tag}: overview buttons are at least 40px tall`, small === 0, small);
        await p.screenshot({ path: `${OUT}/team-${role}-${w}.png`, fullPage: true });
        // keyboard: first attention button -> Enter -> the right tab becomes selected
        const first = p.locator('[data-testid=team-attention] button').first();
        if (await first.count()) {
          await first.focus(); const ring = await first.evaluate((el) => { const cs = getComputedStyle(el); return cs.outlineStyle !== 'none' || cs.boxShadow !== 'none'; });
          const label = await first.getAttribute('aria-label'); const want = /Open (\w+)/.exec(label || '')?.[1];
          await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
          const sel = await wsTabs.and(p.locator('[aria-selected=true]')).innerText();
          check('keyboard', `${tag}: Enter on "${label}" selects the ${want} tab`, want && sel.trim().toLowerCase() === want, [sel, want]);
          check('keyboard', `${tag}: attention button has a visible focus indicator`, ring);
        }
        check('a11y', `${tag}: workspace tabs are in a labelled tablist`, (await p.locator('[role=tablist][aria-label="Dealership sections"]').count()) === 1);
      }
    } else {
      check('team-roles', `${tag}: no Overview, no command-centre data`, (await p.getByTestId('team-overview').count()) === 0 && !/Ksh \d/.test(body), body.slice(0, 200));
      await p.screenshot({ path: `${OUT}/team-${role}-${w}.png` });
    }
    check('team-health', `${tag}: no uncaught page errors`, s.errs.length === 0, s.errs);
    await s.ctx.close();
  }
  // the owner overview route must never open for a personal team account
  { const s = await session(role); await s.p.goto(`${BASE}/?nav=dealer-dashboard`, { waitUntil: 'domcontentloaded' }); await s.p.waitForTimeout(2500); check('team-roles', `${role}: owner overview (?nav=dealer-dashboard) is not shown`, (await s.p.locator('[data-testid=command-centre]').count()) === 0); await s.ctx.close(); }
}
// team overview states: slow API (loading), API failure (no overview, tabs still work), empty
{ const s = await session('manager', 1280, 900); await s.ctx.route('**/api/dealer-platform/command-centre', async (r) => { await new Promise((x) => setTimeout(x, 2500)); r.continue(); });
  await s.p.goto(`${BASE}/?nav=dealership-workspace`, { waitUntil: 'domcontentloaded' }); await s.p.waitForTimeout(1200);
  const loading = (await s.p.getByRole('status').allInnerTexts()).join(' ');
  await s.p.waitForSelector('[data-testid=team-overview]', { timeout: 9000 }); check('states', 'team overview: slow API then data appears (no flash of the "no permissions" message)', !/not given you any workspace permissions/.test(loading), loading.slice(0, 120)); await s.ctx.close(); }
{ const s = await session('manager', 1280, 900); await s.ctx.route('**/api/dealer-platform/command-centre', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false}' }));
  await s.p.goto(`${BASE}/?nav=dealership-workspace`, { waitUntil: 'domcontentloaded' }); await s.p.waitForTimeout(3500);
  const tabs = (await s.p.locator('[role=tablist][aria-label="Dealership sections"]').getByRole('tab').allInnerTexts()).map((t) => t.trim());
  check('states', 'team overview: API failure keeps the existing Inventory/Leads/Customers tabs and shows no invented figures', JSON.stringify(tabs) === JSON.stringify(['Inventory', 'Leads', 'Customers']) && (await s.p.getByTestId('team-overview').count()) === 0, tabs); await s.ctx.close(); }
// empty dealership
{ const s = await session('empty_dealer', 1280, 900); const body = await s.p.locator('body').innerText(); const ok = (await s.p.getByTestId('attention-empty').count()) === 1 && /Ksh 0/.test(body); check('states', 'empty dealership: zeros and "nothing needs attention", no invented figures', ok, body.slice(0, 300)); await s.p.screenshot({ path: `${OUT}/empty-1280.png` }); await s.ctx.close(); }
// error state: API failure
{ const s = await session('owner', 1280, 900); await s.ctx.route('**/api/dealer-platform/command-centre', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false}' })); await s.p.goto(`${BASE}/?nav=dealer-dashboard`, { waitUntil: 'domcontentloaded' }); await s.p.waitForTimeout(3500);
  check('states', 'command centre API failure: quiet unavailable message, rest of overview intact', (await s.p.getByTestId('command-centre-unavailable').count()) === 1 && (await s.p.getByTestId('dealer-overview').count()) === 1); await s.p.screenshot({ path: `${OUT}/error-1280.png` }); await s.ctx.close(); }
// loading state: slow API
{ const s = await session('owner', 1280, 900); await s.ctx.route('**/api/dealer-platform/command-centre', async (r) => { await new Promise((x) => setTimeout(x, 2500)); r.continue(); }); await s.p.goto(`${BASE}/?nav=dealer-dashboard`, { waitUntil: 'domcontentloaded' }); await s.p.waitForTimeout(900);
  check('states', 'slow API: loading skeleton is shown, then the data', (await s.p.getByTestId('command-centre-loading').count()) === 1); await s.p.waitForSelector('[data-testid=command-centre]', { timeout: 8000 }); check('states', 'slow API: data appears after loading', true); await s.ctx.close(); }
// Team and Banking appear once in the navigation (no duplicate destinations)
{ const s = await session('owner', 1280, 900); const nav = await s.p.getByRole('navigation', { name: 'Dealer workspace' }).innerText(); const count = (w) => nav.split('\n').filter((l) => l.trim() === w).length;
  check('nav', 'sidebar: Team, Banking and Overview each appear exactly once', count('Team') === 1 && count('Banking') === 1 && count('Overview') === 1, nav.slice(0, 400)); await s.ctx.close(); }
await b.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ at: new Date().toISOString(), actors: Object.fromEntries(Object.entries(actors).map(([k, v]) => [k, v.replace(/-.*@/, '-…@')])), results }, null, 1));
const bad = results.filter((r) => !r.ok); console.log(`RESULT ${results.length - bad.length}/${results.length} passed`); process.exit(bad.length ? 1 : 0);
