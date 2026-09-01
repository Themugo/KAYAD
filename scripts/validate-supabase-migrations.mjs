#!/usr/bin/env node
/**
 * KAYAD migration-chain guard.
 *
 * This is a static preflight check. It does not replace:
 *   supabase db reset
 *   supabase db push
 *
 * Usage:
 *   node scripts/validate-supabase-migrations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dir = path.join(root, "supabase", "migrations");

const files = fs.readdirSync(dir)
  .filter((f) => f.endsWith(".sql") || f.endsWith(".sql.sql"))
  .sort();

const failures = [];
const warnings = [];

if (files.length === 0) failures.push("No Supabase migrations found.");

const forbidden = [
  /seed_demo_vehicles/i,
  /pexels\.com/i,
  /demo vehicle/i,
  /demo inventory/i,
  /test@example/i,
  /mock payment/i,
  /fake dealer/i,
];

for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), "utf8");

  for (const pattern of forbidden) {
    if (pattern.test(text)) {
      failures.push(`${file}: forbidden production/demo content matched ${pattern}`);
    }
  }

  if (/jypkhvknfgoqrhwzbdwi/i.test(text)) {
    failures.push(`${file}: old Supabase project reference detected`);
  }
}

const tableCreates = new Map();
const createRe = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)/gi;

for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");

  for (const match of text.matchAll(createRe)) {
    const table = match[1].toLowerCase();
    if (!tableCreates.has(table)) tableCreates.set(table, []);
    tableCreates.get(table).push(file);
  }
}

for (const [table, owners] of tableCreates) {
  if (owners.length > 1) {
    // CREATE IF NOT EXISTS can be intentional, but flag for human review.
    warnings.push(`Table ${table} is created in multiple migrations: ${owners.join(", ")}`);
  }
}

const first = files[0] ?? "";
if (!/foundational_tables/i.test(first)) {
  warnings.push(`First migration is ${first}; verify foundational schema ordering.`);
}

console.log(`KAYAD Supabase migration preflight: ${files.length} migration files`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (failures.length) {
  console.error("\nFAIL:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nPASS: no forbidden demo content or old project references detected.");
console.log("Next required validation is a real PostgreSQL/Supabase migration reset.");
