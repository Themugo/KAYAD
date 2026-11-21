/* eslint-disable no-undef -- Node-run disposable-stack harness; not part of the shipped application bundle */
// DISPOSABLE LOCAL ONLY: serves a built SPA with history fallback and proxies /api, /sitemap*, /uploads to the local backend.
// Usage: DIST=/path/to/dist BACKEND=http://127.0.0.1:5055 PORT=4173 node serve-spa.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const DIST = process.env.DIST, PORT = Number(process.env.PORT || 4173), BACKEND = new URL(process.env.BACKEND || "http://127.0.0.1:5055");
if (!DIST || !["127.0.0.1", "localhost"].includes(BACKEND.hostname)) { console.error("DIST required and BACKEND must be loopback"); process.exit(2); }
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".map": "application/json" };
http.createServer((req, res) => {
  if (/^\/(api|sitemap|uploads|socket\.io)/.test(req.url)) {
    const up = http.request({ hostname: BACKEND.hostname, port: BACKEND.port, path: req.url, method: req.method, headers: { ...req.headers, host: BACKEND.host } }, (r) => { res.writeHead(r.statusCode || 502, r.headers); r.pipe(res); });
    up.on("error", (e) => { res.writeHead(502); res.end(String(e.message)); });
    return req.pipe(up);
  }
  const clean = decodeURIComponent(req.url.split("?")[0]);
  let file = path.join(DIST, clean);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, "index.html");
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log(`spa on http://127.0.0.1:${PORT}`));
