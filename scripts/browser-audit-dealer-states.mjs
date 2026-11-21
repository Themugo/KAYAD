// Dealer dashboard overview: state matrix at 320-1440px. /api/** is answered by this harness (network boundary only).
// Usage: node scripts/browser-audit-dealer-states.mjs [baseUrl]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const OUT = 'docs/audits/screenshots/dealer'; fs.mkdirSync(OUT, { recursive: true });
const L = (o = {}) => ({ total: 0, new: 0, contacted: 0, negotiating: 0, inspectionBooked: 0, reserved: 0, sold: 0, lost: 0, ...o });
const LONG = 'Toyota Land Cruiser Prado TX-L 7-Seater Diesel Automatic Fully Loaded Low Mileage Single Owner ' .repeat(2);
const veh = (i, o = {}) => ({ id: `v${i}`, title: `2019 Toyota Prado ${i}`, image: '/hero/kayad-prado.png', status: 'available', views: 120 * i, leads: i, price: 5200000, ...o });
const mk = (o) => ({ success: true, data: { overview: { totalListings: 0, totalViews: 0, leads: L(), revenue: { total: 0 }, listingStatus: {}, ...o.overview }, recentActivity: o.activity || [], topPerformers: { vehicles: o.vehicles || [] } } });
const STATES = {
  'new-dealer': mk({}),
  'one-vehicle-no-leads': mk({ overview: { totalListings: 1, listingStatus: { available: 1 } }, vehicles: [veh(1)] }),
  'many': mk({ overview: { totalListings: 48, totalViews: 15234, leads: L({ total: 120, new: 7, contacted: 30, negotiating: 12, inspectionBooked: 5, reserved: 3, sold: 18, lost: 9 }), revenue: { total: 87450000 }, listingStatus: { available: 40, pending: 5, draft: 3 } },
    activity: [1, 2, 3].map((i) => ({ id: `a${i}`, type: 'lead', message: `New enquiry on 2019 Toyota Prado ${i}`, time: new Date(Date.now() - i * 36e5).toISOString() })), vehicles: [veh(1), veh(2), veh(3)] }),
  'long-text': mk({ overview: { totalListings: 3, totalViews: 99999999, revenue: { total: 123456789012 }, leads: L({ total: 5, new: 1 }) }, vehicles: [veh(1, { title: LONG, price: 987654321 }), veh(2, { image: '', title: 'No photo', price: null, views: null, leads: null })] }),
  'partial': { success: true, data: { overview: { totalListings: 2 } } },
  'failure': null, 'loading': 'hang',
};
const VPS = [320, 360, 390, 768, 1024, 1440];
const browser = await chromium.launch(); let fails = 0;
for (const [name, payload] of Object.entries(STATES)) for (const w of VPS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 800 : 900 }, isMobile: w < 700, hasTouch: w < 700 });
  await ctx.addInitScript(() => localStorage.setItem('kayad_session_hint', '1'));
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.route('**/api/**', (r) => { const p = new URL(r.request().url()).pathname; const j = (s, b) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
    if (/csrf$/.test(p)) return j(200, { success: true, csrfToken: 'x'.repeat(48) });
    if (/auth\/me$/.test(p)) return j(200, { success: true, user: { id: 'd1', name: 'Prime Motors', email: 'd@e.t', role: 'dealer', status: 'approved', emailVerified: true } });
    if (/dealer-platform\/dashboard$/.test(p)) { if (payload === 'hang') return; if (!payload) return j(500, { success: false }); return j(200, payload); }
    return j(200, { success: true, data: [], items: [] }); });
  await page.goto(`${BASE}/?nav=dealer-dashboard`); await page.waitForTimeout(payload === 'hang' ? 1200 : 1500);
  const m = await page.evaluate(() => {
    const clipped = [...document.querySelectorAll('[data-testid="dealer-overview"] *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && !e.closest('svg'); }).length;
    const small = [...document.querySelectorAll('[data-testid="dealer-overview"] button')].filter((b) => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 36; }).length;
    return { has: !!document.querySelector('[data-testid="dealer-overview"]'), sw: document.documentElement.scrollWidth, iw: innerWidth, clipped, small, nan: /NaN|undefined|\[object/.test(document.body.innerText) };
  });
  const ok = m.has && m.sw <= m.iw && m.clipped === 0 && !m.nan && errs.length === 0;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}@${w} ${ok ? '' : JSON.stringify({ ...m, errs: errs.slice(0, 2) })}`);
  if ([320, 1440].includes(w)) await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
  await ctx.close();
}
await browser.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
