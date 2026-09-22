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
const migrationPattern = /^(\d{14})_[A-Za-z0-9][A-Za-z0-9_-]*\.sql$/;
const versions = new Map();
for (const file of files) {
  if (file.endsWith(".sql.sql")) failures.push(`Malformed migration extension: ${file}; rename to a single .sql extension.`);
  const match = file.match(migrationPattern);
  if (!match) failures.push(`Invalid migration filename: ${file}`);
  else {
    const version = match[1];
    if (versions.has(version)) failures.push(`Duplicate migration version ${version}: ${versions.get(version)} / ${file}`);
    else versions.set(version, file);
  }
}
const sortedVersions = [...versions.keys()].sort();
if (sortedVersions.some((v, i) => i > 0 && v <= sortedVersions[i - 1])) failures.push('Migration versions are not strictly increasing.');

if (files.length === 0) failures.push("No Supabase migrations found.");

const forbidden = [
  /test@example/i,
  /mock payment/i,
  /fake dealer/i,
];
const historicalSeed = [/seed_demo_vehicles/i, /pexels\.com/i, /demo vehicle/i, /demo inventory/i];

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

console.log(`KAYAD Supabase migration preflight: ${files.length} migration files, ${versions.size} unique versions`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

const all = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
for (const required of ['cars', 'favorites', 'saved_searches']) {
  const ddl = new RegExp(`\\bCREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?${required}\\b`, 'i');
  if (!ddl.test(all)) failures.push(`Required production table DDL missing: ${required}`);
}

if (failures.length) {
  console.error("\nFAIL:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nPASS: migration filenames, versions, required production DDL, and forbidden-content checks passed.");
console.log("Next required validation is a real PostgreSQL/Supabase migration reset.");
