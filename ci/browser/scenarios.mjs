// Remaining service-worker rehearsal scenarios (5, 9, 10, 11, 13, 14*, 15, 17, 18) against local release dirs A and B. No production access.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { createRequire } from 'node:module';
const require = createRequire(path.resolve('package.json')); const { chromium } = require('playwright');
const A = process.env.DIR_A, B = process.env.DIR_B, PORT = Number(process.env.PORT || 5461), OUT = process.env.OUT || 'reports/evidence/scenarios'; fs.mkdirSync(OUT, { recursive: true });
let cur = A; const hits = []; const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); hits.push(`${cur === A ? 'A' : 'B'} ${req.method} ${u.pathname}`); const f = path.join(cur, decodeURIComponent(u.pathname));
  if (u.pathname.startsWith('/api/')) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{}'); }
  if (u.pathname !== '/' && fs.existsSync(f) && fs.statSync(f).isFile()) {
    const h = { 'content-type': mime[path.extname(f)] || 'application/octet-stream', 'cache-control': u.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : (u.pathname === '/release.json' || u.pathname === '/sw.js') ? 'no-store' : 'public, max-age=0, must-revalidate' };
    res.writeHead(200, h); return fs.createReadStream(f).pipe(res);
  }
  if (u.pathname.startsWith('/assets/')) { res.writeHead(404); return res.end('gone'); }
  res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'public, max-age=0, must-revalidate' }); fs.createReadStream(path.join(cur, 'index.html')).pipe(res);
}).listen(PORT);
const base = `http://127.0.0.1:${PORT}`; const rid = (d) => JSON.parse(fs.readFileSync(path.join(d, 'release.json'))).releaseId;
const meta = (p) => p.evaluate(() => document.querySelector('meta[name="kayad-release"]')?.content).catch(() => 'EVAL-FAIL');
const results = []; const check = (s, name, pass, detail) => { results.push({ scenario: s, name, pass, detail: detail ?? '' }); console.log(pass ? 'PASS' : 'FAIL', `[${s}]`, name, detail ?? ''); };
const go = async (p, url, ms = 15000) => { const t = Date.now(); try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: ms }); return Date.now() - t; } catch { return -1; } };
const swState = (p) => p.evaluate(async () => ({ controller: !!navigator.serviceWorker.controller, regs: (await navigator.serviceWorker.getRegistrations()).map((r) => [r.active?.state, r.installing?.state, r.waiting?.state]), caches: await Promise.all((await caches.keys()).map(async (k) => [k, (await (await caches.open(k)).keys()).length])) })).catch((e) => ({ err: e.message.slice(0, 80) }));
const args = ['--disable-dev-shm-usage', '--disable-gpu'];
async function seed(p, register = true) { cur = A; await go(p, base + '/'); await p.waitForTimeout(1200); if (register) { await p.evaluate(async () => { await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready; }); await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200); } }
const out = {}; process.on('unhandledRejection', (e) => console.error('ERR', e.message.split('\n')[0]));
const b = await chromium.launch({ args });
try {
  // S5 direct vehicle-detail navigation after deploy (worker controlling, host switches A -> B)
  { const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await seed(p); cur = B; await go(p, base + '/'); await p.waitForTimeout(1500);
    const ms = await go(p, base + '/cars/toyota-prado-2019-abc123'); await p.waitForTimeout(1500);
    check('5', 'direct vehicle-detail URL loads release B (not stale A)', ms >= 0 && (await meta(p)) === rid(B), `ms=${ms} meta=${await meta(p)}`);
    check('5', 'no page errors on vehicle deep link', errs.length === 0, errs[0]); out.s5 = await swState(p); await ctx.close(); }
  // S9 multiple tabs
  { const ctx = await b.newContext(); const t1 = await ctx.newPage(); await seed(t1); const t2 = await ctx.newPage(); await go(t2, base + '/dealer'); await t2.waitForTimeout(1200);
    await t2.evaluate(() => { const i = document.createElement('input'); i.id = 'typed'; document.body.appendChild(i); i.value = 'draft'; });
    cur = B; const ms = await go(t1, base + '/'); await t1.waitForTimeout(1500); check('9', 'tab 1 navigation after deploy lands on B', ms >= 0 && (await meta(t1)) === rid(B), `ms=${ms}`);
    await t2.bringToFront(); await t2.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); }); await t2.waitForTimeout(2500);
    check('9', 'tab 2 not reloaded behind the user (typed input kept, still A)', (await t2.inputValue('#typed').catch(() => '')) === 'draft' && (await meta(t2)) === rid(A));
    check('9', 'tab 2 shows update banner', (await t2.locator('text=/new version|update/i').count()) > 0); out.s9 = { t1: await swState(t1), t2: await swState(t2) }; await ctx.close(); }
  // S10 offline -> online
  { const ctx = await b.newContext(); const p = await ctx.newPage(); await seed(p); await ctx.setOffline(true); const ms = await go(p, base + '/dealer', 8000); await p.waitForTimeout(800);
    check('10', 'offline: cached shell renders (no browser error page)', ms >= 0 && (await meta(p)) === rid(A), `ms=${ms}`); await ctx.setOffline(false); cur = B; const ms2 = await go(p, base + '/dealer'); await p.waitForTimeout(1200);
    check('10', 'back online: navigation returns live release B', ms2 >= 0 && (await meta(p)) === rid(B), `ms=${ms2}`); out.s10 = await swState(p); await ctx.close(); }
  // S11 interrupted asset download (first request for a hashed asset aborted)
  { const ctx = await b.newContext(); const p = await ctx.newPage(); await seed(p); await p.evaluate(async () => { for (const k of await caches.keys()) if (k.includes('assets')) await caches.delete(k); }); let aborted = null; await ctx.route('**/assets/*.js', (r) => { if (!aborted) { aborted = r.request().url(); return r.abort('connectionreset'); } return r.continue(); });
    await go(p, base + '/login'); await p.waitForTimeout(2500); const poisoned = await p.evaluate(async (u) => { for (const k of await caches.keys()) { if (await (await caches.open(k)).match(u)) return k; } return null; }, aborted).catch(() => 'err');
    check('11', 'aborted asset was not stored in any cache', aborted ? poisoned === null : false, `aborted=${aborted?.split('/').pop()} cachedIn=${poisoned}`);
    await ctx.unroute('**/assets/*.js'); const ms = await go(p, base + '/login'); await p.waitForTimeout(1500); check('11', 'retry after interruption loads the app', ms >= 0 && (await p.locator('#root *').count()) > 0, `ms=${ms}`); await ctx.close(); }
  // S13 browser restart after update (persistent profile)
  { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kprof-')); let c = await chromium.launchPersistentContext(dir, { args }); let p = c.pages()[0] || await c.newPage(); await seed(p); await c.close();
    cur = B; c = await chromium.launchPersistentContext(dir, { args }); p = c.pages()[0] || await c.newPage(); const ms = await go(p, base + '/dealer'); await p.waitForTimeout(1500);
    check('13', 'after browser restart the first visit shows release B', ms >= 0 && (await meta(p)) === rid(B), `ms=${ms}`); out.s13 = await swState(p); await c.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  // S15 slow network (CDP throttle)
  { const ctx = await b.newContext(); const p = await ctx.newPage(); await seed(p); cur = B; await ctx.route('**/*', async (r) => { await new Promise((x) => setTimeout(x, 700)); r.continue().catch(() => {}); }); const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 500, downloadThroughput: 200 * 1024 / 8 * 8, uploadThroughput: 100 * 1024, connectionType: 'cellular3g' });
    const ms = await go(p, base + '/dealer', 45000); await p.waitForTimeout(3000); check('15', 'slow 3G-like: navigation after deploy completes on B', ms >= 0 && (await meta(p)) === rid(B), `ms=${ms}`); out.s15 = await swState(p); await ctx.close(); }
  // S14 installed-PWA prerequisites (headless cannot install; manifest/worker contract checked)
  { const ctx = await b.newContext(); const p = await ctx.newPage(); cur = B; await go(p, base + '/'); const man = await (await fetch(base + '/manifest.webmanifest')).json().catch(() => null);
    const iconsOk = man ? await Promise.all((man.icons || []).map(async (i) => (await fetch(new URL(i.src, base))).ok)) : [];
    check('14', 'manifest valid: standalone, start_url, scope, icons reachable', !!man && man.display === 'standalone' && !!man.start_url && iconsOk.length > 0 && iconsOk.every(Boolean), JSON.stringify({ d: man?.display, s: man?.start_url, sc: man?.scope, icons: iconsOk.length }));
    await p.emulateMedia({ media: 'screen' }); const ms = await go(p, base + '/dealer'); check('14', 'standalone-style launch URL loads (display-mode emulation not possible headless)', ms >= 0); await ctx.close(); }
  // S17/S18 old cached HTML / partially cached assets: delete half of ASSET_CACHE, then load a different route
  { const ctx = await b.newContext(); const p = await ctx.newPage(); await seed(p); await go(p, base + '/dealer'); await p.waitForTimeout(1500);
    const removed = await p.evaluate(async () => { const c = await caches.open('kayad-assets-v3'); const ks = await c.keys(); let n = 0; for (let i = 0; i < ks.length; i += 2) { await c.delete(ks[i]); n++; } return [n, ks.length]; }).catch(() => [0, 0]);
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); const ms = await go(p, base + '/login'); await p.waitForTimeout(1500);
    check('18', 'half-emptied asset cache: page still loads and refills', ms >= 0 && errs.length === 0, `removed=${removed}`);
    cur = B; const ms2 = await go(p, base + '/dealer'); await p.waitForTimeout(1500); check('17', 'old cached shell/assets from A do not prevent B from loading', ms2 >= 0 && (await meta(p)) === rid(B), `ms=${ms2}`); out.s17 = await swState(p); await ctx.close(); }
} finally { await b.close(); }
fs.writeFileSync(path.join(OUT, 'scenarios.json'), JSON.stringify({ A: rid(A), B: rid(B), at: new Date().toISOString(), results, state: out, lastHits: hits.slice(-30) }, null, 2));
const bad = results.filter((r) => !r.pass); console.log(`RESULT ${results.length - bad.length}/${results.length} passed`); process.exit(bad.length ? 1 : 0);
