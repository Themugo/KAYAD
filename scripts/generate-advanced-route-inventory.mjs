import fs from "fs";
import path from "path";

const root = process.cwd();
const roots = ["backend/routes", "backend/inspection/routes"];
const out = path.join(root, "docs", "ADVANCED_ROUTE_SECURITY_MATRIX.json");
const rows = [];
const routeRe = /router\.(get|post|put|patch|delete)\s*\(\s*(["'`])([^"'`]+)\2/gm;

for (const dir of roots) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of fs.readdirSync(abs).filter((f) => f.endsWith(".js"))) {
    const filePath = path.join(abs, file);
    const source = fs.readFileSync(filePath, "utf8");
    let m;
    while ((m = routeRe.exec(source))) {
      const line = source.slice(0, m.index).split("\n").length;
      const tail = source.slice(m.index, Math.min(source.length, m.index + 1800));
      const end = tail.search(/\);\s*\n/);
      const snippet = tail.slice(0, end > 0 ? end : 700);
      const middleware = snippet
        .replace(/^router\.(get|post|put|patch|delete)\s*\(\s*["'`][^"'`]+["'`]\s*,?/, "")
        .split(",")
        .map((x) => x.trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .slice(0, 12);
      rows.push({
        file: path.join(dir, file).replaceAll("\\", "/"),
        line,
        method: m[1].toUpperCase(),
        path: m[3],
        middleware,
        authentication: middleware.some((x) => /protect|authenticate|requireAuth/i.test(x)),
        csrf: middleware.some((x) => /csrfProtection/i.test(x)),
        rateLimit: middleware.filter((x) => /Limiter|limit/i.test(x)),
      });
    }
  }
}
rows.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), scope: roots, routeCount: rows.length, routes: rows }, null, 2));
console.log(`Wrote ${rows.length} routes to ${out}`);
