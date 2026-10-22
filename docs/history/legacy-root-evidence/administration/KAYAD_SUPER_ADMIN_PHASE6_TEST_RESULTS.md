# Phase 6 Test Results

Environment: Node `v22.16.0`; npm `10.9.2`; repository requires Node `22.22.2` (`.node-version`, `.nvmrc`) and package engine `>=22.22.2`. `node_modules` absent. `npm ci` NOT RUN because the required runtime could not be obtained in this environment.

| Command | Exit | Result |
|---|---:|---|
| `node scripts/validate-admin-route-convergence.mjs` | 0 | PASS 14/14 |
| `node scripts/validate-business-command-centre-phase04.mjs` | 0 | PASS 13/13 |
| `node scripts/validate-stage5f2-dashboard-data-workflow.mjs` | 0 | PASS 11/11 |
| `node scripts/validate-ui-surface-convergence.mjs` | 0 | PASS 9/9 |
| `node scripts/validate-mobile-navigation-polish-20261012.mjs` | 0 | PASS 36/36 |
| `node scripts/validate-premium-presentation-pass.mjs` | 0 | PASS 16/16 |
| `node scripts/validate-brand-palette-convergence.mjs` | 0 | PASS |
| `node scripts/validate-lucide-icon-exports.mjs` | 1 | BLOCKED: lucide-react not installed |
| `node scripts/validate-phase06-department-capabilities.mjs` (initial) | 1 | Initial failure: brittle exact-string owner-tab contract mismatch; logged in `static-validator-9.log` |
| `node scripts/validate-phase06-department-capabilities.mjs` (after assertion correction) | 0 | PASS 14/14; `department-capabilities-after-validator-fix.log` |
| `npm run typecheck` | 2 | BLOCKED by missing React/Vitest/Node typings and other dependency declarations; cannot certify source compilation |
| `npm run build` | 127 | BLOCKED: `vite: not found` |
| `npm test -- --run` | 127 | BLOCKED: `vitest: not found` |

Detailed logs are in `KAYAD_SUPER_ADMIN_PHASE6_LOGS/`. Browser E2E, actual screenshots and authenticated live-data checks were NOT RUN because the application could not be launched and no authenticated staging browser session was available. Do not interpret static validator passes as runtime certification.
