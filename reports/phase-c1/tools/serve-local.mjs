// Local-only static server for browser journeys: serves a built dist/ with SPA fallback and proxies
// /api, /socket.io and /uploads to the disposable backend. Never used for deployment.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const dist = process.argv[2]; const port = Number(process.argv[3] || 4173); const backend = new URL(process.argv[4] || 'http://127.0.0.1:5055');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain' };
const proxy = (req, res) => {
  const up = http.request({ hostname: backend.hostname, port: backend.port, path: req.url, method: req.method, headers: { ...req.headers, host: backend.host } }, (r) => { res.writeHead(r.statusCode || 502, r.headers); r.pipe(res); });
  up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
  req.on('error', () => up.destroy()); res.on('error', () => up.destroy());
  req.pipe(up);
};
const server = http.createServer((req, res) => {
  if (/^\/(api|socket\.io|uploads)(\/|$)|^\/sitemap[^/]*\.xml/.test(req.url)) return proxy(req, res);
  const clean = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(dist, clean);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
server.on('upgrade', (req, socket, head) => {
  socket.on('error', () => socket.destroy());
  const up = http.request({ hostname: backend.hostname, port: backend.port, path: req.url, method: req.method, headers: req.headers });
  up.on('upgrade', (r, s, h) => { socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(r.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\n\r\n`); s.on('error', () => socket.destroy()); s.pipe(socket); socket.pipe(s); });
  up.on('error', () => socket.destroy()); up.end();
});
server.on('clientError', (err, socket) => socket.destroy());
process.on('uncaughtException', (e) => console.error('serve-local uncaught:', e.code || e.message));
server.listen(port, '127.0.0.1', () => console.log(`serving ${dist} on http://127.0.0.1:${port} -> ${backend.origin}`));
