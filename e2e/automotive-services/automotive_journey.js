// Automotive services convergence — real-browser journeys (TEST-ONLY mocked backend).
// The finder, profile and admin governance UI are driven for real; backend responses are a small
// stateful fake so request parameters can be captured. Real backend behaviour is covered by the Jest suites
// and the migration-built PostgreSQL proof.
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const out = []; let fails = 0;
const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`); if (!c) fails++; };
const USER = { id: 'u1', _id: 'u1', name: 'Amina Buyer', email: 'amina@example.test', role: 'buyer', emailVerified: true };
const ADMIN = { id: 'a1', _id: 'a1', name: 'Ada Admin', email: 'ada@example.test', role: 'admin', emailVerified: true };
const json = (r, body, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const TAX = {
  categories: [
    { code: 'pre_purchase_inspection', label: 'Pre-purchase inspection', description: 'An independent check of a vehicle before you buy it.', highRisk: false, bookable: true, requestable: false, travelsToCustomer: false, subcategories: [] },
    { code: 'diagnostics', label: 'Diagnostics and fault assessment', description: 'Find out what is wrong when you do not know the cause.', highRisk: false, bookable: false, requestable: false, travelsToCustomer: false, subcategories: [] },
    { code: 'hybrid_ev', label: 'Hybrid and electric vehicles', description: 'High-voltage systems.', highRisk: true, bookable: false, requestable: false, travelsToCustomer: false, subcategories: [] },
    { code: 'roadside_recovery', label: 'Roadside assistance and recovery', description: 'They travel.', highRisk: false, bookable: false, requestable: false, travelsToCustomer: true, subcategories: [] },
  ],
  powertrains: [{ code: 'petrol', label: 'Petrol' }, { code: 'electric', label: 'Electric' }],
  symptoms: [{ code: 'warning_light', label: 'A warning light is on', suggests: ['diagnostics'] }, { code: 'broken_down', label: "I'm broken down", suggests: ['roadside_recovery'] }],
};
const P = (id, name, over = {}) => ({
  id, companyName: name, location: { country: 'Kenya', county: 'Nairobi', town: 'Westlands' },
  operatingModel: { hasWorkshop: true, offersMobile: false, mobileFee: 0, weekendAvailable: false, sameDayAvailable: false },
  specializations: { vehicleTypes: [], inspectionTypes: [], commercialVehicles: false, electricVehicles: false, luxuryVehicles: false },
  experience: { yearsInBusiness: 0 }, verification: { status: 'verified' },
  stats: { averageRating: null, totalReviews: 0, completedInspections: 0, responseTimeMinutes: null, acceptanceRate: null },
  capabilities: [{ category: 'diagnostics', subcategory: null, status: 'verified', vehicleMakes: 'all', powertrains: [], travelsToCustomer: false, individual: false }], packages: [], ...over,
});

async function install(page, st) {
  const who = () => (st.role === 'admin' ? ADMIN : USER);
  await page.route('**/api/v1/auth/me', (r) => st.user ? json(r, { success: true, user: who() }) : json(r, { success: false, message: 'Unauthenticated' }, 401));
  await page.route(/\/v1\/auth\/csrf/, (r) => json(r, { success: true, csrfToken: 'test-csrf-token-0123456789abcdef0123456789' }));
  await page.route(/^https?:\/\/[^/]+\/api\/favorites/, (r) => json(r, { success: true, data: [] }));
  await page.route(/^https?:\/\/[^/]+\/api\/notifications/, (r) => json(r, { success: true, data: [], unreadCount: 0 }));
  await page.route(/^https?:\/\/[^/]+\/api\/cars(\?.*)?$/, (r) => json(r, { success: true, data: [], pagination: { page: 1, limit: 24, total: 0, pages: 1 } }));
  await page.route(/^https?:\/\/[^/]+\/api\/inspection\/service-taxonomy/, (r) => json(r, { success: true, data: TAX }));
  await page.route(/^https?:\/\/[^/]+\/api\/config\/vehicle\/makes/, (r) => json(r, { success: true, data: [{ value: 'Toyota' }, { value: 'Subaru' }] }));
  await page.route(/^https?:\/\/[^/]+\/api\/inspection\/providers(\?.*)?$/, (r) => {
    const q = Object.fromEntries(new URL(r.request().url()).searchParams); st.searches.push(q);
    if (st.searchFail) return json(r, { success: false, message: 'down' }, 500);
    const items = st.providers.filter((p) => (!q.category || p.capabilities.some((c) => c.category === q.category)) && (!q.verifiedOnly || p.capabilities.some((c) => c.category === q.category && c.status === 'verified')));
    json(r, { success: true, data: { items, total: items.length, page: 1, limit: 12, totalPages: 1 } });
  });
  await page.route(/^https?:\/\/[^/]+\/api\/inspection\/providers\/[^/?]+$/, (r) => { const id = r.request().url().split('/').pop(); json(r, { success: true, data: { ...st.providers.find((p) => p.id === id), contact: { email: 'a@x.co', phone: '0700000000' }, credentials: [], team: { confirmedMembers: 1 } } }); });
  // admin console + governance
  await page.route(/^https?:\/\/[^/]+\/api\/admin\/inspection-governance\/providers(\?.*)?$/, (r) => json(r, { success: true, data: { items: [{ id: 'g1', company_name: 'Quiet Hybrid Works', trading_name: 'Quiet Hybrid Works', lifecycle_stage: st.govStage, county: 'Nairobi', town: 'Karen' }], total: 1, page: 1 } }));
  await page.route(/^https?:\/\/[^/]+\/api\/admin\/inspection-governance\/providers\/g1$/, (r) => json(r, { success: true, data: { provider: { id: 'g1', company_name: 'Quiet Hybrid Works', lifecycle_stage: st.govStage, email: 'q@x.co', has_workshop: false, registration_number: 'CR-77' }, credentials: [{ id: 'c1', title: 'Business registration', verification_status: 'unverified', document_url: 'https://files.example/reg.pdf' }], capabilities: [{ id: 'k1', category_code: 'hybrid_ev', status: 'declared', all_makes: true, powertrains: ['hybrid'], evidence_credential_id: 'c1' }], staff: [], history: [] } }));
  await page.route(/^https?:\/\/[^/]+\/api\/admin\/inspection-governance\/providers\/g1\/decision$/, (r) => {
    const body = JSON.parse(r.request().postData() || '{}'); st.decisions.push(body);
    if (st.refuse) return json(r, { success: false, message: 'The alternative route requires at least two verified pieces of evidence' }, 409);
    st.govStage = body.decision === 'approve' ? 'ACTIVE' : st.govStage; json(r, { success: true, data: { id: 'g1', lifecycle_stage: st.govStage } });
  });
  await page.route(/^https?:\/\/[^/]+\/api\/admin\/(stats|users|cars|audit)/, (r) => json(r, { success: true, data: {}, users: [], cars: [], logs: [], stats: {} }));
}
const fresh = (over = {}) => ({ user: false, role: 'buyer', searches: [], providers: [P('p1', 'Acme Garage'), P('p2', 'Volt Specialists', { capabilities: [{ category: 'hybrid_ev', subcategory: null, status: 'declared', vehicleMakes: 'all', powertrains: ['hybrid'], travelsToCustomer: false, individual: false }] })], decisions: [], govStage: 'UNDER_REVIEW', ...over });
const gotoFinder = async (page) => { await page.goto(BASE + '/?nav=inspection-marketplace', { waitUntil: 'networkidle' }); await page.getByRole('heading', { name: /Find a verified inspector/ }).waitFor({ timeout: 20000 }); await page.waitForLoadState('networkidle'); };
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const open = async (viewport, st, opts = {}) => {
    const ctx = await browser.newContext({ viewport, permissions: opts.geo ? ['geolocation'] : [], geolocation: opts.geo, reducedMotion: 'no-preference' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await install(page, st); return { ctx, page, errors };
  };

  for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 375, height: 800 }]]) {
    // 1. Finder
    { const st = fresh(); const { ctx, page, errors } = await open(vp, st);
      await gotoFinder(page);
      ok(`${label} finder: one h1 and platform notice`, await page.locator('h1').count() === 1 && /independent/.test(await page.getByRole('note').first().innerText()));
      ok(`${label} finder: both businesses listed, no 0.0 rating`, await page.getByText('Acme Garage').isVisible() && await page.getByText('Volt Specialists').isVisible() && !/0\.0/.test(await page.locator('body').innerText()));
      ok(`${label} finder: verified and declared badges differ`, /verified/.test(await page.getByRole('list', { name: 'Services' }).first().innerText()) && /declared/.test(await page.getByRole('list', { name: 'Services' }).nth(1).innerText()));
      ok(`${label} finder: request carried no status/verified/sort`, st.searches.length > 0 && st.searches.every((q) => !('status' in q) && !('verified' in q) && !('sortBy' in q)));
      ok(`${label} finder: no horizontal scroll`, await noHScroll(page));
      // category + symptom
      await Promise.all([page.waitForResponse((r) => /inspection\/providers\?/.test(r.url()) && /category=hybrid_ev/.test(r.url())), page.getByRole('button', { name: /Hybrid and electric vehicles/ }).click()]);
      ok(`${label} hybrid: category sent; declared-only business is shown only because the (mock) server returned it`, st.searches.at(-1).category === 'hybrid_ev');
      await page.getByText(/only businesses whose qualification KAYAD has verified are listed/).waitFor();
      await page.getByRole('button', { name: /All services/ }).click();
      await page.getByLabel('Not sure what is wrong?').selectOption('warning_light');
      ok(`${label} symptom: not a diagnosis`, await page.getByText(/not a diagnosis/i).isVisible());
      // roadside
      await page.getByRole('button', { name: /Roadside assistance and recovery/ }).click();
      await page.getByText(/does not dispatch, track or guarantee roadside help/).waitFor();
      ok(`${label} roadside: no-dispatch notice and emergency numbers`, /999 or 112/.test(await page.getByText(/does not dispatch, track or guarantee roadside help/).locator('..').innerText()));
      ok(`${label} roadside: empty result is explained with a broader search`, await page.getByText(/does not mean no one can help/).isVisible() && await page.getByRole('button', { name: 'Show all services' }).isVisible());
      await page.getByRole('button', { name: 'Show all services' }).click();
      await page.getByText('Acme Garage').waitFor();
      // profile
      await page.getByRole('button', { name: /View business/ }).first().click();
      await page.getByText(/is an independent business/).waitFor();
      ok(`${label} profile: no fake booking button for a non-bookable business`, await page.getByRole('button', { name: 'Continue to booking' }).count() === 0 && await page.getByText(/does not take bookings or payments for this business’s other services yet/).isVisible());
      ok(`${label} profile: no horizontal scroll`, await noHScroll(page));
      ok(`${label} finder: no page errors`, errors.length === 0, errors.join(' | '));
      await ctx.close(); }

    // 2. Location: only on demand
    { const st = fresh(); const { ctx, page } = await open(vp, st, { geo: { latitude: -1.28634, longitude: 36.81712 } });
      await gotoFinder(page);
      ok(`${label} location: nothing sent before consent`, st.searches.every((q) => !('nearLat' in q)));
      await page.getByRole('button', { name: /Vehicle, location and other refinements/ }).click();
      await Promise.all([page.waitForResponse((r) => /nearLat=/.test(r.url())), page.getByRole('button', { name: /Use my location/ }).click()]);
      const q = st.searches.at(-1);
      ok(`${label} location: only an approximate point is sent`, q.nearLat === '-1.29' && q.nearLng === '36.82', JSON.stringify(q));
      await ctx.close(); }
    { const st = fresh(); const { ctx, page } = await open(vp, st); // permission not granted -> denied
      await page.addInitScript(() => { navigator.geolocation.getCurrentPosition = (_ok, err) => err({ code: 1 }); });
      await gotoFinder(page);
      await page.getByRole('button', { name: /Vehicle, location and other refinements/ }).click();
      await page.getByRole('button', { name: /Use my location/ }).click();
      ok(`${label} location: denial falls back to county/town`, await page.getByText(/Enter a county or town instead/).first().isVisible());
      await Promise.all([page.waitForResponse((r) => /county=Nairobi/.test(r.url())), page.getByLabel('County').fill('Nairobi')]);
      ok(`${label} location: manual county works`, st.searches.at(-1).county === 'Nairobi');
      await ctx.close(); }

    // 3. Search failure
    { const st = fresh({ searchFail: true }); const { ctx, page } = await open(vp, st);
      await gotoFinder(page);
      ok(`${label} failure: error with retry, not "no businesses"`, await page.getByRole('button', { name: 'Try again' }).isVisible() && await page.getByText(/No matching businesses/).count() === 0);
      await ctx.close(); }
  }

  // 4. Keyboard / a11y basics on the finder
  { const st = fresh(); const { ctx, page } = await open({ width: 1280, height: 800 }, st);
    await gotoFinder(page);
    const names = await page.evaluate(() => [...document.querySelectorAll('button, a, input, select')].filter((e) => e.offsetParent !== null).filter((e) => !(e.getAttribute('aria-label') || e.innerText || e.getAttribute('placeholder') || (e.id && document.querySelector(`label[for="${e.id}"]`)) || e.closest('label'))).map((e) => e.outerHTML.slice(0, 80)));
    ok('a11y: every visible control has an accessible name', names.length === 0, names.join(' || '));
    const small = await page.evaluate(() => [...document.querySelector('h1').closest('div.min-h-screen').querySelectorAll('button, select, input[type=text], input:not([type])')].filter((e) => e.offsetParent !== null).filter((e) => { const r = e.getBoundingClientRect(); return r.height < 40; }).map((e) => (e.innerText || e.id || e.outerHTML).slice(0, 40)));
    ok('a11y: finder controls are at least 40px tall (site navigation chrome is out of scope for this page)', small.length === 0, small.join(' | '));
    await page.keyboard.press('Tab'); ok('a11y: keyboard focus moves', await page.evaluate(() => document.activeElement && document.activeElement !== document.body));
    await ctx.close(); }

  // 5. Admin governance
  for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 375, height: 800 }]]) {
    { const st = fresh({ user: true, role: 'admin' }); const { ctx, page, errors } = await open(vp, st);
      await page.goto(BASE + '/?nav=admin', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Providers/ }).waitFor({ timeout: 20000 });
      await page.getByRole('button', { name: /Providers/ }).click();
      await page.getByRole('button', { name: /Quiet Hybrid Works/ }).click();
      await page.getByRole('heading', { name: 'Decision' }).waitFor();
      const approve = page.getByRole('button', { name: 'Approve business' });
      ok(`${label} admin: approve is disabled with no written basis`, await approve.isDisabled());
      ok(`${label} admin: document link is a safe https link`, (await page.getByRole('link', { name: /Open submitted document/ }).getAttribute('href')) === 'https://files.example/reg.pdf');
      await page.getByLabel(/What you checked/).fill('Registry extract and two documents sighted');
      await page.getByLabel('Verification route').selectOption('alternative');
      st.refuse = true; await approve.click();
      await page.getByText(/at least two verified pieces of evidence/).waitFor();
      ok(`${label} admin: server refusal is shown and stage did not change`, st.govStage === 'UNDER_REVIEW' && st.decisions.length === 1);
      st.refuse = false; await approve.click();
      await page.getByText('Business approved.').waitFor();
      ok(`${label} admin: approval posts the chosen route and notes`, st.decisions.at(-1).decision === 'approve' && st.decisions.at(-1).route === 'alternative' && /Registry extract/.test(st.decisions.at(-1).notes));
      ok(`${label} admin: no horizontal scroll`, await noHScroll(page));
      ok(`${label} admin: no page errors`, errors.length === 0, errors.join(' | '));
      await ctx.close(); }
  }

  // 6. Non-admin cannot open the console
  { const st = fresh({ user: true, role: 'buyer' }); const { ctx, page } = await open({ width: 1280, height: 800 }, st);
    await page.goto(BASE + '/?nav=admin', { waitUntil: 'networkidle' });
    ok('non-admin: admin governance is not rendered', await page.locator('[data-testid="admin-provider-governance"]').count() === 0);
    await ctx.close(); }

  // 7. Automotive services hub and navigation (UX convergence)
  for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 375, height: 800 }]]) {
    { const st = fresh(); const { ctx, page, errors } = await open(vp, st);
      await page.goto(BASE + '/?nav=inspections', { waitUntil: 'networkidle' });
      await page.getByRole('heading', { level: 1, name: /Find the right independent expert/ }).waitFor({ timeout: 20000 });
      const body = await page.locator('main, body').first().innerText();
      ok(`${label} hub: states KAYAD is the platform and providers perform the work`, /KAYAD is the platform/.test(body) && /They carry out the work, not KAYAD/.test(body));
      ok(`${label} hub: no "KAYAD vehicle inspection" wording`, !/KAYAD vehicle inspection|Request a KAYAD inspection/.test(body));
      ok(`${label} hub: repair/roadside limits are stated`, /does not take repair bookings, take payments for them or dispatch roadside help/.test(body));
      ok(`${label} hub: no horizontal scroll`, await noHScroll(page));
      const h = await page.locator('#insp-panel').getByRole('button', { name: /Choose a provider/ }).evaluate((el) => el.getBoundingClientRect().height);
      ok(`${label} hub: lane actions are at least 44px tall`, h >= 44, String(h));
      await Promise.all([page.waitForResponse((r) => /inspection\/providers\?/.test(r.url()) && /category=roadside_recovery/.test(r.url())), page.locator('#insp-panel').getByRole('button', { name: /Roadside and recovery/ }).click()]);
      await page.getByText(/does not dispatch, track or guarantee roadside help/).waitFor();
      ok(`${label} hub -> roadside: finder opens on the roadside category with the no-dispatch notice`, st.searches.at(-1).category === 'roadside_recovery');
      await page.goto(BASE + '/?nav=inspections', { waitUntil: 'networkidle' });
      await Promise.all([page.waitForResponse((r) => /inspection\/providers\?/.test(r.url()) && /category=pre_purchase_inspection/.test(r.url())), page.locator('#insp-panel').getByRole('button', { name: /Choose a provider/ }).click()]);
      ok(`${label} hub -> choose a provider: finder opens on pre-purchase inspection`, st.searches.at(-1).category === 'pre_purchase_inspection');
      await page.goto(BASE + '/?nav=inspections', { waitUntil: 'networkidle' });
      await page.locator('#insp-panel').getByRole('button', { name: /Get matched|Sign in to get matched/ }).first().click();
      ok(`${label} hub: a guest asked to get matched is sent to sign in, not to a form`, await page.getByRole('dialog', { name: /Get matched with an inspector/ }).count() === 0);
      ok(`${label} hub: no page errors`, errors.length === 0, errors.join(' | '));
      await ctx.close(); }
  }
  { const st = fresh(); const { ctx, page } = await open({ width: 1440, height: 900 }, st);
    await page.goto(BASE + '/?nav=marketplace', { waitUntil: 'networkidle' });
    const primary = page.getByRole('navigation', { name: 'Primary' });
    ok('desktop nav: the entry is "Auto Services", not "Pre-Purchase Inspection"', await primary.getByText('Auto Services').first().isVisible() && await primary.getByText('Pre-Purchase Inspection').count() === 0);
    await primary.getByRole('button', { name: /Auto Services|Open .*Auto Services|Auto Services menu/ }).first().click().catch(async () => { await primary.getByText('Auto Services').first().hover(); });
    ok('desktop nav: dropdown lists inspect, find, roadside (and hides signed-in "My requests" from a guest)', await page.getByText('Inspect a car before you buy').first().isVisible() && await page.getByText('Find a mechanic or garage').first().isVisible() && await page.getByText('Roadside and recovery').first().isVisible() && await page.getByText('My requests and reports').count() === 0);
    await Promise.all([page.waitForResponse((r) => /inspection\/providers\?/.test(r.url()) && /category=roadside_recovery/.test(r.url())), page.getByRole('link', { name: /Roadside and recovery/ }).first().click()]);
    ok('desktop nav: "Roadside and recovery" opens the finder on that category', st.searches.at(-1).category === 'roadside_recovery');
    await ctx.close(); }

  await browser.close();
  console.log(out.join('\n')); console.log(`\n${out.length - fails}/${out.length} passed`);
  process.exit(fails ? 1 : 0);
})();
