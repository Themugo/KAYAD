/* global process, URL, window, document, getComputedStyle, Buffer, console */
// Phase 14.6 browser verification. Tier [B]: REAL frontend bundle, MOCKED API (not a live backend, not staging).
// Synchronisation is condition-based (landmark + network idle); a navigation interrupted by the Vite dev optimiser
// is retried ONCE and always recorded in navInterruptions (see 14.6 browser report). No assertion is removed.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE; const OUT = process.env.OUT || 'evidence/phase14-6-20261026';
const SECTIONS = ['overview','inventory','leads','pipeline','customers','analytics','finance','inspections','auctions','escrow','marketing','reputation','team','settings'];
const user = { id: 'd1', _id: 'd1', name: 'Amani Motors', email: 'd@example.test', role: 'dealer', status: 'approved', emailVerified: true };
const baseImgs = [{ url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', public_id: 'p1' }, { url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', public_id: 'p2' }];
const lead = (id, stage, name) => ({ id, stage, buyer: { name }, vehicle: { title: 'Prado TX' }, source: 'web', createdAt: '2026-10-20T10:00:00Z' });
let captured = []; let navInterruptions = []; let state;
const reset = () => { state = { mode: 'ok', images: [...baseImgs], cars: [{ id: 'c1', title: 'Prado TX', brand: 'Toyota', model: 'Prado', price: 5000000, views: 3, status: 'available', year: 2018, city: 'Nairobi', updatedAt: '2026-10-20T10:00:00Z' }], profile: { id: 'd1', businessName: 'Amani Motors', location: 'Nairobi', bio: 'Hi', phone: '254711111111' }, team: [{ id: 'm1', inviteEmail: 'a@amani.test', role: 'sales_agent', status: 'active', member: 'u2' }, { id: 'm2', inviteEmail: 'b@amani.test', role: 'viewer', status: 'invited', member: null }] }; };
reset();
function respond(req) {
  const u = new URL(req.url()); const p = u.pathname; const m = req.method();
  if (m !== 'GET') captured.push({ method: m, path: p, body: (req.postData() || '').slice(0, 300), contentType: req.headers()['content-type'] || '' });
  const deny = { status: 403, body: { success: false, message: 'Missing dealer permission: canManageTeam' } };
  if (/auth\/me/.test(p)) return { body: { success: true, user } };
  if (/auth\/csrf/.test(p)) return { body: { success: true, csrfToken: 'x'.repeat(48) } };
  if (/verification\/status/.test(p)) return { body: { success: true, onboardingStage: 'pending_approval', verification: { status: 'pending' } } };
  if (/dealer-platform\/profile/.test(p)) {
    if (state.mode === 'forbidden') return { status: 403, body: { success: false, message: 'You can only view your own dealership profile.' } };
    if (m === 'PUT') { const b = JSON.parse(req.postData() || '{}'); state.profile = { ...state.profile, ...b, phone: b.phone ? '254' + b.phone.replace(/^0/, '') : state.profile.phone }; return { body: { success: true, data: state.profile } }; }
    return { body: { success: true, data: state.profile } };
  }
  if (/dealer-platform\/team\/invite/.test(p)) return state.mode === 'forbidden' ? deny : { body: { success: true, data: { id: 'm9' } } };
  if (/dealer-platform\/team/.test(p)) { if (m === 'GET') return { body: { success: true, data: { items: state.mode === 'empty' ? [] : state.team, stats: {} } } }; if (state.mode === 'forbidden') return deny; if (m === 'DELETE') state.team = state.team.filter((t) => !p.endsWith('/' + t.id)); return { body: { success: true, data: {} } }; }
  if (/dealer-platform\/leads/.test(p)) return { body: { success: true, data: { items: state.mode === 'empty' ? [] : [lead('l1', 'new', 'Wanjiku'), lead('l2', 'contacted', 'Otieno'), lead('l3', 'negotiating', 'Achieng'), lead('l4', 'test_drive', 'Kamau')] } } };
  if (/dealer-platform\/dashboard/.test(p)) return { body: { success: true, data: { overview: { totalListings: 1, totalViews: 0, leads: { total: 4, new: 1, contacted: 1, negotiating: 1, reserved: 0 }, revenue: { total: 0 } }, topPerformers: { vehicles: [] } } } };
  if (/dealer-platform\/reputation/.test(p)) return { body: { success: true, data: { overall: { rating: 4.5, totalReviews: 2 }, recentReviews: [] } } };
  if (/my-listings/.test(p)) { if (state.mode === 'error') return { status: 500, body: { success: false, message: 'boom' } }; return { body: { success: true, data: state.mode === 'empty' ? [] : state.cars.map((c) => ({ ...c, images: c.id === 'c1' ? state.images : [] })) } }; }
  if (/\/cars\/c1\/images\/(\d+)$/.test(p) && m === 'DELETE') { const i = Number(p.match(/(\d+)$/)[1]); state.images.splice(i, 1); return { body: { success: true, data: { images: state.images, coverImage: 0 } } }; }
  if (/\/cars\/c1\/images$/.test(p) && m === 'POST') { state.images.push({ url: baseImgs[0].url, public_id: 'p' + (state.images.length + 1) + 'x' }); return { body: { success: true, data: { images: state.images } } }; }
  if (/\/cars\/c1$/.test(p) && m === 'DELETE') { state.cars = state.cars.filter((c) => c.id !== 'c1'); return { body: { success: true, message: 'Deleted' } }; }
  if (/\/cars$/.test(p) && m === 'POST') return { body: { success: true, data: { id: 'c2' } } };
  if (/\/cars\/c1$/.test(p) && m === 'PUT') return { body: { success: true, data: { id: 'c1' } } };
  if (/escrow\/my/.test(p)) return { body: { success: true, data: [] } };
  if (/auctions\/operations/.test(p)) return { body: { success: true, data: [] } };
  return { body: { success: true, data: { items: [], stats: {} } } };
}
async function axeOf(page) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') }).catch(() => {});
  return page.evaluate(async () => window.axe ? (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id + ':' + v.nodes.length) : ['axe-unavailable']).catch(() => ['axe-error']);
}
const nav = (page) => page.getByRole('navigation', { name: 'Dealer workspace' });
// Condition-based open: landmark visible, then network idle. One recorded retry for an interrupted navigation.
async function open(page, path, tag) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try { await page.goto(BASE + path, { waitUntil: 'domcontentloaded' }); break; }
    catch (e) {
      if (attempt === 2 || !/interrupted by another navigation/i.test(String(e))) throw e;
      navInterruptions.push({ view: tag || path, message: String(e).split('\n')[0].slice(0, 200), reloadsSeen: page.__navs || 0 });
      await page.waitForLoadState('load');
    }
  }
  await nav(page).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}
(async () => {
  const browser = await chromium.launch(); const rows = []; const flows = [];
  const flow = (viewport, name, extra) => flows.push({ viewport, flow: name, ...extra });
  for (const [vname, vp] of [['desktop', { width: 1280, height: 900 }], ['tablet', { width: 768, height: 1024 }], ['mobile', { width: 390, height: 844 }]]) {
    reset();
    const ctx = await browser.newContext({ viewport: vp }); const page = await ctx.newPage(); const errs = []; const consoleErrs = []; const netFail = [];
    page.__navs = 0;
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) page.__navs += 1; });
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrs.push(m.text().slice(0, 160)); });
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/api/')) netFail.push(r.status() + ' ' + new URL(r.url()).pathname); });
    await page.route((u) => u.pathname.startsWith('/api/'), (r) => { const o = respond(r.request()); r.fulfill({ status: o.status || 200, contentType: 'application/json', body: JSON.stringify(o.body) }); });
    const views = SECTIONS.map((s) => [s, `/?nav=dealer-dashboard&section=${s}`]).concat([['inventory-new', '/?nav=dealer-dashboard&section=inventory&mode=new'], ['inventory-edit', '/?nav=dealer-dashboard&section=inventory&mode=edit&id=c1']]);
    for (const [name, path] of views) {
      await open(page, path, `${vname}:${name}`);
      const overflow = await page.evaluate(() => document.body.scrollWidth - document.documentElement.clientWidth);
      const crashed = /Something went wrong/.test(await page.locator('body').innerText());
      const axe = await axeOf(page);
      const sect = name.split('-')[0];
      const activeNav = await nav(page).locator('[aria-current="page"]').first().innerText().catch(() => '');
      await page.screenshot({ path: `${OUT}/screenshots/${vname}-${name}.png`, fullPage: true });
      rows.push({ viewport: vname, view: name, crashed, overflowPx: overflow, axeSeriousCritical: axe, pageErrors: [...new Set(errs)], activeNav: activeNav.trim().split('\n')[0], section: sect });
    }
    // direct URL + refresh + Back/Forward + sidebar active state
    await open(page, '/?nav=dealer-dashboard&section=leads', 'nav-leads');
    await nav(page).getByRole('button', { name: /Pipeline/ }).click();
    await page.waitForURL(/section=pipeline/);
    const activePipeline = (await nav(page).locator('[aria-current="page"]').first().innerText()).includes('Pipeline');
    await page.goBack(); await page.waitForURL(/section=leads/);
    const backLeads = (await nav(page).locator('[aria-current="page"]').first().innerText()).includes('Leads');
    await page.goForward(); await page.waitForURL(/section=pipeline/);
    const fwdPipeline = (await nav(page).locator('[aria-current="page"]').first().innerText()).includes('Pipeline');
    await page.reload(); await nav(page).waitFor(); await page.waitForLoadState('networkidle').catch(() => {});
    const afterReload = page.url().includes('section=pipeline') && (await nav(page).locator('[aria-current="page"]').first().innerText()).includes('Pipeline');
    const stageLabels = await page.locator('h4').allInnerTexts();
    flow(vname, 'navigation-history', { activePipeline, backLeads, fwdPipeline, afterReload, pipelineStageHeadings: stageLabels, otherStageNote: await page.getByText(/other stages/).isVisible() });
    // keyboard: Tab reaches a focusable control with a visible focus ring
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return null; const s = getComputedStyle(el); return { tag: el.tagName, outline: s.outlineStyle + ' ' + s.outlineWidth }; });
    flow(vname, 'keyboard-focus', { focus });
    if (vname !== 'tablet') {
      // create flow
      captured = [];
      await open(page, '/?nav=dealer-dashboard&section=inventory', 'create');
      await page.getByRole('button', { name: /Add vehicle/ }).click();
      await page.getByRole('button', { name: 'Publish vehicle' }).click();
      const validationShown = await page.getByText('Brand is required.').isVisible();
      await page.getByLabel(/^Title/).fill('Prado TX'); await page.getByLabel(/^Brand/).fill('Toyota'); await page.getByLabel(/^Price/).fill('4800000');
      await page.getByLabel(/Photos/).setInputFiles({ name: 'car.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') });
      await page.getByRole('button', { name: 'Publish vehicle' }).click();
      await page.getByText(/Vehicle submitted/).waitFor({ timeout: 5000 });
      const post = captured.filter((c) => c.method === 'POST' && /\/cars$/.test(c.path));
      flow(vname, 'listing-create', { validationShown, requests: post.length, multipart: /multipart\/form-data/.test(post[0]?.contentType || ''), urlAfter: page.url().replace(BASE, '') });
      // edit flow
      captured = [];
      await page.getByRole('button', { name: /Edit Prado TX/ }).click();
      const photosShown = await page.getByRole('list', { name: 'Current photos' }).locator('li').count();
      await page.getByLabel(/^Price/).fill('4700000');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await page.getByText('Changes saved.').waitFor({ timeout: 5000 });
      const put = captured.filter((c) => c.method === 'PUT');
      flow(vname, 'listing-edit', { photosShownBeforeSave: photosShown, requests: put.length, path: put[0]?.path, bodyHasImages: /images/.test(put[0]?.body || ''), body: put[0]?.body });
      // photo management: add (multipart), remove (confirm), last photo protected
      captured = [];
      await page.getByRole('button', { name: /Edit Prado TX/ }).click();
      await page.getByLabel('Add photos').setInputFiles({ name: 'new.png', mimeType: 'image/png', buffer: Buffer.from('x') });
      await page.getByRole('button', { name: /Upload 1/ }).click();
      await page.getByText('1 photo added.').waitFor({ timeout: 5000 });
      const up = captured.filter((c) => c.method === 'POST' && /images$/.test(c.path));
      const afterAdd = await page.getByRole('list', { name: 'Current photos' }).locator('li').count();
      await page.screenshot({ path: `${OUT}/screenshots/${vname}-inventory-edit-photos.png`, fullPage: true });
      captured = [];
      await page.getByRole('button', { name: 'Remove photo 1' }).click();
      const noRequestBeforeConfirm = captured.length === 0;
      await page.getByRole('group', { name: 'Confirm removing photo 1' }).getByRole('button', { name: /Remove/ }).click();
      await page.getByText('Photo removed.').waitFor({ timeout: 5000 });
      const afterRemove = await page.getByRole('list', { name: 'Current photos' }).locator('li').count();
      flow(vname, 'photo-management', { uploadRequests: up.length, multipart: /multipart\/form-data/.test(up[0]?.contentType || ''), afterAdd, noRequestBeforeConfirm, afterRemove, deleteRequest: captured.filter((c) => c.method === 'DELETE').map((c) => c.path) });
      // listing removal with confirmation
      captured = [];
      await page.getByRole('button', { name: /Back to inventory/ }).click();
      await page.getByRole('button', { name: 'Remove Prado TX' }).click();
      const noDeleteBeforeConfirm = captured.length === 0;
      await page.screenshot({ path: `${OUT}/screenshots/${vname}-inventory-remove-confirm.png`, fullPage: true });
      await page.getByRole('button', { name: 'Remove listing' }).click();
      await page.getByText('Listing removed from your inventory.').waitFor({ timeout: 5000 });
      flow(vname, 'listing-remove', { noDeleteBeforeConfirm, delete: captured.filter((c) => c.method === 'DELETE').map((c) => c.path), emptyStateShown: await page.getByText("You haven't listed any vehicles yet.").isVisible() });
      reset();
      // settings: save -> reload persistence
      captured = [];
      await open(page, '/?nav=dealer-dashboard&section=settings', 'settings');
      await page.getByLabel(/Business name/).fill('Amani Motors Ltd'); await page.getByLabel(/Contact phone/).fill('0700000000');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await page.getByText(/Profile saved\./).waitFor({ timeout: 5000 });
      const savedMsg = await page.getByText(/Profile saved\./).innerText();
      const put2 = captured.filter((c) => c.method === 'PUT').map((c) => c.path + ' ' + c.body);
      await page.reload(); await page.getByLabel(/Business name/).waitFor();
      const persisted = await page.getByLabel(/Business name/).inputValue();
      flow(vname, 'settings-save-and-reload', { verificationCard: await page.getByTestId('verification-stage').innerText(), put: put2, reverifyNotice: /verified again/.test(savedMsg), persistedAfterReload: persisted });
      // settings: forbidden
      state.mode = 'forbidden'; await page.reload(); await nav(page).waitFor(); await page.waitForLoadState('networkidle').catch(() => {});
      flow(vname, 'settings-forbidden', { errorShown: await page.getByText(/only view your own|could not|unable/i).first().isVisible().catch(() => false) });
      state.mode = 'ok';
      // team
      captured = [];
      await open(page, '/?nav=dealer-dashboard&section=team', 'team');
      await page.getByLabel(/^Email/).fill('new@amani.test');
      await page.getByRole('button', { name: 'Send invitation' }).click();
      await page.getByText('Invitation sent to new@amani.test.').waitFor({ timeout: 5000 });
      flow(vname, 'team-invite', { post: captured.filter((c) => c.method === 'POST').map((c) => c.path + ' ' + c.body) });
      captured = [];
      await page.getByRole('button', { name: /^Remove a@amani.test/ }).click();
      const confirmFocused = await page.evaluate(() => document.activeElement && document.activeElement.textContent === 'Confirm remove');
      await page.keyboard.press('Escape');
      const cancelledNoRequest = captured.length === 0 && !(await page.getByText('Confirm remove').isVisible().catch(() => false));
      await page.getByRole('button', { name: /^Remove a@amani.test/ }).click();
      await page.getByRole('button', { name: 'Confirm remove' }).click();
      await page.getByText('a@amani.test removed.').waitFor({ timeout: 5000 });
      flow(vname, 'team-remove-confirm', { confirmFocused, cancelledNoRequest, delete: captured.filter((c) => c.method === 'DELETE').map((c) => c.path) });
      await page.screenshot({ path: `${OUT}/screenshots/${vname}-team-after-remove.png`, fullPage: true });
      // role denial on team write
      state.mode = 'forbidden';
      await page.getByLabel(/^Email/).fill('deny@amani.test');
      await page.getByRole('button', { name: 'Send invitation' }).click();
      await page.getByRole('alert').filter({ hasText: /permission|canManageTeam/i }).first().waitFor({ timeout: 5000 });
      flow(vname, 'team-invite-denied', { denialShown: true });
      state.mode = 'ok';
      // empty + error states
      state.mode = 'empty'; await open(page, '/?nav=dealer-dashboard&section=inventory', 'empty-inv');
      const emptyInv = await page.getByText("You haven't listed any vehicles yet.").isVisible();
      await open(page, '/?nav=dealer-dashboard&section=leads', 'empty-leads');
      const emptyLeads = await page.getByText('No leads yet.').isVisible();
      state.mode = 'error'; await open(page, '/?nav=dealer-dashboard&section=inventory', 'err-inv');
      const errInv = await page.getByRole('button', { name: 'Try Again' }).isVisible();
      state.mode = 'ok'; await page.getByRole('button', { name: 'Try Again' }).click();
      await page.getByText('Prado TX').first().waitFor({ timeout: 5000 });
      flow(vname, 'empty-and-error-states', { emptyInventory: emptyInv, emptyLeads, inventoryErrorWithRetry: errInv, retryRecovered: true });
    }
    flow(vname, 'console-and-network', { pageErrors: [...new Set(errs)], consoleErrors: [...new Set(consoleErrs)], nonApiFailedResponses: [...new Set(netFail)] });
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/workflow-browser-results.json`, JSON.stringify({ tier: 'B (real bundle, mocked API)', rows, flows, navInterruptions }, null, 2));
  for (const r of rows) console.log(`${r.viewport} ${r.view} crash=${r.crashed} overflow=${r.overflowPx} axe=${r.axeSeriousCritical.join(',') || 'none'} errs=${r.pageErrors.length}`);
  for (const f of flows) console.log('FLOW', JSON.stringify(f));
  console.log('NAV_INTERRUPTIONS', JSON.stringify(navInterruptions));
})().catch((e) => { console.error('SCRIPT FAIL', e); process.exit(1); });
