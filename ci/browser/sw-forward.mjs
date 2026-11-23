// FORWARD-ONLY variant of sw-diagnose.mjs: the host moves A -> B once and stays on B (a real deploy, no rollback/flip-flop). GAP_MS = pause between navigations.
// Service-worker upgrade stall diagnosis. Repeats a bounded navigation churn between two local releases and, on any stall, dumps a full
// diagnostic bundle (trace, console, network, pending requests, worker lifecycle, controller, caches, release ids, server log, screenshot).
// Env: DIR_A DIR_B VARIANT (label) RUNS STEP_MS SW=register|none OUT PORT
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(path.resolve('package.json')); const { chromium } = require('playwright');
const { GAP_MS = '800', DIR_A: A, DIR_B: B, VARIANT = 'v', RUNS = '10', STEP_MS = '12000', SW = 'register', OUT = 'reports/evidence/sw-diagnose', PORT = '5410' } = process.env;
const base = `http://127.0.0.1:${PORT}`; fs.mkdirSync(OUT, { recursive: true });
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
let cur = A; let slog = []; const t0 = () => Date.now();
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const rel = cur === A ? 'A' : 'B'; slog.push({ t: Date.now(), rel, m: req.method, p: u.pathname, nav: req.headers['sec-fetch-mode'] === 'navigate' });
  if (slog.length > 400) slog.shift();
  if (u.pathname.startsWith('/api/')) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{}'); }
  const f = path.join(cur, decodeURIComponent(u.pathname));
  if (u.pathname !== '/' && fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream', 'cache-control': u.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : (u.pathname === '/release.json' || u.pathname === '/sw.js') ? 'no-store' : 'public, max-age=0, must-revalidate' });
    return fs.createReadStream(f).pipe(res);
  }
  if (u.pathname.startsWith('/assets/')) { res.writeHead(404); return res.end('gone'); }
  res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'public, max-age=0, must-revalidate' }); fs.createReadStream(path.join(cur, 'index.html')).pipe(res);
}).listen(Number(PORT));
const rid = (d) => JSON.parse(fs.readFileSync(path.join(d, 'release.json'))).releaseId;
const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] });
const summary = { variant: VARIANT, sw: SW, A: rid(A), B: rid(B), runs: [] };
for (let run = 1; run <= Number(RUNS); run += 1) {
  cur = A; slog = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: SW === 'none' ? 'block' : 'allow' });
  await ctx.tracing.start({ screenshots: true, snapshots: true });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('ServiceWorker.enable');
  const log = { console: [], reqs: new Map(), failed: [], swEvents: [], crashes: 0, pageErrors: [] };
  p.on('console', (m) => log.console.push(`${m.type()}: ${m.text().slice(0, 160)}`)); p.on('pageerror', (e) => log.pageErrors.push(e.message.slice(0, 160))); p.on('crash', () => { log.crashes += 1; });
  p.on('request', (r) => log.reqs.set(r, { url: r.url().replace(base, ''), nav: r.isNavigationRequest(), t: Date.now(), done: false }));
  p.on('requestfinished', (r) => { const e = log.reqs.get(r); if (e) e.done = true; }); p.on('requestfailed', (r) => { const e = log.reqs.get(r); if (e) e.done = true; log.failed.push(`${r.url().replace(base, '')} ${r.failure()?.errorText}`); });
  cdp.on('ServiceWorker.workerVersionUpdated', (e) => log.swEvents.push({ t: Date.now(), kind: 'version', v: e.versions.map((v) => `${v.versionId}:${v.runningStatus}/${v.status}`).join(' ') }));
  cdp.on('ServiceWorker.workerRegistrationUpdated', (e) => log.swEvents.push({ t: Date.now(), kind: 'registration', n: e.registrations.length }));
  const steps = []; let stalled = null;
  const step = async (name, fn) => { const s = t0(); const stuck = Symbol(); const r = await Promise.race([fn().then(() => 'ok', (e) => 'err:' + e.message.split('\n')[0].slice(0, 80)), new Promise((res) => setTimeout(() => res(stuck), Number(STEP_MS)))]); const ms = t0() - s; const out = r === stuck ? 'STALL' : r; steps.push({ name, rel: cur === A ? 'A' : 'B', ms, out, startedAt: s }); if (out === 'STALL' && !stalled) stalled = { name, at: t0(), startedAt: s }; return out; };
  const go = (u) => () => p.goto(base + u, { waitUntil: 'domcontentloaded', timeout: Number(STEP_MS) + 3000 });
  const meta = () => p.evaluate(() => document.querySelector('meta[name="kayad-release"]')?.content);
  const gap = () => p.waitForTimeout(Number(GAP_MS));
  await step('goto /', go('/')); await p.waitForTimeout(1200);
  if (SW === 'register') await step('register sw', () => p.evaluate(async () => { await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready; }));
  await step('reload (A)', () => p.reload({ waitUntil: 'domcontentloaded' })); await p.waitForTimeout(1200);
  cur = B; // the deploy happens here, once
  await step('reload (host now B) <- triggers the one-time worker swap', () => p.reload({ waitUntil: 'domcontentloaded' })); await gap();
  for (const u of ['/dealer', '/', '/dealer', '/login', '/', '/dealer']) { await step(`goto ${u} (B)`, go(u)); await gap(); }
  const finalRelease = await meta().catch(() => 'n/a'); steps.push({ name: 'final release', rel: 'B', ms: 0, out: finalRelease === rid(B) ? 'ok' : 'WRONG-RELEASE:' + finalRelease, startedAt: t0() });
  const bundle = async (tag) => {
    const pending = [...log.reqs.values()].filter((r) => !r.done).map((r) => ({ url: r.url, nav: r.nav, ageMs: Date.now() - r.t }));
    let controller = 'unavailable', caches = 'unavailable', release = 'unavailable', timing = 'unavailable';
    const ev = (fn) => Promise.race([p.evaluate(fn), new Promise((r) => setTimeout(() => r('EVAL-TIMEOUT'), 2500))]).catch((e) => 'EVAL-ERR ' + e.message.slice(0, 60));
    controller = await ev(async () => { const rs = await navigator.serviceWorker.getRegistrations(); return { controller: navigator.serviceWorker.controller?.scriptURL || null, state: navigator.serviceWorker.controller?.state || null, regs: rs.map((r) => [r.active?.state, r.installing?.state, r.waiting?.state]) }; });
    caches = await ev(async () => { const out = {}; for (const n of await window.caches.keys()) out[n] = (await (await window.caches.open(n)).keys()).map((k) => k.url.replace(location.origin, '')).slice(0, 12); return out; });
    release = await ev(() => document.querySelector('meta[name="kayad-release"]')?.content);
    timing = await ev(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { type: n.type, start: Math.round(n.startTime), responseEnd: Math.round(n.responseEnd), domContentLoaded: Math.round(n.domContentLoadedEventEnd), workerStart: Math.round(n.workerStart) } : null; });
    const shot = `${OUT}/${VARIANT}-run${run}-${tag}.png`; await Promise.race([p.screenshot({ path: shot, timeout: 3000 }).catch(() => {}), new Promise((r) => setTimeout(r, 3500))]);
    return { tag, pending, controller, caches, release, timing, swTimeline: log.swEvents.map((e) => ({ msFromStalledNavStart: e.t - (stalled?.startedAt || e.t), kind: e.kind, v: e.v, n: e.n })).filter((e) => e.msFromStalledNavStart > -4500),
    stepStarts: steps.map((x) => ({ name: x.name, rel: x.rel, msFromStalledNavStart: x.startedAt - (stalled?.startedAt || x.startedAt) })),
    serverTimeline: slog.map((x) => ({ ms: x.t - (stalled?.startedAt || x.t), rel: x.rel, p: x.p, nav: x.nav })).filter((x) => x.ms > -4500 && x.ms < 4000 && !x.p.startsWith('/hero')), failedRequests: log.failed.slice(-8), consoleTail: log.console.slice(-6), pageErrors: log.pageErrors, crashes: log.crashes, serverTail: slog.slice(-14).map((s) => `${s.t % 100000} ${s.rel} ${s.m} ${s.p}${s.nav ? ' [nav]' : ''}`), screenshot: shot };
  };
  let diag = null; if (stalled) diag = await bundle('stall');
  const tracePath = `${OUT}/${VARIANT}-run${run}.trace.zip`; await ctx.tracing.stop({ path: stalled ? tracePath : undefined }).catch(() => {});
  summary.runs.push({ run, stalled: stalled?.name || null, steps, diag }); console.error(`${VARIANT} run ${run}: ${stalled ? 'STALL at ' + stalled.name : 'ok'} (${steps.map((s) => s.ms).join(',')}ms)`);
  await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 5000))]).catch(() => {});
}
const stalls = summary.runs.filter((r) => r.stalled).length; summary.total = summary.runs.length; summary.stalls = stalls;
fs.writeFileSync(`${OUT}/${VARIANT}.json`, JSON.stringify(summary, null, 1)); console.error(`RESULT ${VARIANT}: ${stalls}/${summary.total} runs stalled`);
await b.close(); srv.close(); process.exit(0);
