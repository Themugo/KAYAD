#!/usr/bin/env node
// Compare two schema inventories produced by supabase/preflight/INVENTORY_SCHEMA_SECURITY.sql:
//   EXPECTED = repository baseline (full local replay of supabase/migrations, with SUPABASE_DEFAULT_PRIVILEGES=1)
//   ACTUAL   = the hosted database (run the SQL read-only as an authorised operator; never paste credentials anywhere)
// Usage: node scripts/supabase-reconcile.mjs <expected.json> <actual.json> [--json out.json]
// Exit code 1 when security-relevant drift is found (RLS off, client grants/policies wider than the repository, missing
// objects the application references). Output contains object names only — no data.
import fs from "node:fs";

const [expPath, actPath] = process.argv.slice(2);
const jsonOut = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
if (!expPath || !actPath) { console.error("usage: supabase-reconcile.mjs <expected.json> <actual.json> [--json out.json]"); process.exit(2); }
const load = (p) => { const raw = fs.readFileSync(p, "utf8").trim(); return JSON.parse(raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{"))); };
const E = load(expPath), A = load(actPath);
const keys = (o) => new Set(Object.keys(o || {}));
const diff = (a, b) => [...a].filter((x) => !b.has(x)).sort();
const findings = [];
const add = (severity, kind, object, detail) => findings.push({ severity, kind, object, detail });

const eT = keys(E.tables), aT = keys(A.tables);
for (const t of diff(eT, aT)) add("high", "table_missing_in_actual", t, "created by the repository migrations but absent");
for (const t of diff(aT, eT)) add("info", "table_only_in_actual", t, "not created by any repository migration (out-of-band DDL or platform)");
for (const t of [...eT].filter((x) => aT.has(x)).sort()) {
  const e = E.tables[t], a = A.tables[t];
  if (e.rls && !a.rls) add("critical", "rls_disabled", t, "RLS enabled in the repository, DISABLED in actual");
  const eCols = new Map(e.columns.map((c) => [c.name, c])), aCols = new Map(a.columns.map((c) => [c.name, c]));
  for (const [n, c] of eCols) {
    if (!aCols.has(n)) add("high", "column_missing", `${t}.${n}`, c.type);
    else if (aCols.get(n).type !== c.type) add("medium", "column_type_differs", `${t}.${n}`, `${c.type} -> ${aCols.get(n).type}`);
    else if (aCols.get(n).notnull !== c.notnull) add("low", "nullability_differs", `${t}.${n}`, `${c.notnull} -> ${aCols.get(n).notnull}`);
  }
  for (const n of aCols.keys()) if (!eCols.has(n)) add("info", "column_only_in_actual", `${t}.${n}`, aCols.get(n).type);
  for (const role of ["anon", "authenticated"]) {
    const eg = new Set(e.grants?.[role] || []), ag = new Set(a.grants?.[role] || []);
    const wider = diff(ag, eg); if (wider.length) add("high", "client_grant_wider", `${t} (${role})`, wider.join(","));
  }
  const eP = new Map((e.policies || []).map((p) => [p.name, p])), aP = new Map((a.policies || []).map((p) => [p.name, p]));
  for (const [n, p] of aP) {
    const ep = eP.get(n);
    if (!ep) add("high", "policy_only_in_actual", `${t}.${n}`, `${p.cmd} ${JSON.stringify(p.roles)} USING ${p.using} CHECK ${p.check}`);
    else if (ep.using !== p.using || ep.check !== p.check || JSON.stringify(ep.roles) !== JSON.stringify(p.roles)) add("high", "policy_differs", `${t}.${n}`, `actual USING ${p.using} CHECK ${p.check} roles ${JSON.stringify(p.roles)}`);
  }
  for (const n of eP.keys()) if (!aP.has(n)) add("medium", "policy_missing", `${t}.${n}`, "present in the repository");
  const eI = new Set((e.indexes || []).map((i) => i.name)), aI = new Set((a.indexes || []).map((i) => i.name));
  for (const n of diff(eI, aI)) add("medium", "index_missing", `${t}.${n}`, "unique/partial indexes carry idempotency guarantees");
  const eC = new Map((e.constraints || []).map((c) => [c.name, c.def])), aC = new Map((a.constraints || []).map((c) => [c.name, c.def]));
  for (const [n, d] of eC) { if (!aC.has(n)) add("medium", "constraint_missing", `${t}.${n}`, d); else if (aC.get(n) !== d) add("low", "constraint_differs", `${t}.${n}`, aC.get(n)); }
}

const eF = keys(E.functions), aF = keys(A.functions);
for (const f of diff(eF, aF)) add("high", "function_missing_in_actual", f, "repository function absent (signature)");
for (const f of diff(aF, eF)) add("info", "function_only_in_actual", f, "");
for (const f of [...eF].filter((x) => aF.has(x)).sort()) {
  const e = E.functions[f], a = A.functions[f];
  if (e.body_md5 !== a.body_md5) add("medium", "function_body_differs", f, "a later migration may not be applied, or out-of-band edit");
  if (a.security_definer && !e.security_definer) add("high", "function_became_security_definer", f, "");
  const isTrigger = /^trigger$/i.test(String(a.returns || "").trim()); // trigger functions cannot be invoked directly
  for (const role of ["anon", "authenticated"]) if (a.execute?.[role] && !e.execute?.[role]) {
    add(isTrigger ? "low" : a.security_definer ? "critical" : "high", "function_execute_wider", `${f} (${role})`, isTrigger ? "trigger function (not directly callable; hygiene)" : a.security_definer ? "SECURITY DEFINER callable by client role" : "");
  }
  if (a.security_definer && !(a.config || []).some((c) => c.startsWith("search_path="))) add("high", "secdef_without_search_path", f, "");
}

const eM = new Set((E.migration_history || []).map((m) => m.version)), aM = new Set((A.migration_history || []).map((m) => m.version));
if (A.migration_history) {
  for (const v of diff(eM, aM)) add("high", "migration_not_recorded", v, "repository migration missing from supabase_migrations.schema_migrations");
  for (const v of diff(aM, eM)) add("medium", "migration_unknown_to_repo", v, "applied on the database but not in supabase/migrations");
}
const ePub = E.publications?.supabase_realtime || [], aPub = A.publications?.supabase_realtime || [];
for (const t of aPub.filter((x) => !ePub.includes(x))) add("medium", "realtime_publication_wider", t, "table broadcast by Supabase Realtime");

const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
findings.sort((x, y) => order[x.severity] - order[y.severity] || x.kind.localeCompare(y.kind) || x.object.localeCompare(y.object));
const summary = findings.reduce((s, f) => ((s[f.severity] = (s[f.severity] || 0) + 1), s), {});
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ expected: { database: E.database, server_version: E.server_version }, actual: { database: A.database, server_version: A.server_version }, summary, findings }, null, 2));
console.log(`expected: ${E.database} (${E.server_version})  actual: ${A.database} (${A.server_version})`);
console.log("summary:", JSON.stringify(summary));
for (const f of findings.filter((x) => x.severity !== "info").slice(0, 200)) console.log(`${f.severity.toUpperCase().padEnd(8)} ${f.kind.padEnd(34)} ${f.object}${f.detail ? "  — " + f.detail : ""}`);
process.exitCode = findings.some((f) => f.severity === "critical" || f.severity === "high") ? 1 : 0;
