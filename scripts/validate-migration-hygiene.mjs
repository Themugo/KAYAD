#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dir = path.resolve('supabase/migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const failures = [];
const hashes = new Map();
const tableOwners = new Map();
const normalize = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim();

for (const file of files) {
  const raw = fs.readFileSync(path.join(dir, file), 'utf8');
  const digest = crypto.createHash('sha256').update(raw).digest('hex');
  if (!hashes.has(digest)) hashes.set(digest, []);
  hashes.get(digest).push(file);
  const sql = normalize(raw);
  for (const m of sql.matchAll(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi)) {
    const table = m[1].toLowerCase();
    if (!tableOwners.has(table)) tableOwners.set(table, []);
    tableOwners.get(table).push(file);
  }
}

const duplicateBodies = [...hashes.values()].filter((group) => group.length > 1);
const duplicateTables = [...tableOwners.entries()].filter(([, owners]) => owners.length > 1);

for (const group of duplicateBodies) failures.push(`Exact duplicate migration body: ${group.join(', ')}`);
for (const [table, owners] of duplicateTables) failures.push(`Duplicate table creator: ${table} -> ${owners.join(', ')}`);

console.log(`Migration hygiene: ${files.length} migration files scanned.`);
console.log(`PASS exact duplicate migration bodies: ${duplicateBodies.length === 0 ? 'none' : duplicateBodies.length}`);
console.log(`PASS duplicate table creators: ${duplicateTables.length === 0 ? 'none' : duplicateTables.length}`);
if (failures.length) {
  console.log('\nFAILURES:');
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}
console.log('Migration hygiene gate: PASS');
