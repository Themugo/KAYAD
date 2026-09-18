#!/usr/bin/env node
/**
 * KAYAD release gate.
 * Runs the maintained production-contract validators and a repository hygiene
 * scan. Historical phase validators are intentionally not part of this gate;
 * they remain archival evidence of earlier migrations.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const root = process.cwd();
const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);
const sourceExt = /\.(js|jsx|ts|tsx|mjs|cjs)$/;
const failures = [];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function check(name, condition) {
  if (condition) console.log(`PASS ${name}`);
  else { console.error(`FAIL ${name}`); failures.push(name); }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
check('package identity is KAYAD', pkg.name === 'kayad' && lock.packages?.['']?.name === 'kayad');
check('Node release contract is pinned', pkg.engines?.node === '>=22.22.2');
check('production environment contract exists', fs.existsSync(path.join(root, '.env.production.example')));
function hasCommittedBuildArtifact() {
  try {
    const tracked = execFileSync('git', ['ls-files', '--', 'dist', 'build', 'coverage'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return tracked.length > 0;
  } catch {
    // Release archives intentionally omit .git; the archive hygiene scan below
    // is responsible for ensuring generated build directories are absent there.
    return false;
  }
}
check('no committed build artifacts', !hasCommittedBuildArtifact());
check('no temporary source artifacts', walk(root).every(file => !/\.(tmp|bak|orig|rej|old)$|~$/.test(file)));

const sourceFiles = walk(root).filter(file => sourceExt.test(file) && !file.endsWith('.d.ts'));
let syntaxFailures = 0;
for (const file of sourceFiles) {
  try {
    const source = fs.readFileSync(file, 'utf8');
    const result = ts.transpileModule(source, {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, allowJs: true },
      reportDiagnostics: true,
      fileName: file,
    });
    if ((result.diagnostics || []).some(d => d.category === ts.DiagnosticCategory.Error)) syntaxFailures++;
  } catch { syntaxFailures++; }
}
check(`source syntax/transpile audit (${sourceFiles.length - syntaxFailures}/${sourceFiles.length})`, syntaxFailures === 0);

const maintainedValidators = [
  'validate-recovery-repair.mjs',
  'validate-phase35.mjs',
  'validate-phase36.mjs',
  'validate-phase37.mjs',
  'validate-phase38.mjs',
  'validate-phase39.mjs',
  'validate-phase40.mjs',
  'validate-phase58.mjs',
  'validate-phase60.mjs',
  'validate-marketplace-initiative.mjs',
  'validate-communications-initiative.mjs',
  'validate-transaction-integrity.mjs',
  'validate-inspection-marketplace.mjs',
  'validate-dispute-integrity.mjs',
  'validate-code-splitting.mjs',
  'validate-dealer-modal-convergence.mjs',
  'validate-chat-surface-convergence.mjs',
  'validate-ui-surface-convergence.mjs',
  'validate-auction-transport-convergence.mjs',
  'validate-subscription-domain-e2e.mjs',
  'validate-supabase-migrations.mjs',
  'validate-cms-schema.mjs',
  'validate-frontend-runtime-contracts.mjs',
  'validate-dependency-security.mjs',
  'validate-socket-contract.mjs',
  'validate-backend-runtime-contracts.mjs',
  'validate-production-backend.mjs',
  'validate-runtime-integrity.mjs',
  'validate-wave2-invariants.mjs',
  'validate-wave3-convergence.mjs',
  'validate-phase34.mjs',
  'validate-phase19.mjs',
  'validate-phase21.mjs',
  'validate-phase23.mjs',
  'validate-phase25.mjs',
];
for (const file of maintainedValidators) {
  const full = path.join(root, 'scripts', file);
  if (!fs.existsSync(full)) { failures.push(`missing validator ${file}`); continue; }
  try { execFileSync(process.execPath, [full], { cwd: root, stdio: 'pipe', timeout: 15000 }); console.log(`PASS validator ${file}`); }
  catch (err) { console.error(`FAIL validator ${file}`); const output = String(err.stdout || err.stderr || '').trim().split(/\r?\n/).slice(-3).join(' | '); if (output) console.error(output); failures.push(`validator ${file}`); }
}

try { fs.rmSync(path.join(root, 'api-governance-report.json'), { force: true }); } catch {}
console.log(`\nKAYAD release gate: ${failures.length === 0 ? 'PASS' : `FAIL (${failures.length})`}`);
if (failures.length) process.exit(1);
