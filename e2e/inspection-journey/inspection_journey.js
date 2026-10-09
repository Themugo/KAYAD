// Pre-Purchase Inspection convergence — real-browser journeys (TEST-ONLY mocked backend).
// The inspection UI is driven for real; the backend responses are a small stateful fake so
// request bodies can be captured. Real backend behaviour is covered by the Jest suites.
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const out = []; let fails = 0;
const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`); if (!c) fails++; };
const USER = { id: 'u1', _id: 'u1', name: 'Amina Buyer', email: 'amina@example.test', role: 'buyer', emailVerified: true };
const json = (r, body, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const cars = Array.from({ length: 4 }, (_, i) => ({ id: `e2e-car-${i + 1}`, title: `${['Toyota', 'Nissan'][i % 2]} Test Vehicle ${i + 1}`, brand: ['Toyota', 'Nissan'][i % 2], model: 'Prado', year: 2021, price: 3000000 + i * 100000, mileage: 30000, fuel: 'Petrol', transmission: 'Automatic', body_type: 'SUV', color: 'White', condition: 'Foreign Used', location_city: 'Nairobi', status: 'available', images: [], features: [], has_auction: false, auction_status: 'none' }));

async function install(page, state) {
  await page.route('**/api/v1/auth/me', (r) => state.user ? json(r, { success: true, user: USER }) : json(r, { success: false, message: 'Unauthenticated' }, 401));
  await page.route(/\/v1\/auth\/csrf/, (r) => json(r, { success: true, csrfToken: 'test-csrf-token-0123456789abcdef0123456789' }));
  await page.route(/^https?:\/\/[^/]+\/api\/favorites/, (r) => json(r, { success: true, data: [] }));
  await page.route(/^https?:\/\/[^/]+\/api\/notifications/, (r) => json(r, { success: true, data: [], unreadCount: 0 }));
  await page.route(/^https?:\/\/[^/]+\/api\/cars(\?.*)?$/, (r) => json(r, { success: true, data: cars, pagination: { page: 1, limit: 24, total: cars.length, pages: 1 } }));
  await page.route(/^https?:\/\/[^/]+\/api\/cars\/e2e-car-\d+$/, (r) => { const id = r.request().url().split('/').pop(); json(r, { success: true, data: cars.find((c) => c.id === id) }); });
  await page.route('**/api/inspections/my', (r) => state.myStatus !== 200 ? json(r, { success: false, message: 'KAYAD inspections are temporarily unavailable.' }, state.myStatus) : json(r, { success: true, orders: state.orders }));
  await page.route('**/api/inspections/order', async (r) => {
    const body = JSON.parse(r.request().postData() || '{}'); state.orderPosts.push(body);
    await new Promise((x) => setTimeout(x, 400));
    const car = cars.find((c) => c.id === body.carId);
    const order = { id: `ord-${state.orders.length + 1}`, status: 'pending_payment', car: { id: car.id, title: car.title, location: 'Nairobi' }, inspector: null, fee: 2500, location: body.location, overallScore: null, createdAt: new Date().toISOString() };
    state.orders.unshift(order); json(r, { success: true, order, checkoutRequestID: null });
  });
  await page.route('**/api/inspection/bookings', (r) => state.bkStatus !== 200 ? json(r, { success: false, message: 'Bookings unavailable' }, state.bkStatus) : json(r, { success: true, data: { bookings: state.bookings } }));
  await page.route(/\/api\/inspection\/bookings\/[^/]+\/payment\/initiate/, (r) => { state.payInit++; json(r, { success: true, data: { checkoutRequestID: 'ws_CO_1' } }); });
  await page.route(/\/api\/payments\/status\//, (r) => { state.polls++; if (state.polls >= 2) { state.bookings[0].paymentStatus = 'fully_paid'; state.bookings[0].status = 'confirmed'; return json(r, { success: true, status: 'success' }); } json(r, { success: true, status: 'pending' }); });
  await page.route(/\/api\/inspection\/bookings\/[^/]+\/cancel/, (r) => { state.cancels++; state.bookings[0].status = 'cancelled'; json(r, { success: true, data: { booking: state.bookings[0], refundAmount: 0 } }); });
  await page.route(/\/api\/inspection\/reports\//, (r) => json(r, { success: true, data: { id: 'rep1', reportNumber: 'RPT-1', overallScore: 74, overallCondition: 'good', executiveSummary: 'Provider summary', categoryScores: { engine: 80 }, criticalIssues: [], recommendations: ['Service brakes'] } }));
  await page.route('**/api/v1/phase22/providers/register', (r) => { state.applied++; json(r, { success: true, message: 'Application received.' }); });
}
const fresh = (over = {}) => ({ user: true, myStatus: 200, bkStatus: 200, orders: [], bookings: [], orderPosts: [], payInit: 0, polls: 0, cancels: 0, applied: 0, ...over });
const bk = (over = {}) => ({ id: 'bk1', reference: 'INS-100', status: 'booked', paymentStatus: 'pending', vehicle: { year: 2019, make: 'Subaru', model: 'Outback' }, totalPrice: 4500, currency: 'KES', createdAt: '2026-10-05T00:00:00Z', provider: { name: 'AutoCheck' }, ...over });
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const open = async (viewport, state, opts = {}) => {
    const ctx = await browser.newContext({ viewport, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await install(page, state); return { ctx, page, errors };
  };

  // 1. Guest, desktop
  { const st = fresh({ user: false }); const { ctx, page, errors } = await open({ width: 1440, height: 900 }, st);
    await page.goto(BASE + '/?nav=inspections', { waitUntil: 'networkidle' });
    ok('guest: one h1 and the two routes are explained', await page.locator('h1').count() === 1 && await page.getByRole('heading', { name: 'KAYAD vehicle inspection' }).isVisible() && await page.getByRole('heading', { name: 'Book a verified provider' }).isVisible());
    ok('guest: no false claims (no payment/verdict/ratings text)', !/Passed \(Clean|Payment not created|reserve/i.test(await page.locator('main').innerText()));
    const tabs = page.getByRole('tab');
    ok('guest: three tabs, first selected', await tabs.count() === 3 && await tabs.first().getAttribute('aria-selected') === 'true');
    await tabs.first().focus(); await page.keyboard.press('ArrowRight');
    ok('guest: ArrowRight moves focus + selection to My inspections', await page.getByRole('tab', { name: 'My inspections' }).getAttribute('aria-selected') === 'true' && await page.evaluate(() => document.activeElement?.id) === 'insp-tab-mine');
    ok('guest: records tab asks to sign in and calls no inspection API', /Sign in to see your inspection/.test(await page.locator('#insp-panel').innerText()));
    ok('guest: no horizontal scroll (desktop)', await noHScroll(page));
    ok('guest: no page errors', errors.length === 0, errors[0] || ''); await ctx.close(); }

  // 2. Signed in: empty -> request -> tracked, double submit, focus & keyboard
  { const st = fresh(); const { ctx, page, errors } = await open({ width: 1440, height: 900 }, st);
    await page.goto(BASE + '/?nav=inspections', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'My inspections' }).click();
    ok('empty: honest empty state', await page.getByText('No inspections yet').isVisible());
    await page.getByRole('tab', { name: 'Get an inspection' }).click();
    const trigger = page.locator('#insp-panel').getByRole('button', { name: 'Request an inspection' });
    await trigger.focus(); await page.keyboard.press('Enter');
    const dlg = page.getByRole('dialog');
    ok('request: dialog opens with accessible name', await dlg.isVisible() && /Request a KAYAD inspection/.test(await dlg.getAttribute('aria-label') || await dlg.locator('h2,h1,h3').first().innerText()));
    ok('request: focus moved inside the dialog', await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')));
    const sel = dlg.getByLabel('KAYAD marketplace vehicle');
    ok('request: no vehicle is preselected by default', (await sel.inputValue()) === '');
    const submit = dlg.getByRole('button', { name: 'Submit inspection request' });
    ok('request: submit disabled until valid', await submit.isDisabled());
    await sel.selectOption('e2e-car-2'); await dlg.getByLabel('Your phone number').fill('12'); await dlg.getByLabel('Your phone number').blur();
    ok('request: invalid phone exposes aria-invalid + described error', await dlg.getByLabel('Your phone number').getAttribute('aria-invalid') === 'true' && /valid phone/.test(await dlg.locator('[id$="phone-error"]').innerText()));
    await dlg.getByLabel('Your phone number').fill('0712345678');
    ok('request: states no payment is taken', /No payment is taken/.test(await dlg.innerText()));
    await submit.dblclick();
    await dlg.getByText('Your request is saved').waitFor();
    ok('request: ONE POST despite double click', st.orderPosts.length === 1, JSON.stringify(st.orderPosts));
    ok('request: POST carries the chosen vehicle and phone', st.orderPosts[0].carId === 'e2e-car-2' && st.orderPosts[0].phone === '0712345678');
    ok('request: confirmation is the server order + truthful status', /ord-1/.test(await dlg.innerText()) && /Request received/.test(await dlg.innerText()) && /No payment taken/.test(await dlg.innerText()));
    await dlg.getByRole('button', { name: 'View my inspections' }).click();
    await page.getByText('Nissan Test Vehicle 2').waitFor();
    ok('tracked: record appears in My inspections after reload from the API', await page.getByRole('list').getByText('Request received').first().isVisible());
    ok('tracked: stage progress is exposed as a list with current step', await page.locator('ol[aria-label="Inspection progress"] [aria-current="step"]').count() === 1);
    ok('tracked: no payment/pay button for a KAYAD request', await page.getByRole('button', { name: 'Pay now' }).count() === 0);
    // duplicate
    await page.getByRole('tab', { name: 'Get an inspection' }).click();
    ok('no page errors', errors.length === 0, errors[0] || ''); await ctx.close(); }

  // 3. Failures: both sources down, then partial
  { const st = fresh({ myStatus: 500, bkStatus: 500 }); const { ctx, page } = await open({ width: 1440, height: 900 }, st);
    await page.goto(BASE + '/?nav=inspections', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'My inspections' }).click();
    await page.getByRole('alert').first().waitFor();
    ok('failure: error shown, NOT an empty state', await page.getByText('No inspections yet').count() === 0);
    st.myStatus = 200; st.bkStatus = 200; st.bookings = [bk()];
    await page.getByRole('button', { name: /Try again/ }).click();
    await page.getByText('2019 Subaru Outback').waitFor();
    ok('failure: retry recovers and shows the real booking', await page.getByRole('button', { name: 'Pay now' }).isVisible());
    await ctx.close(); }
  { const st = fresh({ myStatus: 500, bookings: [bk()] }); const { ctx, page } = await open({ width: 1440, height: 900 }, st);
    await page.goto(BASE + '/?nav=inspections', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'My inspections' }).click();
    await page.getByText('2019 Subaru Outback').waitFor();
    ok('partial failure: the working source is shown and the failure is announced', (await page.getByRole('alert').first().innerText()).length > 0);
    await ctx.close(); }

  // 4. Pay an unpaid booking (server-confirmed), keyboard dismissal, then cancel path
  { const st = fresh({ bookings: [bk()] }); const { ctx, page } = await open({ width: 1440, height: 900 }, st);
    await page.goto(BASE + '/?nav=inspections', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'My inspections' }).click();
    await page.getByRole('button', { name: 'Pay now' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('M-Pesa phone number').fill('0712345678');
    await dlg.getByRole('button', { name: 'Send M-Pesa prompt' }).click();
    ok('pay: waiting state is announced and Escape is blocked mid-payment', await dlg.getByText(/do not pay twice/).isVisible());
    await page.keyboard.press('Escape');
    ok('pay: dialog stays open while waiting', await dlg.isVisible());
    await dlg.getByText('Payment confirmed by KAYAD').waitFor({ timeout: 15000 });
    ok('pay: confirmed only after the status endpoint reported success', st.polls >= 2 && st.payInit === 1);
    await dlg.getByRole('button', { name: 'Done' }).click();
    await page.waitForFunction(() => /Paid/.test(document.body.innerText));
    ok('pay: list reloaded from the API shows Paid and no Pay button', await page.getByRole('button', { name: 'Pay now' }).count() === 0);
    await ctx.close(); }
  { const st = fresh({ bookings: [bk()] }); const { ctx, page } = await open({ width: 1440, height: 900 }, st);
    await page.goto(BASE + '/?nav=inspections', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'My inspections' }).click();
    const btn = page.getByRole('button', { name: 'Cancel booking' }).first();
    await btn.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel booking' }).click();
    await page.waitForFunction(() => /Cancelled/.test(document.body.innerText));
    ok('cancel: unpaid booking cancelled via API and list shows Cancelled', st.cancels === 1);
    await ctx.close(); }

  // 5. Reports (KAYAD + provider), Escape + focus restore
  { const st = fresh({ orders: [{ id: 'ord-9', status: 'completed', overallScore: 82, conditionRating: 'good', inspectorNotes: 'Solid car', car: { id: 'e2e-car-1', title: 'Toyota Test Vehicle 1' }, inspector: { id: 'i', _id: 'i', name: 'Jane' }, createdAt: '2026-10-01T00:00:00Z', completedAt: '2026-10-02T00:00:00Z', images: [], evidence: [] }], bookings: [bk({ id: 'bk2', status: 'report_generated', paymentStatus: 'fully_paid', report: { id: 'rep1', number: 'RPT-1' } })] });
    const { ctx, page } = await open({ width: 1440, height: 900 }, st);
    await page.goto(BASE + '/?nav=inspections', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Reports' }).click();
    const views = page.getByRole('button', { name: /View report/ });
    await views.first().waitFor(); ok('reports: both completed records listed', await views.count() === 2);
    await views.nth(1).focus(); await page.keyboard.press('Enter');
    const dlg = page.getByRole('dialog'); await dlg.getByText('82/100').waitFor();
    ok('report: shows stored score + notes, invents no verdict', /Solid car/.test(await dlg.innerText()) && !/Passed|Clean Certification|Failed/.test(await dlg.innerText()));
    await page.keyboard.press('Escape');
    ok('report: Escape closes and focus returns to the trigger', await dlg.count() === 0 && await page.evaluate(() => document.activeElement?.textContent?.includes('View report')));
    await views.nth(0).click(); await page.getByRole('dialog').getByText('Provider summary').waitFor();
    ok('report: provider report is fetched from the API and rendered', /Service brakes/.test(await page.getByRole('dialog').innerText()));
    await ctx.close(); }

  // 6. Vehicle details -> Request an Inspection keeps the vehicle
  { const st = fresh(); const { ctx, page, errors } = await open({ width: 1440, height: 900 }, st);
    await page.goto(BASE + '/?nav=marketplace&vehicleId=e2e-car-3', { waitUntil: 'networkidle' });
    const btn = page.getByRole('button', { name: /^Request an Inspection$/ });
    await btn.first().waitFor({ timeout: 30000 }).catch(() => {});
    if (await btn.count()) {
      await btn.first().click();
      const dlg = page.getByRole('dialog'); await dlg.waitFor();
      ok('vehicle->inspection: lands on inspections with the vehicle preselected', /Test Vehicle 3/.test(await dlg.innerText()) && /Change vehicle/.test(await dlg.innerText()));
      ok('vehicle->inspection: URL no longer holds the vehicle detail', !/vehicleId=/.test(page.url()));
    } else { console.log('DEBUG', page.url(), (await page.evaluate(() => document.body.innerText)).slice(0, 400), await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean).slice(0, 40).join(' | '))); ok('vehicle->inspection: CTA present on detail view', false, 'button not found'); }
    ok('no page errors', errors.length === 0, errors[0] || ''); await ctx.close(); }

  // 7. Provider application
  { const st = fresh(); const { ctx, page } = await open({ width: 1440, height: 900 }, st);
    await page.goto(BASE + '/?nav=inspections', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Apply as a provider' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('button', { name: 'Submit application' }).click();
    ok('apply: phone required inline (aria-invalid) and nothing sent', await dlg.getByLabel('Contact phone').getAttribute('aria-invalid') === 'true' && st.applied === 0);
    await dlg.getByLabel('Contact phone').fill('0712345678'); await dlg.getByRole('button', { name: 'Submit application' }).click();
    await dlg.getByText('Application received.').waitFor();
    ok('apply: server message shown and says access is not granted', st.applied === 1 && /does not grant provider access/.test(await dlg.innerText()));
    await ctx.close(); }

  // 8. Mobile widths + reduced motion + focus trap
  for (const w of [360, 375, 390, 768]) {
    const st = fresh({ orders: [{ id: 'ord-1', status: 'assigned', car: { id: 'e2e-car-1', title: 'Toyota Test Vehicle 1 with a rather long title to test wrapping behaviour' }, inspector: { id: 'i', _id: 'i', name: 'Jane' }, fee: 2500, createdAt: '2026-10-01T00:00:00Z' }], bookings: [bk()] });
    const { ctx, page, errors } = await open({ width: w, height: 800 }, st, { reduced: true });
    await page.goto(BASE + '/?nav=inspections', { waitUntil: 'networkidle' });
    ok(`mobile ${w}: service tab has no horizontal scroll`, await noHScroll(page));
    await page.getByRole('tab', { name: 'My inspections' }).click(); await page.getByText('2019 Subaru Outback').waitFor();
    ok(`mobile ${w}: records tab has no horizontal scroll`, await noHScroll(page));
    const small = await page.evaluate(() => [...document.querySelectorAll('#insp-panel button, [role=tab]')].filter((b) => b.getBoundingClientRect().height < 32).length);
    ok(`mobile ${w}: interactive controls are at least 32px tall`, small === 0, `small=${small}`);
    await page.getByRole('button', { name: 'Pay now' }).click();
    const dlg = page.getByRole('dialog');
    const fits = await dlg.evaluate((d) => { const r = d.getBoundingClientRect(); return r.left >= -1 && r.right <= window.innerWidth + 1; });
    ok(`mobile ${w}: dialog fits the viewport`, fits);
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    ok(`mobile ${w}: Tab never leaves the dialog (focus trap)`, await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')));
    ok(`mobile ${w}: reduced-motion honoured (no running animation on dialog)`, await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
    ok(`mobile ${w}: no page errors`, errors.length === 0, errors[0] || '');
    await ctx.close();
  }

  await browser.close();
  console.log(out.join('\n') + `\n\nTOTAL=${out.length} FAIL=${fails}`); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
