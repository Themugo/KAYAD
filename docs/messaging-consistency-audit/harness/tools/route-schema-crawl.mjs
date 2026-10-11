// Runtime schema reconciliation: boot the REAL backend against a database built ONLY from supabase/migrations, let background
// jobs run, then GET every documented route (openapi.yaml) as a superadmin and record which database objects the data
// layer could not find. Read-only against a disposable local database. Usage:
//   KAYAD_TEST_DB=<replayed db> node tools/route-schema-crawl.mjs <out.json> [bootWaitMs]
// Optional: CRAWL_ONLY=<file with one "GET /path" per line> restricts the crawl to those routes (group reruns).
// Each result also records the response message and the server log lines written while the route ran (truncated, and
// with bearer/JWT-looking strings redacted) so that 500s without a database error can be classified.
import fs from "node:fs";
import path from "node:path";
import { startStack, BACKEND, uuid } from "../lib/stack.mjs";

const out = process.argv[2] || "route-schema-crawl.json";
const bootWait = Number(process.argv[3] || 45000);
const s = await startStack({ port: 5058 });
const admin = await s.makeUser("Crawl Admin", { role: "superadmin" });
const c = s.client(admin);
await new Promise((r) => setTimeout(r, bootWait));
const bootErrors = s.emu.stats.errors.splice(0);

const yaml = fs.readFileSync(path.join(BACKEND, "openapi.yaml"), "utf8");
const paths = []; let cur = null;
for (const line of yaml.split("\n")) {
  const p = line.match(/^  (\/[^:]+):\s*$/); if (p) { cur = p[1]; continue; }
  if (cur && /^    get:\s*$/.test(line)) paths.push(cur);
}
const only = process.env.CRAWL_ONLY ? new Set(fs.readFileSync(process.env.CRAWL_ONLY, "utf8").split("\n").map((l) => l.trim()).filter(Boolean)) : null;
const redact = (t) => String(t || "").replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<jwt>").replace(/Bearer\s+\S+/gi, "Bearer <redacted>");
const results = [];
for (const p of paths) {
  if (only && !only.has(`GET ${p}`)) continue;
  const url = p.replace(/\{[^}]+\}/g, () => uuid());
  const before = s.emu.stats.errors.length;
  const logStart = s.logs().length;
  let status = 0, message = null;
  try { const res = await c.get(url); status = res.status; message = res.json?.message || res.json?.error || (res.json ? null : String(res.text || "").slice(0, 160)); } catch { status = -1; }
  await new Promise((r) => setTimeout(r, 30));
  const errs = s.emu.stats.errors.slice(before).map((e) => ({ code: e.code, message: e.message }));
  const serverLog = status >= 500 ? redact(s.logs().slice(logStart)).split("\n").filter((l) => /error|exception|fail|cannot|undefined|not a function|ECONN|timeout|message/i.test(l) && !/memory usage/i.test(l)).slice(0, 12).map((l) => l.slice(0, 300)) : [];
  results.push({ route: `GET ${p}`, status, dbErrors: errs, message: message ? redact(message).slice(0, 300) : null, serverLog });
}
const relOf = (m) => (String(m).match(/relation "(?:public\.)?([\w]+)" does not exist|table "?(?:public\.)?(\w+)"?|function public\.(\w+)/) || []).slice(1).find(Boolean) || null;
const byObject = {};
for (const r of results) for (const e of r.dbErrors) { const o = relOf(e.message) || `${e.code}: ${String(e.message).slice(0, 80)}`; (byObject[o] ||= new Set()).add(r.route); }
for (const e of bootErrors) { const o = relOf(e.message) || `${e.code}: ${String(e.message).slice(0, 80)}`; (byObject[o] ||= new Set()).add("BOOT/BACKGROUND JOB"); }
const summary = {
  database: process.env.KAYAD_TEST_DB, routesCalled: results.length,
  status: results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {}),
  routesWithDbErrors: results.filter((r) => r.dbErrors.length).length,
  bootBackgroundDbErrors: bootErrors.length,
  objects: Object.fromEntries(Object.entries(byObject).sort().map(([k, v]) => [k, [...v].sort()])),
};
fs.writeFileSync(out, JSON.stringify({ summary, results, bootErrors }, null, 2));
console.log(JSON.stringify({ ...summary, objects: Object.fromEntries(Object.entries(summary.objects).map(([k, v]) => [k, v.length])) }, null, 1));
await s.stop();
