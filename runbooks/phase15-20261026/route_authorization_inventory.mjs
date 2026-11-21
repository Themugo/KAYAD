// Runtime inventory of every mounted API route and its middleware chain (introspects the real Express routers).
// Usage (backend dir, with the local env loaded): node ../runbooks/phase15-20261026/route_authorization_inventory.mjs > inventory.csv
import fs from "fs";
import path from "path";
const root = process.cwd();
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const imports = {};
for (const m of server.matchAll(/^import\s+(\w+)\s+from\s+"(\.\/routes\/[^"]+)"/gm)) imports[m[1]] = m[2];
const mounts = [];
for (const m of server.matchAll(/^app\.use\(\s*"([^"]+)"\s*,([^;]*)\);/gm)) {
  const names = m[2].split(",").map((s) => s.trim().replace(/\/\/.*$/, "").trim()).filter(Boolean);
  const routerName = [...names].reverse().find((n) => imports[n]);
  if (routerName) mounts.push({ prefix: m[1], file: imports[routerName], pre: names.filter((n) => n !== routerName) });
}
const AUTH = new Set(["protect", "optionalAuth", "protectAccount"]);
const rows = [["method", "full_path", "route_file", "mount_middleware", "route_middleware", "authentication", "role_or_permission_guards"]];
const seen = new Set();
const walk = (stack, prefix, file, pre, inherited) => {
  const inh = [...inherited];
  for (const layer of stack) {
    if (layer.route) {
      const names = layer.route.stack.map((l) => l.handle?.name || l.name || "anonymous");
      const chain = [...inh, ...names.slice(0, -1)];
      const auth = chain.find((n) => AUTH.has(n)) || (pre.some((n) => AUTH.has(n)) ? "mount" : "NONE");
      const guards = chain.filter((n) => !AUTH.has(n) && !/^(asyncHandler|bound dispatch|anonymous|handle|limiter|rateLimit|expressRateLimit)$/.test(n)).join("+");
      for (const method of Object.keys(layer.route.methods)) {
        const fp = (prefix + (layer.route.path === "/" ? "" : layer.route.path)).replace(/\/+/g, "/");
        const key = `${method}|${fp}|${file}`;
        if (seen.has(key)) continue; seen.add(key);
        rows.push([method.toUpperCase(), fp, file, pre.join("+"), names.join(">"), auth, guards]);
      }
    } else if (layer.handle && Array.isArray(layer.handle.stack)) {
      // nested router: path unknown in Express 5 layers -> handled by mount list; skip
    } else if (!layer.route && layer.name !== "router") {
      inh.push(layer.handle?.name || layer.name || "anonymous");
    }
  }
};
for (const mt of mounts) {
  let mod;
  try { mod = (await import(path.join(root, mt.file))).default; } catch (e) { rows.push(["ERR", mt.prefix, mt.file, "", String(e.message).slice(0, 80), "", ""]); continue; }
  if (!mod?.stack) continue;
  walk(mod.stack, mt.prefix, mt.file, mt.pre, []);
}
console.log(rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"));
process.exit(0);
