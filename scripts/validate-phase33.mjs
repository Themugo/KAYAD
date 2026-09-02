import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const serviceDir = path.join(root, 'src', 'services');
const apiServices = [
  'authApi.ts', 'bidApi.ts', 'inspectionApi.ts', 'loanApi.ts', 'vehicleApi.ts',
  'chatApi.ts', 'escrowApi.ts', 'phoneVerificationApi.ts', 'supportApi.ts',
  'favoriteApi.ts', 'adApi.ts', 'heroApi.ts', 'cmsContentApi.ts',
];
const failures = [];

for (const file of apiServices) {
  const full = path.join(serviceDir, file);
  if (!fs.existsSync(full)) { failures.push(`${file}: missing`); continue; }
  const source = fs.readFileSync(full, 'utf8');
  if (!source.includes("../api/httpRequest")) failures.push(`${file}: missing canonical request adapter`);
  if (/\bfetch\s*\(/.test(source)) failures.push(`${file}: direct fetch remains`);
  if (/axios\.create\s*\(|from ['"]axios['"]/.test(source)) failures.push(`${file}: owns/imports Axios directly`);
  if (/import\s*\{\s*getCsrfHeaders\s*\}/.test(source)) failures.push(`${file}: owns CSRF transport logic`);
}

const helper = fs.readFileSync(path.join(root, 'src', 'api', 'httpRequest.ts'), 'utf8');
const client = fs.readFileSync(path.join(root, 'src', 'api', 'httpClient.ts'), 'utf8');
if (!helper.includes("from './httpClient'")) failures.push('httpRequest.ts: does not delegate to httpClient');
if (!client.includes('axios.create')) failures.push('httpClient.ts: canonical Axios client missing');
if (!client.includes('getCsrfHeaders')) failures.push('httpClient.ts: CSRF interceptor missing');
if (!client.includes('VITE_API_URL')) failures.push('httpClient.ts: API URL contract missing');
if (!client.includes(" : '/api'")) failures.push('httpClient.ts: same-origin /api fallback missing');
if (!helper.includes("path.slice(4)")) failures.push('httpRequest.ts: /api fallback path normalization missing');

const remainingServiceFetches = [];
for (const entry of fs.readdirSync(serviceDir)) {
  if (!/\.(js|ts|jsx|tsx)$/.test(entry)) continue;
  const source = fs.readFileSync(path.join(serviceDir, entry), 'utf8');
  if (/\bfetch\s*\(/.test(source) && entry !== 'uploadService.js') remainingServiceFetches.push(entry);
}
if (remainingServiceFetches.length) failures.push(`service direct fetch remains: ${remainingServiceFetches.join(', ')}`);

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

for (const file of ['package.json', 'backend/package.json']) {
  try { JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
  catch { failures.push(`${file}: invalid JSON`); }
}

console.log('PHASE 33 FRONTEND REQUEST TRANSPORT VALIDATION');
console.log(`Canonical API service modules checked: ${apiServices.length}`);
console.log(`Direct service fetch clients remaining: ${remainingServiceFetches.length}`);
console.log(`JavaScript syntax failures: ${syntaxFailures}`);
if (failures.length) {
  console.error('FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('PASS');
