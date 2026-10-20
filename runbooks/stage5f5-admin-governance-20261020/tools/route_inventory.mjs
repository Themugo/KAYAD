// Static route inventory: method, full path, guard chain, file:line. Read-only; imports nothing from the app.
import fs from "node:fs"; import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire("/home/claude/s7/work/package.json");
const acorn = require("acorn");
const root = "/home/claude/s7/work/backend";
const METHODS = new Set(["get", "post", "put", "patch", "delete", "all", "use"]);
const parse = (src) => acorn.parse(src, { ecmaVersion: "latest", sourceType: "module", locations: true, allowHashBang: true });
const walk = (n, f) => { if (!n || typeof n.type !== "string") return; f(n); for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach((c) => walk(c, f)); else if (v && typeof v.type === "string") walk(v, f); } };

// 1) mounts from server.js: app.use("/prefix", ...guards, routerIdent)  + import map ident -> file
const serverSrc = fs.readFileSync(path.join(root, "server.js"), "utf8"); const serverAst = parse(serverSrc);
const importMap = {}; for (const n of serverAst.body) if (n.type === "ImportDeclaration" && n.source.value.startsWith("./routes/")) for (const s of n.specifiers) importMap[s.local.name] = n.source.value.replace("./", "") + (n.source.value.endsWith(".js") ? "" : ".js");
const mounts = {}; // file -> [{prefix, guards}]
walk(serverAst, (n) => { if (n.type === "CallExpression" && n.callee.type === "MemberExpression" && n.callee.object.name === "app" && n.callee.property.name === "use") {
  const a = n.arguments; const last = a[a.length - 1]; if (last?.type === "Identifier" && importMap[last.name]) { const prefix = a[0]?.type === "Literal" ? a[0].value : "/"; const guards = a.slice(a[0]?.type === "Literal" ? 1 : 0, -1).map((x) => serverSrc.slice(x.start, x.end).replace(/\s+/g, " ")); (mounts[importMap[last.name]] ||= []).push({ prefix, guards, line: n.loc.start.line }); } } });

// 2) routes per file
const rows = []; const files = fs.readdirSync(path.join(root, "routes")).filter((f) => f.endsWith(".js"));
for (const f of files) {
  const rel = `routes/${f}`; const src = fs.readFileSync(path.join(root, rel), "utf8"); let ast; try { ast = parse(src); } catch (e) { rows.push({ file: rel, error: String(e.message) }); continue; }
  const m = mounts[rel] || [{ prefix: "(unmounted-in-server.js)", guards: [], line: 0 }];
  walk(ast, (n) => { if (n.type !== "CallExpression" || n.callee.type !== "MemberExpression") return; const o = n.callee.object; const meth = n.callee.property?.name;
    if (!(o.type === "Identifier" && /^(router|app|r|adminRouter)$/i.test(o.name)) || !METHODS.has(meth)) return;
    const args = n.arguments; const hasPath = args[0]?.type === "Literal" && typeof args[0].value === "string"; const p = hasPath ? args[0].value : (meth === "use" ? "(all)" : "(dynamic)");
    const mids = args.slice(hasPath ? 1 : 0); const handler = mids.length ? mids[mids.length - 1] : null;
    const guards = (meth === "use" ? mids : mids.slice(0, -1)).map((x) => src.slice(x.start, x.end).replace(/\s+/g, " ").slice(0, 140));
    for (const mt of m) rows.push({ file: rel, mount: mt.prefix, mountGuards: mt.guards.join(" | "), method: meth.toUpperCase(), path: p, guards: guards.join(" | "), handlerIsInline: handler && /Function/.test(handler.type) ? "inline" : (handler ? src.slice(handler.start, handler.end).slice(0, 60) : ""), line: n.loc.start.line });
  });
}
fs.writeFileSync("/home/claude/s7/out/route_inventory.json", JSON.stringify(rows, null, 1));
const tsv = ["file\tline\tmount\tmethod\tpath\tmountGuards\tguards"].concat(rows.filter(r=>!r.error).map((r) => [r.file, r.line, r.mount, r.method, r.path, r.mountGuards, r.guards].join("\t")));
fs.writeFileSync("/home/claude/s7/out/route_inventory.tsv", tsv.join("\n"));
console.log("route files:", files.length, "rows:", rows.length, "parse errors:", rows.filter((r) => r.error).length, "unmounted files:", files.filter((f) => !mounts[`routes/${f}`]).length);
