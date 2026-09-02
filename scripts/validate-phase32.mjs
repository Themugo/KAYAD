import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const serviceDir = path.join(root, 'src', 'services');
const files = fs.readdirSync(serviceDir).filter((f) => f.endsWith('Api.js'));
const failures = [];
const expectedPrefixes = {
  'aiApi.js': '/ai',
  'automationApi.js': '/automation',
  'cmsApi.js': '/cms',
  'commandCenterApi.js': '/command-center',
  'configApi.js': '/config',
  'dealerPlatformApi.js': '/dealer-platform',
  'digitalTwinApi.js': '/digital-twin',
  'ecpApi.js': '/ecp',
  'eipApi.js': '/integration',
  'ghostCheckersApi.js': '/ghost-checkers',
  'governanceApi.js': '/governance',
  'improvementApi.js': '/improvement',
  'intelligenceApi.js': '/intelligence',
  'lowCodeApi.js': '/lowcode',
  'platformFactoryApi.js': '/platform-factory',
  'vxpApi.js': '/vxp',
  'xosApi.js': '/xos',
};

for (const file of files) {
  const source = fs.readFileSync(path.join(serviceDir, file), 'utf8');
  if (file === 'api.js') continue;
  if (!source.includes("from '../api/httpClient'")) failures.push(`${file}: missing canonical httpClient import`);
  if (/axios\.create\s*\(/.test(source)) failures.push(`${file}: owns a secondary axios client`);
  if (/\baxios\s+from\s+['"]axios['"]/.test(source)) failures.push(`${file}: imports axios directly`);
  const prefix = expectedPrefixes[file];
  if (prefix && !source.includes(prefix)) failures.push(`${file}: expected API prefix ${prefix} not found`);
  if (/\b\w+Api\.(get|post|put|patch|delete)\(/.test(source)) failures.push(`${file}: stale per-service client calls remain`);
}

const httpClient = fs.readFileSync(path.join(root, 'src', 'api', 'httpClient.ts'), 'utf8');
if (!httpClient.includes('axios.create')) failures.push('httpClient.ts: canonical axios client missing');
if (!httpClient.includes('getCsrfHeaders')) failures.push('httpClient.ts: CSRF interceptor missing');
if (!httpClient.includes('VITE_API_URL')) failures.push('httpClient.ts: configured API URL contract missing');

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|mjs|cjs)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(path.join(root, 'src'));
let syntaxFailures = 0;
for (const file of sourceFiles) {
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'ignore' }); }
  catch { syntaxFailures++; failures.push(`syntax: ${path.relative(root, file)}`); }
}

console.log('PHASE 32 FRONTEND TRANSPORT VALIDATION');
console.log(`API service files scanned: ${files.length}`);
console.log(`Canonical axios client count: ${fs.existsSync(path.join(root, 'src', 'api', 'httpClient.ts')) ? 1 : 0}`);
console.log(`JavaScript syntax failures: ${syntaxFailures}`);
if (failures.length) {
  console.error('FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('PASS');
