// Reports class names rendered inside the admin content area that no loaded stylesheet rule references.
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.argv[2]; const routes = process.argv[3].split(','); const out = process.argv[4];
const user = { id: 'fx', _id: 'fx', name: 'Test Administrator', email: 'a@fixture.invalid', role: 'superadmin', isOwner: true, status: 'approved' };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const result = {};
  for (const r of routes) {
    const page = await ctx.newPage();
    await page.route('**/api/**', route => { const u = new URL(route.request().url()); if (/auth\/me$/.test(u.pathname)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user }) }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], users: [], cars: [], entries: [], items: [] }) }); });
    await page.goto(BASE + r, { waitUntil: 'domcontentloaded' }); await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(700);
    result[r] = await page.evaluate(() => {
      const defined = new Set();
      const walk = (rules) => { for (const rule of rules) { if (rule.selectorText) (rule.selectorText.match(/\.[A-Za-z_][\w-]*/g) || []).forEach(c => defined.add(c.slice(1))); if (rule.cssRules) walk(rule.cssRules); } };
      for (const ss of document.styleSheets) { try { walk(ss.cssRules); } catch (e) {} }
      const counts = {};
      document.querySelectorAll('.kayad-admin-shell__content *').forEach(el => { if (typeof el.className !== 'string') return; el.className.split(/\s+/).filter(Boolean).forEach(c => { if (!defined.has(c) && !/[:\[\]\/\\]/.test(c)) counts[c] = (counts[c] || 0) + 1; }); });
      return counts;
    });
    await page.close();
  }
  fs.writeFileSync(out, JSON.stringify(result, null, 1)); await b.close();
  const agg = {}; for (const r of Object.values(result)) for (const [c, n] of Object.entries(r)) agg[c] = (agg[c] || 0) + n;
  console.log(Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([c, n]) => c + ':' + n).join(' '));
})();
