// Real frontend bundle, MOCKED API (not a live backend). Sections x 3 widths + new dealer write workflows with request capture.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE; const OUT = process.env.OUT || 'evidence/phase14-4-20261026';
const SECTIONS = ['overview','inventory','leads','pipeline','customers','analytics','finance','inspections','auctions','escrow','marketing','reputation','team','settings'];
const user = { id: 'd1', _id: 'd1', name: 'Amani Motors', email: 'd@example.test', role: 'dealer', status: 'approved', emailVerified: true };
const captured = [];
const team = [{ id: 'm1', inviteEmail: 'a@amani.test', role: 'sales_agent', status: 'active', member: 'u2' }, { id: 'm2', inviteEmail: 'b@amani.test', role: 'viewer', status: 'invited', member: null }];
function respond(req) {
  const u = new URL(req.url()); const p = u.pathname; const m = req.method();
  if (m !== 'GET') captured.push({ method: m, path: p, body: (req.postData() || '').slice(0, 300), contentType: req.headers()['content-type'] || '' });
  if (/auth\/me/.test(p)) return { success: true, user };
  if (/auth\/csrf/.test(p)) return { success: true, csrfToken: 'x'.repeat(48) };
  if (/verification\/status/.test(p)) return { success: true, onboardingStage: 'pending_approval', verification: { status: 'pending' } };
  if (/dealer-platform\/profile/.test(p)) return m === 'PUT' ? { success: true, data: { id: 'd1', businessName: 'Amani Motors Ltd', location: 'Nairobi', bio: 'Hi', phone: '+254700000000' } } : { success: true, data: { id: 'd1', businessName: 'Amani Motors', location: 'Nairobi', bio: 'Hi' } };
  if (/dealer-platform\/team\/invite/.test(p)) return { success: true, data: { id: 'm9' } };
  if (/dealer-platform\/team/.test(p)) return m === 'GET' ? { success: true, data: { items: team, stats: {} } } : { success: true, data: {} };
  if (/dealer-platform\/dashboard/.test(p)) return { success: true, data: { overview: { totalListings: 1, totalViews: 9, leads: { total: 0, new: 0 }, revenue: { total: 0 } }, topPerformers: { vehicles: [] } } };
  if (/dealer-platform\/reputation/.test(p)) return { success: true, data: { overall: { rating: 4.5, totalReviews: 2 }, recentReviews: [] } };
  if (/my-listings/.test(p)) return { success: true, data: [{ id: 'c1', title: 'Prado TX', brand: 'Toyota', model: 'Prado', price: 5000000, views: 3, status: 'available', year: 2018, city: 'Nairobi' }] };
  if (/\/cars$/.test(p) && m === 'POST') return { success: true, data: { id: 'c2' } };
  if (/\/cars\/c1$/.test(p) && m === 'PUT') return { success: true, data: { id: 'c1' } };
  if (/escrow\/my/.test(p)) return { success: true, data: [] };
  if (/auctions\/operations/.test(p)) return { success: true, data: [] };
  return { success: true, data: { items: [], stats: {} } };
}
async function axeOf(page) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') }).catch(() => {});
  return page.evaluate(async () => window.axe ? (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id + ':' + v.nodes.length) : ['axe-unavailable']).catch(() => ['axe-error']);
}
(async () => {
  const browser = await chromium.launch(); const rows = []; const flows = [];
  for (const [vname, vp] of [['desktop', { width: 1280, height: 900 }], ['tablet', { width: 768, height: 1024 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await page.route((u) => u.pathname.startsWith('/api/'), (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(r.request())) }));
    const views = SECTIONS.map((s) => [s, `/?nav=dealer-dashboard&section=${s}`]).concat([['inventory-new', '/?nav=dealer-dashboard&section=inventory&mode=new'], ['inventory-edit', '/?nav=dealer-dashboard&section=inventory&mode=edit&id=c1']]);
    for (const [name, path] of views) {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2200);
      const overflow = await page.evaluate(() => document.body.scrollWidth - document.documentElement.clientWidth);
      const crashed = /Something went wrong/.test(await page.locator('body').innerText());
      const axe = await axeOf(page);
      if (['inventory','inventory-new','inventory-edit','settings','team'].includes(name)) await page.screenshot({ path: `${OUT}/screenshots/${vname}-${name}.png`, fullPage: true });
      rows.push({ viewport: vname, view: name, crashed, overflowPx: overflow, axeSeriousCritical: axe, pageErrors: [...new Set(errs)] });
    }
    if (vname !== 'tablet') {
      // create flow
      captured.length = 0;
      await page.goto(BASE + '/?nav=dealer-dashboard&section=inventory', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Add vehicle/ }).click();
      await page.getByRole('button', { name: 'Publish vehicle' }).click();
      const validationShown = await page.getByText('Brand is required.').isVisible();
      await page.getByLabel(/^Title/).fill('Prado TX'); await page.getByLabel(/^Brand/).fill('Toyota'); await page.getByLabel(/^Price/).fill('4800000');
      await page.getByLabel(/Photos/).setInputFiles({ name: 'car.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') });
      await page.getByRole('button', { name: 'Publish vehicle' }).click();
      await page.getByText(/Vehicle submitted/).waitFor({ timeout: 5000 });
      const post = captured.filter((c) => c.method === 'POST' && /\/cars$/.test(c.path));
      flows.push({ viewport: vname, flow: 'listing-create', validationShown, requests: post.length, multipart: /multipart\/form-data/.test(post[0]?.contentType || ''), urlAfter: page.url().replace(BASE, '') });
      // edit flow
      captured.length = 0;
      await page.getByRole('button', { name: /Edit Prado TX/ }).click();
      await page.getByLabel(/^Price/).fill('4700000');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await page.getByText('Changes saved.').waitFor({ timeout: 5000 });
      const put = captured.filter((c) => c.method === 'PUT');
      flows.push({ viewport: vname, flow: 'listing-edit', requests: put.length, path: put[0]?.path, body: put[0]?.body });
      // settings
      captured.length = 0;
      await page.goto(BASE + '/?nav=dealer-dashboard&section=settings', { waitUntil: 'domcontentloaded' });
      await page.getByLabel(/Business name/).fill('Amani Motors Ltd'); await page.getByLabel(/Contact phone/).fill('+254700000000');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await page.getByText('Profile saved.').waitFor({ timeout: 5000 });
      flows.push({ viewport: vname, flow: 'settings-save', verificationCard: await page.getByTestId('verification-stage').innerText(), put: captured.filter((c) => c.method === 'PUT').map((c) => c.path + ' ' + c.body) });
      // team
      captured.length = 0;
      await page.goto(BASE + '/?nav=dealer-dashboard&section=team', { waitUntil: 'domcontentloaded' });
      await page.getByLabel(/^Email/).fill('new@amani.test');
      await page.getByRole('button', { name: 'Send invitation' }).click();
      await page.getByText('Invitation sent to new@amani.test.').waitFor({ timeout: 5000 });
      flows.push({ viewport: vname, flow: 'team-invite', post: captured.filter((c) => c.method === 'POST').map((c) => c.path + ' ' + c.body) });
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/workflow-browser-results.json`, JSON.stringify({ rows, flows }, null, 2));
  for (const r of rows) console.log(`${r.viewport} ${r.view} crash=${r.crashed} overflow=${r.overflowPx} axe=${r.axeSeriousCritical.join(',') || 'none'} errs=${r.pageErrors.length}`);
  for (const f of flows) console.log('FLOW', JSON.stringify(f));
})().catch((e) => { console.error('SCRIPT FAIL', e); process.exit(1); });
