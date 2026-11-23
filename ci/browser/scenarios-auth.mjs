// Scenarios 6 and 7: login, registration and e-mail verification across a release update, against the DISPOSABLE local API (loopback, example.test accounts).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(path.resolve('package.json')); const { chromium } = require('playwright');
const A = '/tmp/appA', B = '/tmp/appB', PORT = 5471, API = 5065, OUT = 'reports/evidence/scenarios'; fs.mkdirSync(OUT, { recursive: true });
let cur = A; const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
const apiCalls = [];
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) {
    const pr = http.request({ host: '127.0.0.1', port: API, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${API}`, origin: `http://127.0.0.1:${PORT}` } }, (r) => { apiCalls.push(`${req.method} ${u.pathname} ${r.statusCode}`); res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    pr.on('error', () => { res.writeHead(502); res.end(); }); return req.pipe(pr);
  }
  const f = path.join(cur, decodeURIComponent(u.pathname));
  if (u.pathname !== '/' && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream', 'cache-control': u.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : (u.pathname === '/release.json' || u.pathname === '/sw.js') ? 'no-store' : 'public, max-age=0, must-revalidate' }); return fs.createReadStream(f).pipe(res); }
  if (u.pathname.startsWith('/assets/')) { res.writeHead(404); return res.end('gone'); }
  res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'public, max-age=0, must-revalidate' }); fs.createReadStream(path.join(cur, 'index.html')).pipe(res);
}).listen(PORT);
const base = `http://127.0.0.1:${PORT}`; const seed = JSON.parse(fs.readFileSync('ci/db-journeys/out/browser-seed.json')); const rid = (d) => JSON.parse(fs.readFileSync(path.join(d, 'release.json'))).releaseId;
const meta = (p) => p.evaluate(() => document.querySelector('meta[name="kayad-release"]')?.content).catch(() => 'EVAL-FAIL');
const results = []; const check = (s, n, pass, d) => { results.push({ scenario: s, name: n, pass, detail: d ?? '' }); console.log(pass ? 'PASS' : 'FAIL', `[${s}]`, n, d ?? ''); };
const go = async (p, url, ms = 15000) => { try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: ms }); return true; } catch { return false; } };
const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] }); const errs = [];
async function withWorker() { cur = A; const ctx = await b.newContext(); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); await go(p, base + '/'); await p.waitForTimeout(1200); await p.evaluate(async () => { await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready; }); await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200); return { ctx, p }; }
const apiJson = (p, url, opt) => p.evaluate(async ([u, o]) => { const t = (await (await fetch('/api/v1/auth/csrf', { credentials: 'include' })).json()).csrfToken; const r = await fetch(u, { method: o?.method || 'GET', credentials: 'include', headers: { 'content-type': 'application/json', 'x-csrf-token': t, 'x-xsrf-token': t, 'idempotency-key': 'k' + Math.random() }, body: o?.body ? JSON.stringify(o.body) : undefined }); return { status: r.status, j: await r.json().catch(() => null) }; }, [url, opt]);
const loginUI = async (p, email) => { await go(p, base + '/login'); await p.waitForSelector('input[type=email]', { timeout: 10000 }); await p.fill('input[type=email]', email); await p.fill('input[type=password]', seed.password); await p.click('.kayad-auth-submit'); await p.waitForTimeout(3000); };
const me = (p) => apiJson(p, '/api/v1/auth/me');
try {
  // S6a: signed-in session survives a release update
  { const { ctx, p } = await withWorker(); await loginUI(p, seed.personal); const m1 = await me(p); check('6', 'login via UI under old release works', m1.status === 200, `me=${m1.status} url=${new URL(p.url()).pathname}`);
    cur = B; await go(p, base + '/'); await p.waitForTimeout(1500); const m2 = await me(p); check('6', 'after deploy: release B served and session still valid (no forced logout)', (await meta(p)) === rid(B) && m2.status === 200, `meta=${await meta(p)} me=${m2.status}`);
    const ok = await go(p, base + '/dealer'); await p.waitForTimeout(1500); check('6', 'authenticated deep link after deploy navigates', ok); await ctx.close(); }
  // S6b: login performed AFTER the deploy, with the old worker still controlling the tab
  { const { ctx, p } = await withWorker(); cur = B; await loginUI(p, seed.buyer); const m = await me(p); check('6', 'login via UI right after deploy (old worker controlling) succeeds', m.status === 200, `me=${m.status} meta=${await meta(p)}`); await ctx.close(); }
  // S7: registration + e-mail verification link opened after a deploy
  { const { ctx, p } = await withWorker(); const email = `swreg-${Date.now().toString(36)}@example.test`; const pw = seed.password;
    const reg = await apiJson(p, '/api/v1/auth/register', { method: 'POST', body: { name: 'SW Rehearsal', email, password: pw, role: 'user' } }); check('7', 'registration through the app transport succeeds', reg.status < 300, `status=${reg.status} ${JSON.stringify(reg.j)?.slice(0, 120)}`);
    await new Promise((r) => setTimeout(r, 1500)); const log = fs.readFileSync('ci/db-journeys/out/brevo-stub.log', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((m) => m.to?.[0]?.email === email && /verify/i.test(m.subject));
    const link = log.at(-1)?.html.match(/href=\\?"([^"\\]*verify-email[^"\\]*)/)?.[1]?.replace(/&amp;/g, '&'); check('7', 'verification e-mail captured by the loopback stub', !!link, link ? new URL(link).pathname : 'none');
    cur = B; if (link) { const u = new URL(link); const ok = await go(p, base + u.pathname + u.search); await p.waitForTimeout(3500); const txt = (await p.locator('body').innerText()).slice(0, 300); check('7', 'verification link opened after deploy completes successfully on release B', ok && (await meta(p)) === rid(B) && /verified|success|confirmed/i.test(txt), `meta=${await meta(p)} text=${txt.replace(/\s+/g, ' ').slice(0, 140)}`); }
    await ctx.close(); }
  check('6/7', 'no uncaught page errors across auth scenarios', errs.length === 0, errs.slice(0, 2).join(' | '));
} finally { await b.close(); }
fs.writeFileSync(path.join(OUT, 'scenarios-auth.json'), JSON.stringify({ at: new Date().toISOString(), results, apiCalls: apiCalls.slice(-40) }, null, 2));
const bad = results.filter((r) => !r.pass); console.log(`RESULT ${results.length - bad.length}/${results.length} passed`); process.exit(bad.length ? 1 : 0);
