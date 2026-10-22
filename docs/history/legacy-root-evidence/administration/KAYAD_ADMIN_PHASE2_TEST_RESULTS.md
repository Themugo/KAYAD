# KAYAD Admin Phase 2 — Test Results

| Command/check | Result | Output |
|---|---|---|
| `sha256sum -c KAYAD-SUPER-ADMIN-CONTROL-CENTRE-COMPLETION-20261022.zip.sha256` | PASS | Foundation checksum matched |
| `unzip -tq ...` | PASS | No archive errors |
| `node scripts/validate-admin-route-convergence.mjs` | PASS | 14/14 |
| `node scripts/validate-business-command-centre-phase04.mjs` | PASS | 13/13 |
| `node scripts/validate-stage5f2-dashboard-data-workflow.mjs` | PASS | 11/11 |
| TypeScript `transpileModule` on `src/features/AdminView.tsx` | PASS | Zero transpile diagnostics |
| Route source inspection | PASS | `/admin/support`, `/admin/escrows`, `/admin/moderation`, `/admin/dealer-verifications` exist in route registry |
| `npm ci --ignore-scripts --no-audit --no-fund` | BLOCKED | `EBADENGINE`: current Node v22.16.0, required >=22.22.2 |
| `npm ci --engine-strict=false --ignore-scripts --no-audit --no-fund` | BLOCKED | npm registry fetches failed with `EAI_AGAIN`; incomplete install was removed |
| `npm run typecheck` | BLOCKED | Missing dependency type definitions (`react`, `react-dom`, `node`, and others) |
| `npm run build` | BLOCKED | `vite: not found` |
| `npm test -- --run` | BLOCKED | `vitest: not found` |
| Authenticated browser/E2E | NOT RUN | Runtime unavailable |
| Screenshot comparison | NOT VERIFIED | Runtime unavailable |

The source-contract validator was updated because its prior assertions expected an obsolete `destination` object. New assertions validate the actual canonical routes and accessible controls. No test was deleted; checks were not reduced.
