import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) failures.push(message); };

const rootPkg = JSON.parse(read('package.json'));
const backendPkg = JSON.parse(read('backend/package.json'));
const nvmrc = read('.nvmrc').trim();

assert(nvmrc === '22.22.2', `.nvmrc must be 22.22.2 (found ${nvmrc})`);
assert(rootPkg.engines?.node === '>=22.22.2', 'root package Node engine must be >=22.22.2');
assert(backendPkg.engines?.node === '>=22.22.2', 'backend package Node engine must be >=22.22.2');
assert(!Object.keys(backendPkg.scripts).some((k) => k.includes('node20')), 'obsolete Node 20 scripts remain');
assert(!('backup' in backendPkg.scripts) && !('backup:status' in backendPkg.scripts), 'broken legacy backup package scripts remain');
assert(!fs.existsSync(path.join(root, 'backend/scripts/backup.js')), 'obsolete backend backup script still exists');

const activeFiles = [
  'backend/.env.test.example',
  'backend/TESTING.md',
  'backend/config/monitoring.js',
  'backend/config/opentelemetry.js',
  'backend/config/metrics.js',
  'scripts/dev-setup.sh',
  'scripts/dev-setup.bat',
  'scripts/backup-database.sh',
  'scripts/backup-database.bat',
  'docs/DEPLOYMENT.md',
  'docs/GITHUB_SECRETS_GUIDE.md',
  'docs/OBSERVABILITY.md',
  'DISASTER_RECOVERY.md',
];

for (const file of activeFiles) {
  const content = read(file);
  assert(!/\bMONGO_URI\s*=|mongodb:\/\/|mongodb\+srv:\/\/|\bNode 20\b|node20|MongoDB Atlas|MongoDB backup/i.test(content), `${file} contains an obsolete MongoDB/Node 20 operational reference`);
}

const sh = read('scripts/backup-database.sh');
const bat = read('scripts/backup-database.bat');
assert(sh.includes('supabase db dump') && sh.includes('SUPABASE_DB_URL'), 'POSIX backup helper is not Supabase-backed and fail-closed');
assert(bat.includes('supabase db dump') && bat.includes('SUPABASE_DB_URL'), 'Windows backup helper is not Supabase-backed and fail-closed');

if (failures.length) {
  console.error('PHASE 26 SUPABASE RUNTIME VALIDATION: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PHASE 26 SUPABASE RUNTIME VALIDATION: PASS');
console.log('Node baseline: 22.22.2');
console.log('Active runtime/ops paths: Supabase/PostgreSQL');
console.log('MongoDB operational dependency: removed');
console.log('Backup contract: supabase db dump + explicit SUPABASE_DB_URL');
