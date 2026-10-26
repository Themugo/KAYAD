/* eslint-disable no-undef -- Node CLI tool (process/console); not part of the shipped application bundle */
// PHASE 13H — compares the migration list returned by phase13h_staging_preflight_readonly.sql with supabase/migrations. Read-only, offline.
// Usage: node scripts/owner/compare_migration_history.mjs <preflight-output.txt> [migrationsDir]
import fs from "node:fs";
const [out, dir = "supabase/migrations"] = process.argv.slice(2);
if (!out) { console.error("usage: compare_migration_history.mjs <preflight-output.txt> [dir]"); process.exit(2); }
const repo = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => f.replace(/\.sql$/, "")).sort();
const applied = fs.readFileSync(out, "utf8").split("\n").map((l) => l.match(/MIGRATION (\d{8,14})\s*(.*?)\s*\|?\s*$/)).filter(Boolean).map((m) => ({ v: m[1], n: m[2].trim() }));
const repoV = new Map(repo.map((f) => [f.split("_")[0], f])); const appV = new Map(applied.map((a) => [a.v, a.n]));
const notApplied = repo.filter((f) => !appV.has(f.split("_")[0])); const notInRepo = applied.filter((a) => !repoV.has(a.v));
console.log(`repository migrations: ${repo.length}; applied in target: ${applied.length}`);
console.log(`in repository, NOT in target history (${notApplied.length}):`); for (const f of notApplied) console.log("  " + f);
console.log(`in target history, NOT in repository (${notInRepo.length}):`); for (const a of notInRepo) console.log(`  ${a.v} ${a.n}`);
const order = notApplied.filter((f) => f.split("_")[0] < (applied.at(-1)?.v ?? "0"));
console.log(`gaps BELOW the newest applied version (out-of-order risk): ${order.length}`); for (const f of order) console.log("  " + f);
process.exit(notInRepo.length ? 1 : 0);
