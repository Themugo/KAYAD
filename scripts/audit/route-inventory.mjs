// Runtime route inventory: instruments express' Router BEFORE importing each
// route module, so every registered handler/middleware (including nested routers
// and router.use guards) is observed as actually registered - not regex-guessed.
// Usage (from backend/): node ../scripts/audit/route-inventory.mjs <out.tsv>
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(path.resolve("package.json"));
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ||= "inventory-secret-32-chars-minimum-xx";
process.env.DISABLE_REDIS ||= "true";
const express = require("express");
const Router = express.Router;
let proto = Object.getPrototypeOf(Router());
while (proto && !Object.prototype.hasOwnProperty.call(proto, "use")) proto = Object.getPrototypeOf(proto);
if (!proto) throw new Error("cannot locate Router prototype owning use()");
const meta = new WeakMap(); // router fn -> entries
const rec = (r) => { if (!meta.has(r)) meta.set(r, []); return meta.get(r); };
const nameOf = (f) => f?.name || "";
const AUTHISH = /^(protect|authenticate|authMiddleware|requireAuth|optionalAuth|adminOnly|allowRoles|requireRole|requirePermission|authorize|requireDealer.*|requireSuper.*|dealerOnly|privateSellerOnly|requireWebhook.*|verify.*|.*Guard|requireApiKey.*|mpesaIpWhitelist|validateMpesaCallback)$/;
const classify = (f) => {
  const n = nameOf(f);
  if (n && AUTHISH.test(n)) return n;
  let src = ""; try { src = Function.prototype.toString.call(f); } catch {}
  if (/req\.user/.test(src) && /(401|403)/.test(src)) return n || "anon:req.user+401/403";
  if (/x-api-key|signature|webhook.?secret|timingSafeEqual/i.test(src) && /(401|403)/.test(src)) return n || "anon:secret/signature";
  return null;
};
const origUse = proto.use;
proto.use = function (...args) {
  let p = "/"; let fns = args.flat(Infinity);
  if (typeof fns[0] === "string" || fns[0] instanceof RegExp) p = String(fns.shift());
  rec(this).push({ kind: "use", path: p, fns });
  return origUse.apply(this, args);
};
const origRoute = proto.route;
proto.route = function (p) {
  const route = origRoute.call(this, p);
  const entry = { kind: "route", path: String(p), methods: {}, route };
  rec(this).push(entry);
  for (const m of ["get", "post", "put", "patch", "delete", "all"]) {
    const orig = route[m];
    route[m] = function (...fns) { (entry.methods[m] ||= []).push(...fns.flat(Infinity)); return orig.apply(this, fns); };
  }
  return route;
};
const rows = [];
function walk(router, prefix, inherited, file) {
  const guards = [...inherited];
  for (const e of meta.get(router) || []) {
    if (e.kind === "use") {
      const kids = e.fns.filter((f) => meta.has(f));
      const mids = e.fns.filter((f) => !meta.has(f));
      const g = mids.map(classify).filter(Boolean);
      if (!kids.length) { guards.push(...g); continue; } // router.use(guard)
      for (const k of kids) walk(k, join(prefix, e.path), [...guards, ...g], file);
    } else {
      for (const [m, fns] of Object.entries(e.methods)) {
        const own = fns.map(classify).filter(Boolean);
        const all = [...guards, ...own];
        rows.push([file, m.toUpperCase(), join(prefix, e.path), all.length ? "guarded" : "NO_GUARD", [...new Set(all)].join("|"), fns.map(nameOf).filter(Boolean).slice(-1)[0] || ""]);
      }
    }
  }
}
const join = (a, b) => (a + "/" + b).replace(/\/+/g, "/").replace(/\/$/, "") || "/";
// mount table from server.js (prefix + middleware idents + router ident)
const server = fs.readFileSync("server.js", "utf8");
const imports = {};
for (const m of server.matchAll(/^import\s+(\w+)\s+from\s+"(\.\/routes\/[^"]+)"/gm)) imports[m[1]] = m[2];
const mounts = [];
for (const m of server.matchAll(/app\.use\(\s*"(\/api[^"]*)"\s*,([^;]*?)\)\s*;/g)) {
  const idents = m[2].split(",").map((s) => s.trim()).filter((s) => /^\w+$/.test(s));
  const router = idents.filter((i) => imports[i]).pop();
  if (router) mounts.push({ prefix: m[1], router, mids: idents.filter((i) => i !== router) });
}
const failed = [];
for (const mt of mounts) {
  try {
    const mod = await import(path.resolve(imports[mt.router]));
    const r = mod.default;
    if (!meta.has(r)) { failed.push([mt.router, "router not instrumented"]); continue; }
    const mids = mt.mids.filter((n) => AUTHISH.test(n)).map((n) => `mount:${n}`);
    walk(r, mt.prefix, mids, path.basename(imports[mt.router]));
  } catch (e) { failed.push([mt.router, String(e.message).slice(0, 120)]); }
}
const out = process.argv[2] || "route-inventory.tsv";
fs.writeFileSync(out, "file\tmethod\tfull_path\tguard_status\tguards_observed\tfinal_handler\n" + rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`mounts=${mounts.length} routes=${rows.length} unguarded=${rows.filter((r) => r[3] === "NO_GUARD").length} import_failures=${failed.length}`);
for (const f of failed) console.log("IMPORT_FAIL", f.join(": "));
process.exit(0);
