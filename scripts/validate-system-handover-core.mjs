#!/usr/bin/env node
/**
 * Maintained KAYAD handover gate.
 * Runs the current architecture/source-contract checks that are relevant to
 * the shipping application. Historical validators remain archived and are
 * intentionally not treated as current release gates.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const checks = [
  ['Private seller listing workflow', 'scripts/validate-private-seller-listing-workflow.mjs'],
  ['Private seller workspace shell', 'scripts/validate-private-seller-workspace-shell.mjs'],
  ['Supabase migration preflight', 'scripts/validate-supabase-migrations.mjs'],
  ['Canonical architecture', 'scripts/validate-canonical-architecture.mjs'],
  ['Dependency security floors', 'scripts/validate-dependency-security.mjs'],
  ['Frontend runtime contracts', 'scripts/validate-frontend-runtime-contracts.mjs'],
  ['Backend runtime contracts', 'scripts/validate-backend-runtime-contracts.mjs'],
  ['UI surface convergence', 'scripts/validate-ui-surface-convergence.mjs'],
  ['Mobile menu viewport', 'scripts/validate-mobile-menu-viewport.mjs'],
  ['Marketplace core', 'scripts/validate-marketplace-initiative.mjs'],
  ['Auction transport convergence', 'scripts/validate-auction-transport-convergence.mjs'],
  ['Dealer subscription domain', 'scripts/validate-subscription-domain-e2e.mjs'],
  ['Homepage hero containment', 'scripts/validate-home-hero-premium.mjs'],
  ['API and route documentation convergence', 'scripts/validate-wave3-convergence.mjs'],
];

let failed = 0;
for (const [label, file] of checks) {
  const result = spawnSync(process.execPath, [path.resolve(file)], { encoding: 'utf8', timeout: 30000 });
  const ok = result.status === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) {
    failed += 1;
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) console.error(result.error.message);
  }
}
console.log(`\nKAYAD maintained handover core: ${checks.length - failed}/${checks.length} ${failed ? 'FAILED' : 'PASS'}`);
if (failed) process.exitCode = 1;
