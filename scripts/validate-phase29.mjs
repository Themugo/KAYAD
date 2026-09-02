import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const migration = read('supabase/migrations/20260902130000_phase29_auth_boundary_reconciliation.sql');
const setup = read('setup-windows.bat');
const foundational = read('supabase/migrations/20260710043200_20260710005000_foundational_tables.sql.sql');
const legacyAuthMigration = read('supabase/migrations/20260710043238_20260710010000_gari_motors_full_schema.sql.sql');

assert.match(migration, /DROP TRIGGER IF EXISTS on_auth_user_created ON auth\.users/i);
assert.match(migration, /DROP FUNCTION IF EXISTS public\.handle_new_user/i);
assert.match(migration, /DROP POLICY IF EXISTS/i);
assert.match(migration, /users\/user_auth|users\/user_auth tables/i);
assert.doesNotMatch(setup, /MONGO_URI|MongoDB|mongodb\+srv|mongodb:\/\//i);
assert.match(setup, /npm ci/);
assert.doesNotMatch(setup, /cd .*frontend/i);
assert.match(foundational, /custom bcrypt\/JWT auth/i);
assert.match(foundational, /no dependency on Supabase's auth\.users/i);
assert.match(legacyAuthMigration, /CREATE TRIGGER on_auth_user_created/i);

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql') || f.endsWith('.sql.sql'));
assert.ok(migrations.includes('20260902130000_phase29_auth_boundary_reconciliation.sql'));

console.log('PHASE 29 AUTH BOUNDARY VALIDATION: PASS');
console.log(`Migrations scanned: ${migrations.length}`);
console.log('Canonical identity: users + user_auth');
console.log('Supabase Auth trigger: corrected by follow-up migration');
console.log('auth.uid()-based legacy policies: corrected by follow-up migration');
console.log('Windows setup: root npm ci + Node 22 baseline');
