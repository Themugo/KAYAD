#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
const read = (f) => fs.readFileSync(path.join(migrationDir, f), 'utf8');
const stripSql = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const created = new Set();
const duplicateDefs = new Map();
for (const file of files) {
  const sql = stripSql(read(file));
  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-zA-Z0-9_]+)"?/gi)) {
    const table = m[1].toLowerCase();
    created.add(table);
    if (!duplicateDefs.has(table)) duplicateDefs.set(table, []);
    duplicateDefs.get(table).push(file);
  }
}

const requiredTables = [
  'users', 'profiles', 'user_auth', 'dealers', 'dealer_verifications',
  'inspector_applications', 'inspection_providers', 'hero_slides',
  'vehicle_service_offerings', 'roadside_service_requests', 'service_jobs',
  'communication_deliveries', 'communication_preferences', 'platform_config',
];
check('required system tables are migration-backed', requiredTables.every((t) => created.has(t)),
  requiredTables.filter((t) => !created.has(t)).join(', ') || 'all present');

const missingReferences = new Set();
for (const file of files) {
  const sql = stripSql(read(file));
  for (const m of sql.matchAll(/references\s+public\."?([a-zA-Z0-9_]+)"?/gi)) {
    const table = m[1].toLowerCase();
    if (!created.has(table)) missingReferences.add(table);
  }
  for (const m of sql.matchAll(/references\s+users\s*\(/gi)) {
    if (!created.has('users')) missingReferences.add('users');
  }
}
check('migration foreign-key references resolve to migration-backed tables', missingReferences.size === 0,
  [...missingReferences].join(', ') || 'no unresolved references');

check('hero_slides is created before its premium ALTER contract', (() => {
  const file = files.find((f) => f === '20260926110000_hero_premium_media_layout.sql');
  if (!file) return false;
  const sql = stripSql(read(file));
  return /create\s+table\s+if\s+not\s+exists\s+public\.hero_slides/i.test(sql) && /alter\s+table\s+public\.hero_slides/i.test(sql);
})());

check('Phase 22 service-job reference domains are created before service_jobs', (() => {
  const file = '20260920220000_phase22_reconciliation.sql';
  const sql = stripSql(read(file));
  const a = sql.indexOf('create table if not exists public.vehicle_service_offerings');
  const b = sql.indexOf('create table if not exists public.roadside_service_requests');
  const c = sql.indexOf('create table if not exists public.service_jobs');
  return a >= 0 && b >= 0 && c >= 0 && a < c && b < c;
})());

check('registration atomic identity RPC is migration-backed', (() => {
  const all = files.map(read).join('\n');
  return all.includes('kayad_register_identity_atomic') && all.includes('p_password_hash');
})());

check('dealer identity has canonical one-to-one constraint', (() => {
  const all = files.map(read).join('\n');
  return all.includes('uq_dealers_user_canonical') || all.includes('"user" UUID NOT NULL UNIQUE');
})());

check('inspector application has pending concurrency protection', (() => {
  const all = files.map(read).join('\n');
  return all.includes('uq_inspector_applications_pending_user') && all.includes('uq_inspector_applications_pending_email');
})());

check('communication delivery supports dead-letter terminal state', (() => {
  const all = files.map(read).join('\n');
  return all.includes("'dead_letter'") && all.includes('communication_deliveries_status_check');
})());

const duplicateTableWarnings = [...duplicateDefs.entries()].filter(([, defs]) => defs.length > 1);
console.log(`\nDuplicate table definitions retained for historical compatibility: ${duplicateTableWarnings.length}`);
for (const [table, defs] of duplicateTableWarnings) console.log(`  WARN ${table}: ${defs.join(', ')}`);

const failed = checks.filter((x) => !x.ok);
console.log(`\nDATABASE CONTRACT ALIGNMENT: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
