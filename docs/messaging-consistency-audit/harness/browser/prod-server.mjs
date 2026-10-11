// Minimal "Vercel-like" host for the PRODUCTION bundle: serves dist/ with SPA fallback and proxies /api/* to the backend
// (same-origin, exactly what vercel.json's /api rewrite does). Used so the matrix also runs without React.StrictMode double-effects.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
export function startProdServer({ dist, port, target }) {
  const t = new URL(target);
  const srv = http.createServer((req, res) => {
    if (req.url.startsWith("/api/")) {
      const p = http.request({ host: t.hostname, port: t.port, method: req.method, path: req.url, headers: { ...req.headers, host: t.host } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
      p.on("error", () => { res.writeHead(502); res.end("bad gateway"); }); req.pipe(p); return;
    }
    let f = path.join(dist, decodeURIComponent(req.url.split("?")[0]));
    if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, "index.html");
    res.writeHead(200, { "content-type": mime[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
  });
  return new Promise((resolve) => srv.listen(port, "127.0.0.1", () => resolve(srv)));
}
