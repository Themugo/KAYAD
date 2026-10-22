#!/usr/bin/env node
// DISPOSABLE / LOCAL DATABASES ONLY. supabase-js talks to `${SUPABASE_URL}/rest/v1/*`; a bare PostgREST server
// serves the same API at `/*`. This proxy strips the `/rest/v1` prefix so the real backend data layer
// (backend/db/index.js, backend/models/_base.js) can run unmodified against a local PostgREST.
// Usage: POSTGREST_URL=http://127.0.0.1:54330 PROXY_PORT=54331 node scripts/local-db/rest-v1-proxy.mjs
import http from 'node:http';

const upstream = new URL(process.env.POSTGREST_URL || 'http://127.0.0.1:54330');
const port = Number(process.env.PROXY_PORT || 54331);
if (!['127.0.0.1', 'localhost', '::1'].includes(upstream.hostname)) {
  console.error(`Refusing to proxy to non-local upstream ${upstream.hostname}; this proxy is for disposable databases only.`);
  process.exit(1);
}

http.createServer((req, res) => {
  const path = req.url.startsWith('/rest/v1') ? req.url.slice('/rest/v1'.length) || '/' : req.url;
  const forward = http.request({ hostname: upstream.hostname, port: upstream.port, path, method: req.method, headers: { ...req.headers, host: upstream.host } }, (up) => {
    res.writeHead(up.statusCode || 502, up.headers);
    up.pipe(res);
  });
  forward.on('error', (err) => { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ message: err.message })); });
  req.pipe(forward);
}).listen(port, '127.0.0.1', () => console.log(`rest-v1 proxy listening on http://127.0.0.1:${port} -> ${upstream.origin}`));
