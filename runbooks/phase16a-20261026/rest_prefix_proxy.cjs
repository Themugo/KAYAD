// Test-only: supabase-js calls <url>/rest/v1/...; a bare PostgREST serves at /. This strips the prefix.
const http = require('http');
const TARGET = { host: '127.0.0.1', port: Number(process.env.PGRST_PORT || 54330) };
http.createServer((req, res) => {
  const path = req.url.replace(/^\/rest\/v1/, '') || '/';
  const p = http.request({ ...TARGET, path, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on('error', (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
}).listen(Number(process.env.PROXY_PORT || 54331), '127.0.0.1');
