/* global console, process */
// Test-only static SPA server: serves DIST, proxies /api to the local backend, falls back to index.html.
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = process.argv[2], PORT = Number(process.argv[3]);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon' };
http.createServer((req, res) => {
  if (req.url.startsWith('/api')) {
    const p = http.request({ host: '127.0.0.1', port: 5055, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    p.on('error', (e) => { res.writeHead(502); res.end(String(e)); }); return req.pipe(p);
  }
  let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log('spa on', PORT));
