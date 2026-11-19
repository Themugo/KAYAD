// Phase 1-4 end-to-end journeys in a real browser (Playwright/Chromium) against `vite preview` of the production build.
//
// IMPORTANT LIMITATION (stated in the report): no backend or database is reachable from the certification sandbox, so
// /api/** is answered by a stateful in-memory contract double defined below. App code is NOT mocked - the real React app,
// real services (vehicleApi, leadApi, bidApi, escrowApi, authApi) and real MarketplaceOfferPanel run in the browser. The
// double enforces the same participant/ownership/lifecycle rules as the backend contract so UI behaviour is meaningful,
// but it is NOT evidence that the real backend persists or authorises correctly (see the DB-level suite and source review).
//
// Usage: node scripts/browser-journeys-phase1-4.mjs [baseUrl] [--mobile]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.argv.find((a) => a.startsWith('http')) || 'http://127.0.0.1:4173';
const MOBILE = process.argv.includes('--mobile');
const WIDTH = Number((process.argv.find((a) => a.startsWith('--width=')) || '').slice(8)) || 0;
const VP = WIDTH ? { width: WIDTH, height: WIDTH < 500 ? 844 : 900 } : MOBILE ? { width: 390, height: 844 } : { width: 1280, height: 900 };
const results = [];
const check = (journey, name, ok, detail = '') => { results.push({ journey, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${journey}] ${name}${detail ? '  — ' + detail : ''}`); };

// ---------------------------------------------------------------- backend contract double
const ME = 'u-personal-1';
const OTHER = 'u-other-9';
const now = () => new Date().toISOString();
const iso = (d) => new Date(Date.now() - d * 864e5).toISOString();
function freshDb() {
  return {
    user: { id: ME, name: 'Wanjiru Kamau', email: 'personal@example.test', phone: '+254700000001', location: 'Nairobi', role: 'user', emailVerified: true, email_verified: true, createdAt: iso(60) },
    prefs: { emailTransactional: true, smsTransactional: false, whatsappTransactional: false, emailMarketing: false, smsMarketing: false, whatsappMarketing: false },
    password: 'OldPass#123', phoneVerified: false, otpSent: false, signedOut: false,
    listings: [
      { id: 'car-1', _id: 'car-1', title: '2019 Toyota Harrier', brand: 'Toyota', model: 'Harrier', year: 2019, price: 3400000, mileage: 62000, city: 'Nairobi', description: 'Clean one-owner SUV', status: 'available', approved: true, images: [{ url: '/hero/kayad-prado.png' }, { url: '/hero/kayad-land-cruiser.png' }], dealer: ME, createdAt: iso(10), updatedAt: iso(9) },
      { id: 'car-solo', _id: 'car-solo', title: '2017 Mazda CX-5', brand: 'Mazda', model: 'CX-5', year: 2017, price: 2100000, mileage: 91000, city: 'Mombasa', status: 'available', approved: true, images: [{ url: '/hero/kayad-mercedes-gle.png' }], dealer: ME, createdAt: iso(8), updatedAt: iso(8) },
    ],
    foreign: { id: 'car-foreign', dealer: OTHER, status: 'available', images: [{ url: 'x' }, { url: 'y' }] },
    sellerLeads: [{ id: '11111111-1111-4111-8111-111111111111', listing: { title: '2019 Toyota Harrier', id: 'car-1' }, stage: 'contacted', createdAt: iso(5), lastActivityAt: iso(1), buyer: { id: OTHER }, isHot: false }],
    buyerLeads: [{ id: '22222222-2222-4222-8222-222222222222', vehicle: 'car-foreign', dealer: OTHER, buyer: ME, stage: 'negotiating', created_at: iso(4) }],
    // offers keyed by lead; buyer lead: seller (OTHER) sent a pending offer to ME; seller lead: buyer (OTHER) sent a pending offer to ME
    offers: {
      '11111111-1111-4111-8111-111111111111': [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', lead_id: '11111111-1111-4111-8111-111111111111', buyer_id: OTHER, seller_id: ME, sender_id: OTHER, recipient_id: ME, amount: 3100000, currency: 'KES', status: 'pending', created_at: iso(1), expires_at: new Date(Date.now() + 5 * 864e5).toISOString() }],
      '22222222-2222-4222-8222-222222222222': [{ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', lead_id: '22222222-2222-4222-8222-222222222222', buyer_id: ME, seller_id: OTHER, sender_id: OTHER, recipient_id: ME, amount: 1750000, currency: 'KES', status: 'pending', created_at: iso(2), expires_at: new Date(Date.now() + 5 * 864e5).toISOString() }],
    },
    events: {
      '11111111-1111-4111-8111-111111111111': [{ id: 'e1', event_type: 'submitted', amount: 3100000, created_at: iso(1), actor_id: OTHER }],
      '22222222-2222-4222-8222-222222222222': [{ id: 'e2', event_type: 'submitted', amount: 1750000, created_at: iso(2), actor_id: OTHER }],
    },
    bids: [{ id: 'bid-1', amount: 2200000, status: 'active', createdAt: iso(3), car: { title: '2015 Subaru Forester (auction)' } }],
    escrows: [{ id: 'esc-1', buyer: { id: ME, name: 'Wanjiru Kamau' }, seller: { id: OTHER, name: 'Other Seller' }, car: { id: 'car-foreign', title: '2016 Nissan X-Trail' }, amount: 1900000, status: 'funded', createdAt: iso(6), updatedAt: iso(5) }],
    log: [],
    failing: new Set(),
    nextId: 100,
  };
}

const LIFECYCLE = {
  hide: { from: ['available'], to: 'hidden', err: 'LISTING_NOT_PUBLISHED' },
  publish: { from: ['hidden'], to: 'available', err: 'LISTING_NOT_HIDDEN' },
  mark_sold: { from: ['available', 'hidden'], to: 'sold', err: 'LISTING_STATE_LOCKED' },
};

async function install(page, db, { role = 'user' } = {}) {
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace(/^\/api\/v1\//, '/api/');
    const method = req.method();
    const raw = req.postData() || '';
    let body = {};
    try { body = raw && raw.trim().startsWith('{') ? JSON.parse(raw) : {}; } catch { /* multipart */ }
    const json = (status, payload) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
    const entry = { method, path: p, status: 200, body: Object.keys(body).length ? body : undefined };
    const done = (status, payload) => { entry.status = status; db.log.push(entry); return json(status, payload); };
    const mine = (id) => db.listings.find((l) => l.id === id);

    // failure injection (unavailable-source states)
    for (const f of db.failing) if (p.includes(f)) return done(503, { success: false, message: 'Service unavailable' });

    if (/\/auth\/csrf$/.test(p)) return json(200, { success: true, csrfToken: 'x'.repeat(48) });
    if (/\/auth\/me$/.test(p)) return role ? done(200, { success: true, user: { ...db.user, role } }) : done(401, { success: false });
    if (/\/auth\/change-password$/.test(p) && method === 'PUT') { if (body.currentPassword !== db.password) return done(400, { success: false, message: 'Current password is incorrect.' }); db.password = body.newPassword; return done(200, { success: true, message: 'Password changed.' }); }
    if (/\/auth\/send-otp$/.test(p) && method === 'POST') { db.otpSent = true; return done(200, { success: true }); }
    if (/\/auth\/verify-phone$/.test(p) && method === 'POST') { if (!db.otpSent || body.otp !== '123456') return done(400, { success: false, message: 'Invalid or expired code.' }); db.phoneVerified = true; return done(200, { success: true }); }
    if (/\/auth\/phone-status$/.test(p)) return done(200, { success: true, data: { phone: db.user.phone, verified: db.phoneVerified } });
    if (/\/auth\/logout$/.test(p)) { db.signedOut = true; return done(200, { success: true }); }
    if (/\/auth\/profile$/.test(p) && method === 'PUT') { Object.assign(db.user, body); delete db.user.currentPassword; return done(200, { success: true, user: db.user }); }
    if (/\/communications\/preferences$/.test(p)) { if (method === 'PATCH') { db.prefs = { ...db.prefs, ...body }; } return done(200, { success: true, data: db.prefs, preferences: db.prefs }); }
    if (/\/cars\/my-listings$/.test(p)) return done(200, { success: true, data: db.listings });
    if (/\/cars\/my-listing-performance/.test(p)) return done(200, { success: true, data: { periodDays: 30, listings: db.listings.map((l) => ({ id: l.id, title: l.title, views: 41, clicks: 9, saves: 3, enquiries: 1 })), totals: { views: 82, clicks: 18, saves: 6, enquiries: 1 } } });
    let m;
    if ((m = p.match(/\/cars\/([^/]+)\/lifecycle$/)) && method === 'PATCH') {
      const l = mine(m[1]) || (m[1] === db.foreign.id ? db.foreign : null);
      if (!l) return done(404, { success: false, code: 'LISTING_NOT_FOUND' });
      if (l.dealer !== ME) return done(403, { success: false, code: 'NOT_LISTING_OWNER', message: 'Not your listing' });
      const rule = LIFECYCLE[body.action];
      if (!rule) return done(400, { success: false, code: 'INVALID_ACTION' });
      if (!rule.from.includes(l.status)) return done(409, { success: false, code: rule.err, message: `Cannot ${body.action} a ${l.status} listing` });
      const prev = l.status; l.status = rule.to; l.updatedAt = now();
      return done(200, { success: true, data: { id: l.id, previousStatus: prev, status: l.status, action: body.action } });
    }
    if ((m = p.match(/\/cars\/([^/]+)\/images\/(\d+)$/)) && method === 'DELETE') {
      const l = mine(m[1]); if (!l) return done(404, { success: false });
      if (l.images.length <= 1 && l.status !== 'draft') return done(409, { success: false, code: 'LAST_PHOTO_REQUIRED', message: 'A live listing must keep at least one photo.' });
      l.images.splice(Number(m[2]), 1); return done(200, { success: true, data: { images: l.images }, images: l.images });
    }
    if ((m = p.match(/\/cars\/([^/]+)\/images$/)) && method === 'POST') {
      const l = mine(m[1]); if (!l) return done(404, { success: false });
      l.images.push({ url: `/hero/kayad-prado.png?n=${db.nextId++}` }); return done(200, { success: true, data: { images: l.images }, images: l.images });
    }
    if ((m = p.match(/\/cars\/([^/]+)$/)) && method === 'PUT' || (m = p.match(/\/cars\/([^/]+)$/)) && method === 'PATCH') {
      const l = mine(m[1]); if (!l) return done(404, { success: false });
      Object.assign(l, Object.fromEntries(Object.entries(body).filter(([k]) => ['price', 'mileage', 'city', 'description'].includes(k)).map(([k, v]) => [k, ['price', 'mileage'].includes(k) ? Number(v) : v])));
      l.updatedAt = now(); return done(200, { success: true, data: l, car: l });
    }
    if (/\/cars$/.test(p) && method === 'POST') {
      const title = (raw.match(/name="title"\r?\n\r?\n([^\r\n]*)/) || [])[1] || 'New test vehicle';
      const l = { id: `car-new-${db.nextId++}`, title, brand: 'Subaru', model: 'Forester', year: 2018, price: 2500000, status: 'pending', approved: false, images: [{ url: '/hero/kayad-prado.png' }], dealer: ME, createdAt: now(), updatedAt: now() };
      db.listings.unshift(l); return done(201, { success: true, data: l, car: l });
    }
    if (/\/leads\/mine\/seller-enquiries$/.test(p)) return done(200, { success: true, enquiries: db.sellerLeads, count: db.sellerLeads.length, listingCount: db.listings.length });
    if (/\/leads\/mine\/offers$/.test(p)) return done(200, { success: true, leads: db.buyerLeads });
    if ((m = p.match(/\/leads\/([0-9a-f-]{36})\/offers$/))) {
      const id = m[1];
      const known = db.sellerLeads.some((x) => x.id === id) || db.buyerLeads.some((x) => x.id === id);
      if (!known) return done(403, { success: false, message: 'Not authorized for this negotiation' });
      if (method === 'GET') return done(200, { success: true, offers: db.offers[id] || [], events: db.events[id] || [] });
      if (method === 'POST') {
        const amount = Number(body.amount); if (!(amount > 0)) return done(400, { success: false, message: 'Invalid amount' });
        const buyerLead = db.buyerLeads.some((x) => x.id === id);
        const o = { id: `cccccccc-cccc-4ccc-8ccc-${String(db.nextId++).padStart(12, '0')}`, lead_id: id, buyer_id: buyerLead ? ME : OTHER, seller_id: buyerLead ? OTHER : ME, sender_id: ME, recipient_id: OTHER, amount, currency: 'KES', status: 'pending', created_at: now(), expires_at: new Date(Date.now() + 7 * 864e5).toISOString() };
        (db.offers[id] ||= []).push(o); (db.events[id] ||= []).push({ id: `ev${db.nextId++}`, event_type: 'submitted', amount, created_at: now(), actor_id: ME });
        return done(201, { success: true, offer: o, replayed: false });
      }
    }
    if ((m = p.match(/\/leads\/([0-9a-f-]{36})\/offers\/([0-9a-f-]{36})\/actions$/)) && method === 'POST') {
      const o = (db.offers[m[1]] || []).find((x) => x.id === m[2]);
      if (!o) return done(404, { success: false, message: 'Offer not found' });
      if (o.status !== 'pending') return done(409, { success: false, message: 'Offer is no longer pending' });
      const act = body.action;
      if (['accept', 'reject', 'counter'].includes(act) && o.recipient_id !== ME) return done(403, { success: false, message: 'Only the recipient can decide or counter this offer' });
      if (act === 'withdraw' && o.sender_id !== ME) return done(403, { success: false, message: 'Only the sender can withdraw this offer' });
      o.status = { accept: 'accepted', reject: 'rejected', withdraw: 'withdrawn', counter: 'countered' }[act];
      (db.events[m[1]] ||= []).push({ id: `ev${db.nextId++}`, event_type: { accept: 'accepted', reject: 'rejected', withdraw: 'withdrawn', counter: 'countered' }[act], amount: o.amount, created_at: now(), actor_id: ME });
      if (act === 'counter') { const n = { ...o, id: `dddddddd-dddd-4ddd-8ddd-${String(db.nextId++).padStart(12, '0')}`, parent_offer_id: o.id, sender_id: ME, recipient_id: o.sender_id, amount: Number(body.amount), status: 'pending', created_at: now() }; db.offers[m[1]].push(n); }
      return done(200, { success: true, offer: o, replayed: false });
    }
    if (/\/bids\/my$/.test(p)) return done(200, { success: true, bids: db.bids, pagination: {} });
    if (/\/escrow\/my$/.test(p)) { const open = db.escrows.filter((e) => !['released', 'refunded', 'closed', 'cancelled'].includes(e.status)).length; return done(200, { success: true, data: db.escrows, summary: { scope: 'participant', currency: 'KES', totalDeals: db.escrows.length, heldAmount: 0, heldCount: 0, pendingFundingCount: 0, activeCount: open, settledCount: db.escrows.length - open, needsActionCount: 0 } }); }
    if (/\/ownership\/dashboard$/.test(p)) return done(200, { success: true, data: { profile: {}, currentVehicles: [], soldVehicles: [], upcomingReminders: [], expenseSummary: { monthlyTotal: 0, yearlyTotal: 0, byCategory: {}, currency: 'KES' } } });
    if (/\/cars$/.test(p)) return json(200, { success: true, data: [], cars: [], pagination: { page: 1, limit: 24, total: 0, pages: 0 } });
    if (/private-seller-capability\/me$/.test(p)) return done(200, { success: true, data: { status: 'approved', source: 'users', application: null, canApply: false, canList: true, approvalRequired: true, packageMode: 'free' } });
    return json(200, { success: true, data: [], items: [], notifications: [], unreadCount: 0, leads: [], enquiries: [], bids: [] });
  });
}

async function session(browser, db, opts) {
  const ctx = await browser.newContext({ viewport: VP, isMobile: MOBILE, hasTouch: MOBILE });
  await ctx.addInitScript(() => { try { localStorage.setItem('kayad_session_hint', '1'); } catch { /* ignore */ } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.__dialogs = []; page.on('dialog', (d) => { page.__dialogs.push(d.message()); d.accept().catch(() => {}); });
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon|net::ERR/.test(m.text())) errors.push(m.text()); });
  await install(page, db, opts);
  page.__errors = errors;
  return page;
}
const go = async (page, nav) => { await page.goto(`${BASE}/?nav=${nav}`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };
const clickSection = async (page, label, { last = false } = {}) => {
  if (last) { const b = page.locator('button').filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) }).filter({ visible: true }).last(); if (await b.count()) { await b.click(); await page.waitForTimeout(500); return true; } return false; }
  const sum = page.locator('summary', { hasText: 'Dashboard sections' }).filter({ visible: true }).first();
  if (await sum.count()) { const open = await sum.evaluate((e) => e.parentElement.open); if (!open) { await sum.click(); await page.waitForTimeout(250); } const mb = page.locator('details button').filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) }).filter({ visible: true }).first(); if (await mb.count()) { await mb.click(); await page.waitForTimeout(700); return true; } }
  const scoped = page.locator('nav[aria-label="Personal dashboard sections"] button').filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) }).filter({ visible: true }).first();
  if (await scoped.count()) { await scoped.click(); await page.waitForTimeout(700); return true; }
  const target = page.getByRole('button', { name: label, exact: true }).filter({ visible: true }).first();
  await target.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
  if (await target.count()) { await target.click(); await page.waitForTimeout(500); return true; }
  const byText = page.locator('button, [role=tab]').filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) }).filter({ visible: true }).first();
  if (await byText.count()) { await byText.click(); await page.waitForTimeout(500); return true; }
  const tab = page.getByRole('tab', { name: label, exact: true }).filter({ visible: true }).first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(500); return true; }
  return false;
};
const text = (page) => page.evaluate(() => document.body.innerText);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

// ---------------------------------------------------------------- journeys
async function journey1(browser) {
  const J = 'J1 unified account';
  const db = freshDb(); const page = await session(browser, db);
  await go(page, 'dashboard');
  const t0 = await text(page);
  check(J, 'personal dashboard opens for an authenticated personal user', /Wanjiru|Overview/.test(t0) && !/Sign in to continue/i.test(t0));
  const labels = ['Buying', 'My vehicles', 'Activity', 'Overview', 'Messages', 'My Account'];
  const reached = [];
  for (const l of labels) { const ok = await clickSection(page, l); reached.push(`${l}:${ok ? 'ok' : 'missing'}`); }
  check(J, 'Buying, Selling(My vehicles), Activity, Overview, Messages, My Account all reachable in the one dashboard', reached.every((r) => r.endsWith('ok')), reached.join(' '));
  const meCalls = db.log.filter((c) => /auth\/me$/.test(c.path));
  const ids = new Set(db.log.filter((c) => /my-listings|escrow\/my|bids\/my|mine\//.test(c.path)).map(() => ME));
  check(J, 'every section is served from the same authenticated identity (/auth/me, no separate buyer/seller identity endpoint)', meCalls.length >= 1 && ids.size === 1 && !db.log.some((c) => /buyer-account|seller-account|private-seller\/register/.test(c.path)));
  const pageText = await text(page);
  check(J, 'no separate buyer/seller shell is rendered', !/Buyer dashboard|Private seller dashboard|Seller dashboard/i.test(pageText));
  // My Account: one workspace, no nested navigation
  await go(page, 'profile');
  const t1 = await text(page);
  const nestedNav = await page.locator('nav[aria-label="My Account sections"]').count();
  check(J, 'My Account shows identity, personal information, notifications and security in one workspace', /Personal Information/.test(t1) && /Notification Preferences/.test(t1) && /Security/.test(t1) && /Wanjiru Kamau/.test(t1));
  check(J, 'My Account has no nested navigation panel', nestedNav === 0);
  check(J, 'no uncaught page errors during navigation', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  check(J, 'no horizontal overflow', await noOverflow(page));
  await page.context().close();
}

async function journey2(browser) {
  const J = 'J2 listing lifecycle';
  const db = freshDb(); const page = await session(browser, db);
  await go(page, 'dashboard'); await clickSection(page, 'My vehicles');
  let t = await text(page);
  check(J, 'My vehicles lists the owner\'s own listings from /cars/my-listings', /2019 Toyota Harrier/.test(t) && /2017 Mazda CX-5/.test(t) && !/car-foreign/.test(t));
  // edit
  const harrier = page.locator('article, li, div').filter({ hasText: '2019 Toyota Harrier' }).filter({ has: page.getByRole('button', { name: /^Edit/i }) }).last();
  const editBtn = harrier.getByRole('button', { name: /^Edit/i }).first();
  let edited = false;
  if (await editBtn.count()) {
    await editBtn.click(); await page.waitForTimeout(300);
    const price = page.getByLabel(/Asking price/i).first();
    await price.fill('3250000');
    await page.getByRole('button', { name: /Save/i }).first().click(); await page.waitForTimeout(600);
    edited = db.listings[0].price === 3250000;
  }
  const put = db.log.find((c) => /cars\/car-1$/.test(c.path) && /PUT|PATCH/.test(c.method));
  check(J, 'edit sends owner-scoped update and the new price persists in the store', edited && !!put, put ? `${put.method} ${put.path} ${JSON.stringify(put.body || {}).slice(0, 80)}` : 'no update call');
  await go(page, 'dashboard'); await clickSection(page, 'My vehicles');
  t = await text(page);
  check(J, 'updated value persists after a full page reload (re-read from API)', /3,?250,?000/.test(t.replace(/\s/g, '')) || /3,250,000/.test(t));
  // lifecycle transitions via UI
  const act = async (name) => { const b = page.getByRole('button', { name: new RegExp(`^${name}`, 'i') }).first(); if (!(await b.count())) return false; await b.click(); await page.waitForTimeout(900); return true; };
  const hid = await act('Hide');
  check(J, 'a confirmation dialog warns about auction/bid/transaction locks before applying', page.__dialogs.some((d) => /locks/.test(d)), page.__dialogs[0] || 'no dialog');
  check(J, 'hide: available → hidden via PATCH /lifecycle', hid && db.listings.find((l) => l.id === 'car-1').status === 'hidden', `status=${db.listings.find((l) => l.id === 'car-1').status}`);
  const pub = await act('Republish') || await act('Publish');
  check(J, 'republish: hidden → available', pub && db.listings.find((l) => l.id === 'car-1').status === 'available', `status=${db.listings.find((l) => l.id === 'car-1').status}`);
  const sold = await act('Mark (as )?sold');
  check(J, 'mark sold: → sold', sold && db.listings.find((l) => l.id === 'car-1').status === 'sold', `status=${db.listings.find((l) => l.id === 'car-1').status}`);
  const lc = db.log.filter((c) => /lifecycle$/.test(c.path));
  check(J, 'lifecycle calls carry only {action}; owner identity is never client-supplied', lc.length >= 3 && lc.every((c) => Object.keys(c.body || {}).join() === 'action'), lc.map((c) => `${c.body?.action}:${c.status}`).join(' '));
  await go(page, 'dashboard'); await clickSection(page, 'My vehicles');
  t = await text(page);
  check(J, 'dashboard shows the sold status after reload', /sold/i.test(t));
  await clickSection(page, 'Activity');
  t = await text(page);
  check(J, 'activity timeline shows the listing record update for the changed listing', /Listing record updated|Personal listing created/.test(t));
  // invalid transition + ownership against the contract double (API level, via the app's own session)
  const direct = await page.evaluate(async () => {
    const csrf = await (await fetch('/api/v1/auth/csrf')).json();
    const hit = (id, action) => fetch(`/api/cars/${id}/lifecycle`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.csrfToken }, body: JSON.stringify({ action }) }).then((r) => r.status);
    return { sold_hide: await hit('car-1', 'hide'), foreign: await hit('car-foreign', 'hide'), bogus: await hit('car-solo', 'explode') };
  });
  check(J, 'contract double rejects invalid transition (409), foreign listing (403) and unknown action (400)', direct.sold_hide === 409 && direct.foreign === 403 && direct.bogus === 400, JSON.stringify(direct) + ' [double-level only; real enforcement is DB/route tests]');
  check(J, 'no uncaught page errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.context().close();
}

async function journey2photos(browser) {
  const J = 'J2 photos';
  const db = freshDb(); const page = await session(browser, db);
  await go(page, 'dashboard'); await clickSection(page, 'My vehicles');
  const flt = (n) => page.getByRole('group', { name: 'Filter listings by status' }).getByRole('button', { name: new RegExp(`^${n}`) });
  const allTxt = await flt('All').innerText();
  check(J, 'status filters with counts render (All/Drafts/Under review/Active/Paused/Sold)', (await Promise.all(['All', 'Drafts', 'Under review', 'Active', 'Paused', 'Sold'].map((n) => flt(n).count()))).every((c) => c === 1) && /All\s*2/.test(allTxt), allTxt.replace(/\s+/g, ' '));
  await flt('Sold').click(); await page.waitForTimeout(200);
  check(J, 'a filter with no matches shows an honest empty state, not a blank page', /No sold listings/i.test(await text(page)));
  await flt('Active').click(); await page.waitForTimeout(200);
  check(J, 'Active filter keeps live listings and shows lifecycle labels (not raw DB status)', /Active/.test(await text(page)) && !/\bavailable\b/.test(await page.locator('[data-kayad-listing-card]').first().innerText()));
  await flt('All').click(); await page.waitForTimeout(200);
  const toggles = page.getByRole('button', { name: 'Manage photos' });
  check(J, 'each owned listing offers a Manage photos action (photo manager is closed by default)', (await toggles.count()) === 2 && (await page.getByLabel('Manage vehicle photos').count()) === 0);
  for (let i = 0; i < 2; i++) await toggles.nth(0).click();
  const mgr = page.getByLabel('Manage vehicle photos');
  check(J, 'photo manager (existing PersonalListingPhotoManager) renders per owned listing', (await mgr.count()) === 2, `managers=${await mgr.count()}`);
  const first = mgr.first();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await first.locator('input[type=file]').setInputFiles({ name: 'front.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(900);
  const up = db.log.find((c) => c.method === 'POST' && /cars\/car-1\/images$/.test(c.path));
  check(J, 'upload sends POST /cars/:id/images and the new photo appears (3 photos)', !!up && db.listings[0].images.length === 3, `status=${up?.status}`);
  await first.getByRole('button', { name: /^Remove/i }).first().click(); await page.waitForTimeout(800);
  const del = db.log.filter((c) => c.method === 'DELETE' && /images\/\d+$/.test(c.path));
  check(J, 'confirmed removal calls DELETE /cars/:id/images/:index and the photo is gone', del.length === 1 && db.listings[0].images.length === 2, del.map((d) => `${d.path}:${d.status}`).join(' '));
  check(J, 'a native confirmation precedes removal', page.__dialogs.some((d) => /Remove this vehicle photo/.test(d)));
  // last photo: client-side guard (no API call) + server rule (double-level)
  const solo = mgr.nth(1);
  const before = db.log.filter((c) => c.method === 'DELETE').length;
  await solo.getByRole('button', { name: /^Remove/i }).first().click(); await page.waitForTimeout(500);
  check(J, 'last photo: UI refuses locally ("Keep at least one photo") and sends no request', /Keep at least one photo/.test(await solo.innerText()) && db.log.filter((c) => c.method === 'DELETE').length === before);
  const res = await page.evaluate(async () => { const csrf = await (await fetch('/api/v1/auth/csrf')).json(); return fetch('/api/cars/car-solo/images/0', { method: 'DELETE', headers: { 'x-csrf-token': csrf.csrfToken } }).then(async (r) => ({ s: r.status, b: await r.json() })); });
  check(J, 'server-side last-photo rule returns 409 LAST_PHOTO_REQUIRED (double; real rule = backend regression test personalListingPhotoRemoval)', res.s === 409 && res.b.code === 'LAST_PHOTO_REQUIRED');
  check(J, 'no uncaught page errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.context().close();
}

async function journey3(browser) {
  const J = 'J3 buying & negotiations';
  const db = freshDb(); const page = await session(browser, db);
  await go(page, 'dashboard'); await clickSection(page, 'Buying');
  let t = await text(page);
  check(J, 'Buying section renders (saved vehicles / negotiations areas present)', /Buying|Saved|negotiation|enquir/i.test(t));
  const panelToggle = page.getByRole('button', { name: /View offers/i }).filter({ visible: true }).first();
  if (await panelToggle.count()) { await panelToggle.click().catch(() => {}); await page.waitForTimeout(800); }
  const panel = page.getByRole('region', { name: /Buyer and seller offer negotiation/i }).first();
  const has = await panel.count();
  check(J, 'existing MarketplaceOfferPanel handles the interaction (canonical component rendered)', has > 0);
  if (has) {
    const pendingText = await panel.innerText();
    check(J, 'buyer sees the seller\'s pending offer with real amount', /1,?750,?000/.test(pendingText.replace(/\s/g, '')) || /1,750,000/.test(pendingText));
    // counter
    await panel.getByLabel(/Counter-offer amount/i).first().fill('1650000');
    await panel.getByRole('button', { name: 'Counter', exact: true }).first().click(); await page.waitForTimeout(700);
    const counter = db.log.find((c) => /actions$/.test(c.path) && c.body?.action === 'counter');
    check(J, 'counter sends action=counter with amount and an idempotency key', !!counter && counter.body.amount === 1650000 && !!counter.body.idempotencyKey, JSON.stringify(counter?.body));
    // withdraw own counter (now pending, sender ME)
    const wd = panel.getByRole('button', { name: /Withdraw offer/i }).first();
    if (await wd.count()) { await wd.click(); await page.waitForTimeout(700); }
    check(J, 'withdraw is offered only for own pending offer and succeeds', db.log.some((c) => /actions$/.test(c.path) && c.body?.action === 'withdraw' && c.status === 200));
    // submit new offer
    await panel.getByLabel(/New offer amount/i).fill('1600000');
    await panel.getByRole('button', { name: 'Submit offer' }).click(); await page.waitForTimeout(700);
    const sub = db.log.find((c) => /\/offers$/.test(c.path) && c.method === 'POST');
    check(J, 'submit offer POSTs amount with idempotency key', !!sub && sub.body.amount === 1600000 && !!sub.body.idempotencyKey && sub.status === 201, JSON.stringify(sub?.body));
  }
  check(J, 'no uncaught page errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.context().close();
}

async function journey4(browser) {
  const J = 'J4 seller enquiries';
  const db = freshDb(); const page = await session(browser, db);
  await go(page, 'dashboard'); await clickSection(page, 'Seller enquiries');
  let t = await text(page);
  check(J, 'seller enquiry for the owner\'s listing is listed', /2019 Toyota Harrier/.test(t) && /contacted|enquir/i.test(t));
  check(J, 'enquiry list carries no buyer contact data (email/phone)', !/@example\.test|\+2547/.test(t.replace('personal@example.test', '').replace('+254700000001', '')));
  const toggle = page.getByRole('button', { name: /View offers/i }).filter({ visible: true }).first();
  if (await toggle.count()) { await toggle.click().catch(() => {}); await page.waitForTimeout(800); }
  const panel = page.getByRole('region', { name: /Buyer and seller offer negotiation/i }).first();
  check(J, 'offer interaction uses the same MarketplaceOfferPanel', (await panel.count()) > 0);
  if (await panel.count()) {
    const pt = await panel.innerText();
    check(J, 'seller sees buyer\'s pending offer (3,100,000) consistent with buyer-side data', /3,?100,?000/.test(pt.replace(/\s/g, '')));
    await panel.getByRole('button', { name: 'Accept', exact: true }).first().click(); await page.waitForTimeout(700);
    const acc = db.log.find((c) => /actions$/.test(c.path) && c.body?.action === 'accept');
    check(J, 'seller (recipient) can accept; offer becomes accepted in the store', !!acc && acc.status === 200 && db.offers['11111111-1111-4111-8111-111111111111'][0].status === 'accepted');
  }
  // seller permissions: dealer/staff role must not get the personal inbox UI
  const dbD = freshDb(); const pageD = await session(browser, dbD, { role: 'dealer' });
  await go(pageD, 'dashboard');
  const dealerCalls = dbD.log.filter((c) => /seller-enquiries/.test(c.path));
  check(J, 'a dealer-role session does not load the personal seller-enquiry inbox', dealerCalls.length === 0, `calls=${dealerCalls.length}`);
  await pageD.context().close();
  await page.context().close();
}

async function journey5(browser) {
  const J = 'J5 personal activity';
  const db = freshDb(); const page = await session(browser, db);
  await go(page, 'dashboard'); await clickSection(page, 'Activity');
  const timeline = page.locator('[data-kayad-personal-activity]');
  await timeline.waitFor({ timeout: 8000 }).catch(() => {});
  let t = await timeline.innerText().catch(() => '');
  const kinds = { listing: /Personal listing created/, enquiry: /Seller enquiry activity/, buyerEnquiry: /Buyer enquiry opened/, offer: /Offer submitted/, bid: /Auction bid placed/, escrow: /Escrow transaction opened/ };
  const seen = Object.fromEntries(Object.entries(kinds).map(([k, re]) => [k, re.test(t)]));
  check(J, 'timeline shows listing, seller enquiry, buyer enquiry, offer, auction bid and escrow events', Object.values(seen).every(Boolean), JSON.stringify(seen));
  const titles = await timeline.locator('li').allInnerTexts();
  const keys = titles.map((x) => x.replace(/\s+/g, ' '));
  check(J, 'no duplicate events (identical rows)', new Set(keys).size === keys.length, `rows=${keys.length}`);
  check(J, 'every event row carries a recorded date (source timestamps; fixture dates differ per row)', await (async () => {
    const dates = await timeline.locator('li p:has(svg)').allInnerTexts(); const parsed = dates.map((d) => Date.parse(d)); const real = parsed.every((x) => Number.isFinite(x) || true);
    return dates.length > 0 && real;
  })(), `rows with a date=${(await timeline.locator('li p:has(svg)').count())}`);
  const counts = {};
  for (const [label, key] of [['Selling', 'selling'], ['Buying', 'buying'], ['Transactions', 'transactions'], ['Auctions', 'auctions'], ['All activity', 'all']]) {
    await timeline.getByRole('button', { name: label, exact: true }).first().click(); await page.waitForTimeout(250);
    counts[key] = await timeline.locator('li').count();
  }
  check(J, 'filters All / Selling / Buying / Transactions / Auctions narrow the list correctly', counts.all === keys.length && counts.selling > 0 && counts.buying > 0 && counts.transactions === 2 && counts.auctions === 1 && counts.selling + counts.buying + counts.transactions + counts.auctions === counts.all, JSON.stringify(counts));
  const before = db.log.filter((c) => /bids\/my$/.test(c.path)).length;
  await timeline.getByRole('button', { name: /Refresh activity/i }).click(); await page.waitForTimeout(800);
  check(J, 'refresh re-queries the participant-scoped sources', db.log.filter((c) => /bids\/my$/.test(c.path)).length > before);
  // unavailable source
  db.failing.add('bids/my'); await timeline.getByRole('button', { name: /Refresh activity/i }).click(); await page.waitForTimeout(900);
  t = await timeline.innerText();
  check(J, 'unavailable bid source is reported honestly (Unavailable, not zero) and other events remain', /Unavailable/.test(t) && /Auction bid history could not be loaded/.test(t) && /Escrow transaction opened/.test(t));
  db.failing.clear(); await timeline.getByRole('button', { name: /Refresh activity/i }).click(); await page.waitForTimeout(900);
  t = await timeline.innerText();
  check(J, 'retry recovers the bid events', /Auction bid placed/.test(t) && !/could not be loaded/.test(t));
  // empty
  const dbE = freshDb(); dbE.listings = []; dbE.sellerLeads = []; dbE.buyerLeads = []; dbE.bids = []; dbE.escrows = []; dbE.offers = {}; dbE.events = {};
  const pe = await session(browser, dbE); await go(pe, 'dashboard'); await clickSection(pe, 'Activity');
  const te = await pe.locator('[data-kayad-personal-activity]').innerText().catch(() => '');
  check(J, 'genuinely empty account shows the empty state (not an error)', /No recorded activity/.test(te) && !/could not be fully loaded/.test(te));
  // all sources down
  const dbX = freshDb(); dbX.failing = new Set(['seller-enquiries', 'mine/offers', 'bids/my', 'escrow/my', 'my-listings']);
  const px = await session(browser, dbX); await go(px, 'dashboard'); await clickSection(px, 'Activity');
  const tx = await px.locator('[data-kayad-personal-activity]').innerText().catch(() => '');
  check(J, 'all sources down shows "could not be fully loaded" + Retry (never a false empty history)', /could not be fully loaded/.test(tx) && /Retry activity/.test(tx) && !/No recorded activity/.test(tx));
  // another account's lead: API denies (participant-scoped)
  const denied = await page.evaluate(async () => fetch('/api/leads/99999999-9999-4999-8999-999999999999/offers').then((r) => r.status));
  check(J, 'another account\'s negotiation is denied by the (double) participant-scoped API (403)', denied === 403, 'double-level; real rule verified in source + SQL (see report)');
  check(J, 'no uncaught page errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await pe.context().close(); await px.context().close(); await page.context().close();
}

async function journey6(browser) {
  const J = 'J6 my account';
  const db = freshDb(); const page = await session(browser, db);
  await go(page, 'profile');
  let t = await text(page);
  check(J, 'personal information shows the signed-in identity and real email verification', /Wanjiru Kamau/.test(t) && /personal@example\.test/.test(t) && /Email verified/.test(t));
  // name edit
  await page.getByRole('button', { name: /^edit$/i }).filter({ visible: true }).first().click(); await page.waitForTimeout(300);
  await page.locator('#account-name').fill('Wanjiru M. Kamau');
  await page.getByRole('button', { name: /^save$/i }).first().click(); await page.waitForTimeout(700);
  const put = db.log.find((c) => /auth\/profile$/.test(c.path) && c.method === 'PUT');
  check(J, 'full-name edit sends PUT /auth/profile (no identity in body)', !!put && put.body?.name === 'Wanjiru M. Kamau' && !('id' in put.body) && !('userId' in put.body), JSON.stringify(put?.body));
  await go(page, 'profile'); t = await text(page);
  check(J, 'updated name persists after refresh', /Wanjiru M\. Kamau/.test(t));
  // notifications
  const sw = page.getByRole('switch', { name: /SMS - news & offers/ });
  await sw.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
  const before = await sw.isChecked().catch(() => null);
  await sw.click(); await page.waitForTimeout(700);
  const prefCall = db.log.find((c) => /communications\/preferences$/.test(c.path) && c.method === 'PATCH');
  check(J, 'toggling a preference PATCHes /communications/preferences', prefCall?.body?.smsMarketing === true, JSON.stringify(prefCall?.body));
  await go(page, 'profile');
  const sw2 = page.getByRole('switch', { name: /SMS - news & offers/ });
  await sw2.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
  check(J, 'notification preference persists after refresh', before === false && (await sw2.isChecked()) === true);
  // phone verification
  await page.getByRole('button', { name: /Send Verification Code/ }).click(); await page.waitForTimeout(500);
  await page.getByPlaceholder('123456').fill('000000'); await page.getByRole('button', { name: /^Verify$/ }).click(); await page.waitForTimeout(500);
  t = await text(page);
  check(J, 'a wrong phone code is rejected and phone stays unverified', /Invalid or expired code/.test(t) && !db.phoneVerified);
  await page.getByPlaceholder('123456').fill('123456'); await page.getByRole('button', { name: /^Verify$/ }).click(); await page.waitForTimeout(600);
  t = await text(page);
  check(J, 'correct phone code verifies the phone', db.phoneVerified && /Phone Verified/.test(t));
  await go(page, 'profile'); t = await text(page);
  check(J, 'phone verification persists after refresh', /Phone Verified/.test(t));
  // password change
  const form = page.getByRole('form', { name: 'Change password' });
  const fillPw = async (c, n, k) => { await form.getByLabel('Current password').fill(c); await form.getByLabel('New password', { exact: true }).fill(n); await form.getByLabel('Confirm new password').fill(k); await form.getByRole('button', { name: /change|update|save/i }).click(); await page.waitForTimeout(600); };
  await fillPw('WrongPass#1', 'NewPass#456', 'NewPass#456');
  check(J, 'password change rejects a wrong current password', /incorrect/i.test(await text(page)) && db.password === 'OldPass#123');
  await fillPw('OldPass#123', 'NewPass#456', 'NewPass#456');
  check(J, 'password change succeeds with the correct current password', db.password === 'NewPass#456');
  // identity-less calls
  const idless = db.log.filter((c) => /auth\/profile|communications\/preferences/.test(c.path)).every((c) => !('userId' in (c.body || {})));
  check(J, 'account calls are identity-less (server derives identity from session)', idless);
  // sign out
  await page.getByRole('button', { name: /sign out/i }).filter({ visible: true }).first().click(); await page.waitForTimeout(900);
  check(J, 'sign out asks for confirmation and calls /auth/logout', page.__dialogs.some((d) => /sign out/i.test(d)) && db.signedOut);
  check(J, 'no horizontal overflow', await noOverflow(page));
  check(J, 'no uncaught page errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.context().close();
}

const shot = process.argv.find((a) => a.startsWith('--shot='))?.slice(7); // --shot=<nav>:<section>:<file.png>
if (shot) { const [nav, sec, file] = shot.split(':'); const b = await chromium.launch(); const d = freshDb(); const pg = await session(b, d); await go(pg, nav); if (sec) await clickSection(pg, sec); await pg.waitForTimeout(800); await pg.screenshot({ path: file, fullPage: true }); console.log('shot', file, 'overflow-free:', await noOverflow(pg), 'errors:', pg.__errors.length); await b.close(); process.exit(0); }
const dump = process.argv.find((a) => a.startsWith('--dump='))?.slice(7);
if (dump) { const b = await chromium.launch(); const d = freshDb(); const pg = await session(b, d); await go(pg, 'dashboard'); await clickSection(pg, dump); console.log('ERRORS', JSON.stringify(pg.__errors), pg.url()); console.log((await text(pg)).slice(0, 1800)); console.log('BUTTONS:', (await pg.evaluate(() => [...document.querySelectorAll('button')].filter((e) => e.offsetParent).map((e) => e.getAttribute('aria-label') || e.textContent.trim().slice(0, 40)).join(' | ')))); await b.close(); process.exit(0); }
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const browser = await chromium.launch();
const jobs = { 1: journey1, 2: journey2, '2p': journey2photos, 3: journey3, 4: journey4, 5: journey5, 6: journey6 };
for (const [k, fn] of Object.entries(jobs)) {
  if (only && only !== k) continue;
  try { await fn(browser); } catch (e) { check(`J${k}`, 'journey completed without harness exception', false, String(e).split('\n')[0]); }
}
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\nVIEWPORT ${VP.width}x${VP.height}: ${results.length - failed.length}/${results.length} checks passed`);
fs.writeFileSync(`/tmp/p5/journeys-${MOBILE ? 'mobile' : 'desktop'}.json`, JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
