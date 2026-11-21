import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const typesTarget = path.join(root, 'src', 'types', 'database.ts');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
if (new Set(migrations.map((f) => f.match(/^\d+/)[0])).size !== migrations.length) throw new Error('Duplicate migration timestamps detected.');

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
// GAP-CLI (2026-11-21): pinned. supabase@3.x rejects the [inbucket] section of supabase/config.toml ("no longer supported. Use local_smtp"),
// supabase@2.75.0 parses it (verified: it proceeds to the Docker check). The FULL start/reset/lint/test/gen sequence has not been executed
// because the audit machine has no Docker daemon. Before moving to 3.x, migrate config.toml to local_smtp and re-run the whole sequence.
const SUPABASE_CLI = process.env.SUPABASE_CLI_VERSION || '2.75.0';

function run(args, label) {
  try {
    const out = execFileSync(npxCommand, ['--yes', `supabase@${SUPABASE_CLI}`, ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
    console.log(`${label}: passed`);
    if (out.trim()) console.log(out.trim());
    return out;
  } catch (err) {
    const detail = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim();
    throw new Error(`${label}: failed\n${detail}`);
  }
}

console.log(`Active migration count: ${migrations.length}`);
run(['start'], 'Supabase local start');
run(['db', 'reset', '--local'], 'Local database reset');
run(['db', 'lint', '--local'], 'Local database lint');
run(['test', 'db', '--local'], 'Database regression tests');
const types = run(['gen', 'types', 'typescript', '--local'], 'Local TypeScript generation');
fs.mkdirSync(path.dirname(typesTarget), { recursive: true });
fs.writeFileSync(typesTarget, types);
console.log(`Generated database types: ${typesTarget}`);
