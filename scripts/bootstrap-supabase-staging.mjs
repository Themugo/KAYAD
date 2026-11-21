#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const projectRef = process.env.KAYAD_SUPABASE_PROJECT_REF || "";
const allowApply = args.includes("--apply");
const root = process.cwd();
const productionRef = "ubvgixwhfybbyjuvxboj";

const run = (command, commandArgs) => {
  console.log(`\n> ${command} ${commandArgs.join(" ")}`);
  const result = spawnSync(command, commandArgs, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

if (!projectRef) {
  console.error("Set KAYAD_SUPABASE_PROJECT_REF to the staging Supabase project reference.");
  process.exit(1);
}
if (projectRef === productionRef) {
  console.error("Refusing staging bootstrap against the KAYAD production project reference.");
  process.exit(1);
}
if (!fs.existsSync(path.join(root, "supabase/migrations"))) {
  console.error("supabase/migrations directory not found. Run from KAYAD repository root.");
  process.exit(1);
}

run("node", ["scripts/validate-supabase-migrations.mjs"]);
run("supabase", ["link", "--project-ref", projectRef]);
run("supabase", ["migration", "list"]);
run("supabase", ["db", "push", "--dry-run"]);

if (!allowApply) {
  console.log("\nSTAGING DRY RUN COMPLETE. No database changes were made.");
  console.log("Rerun with --apply only after reviewing the migration plan.");
  process.exit(0);
}

run("supabase", ["db", "push"]);
run("supabase", ["migration", "list"]);
run("node", ["scripts/verify-supabase-production.mjs"]);
console.log("\nKAYAD staging Supabase migration/certification completed.");
