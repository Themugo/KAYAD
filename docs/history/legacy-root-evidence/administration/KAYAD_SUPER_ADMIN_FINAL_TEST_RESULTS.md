# KAYAD Super Admin — Final Test Results

## Foundation
- SHA-256: PASS — expected hash matches actual hash.
- ZIP integrity: PASS — 6,566 entries; no corrupt member found.

## Source validators
- Admin route convergence: PASS, 14/14.
- Business Command Centre Phase 04: PASS, 13/13.
- Stage 5F.1 command-centre layout: PASS, 13/13.
- UI surface convergence: PASS, 9/9.
- Stage 5F.2: NOT RUN; guessed validator path `scripts/validate-stage5f2-command-centre-data-workflow.mjs` was absent.

## Runtime
- Node: BLOCKED; active `v22.16.0`; project `.node-version` and `.nvmrc` specify `22.22.2`.
- Root dependencies: BLOCKED; `node_modules` absent.
- `npm run typecheck`: BLOCKED, exit 2. Missing React/router/icon/type modules and environment types mean diagnostics cannot be interpreted as a reliable clean typecheck.
- `npm run build`: BLOCKED, exit 127, `vite: not found`.
- `npm test -- --run`: BLOCKED, exit 127, `vitest: not found`.
- Authenticated browser E2E: NOT RUN.
- Desktop/tablet/mobile screenshots: NOT RUN.
- Visual pixel/spacing comparison: NOT RUN.

Source validators do not constitute runtime or visual certification.
