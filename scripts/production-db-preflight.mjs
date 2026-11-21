import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

const env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
if (/^VITE_SUPABASE_/m.test(env)) errors.push('Client env template must not carry Supabase settings; the frontend uses the KAYARD API only.');
if (env.includes('service_role') || env.includes('SUPABASE_SERVICE_ROLE_KEY')) errors.push('Server-only service-role credential is exposed in .env.example.');

const workflows = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
if (!workflows.includes('npm ci')) errors.push('CI workflow does not install with npm ci.');

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
if (migrations.length < 40) errors.push(`Expected at least 40 active migrations, found ${migrations.length}.`);
if (migrations.some((f) => !/^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/.test(f))) errors.push('One or more migration filenames violate the production naming contract.');

if (!fs.existsSync(path.join(root, 'render.yaml')) || !fs.readFileSync(path.join(root, 'render.yaml'), 'utf8').includes('healthCheckPath: /health')) errors.push('render.yaml must define healthCheckPath: /health.');

if (errors.length) {
  console.error('Production database preflight failed.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Production database preflight passed.');
for (const warning of warnings) console.warn(`WARN: ${warning}`);
