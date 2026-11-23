// Release-switch rehearsal (local, no production access): serve release A, switch the host to release B WITHOUT clearing the browser, and check what a returning visitor runs.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(path.resolve('package.json')); const { chromium } = require('playwright');
const A = process.env.DIR_A, B = process.env.DIR_B, OUT = process.env.OUT || 'reports/evidence/release-switch'; fs.mkdirSync(OUT, { recursive: true });
let cur = A; const log = []; const hits = []; const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); hits.push(`${cur === A ? 'A' : 'B'} ${req.method} ${u.pathname}`); if (hits.length > 60) hits.shift(); const f = path.join(cur, decodeURIComponent(u.pathname));
  if (u.pathname.startsWith('/api/')) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{}'); }
  if (u.pathname !== '/' && fs.existsSync(f) && fs.statSync(f).isFile()) {
    const h = { 'content-type': mime[path.extname(f)] || 'application/octet-stream' };
    h['cache-control'] = u.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : (u.pathname === '/release.json' || u.pathname === '/sw.js') ? 'no-store' : 'public, max-age=0, must-revalidate';
    res.writeHead(200, h); return fs.createReadStream(f).pipe(res);
  }
  if (u.pathname.startsWith('/assets/')) { res.writeHead(404); return res.end('gone'); } // deleted chunk: a real 404, as on the host
  res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'public, max-age=0, must-revalidate' }); fs.createReadStream(path.join(cur, 'index.html')).pipe(res);
}).listen(5391);
const go = async (url) => { try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }); } catch (e) {
  const st = await ctx.pages()[0].evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map((r) => [r.active?.state, r.installing?.state, r.waiting?.state])).catch((x) => 'eval-failed ' + x.message.slice(0, 60));
  console.error('NAV-HANG', url, JSON.stringify(st), '\nLAST HITS\n' + hits.slice(-14).join('\n')); process.exit(3); } };
const meta = (p) => p.evaluate(() => document.querySelector('meta[name="kayad-release"]')?.content);
const rid = (d) => JSON.parse(fs.readFileSync(path.join(d, 'release.json'))).releaseId;
const results = []; const check = (name, pass, detail) => { results.push({ name, pass, detail }); console.error(pass ? 'PASS' : 'FAIL', name, detail || ''); };
process.on('unhandledRejection', (e) => { console.error('ERR', e.message.split('\n')[0]); process.exit(2); });
const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] }); const ctx = await b.newContext({ viewport: { width: 390, height: 800 } }); const p = await ctx.newPage(); let lastStep = ''; for (const m of ['goto', 'reload', 'evaluate', 'click', 'screenshot', 'inputValue']) { const o = p[m].bind(p); p[m] = (...a) => { lastStep = m + ' ' + String(a[0]).slice(0, 70) + ' @cur=' + (cur === A ? 'A' : 'B'); return o(...a); }; }
setTimeout(() => { console.error('WATCHDOG stuck in:', lastStep, '\nLAST HITS\n' + hits.slice(-10).join('\n')); process.exit(4); }, 75000);
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
// Returning visitor with a LEGACY-style registered worker (the app itself no longer registers one).
await go('http://127.0.0.1:5391/'); await p.waitForTimeout(1500);
await p.evaluate(async () => { await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready; }); await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500);
check('A: first visit runs release A', (await meta(p)) === rid(A), await meta(p));
check('A: worker controls the page', await p.evaluate(() => !!navigator.serviceWorker.controller));
// Host deploys release B. No cache clearing in the browser.
cur = B; await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2000);
check('B: returning visitor gets release B HTML on plain reload (SW is network-first)', (await meta(p)) === rid(B), await meta(p));
// Deep link (non-root navigation) must also be fresh: this was stale-while-revalidate in the old worker.
cur = A; await go('http://127.0.0.1:5391/dealer'); await p.waitForTimeout(1000); cur = B;
await go('http://127.0.0.1:5391/dealer'); await p.waitForTimeout(1500);
check('B: deep link /dealer is not served stale from cache', (await meta(p)) === rid(B), await meta(p));
// An open tab still running A learns about B without a reload and without losing form input.
cur = A; await go('http://127.0.0.1:5391/'); await p.waitForTimeout(1500);
await p.evaluate(() => { const i = document.createElement('input'); i.id = 'typed'; i.value = 'draft listing text'; document.body.appendChild(i); });
cur = B; await p.evaluate(() => { window.dispatchEvent(new Event('focus')); }); await p.waitForTimeout(2500);
const banner = await p.locator('[data-testid="release-update-banner"]').count();
check('A->B: open tab shows a non-disruptive update banner', banner === 1);
check('A->B: nothing reloaded by itself (typed input kept)', (await p.inputValue('#typed').catch(() => '')) === 'draft listing text');
await p.screenshot({ path: `${OUT}/banner-390.png` });
await p.locator('[data-testid="release-update-banner"] button:has-text("Refresh")').click(); await p.waitForTimeout(2500);
check('Refresh button loads release B', (await meta(p)) === rid(B), await meta(p));
// Stale chunk: tab on A, host now B (A chunks deleted) -> a lazy route chunk 404s -> one guarded reload to B.
cur = A; await go('http://127.0.0.1:5391/'); await p.waitForTimeout(1500); await p.evaluate(() => sessionStorage.clear()); cur = B;
await p.route('**/*', (r) => r.continue()); let reloads = 0; p.on('framenavigated', (f) => { if (f === p.mainFrame()) reloads++; }); const before = reloads;
await p.evaluate(() => window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))); await p.waitForTimeout(2500);
check('stale chunk: exactly one recovery reload, lands on B', reloads - before === 1 && (await meta(p)) === rid(B), `reloads=${reloads - before} meta=${await meta(p)}`);
await p.evaluate(() => window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))); await p.waitForTimeout(1500);
check('stale chunk: a second failure inside 60s does not loop', reloads - before === 1, `reloads=${reloads - before}`);
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ A: rid(A), B: rid(B), results }, null, 1));
await b.close(); srv.close(); process.exit(results.every((r) => r.pass) ? 0 : 1);
