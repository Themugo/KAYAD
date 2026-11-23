import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const src = fs.readFileSync(path.resolve(__dirname, '../../../public/sw.js'), 'utf8');

function boot(responses: Record<string, { type: string; ok?: boolean }>, offline = false) {
  const stores = new Map<string, Map<string, any>>();
  const handlers: Record<string, (e: any) => void> = {};
  const fetched: string[] = [];
  const mkRes = (url: string) => { const r = responses[new URL(url).pathname] || { type: 'text/plain' }; return { ok: r.ok !== false, headers: { get: () => r.type }, clone() { return this; }, url }; };
  const caches = {
    async open(n: string) { if (!stores.has(n)) stores.set(n, new Map()); const m = stores.get(n)!; return { match: async (r: any) => m.get(typeof r === 'string' ? r : r.url), put: async (r: any, v: any) => { m.set(typeof r === 'string' ? r : r.url, v); }, keys: async () => [...m.keys()].map((k) => ({ url: k })), delete: async (r: any) => m.delete(r.url) }; },
    async keys() { return [...stores.keys()]; },
    async delete(n: string) { return stores.delete(n); },
    async match(r: string, o?: { cacheName?: string }) { const m = stores.get(o?.cacheName || ''); return m?.get(r); },
  };
  const sandbox: any = { self: { addEventListener: (t: string, h: any) => { handlers[t] = h; }, location: { origin: 'https://x.test' }, skipWaiting: async () => {}, clients: { claim: async () => {} }, registration: {} }, caches, URL, setTimeout, clearTimeout, Promise, fetch: async (r: any) => { const u = typeof r === 'string' ? r : r.url; fetched.push(u); if (offline) throw new Error('offline'); return mkRes(u); }, clients: {}, console };
  vm.createContext(sandbox); vm.runInContext(src, sandbox);
  const req = (p: string, mode = 'cors', extra: any = {}) => ({ method: 'GET', url: 'https://x.test' + p, mode, destination: '', ...extra });
  const run = async (r: any) => {
    let out: any = 'passthrough'; const pending: Promise<unknown>[] = [];
    handlers.fetch({ request: r, respondWith: (p: any) => { out = p; }, waitUntil: (p: Promise<unknown>) => { pending.push(Promise.resolve(p)); } });
    const result = out === 'passthrough' ? out : await out;
    await Promise.all(pending); // background cache writes finish before assertions
    return result;
  };
  return { stores, handlers, fetched, req, run, caches };
}

describe('service worker', () => {
  it('is release-independent so deploys never force a worker reinstall', () => { expect(src).not.toContain('__KAYAD_RELEASE_ID__'); });
  it('never intercepts release.json, manifests, sw.js, api or uploads', async () => {
    const w = boot({});
    for (const p of ['/release.json', '/manifest.webmanifest', '/sw.js', '/api/v1/cars', '/uploads/a.jpg', '/data.json']) expect(await w.run(w.req(p))).toBe('passthrough');
  });
  it('navigations are network-first and the shell is only a cache fallback', async () => {
    const w = boot({ '/dealer': { type: 'text/html; charset=utf-8' } });
    await w.run(w.req('/dealer', 'navigate'));
    expect(w.fetched).toContain('https://x.test/dealer');
    const off = boot({ '/dealer': { type: 'text/html' } }, true);
    await expect(off.run(off.req('/dealer', 'navigate'))).rejects.toThrow('offline'); // nothing cached yet: honest failure, not a stale page
  });
  it('serves the last good shell only when offline', async () => {
    const w = boot({ '/': { type: 'text/html' } });
    await w.run(w.req('/', 'navigate'));
    const cache = await w.caches.open('kayad-shell-v3'); expect(await cache.match('/index.html')).toBeTruthy();
  });
  it('does not cache an HTML response served for a missing hashed asset', async () => {
    const w = boot({ '/assets/gone-abc.js': { type: 'text/html' } });
    await w.run(w.req('/assets/gone-abc.js', 'no-cors', { destination: 'script' }));
    const cache = await w.caches.open('kayad-assets-v3'); expect(await cache.match('https://x.test/assets/gone-abc.js')).toBeUndefined();
  });
  it('caches a real hashed asset and serves it from cache next time', async () => {
    const w = boot({ '/assets/app-1.js': { type: 'text/javascript' } });
    await w.run(w.req('/assets/app-1.js', 'no-cors', { destination: 'script' }));
    const n = w.fetched.length; await w.run(w.req('/assets/app-1.js', 'no-cors', { destination: 'script' }));
    expect(w.fetched.length).toBe(n);
  });
  it('a stuck cache read cannot hang a navigation: offline fallback is time-bounded', async () => {
    const w = boot({}, true);
    w.caches.match = () => new Promise(() => {}) as any; // never settles
    const t = Date.now();
    await expect(w.run(w.req('/dealer', 'navigate'))).rejects.toThrow('offline');
    expect(Date.now() - t).toBeLessThan(3000);
  });
  it('activation deletes caches it does not own (old releases/legacy names) and keeps its own', async () => {
    const w = boot({});
    await w.caches.open('kayad-static-v2'); await w.caches.open('kayad-mobile-v2'); await w.caches.open('kayad-shell-rel-OLD'); await w.caches.open('kayad-assets-v3');
    let done: Promise<unknown> = Promise.resolve(); w.handlers.activate({ waitUntil: (p: Promise<unknown>) => { done = p; } }); await done;
    expect(await w.caches.keys()).toEqual(['kayad-assets-v3']);
  });
});
