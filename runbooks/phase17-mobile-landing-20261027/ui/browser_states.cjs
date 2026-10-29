/* global console, document, process, setTimeout */
// Real-stack inventory-state scenarios. REAL: healthy, maintenance (disposable DB flag), DB-down (proxy stopped), empty (disposable DB).
// MOCKED (labelled): network abort, 403, 504 via Playwright route interception.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const [base, out, label] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const sql = q => execSync(`psql -h 127.0.0.1 -p 54329 -U postgres -d kayad_t -q -c "${q}"`, { stdio: 'pipe' });
const setMaint = on => sql(`update system_settings set value = jsonb_set(value,'{isMaintenanceMode}','${on}') where key='system_status'`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
async function snap(browser, name, setup) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  if (setup) await setup(page);
  const apiStatuses = [];
  page.on('response', r => { if (r.url().includes('/api/cars') && !r.url().includes('facets')) apiStatuses.push(r.status()); });
  await page.goto(base + '/', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    const pill = document.querySelector('#market-journey [data-inventory-state]');
    const panel = [...document.querySelectorAll('[role="status"] h3')].map(h => h.textContent)[0] || null;
    const empty = [...document.querySelectorAll('h3,h4')].map(h => h.textContent).find(t => /No vehicles/.test(t)) || null;
    const ref = [...document.querySelectorAll('[role="status"] p')].map(p => p.textContent).find(t => /Reference/.test(t)) || null;
    const de = document.documentElement;
    return { pill: pill && pill.textContent.trim(), pillState: pill && pill.getAttribute('data-inventory-state'), panel, empty, ref, ovf: de.scrollWidth - de.clientWidth };
  });
  await page.screenshot({ path: `${out}/${label}-state-${name}.png` });
  results.push({ name, apiStatuses: apiStatuses.slice(0, 3), ...info });
  return { ctx, page };
}
(async () => {
  const browser = await chromium.launch();
  await (await snap(browser, '1-healthy')).ctx.close();
  // REAL: global maintenance
  setMaint('true'); await sleep(11000);
  const m = await snap(browser, '2-maintenance-real');
  // recover for real, then retry via the pill
  setMaint('false'); await sleep(11000);
  const pill = m.page.locator('#market-journey button[data-inventory-state]');
  const before = await pill.count();
  if (before) { await pill.click(); await m.page.waitForTimeout(1500); }
  const after = await m.page.evaluate(() => { const p = document.querySelector('#market-journey [data-inventory-state]'); return p && p.textContent.trim(); });
  results.push({ name: '2b-retry-after-recovery', pillWasButton: before, pillAfterRetry: after });
  await m.ctx.close();
  // REAL: genuinely empty inventory
  sql(`update cars set deleted_at=now()`); execSync('redis-cli -p 6390 flushall',{stdio:'pipe'}); await sleep(500);
  await (await snap(browser, '3-empty-real')).ctx.close();
  sql(`update cars set deleted_at=null`); execSync('redis-cli -p 6390 flushall',{stdio:'pipe'});
  // REAL: database/PostgREST down
  try { execSync('fuser -k 54331/tcp', { stdio: 'pipe' }); } catch { /* none */ }
  await sleep(1500);
  await (await snap(browser, '4-db-down-real')).ctx.close();
  // MOCKED
  const mock = (status) => async page => page.route('**/api/cars?*', r => status === 'abort' ? r.abort('connectionreset') : r.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'mock ' + status }) }));
  await (await snap(browser, '5-network-MOCK', mock('abort'))).ctx.close();
  await (await snap(browser, '6-403-MOCK', mock(403))).ctx.close();
  await (await snap(browser, '7-504-MOCK', mock(504))).ctx.close();
  fs.writeFileSync(`${out}/${label}-states.json`, JSON.stringify(results, null, 1));
  console.log(JSON.stringify(results, null, 1));
  await browser.close();
})();
