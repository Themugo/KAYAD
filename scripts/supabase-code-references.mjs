#!/usr/bin/env node
// KAYAD — which database tables / RPC functions does the DEPLOYED backend actually reference, and do they exist?
//
// Method (static, read-only):
//   1. Build the ESM import graph from backend/server.js (static imports, `export … from`, and literal dynamic imports).
//      Only files reachable from the server entry count as "deployed code". Tests, scripts and dead files are excluded.
//   2. In reachable files, collect table names from supabase `.from("t")`, the db layer helpers
//      (findAll/findById/findOne/create/createMany/update/updateMany/upsert/upsertMany/remove/removeMany/softDelete/
//      count/distinct/aggregate/paginate/find("t", …)), and models (`createModel("Name")` → models/_base.js TABLE_MAP
//      or name.toLowerCase(), exactly as createModel resolves it); RPC names from `.rpc("fn")`.
//   3. Compare with a schema inventory JSON produced by supabase/preflight/INVENTORY_SCHEMA_SECURITY.sql.
//
// Usage: node scripts/supabase-code-references.mjs <inventory.json> [--json out.json]
// Limits: dynamic table names (variables) are reported as "dynamic" call sites, not resolved.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKEND = path.join(ROOT, "backend");
const invPath = process.argv[2];
const jsonOut = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
if (!invPath) { console.error("usage: supabase-code-references.mjs <inventory.json> [--json out.json]"); process.exit(2); }
const inv = JSON.parse(fs.readFileSync(invPath, "utf8"));
const tables = new Set(Object.keys(inv.tables || {}));
const functions = new Set(Object.keys(inv.functions || {}).map((k) => k.slice(0, k.indexOf("("))));

const resolveImport = (from, spec) => {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const c of [base, base + ".js", base + ".mjs", path.join(base, "index.js")]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
};
const IMPORT_RE = /(?:import\s[^'"]*?from\s*|import\s*\(\s*|export\s[^'"]*?from\s*|import\s*)["'`]([^"'`]+)["'`]/g;
const reachable = new Set();
const queue = [path.join(BACKEND, "server.js")];
while (queue.length) {
  const f = queue.pop();
  if (reachable.has(f)) continue;
  reachable.add(f);
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(IMPORT_RE)) {
    const r = resolveImport(f, m[1]);
    if (r && /\.(m?js)$/.test(r) && !reachable.has(r)) queue.push(r);
  }
}

const baseSrc = fs.readFileSync(path.join(BACKEND, "models/_base.js"), "utf8");
const mapBlock = baseSrc.slice(baseSrc.indexOf("const TABLE_MAP"), baseSrc.indexOf("};", baseSrc.indexOf("const TABLE_MAP")));
const TABLE_MAP = Object.fromEntries([...mapBlock.matchAll(/(\w+)\s*:\s*"([\w.]+)"/g)].map((m) => [m[1], m[2]]));

const DB_FNS = "findAll|findById|findOne|create|createMany|update|updateMany|upsert|upsertMany|remove|removeMany|softDelete|count|distinct|aggregate|paginate|find";
const patterns = [
  { kind: "from", re: /\.from\(\s*["'`]([\w.]+)["'`]/g },
  { kind: "db", re: new RegExp(`(?<![\\w.])(?:db\\.)?(?:${DB_FNS})\\(\\s*["'\`]([a-z_][\\w]*)["'\`]`, "g") },
  { kind: "model", re: /createModel\(\s*["'`](\w+)["'`]/g },
];
const refs = new Map(); // table -> Set(files)
const rpcs = new Map();
const dynamic = [];
const add = (m, k, f) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(path.relative(ROOT, f)); };
for (const f of reachable) {
  const src = fs.readFileSync(f, "utf8");
  for (const { kind, re } of patterns) {
    for (const m of src.matchAll(re)) {
      const t = kind === "model" ? (TABLE_MAP[m[1]] || m[1].toLowerCase()) : m[1];
      if (kind === "from" && t.includes(".")) continue;
      add(refs, t.replace(/^public\./, ""), f);
    }
  }
  for (const m of src.matchAll(/\.rpc\(\s*["'`](\w+)["'`]/g)) add(rpcs, m[1], f);
  for (const m of src.matchAll(/\.from\(\s*([A-Za-z_$][\w$.]*)\s*\)/g)) dynamic.push(`${path.relative(ROOT, f)}: .from(${m[1]})`);
}
// Model files are reachable only when imported; a model that is reachable means its table is used by deployed code.

const missingTables = [...refs].filter(([t]) => !tables.has(t)).sort();
const missingRpcs = [...rpcs].filter(([fn]) => !functions.has(fn)).sort();
const report = {
  inventory: { file: invPath, database: inv.database, server_version: inv.server_version, tables: tables.size, functions: functions.size },
  reachableFiles: reachable.size,
  referencedTables: refs.size,
  referencedRpcs: rpcs.size,
  missingTables: missingTables.map(([t, fs_]) => ({ table: t, consumers: [...fs_].sort() })),
  missingRpcs: missingRpcs.map(([fn, fs_]) => ({ rpc: fn, consumers: [...fs_].sort() })),
  dynamicFromCallSites: dynamic.sort(),
};
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));
console.log(`deployed-code files reachable from backend/server.js: ${report.reachableFiles}`);
console.log(`tables referenced: ${report.referencedTables}  (missing from inventory: ${report.missingTables.length})`);
for (const m of report.missingTables) console.log(`  MISSING TABLE  ${m.table.padEnd(34)} <- ${m.consumers.slice(0, 4).join(", ")}${m.consumers.length > 4 ? ` (+${m.consumers.length - 4})` : ""}`);
console.log(`rpc functions referenced: ${report.referencedRpcs}  (missing: ${report.missingRpcs.length})`);
for (const m of report.missingRpcs) console.log(`  MISSING RPC    ${m.rpc.padEnd(34)} <- ${m.consumers.join(", ")}`);
console.log(`dynamic .from(<variable>) call sites (not resolved): ${report.dynamicFromCallSites.length}`);
process.exitCode = report.missingTables.length || report.missingRpcs.length ? 1 : 0;
