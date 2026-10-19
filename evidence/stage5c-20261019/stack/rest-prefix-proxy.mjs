// DISPOSABLE LOCAL ONLY: maps supabase-js's /rest/v1/* to a local PostgREST root. Refuses non-loopback upstreams.
import http from "node:http";
const UP = { host: "127.0.0.1", port: Number(process.env.UP_PORT || 54340) };
http.createServer((req, res) => {
  const path = req.url.replace(/^\/rest\/v1/, "") || "/";
  const p = http.request({ ...UP, path, method: req.method, headers: { ...req.headers, host: `${UP.host}:${UP.port}` } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on("error", (e) => { res.writeHead(502); res.end(JSON.stringify({ message: e.message })); });
  req.pipe(p);
}).listen(Number(process.env.PORT || 54341), "127.0.0.1", () => console.log("rest prefix proxy up"));
