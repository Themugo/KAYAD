# KAYAD Pre-Phase 8 — Validation Results

## Foundation and static validators

| Check | Command / method | Result |
|---|---|---|
| Foundation SHA-256 | `sha256sum KAYAD-SUPER-ADMIN-PHASE7-SOURCE-EXECUTION-20261023.zip` | PASS — exact expected hash |
| ZIP integrity | `unzip -tq ...` | PASS |
| Phase 1 navigation | `node scripts/validate-super-admin-phase1-navigation.mjs` | PASS — 12/12, exit 0 |
| Phase 2 hero | `node scripts/validate-super-admin-phase2-hero.mjs` | PASS — 13/13, exit 0 |
| Phase 3 foundation | `node scripts/validate-super-admin-phase3-foundation.mjs` | PASS — 12/12, exit 0 |
| Phase 5 gap closure, before correction | `node scripts/validate-phase5-gap-closure.mjs` | FAIL — 14/15, exit 1; stale heading expectation |
| Phase 5 gap closure, after correction | `node scripts/validate-phase5-gap-closure.mjs` | PASS — 15/15, exit 0 |
| Phase 6 right panel | `node scripts/validate-phase6-right-panel.mjs` | PASS — 15/15, exit 0 |
| Phase 7 source contract | `node scripts/validate-super-admin-phase7-cards.mjs` | PASS — 10/10, exit 0 |

## Runtime checks attempted

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test -- --run` | BLOCKED/FAIL — exit 127, `vitest: not found` because dependencies are absent |
| Typecheck | `npm run typecheck` | BLOCKED — exit 2; missing installed React, Vitest and Node type packages; cannot treat these errors as source defects without installing locked dependencies |
| Lint script | `npm run lint` | BLOCKED — exit 2 for the same missing dependency/type declarations; manifest maps lint to `tsc --noEmit` |
| Production build | `npm run build` | BLOCKED/FAIL — exit 127, `vite: not found` |
| Playwright/browser, API integration, responsive/accessibility | Not run | BLOCKED — dependencies and compatible runtime unavailable; no authenticated staging credentials supplied |

## Runtime requirement

Actual Node version: `v22.16.0`; project requires `>=22.22.2`. Full runtime checks must be repeated in a compatible runtime with lockfile-defined dependencies installed. Static validator success is not a substitute for typecheck, tests, build, backend/API or browser validation.
