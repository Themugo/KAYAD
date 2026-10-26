# KAYAD Phase 13K — Verification Report

Local only (disposable PostgreSQL, synthetic data). No staging/production verification.

## Foundation
13J ZIP full SHA-256 matched its sidecar; ZIP integrity clean; extracted; manifest 8578/8578 OK. (Archive was at `/home/claude/j/out/`, not `/home/claude/i/out/` as the prompt stated.) After the patch, the only manifest differences are the 5 intentionally modified source files.

## Certification commands (exit code, seconds)
| Check | Command | Exit | Result |
|---|---|---|---|
| 13K HTTP security suite | `node runbooks/phase13k-20261026/http/phase13k_public_vehicle_security.mjs` | 0 | 276/276 |
| 13J registration suite | `node runbooks/phase13j-20261026/http/phase13j_registration_security.mjs` | 0 | 145/145 |
| Typecheck | `npm run typecheck` | 0 | pass |
| Build | `npm run build` | 0 | pass |
| Backend Jest | `npm run test:jest` | 0 | 160 suites / 2841 tests |
| Backend Vitest | `npm run test:vitest` | 0 | 6 files / 36 tests |
| Backend node:test | `npm run test:node` | 0 | pass |
| Frontend Vitest | `npx vitest run` | 0 | 110 files, 879 pass, 1 skipped |
| validate:phase13e-listing-visibility | npm | 0 | pass |
| validate:migration-hygiene | npm | 0 | pass |
| validate:supabase-migrations | npm | 0 | pass |
| validate:super-admin-phase1-navigation | npm | 0 | pass |
| validate:stage5f7-private-auction-contract | npm | **1** | pre-existing: missing doc `KAYAD_STAGE5F7_PHASE_A_CONTRACT_FREEZE.md`; identical to 13I baseline |
| 13I personal-account matrix | node | 0 | 78/0 |
| 13I public-endpoint exposure | node | 0 | 165/0 |
| Browser journeys (Playwright, desktop 1280 + mobile 390) | `phase13k_ui_journeys.mjs` | 0 | 28/28 (before patch: 21 pass / 7 fail) |

Skipped: 1 frontend Vitest test (pre-existing skip). No test was disabled for this phase.

## Accessibility (axe, detail page, both viewports)
critical=4, serious=3 in total (button-name, label, color-contrast, aria-prohibited-attr). Identical before and after the patch; pre-existing, not changed here (out of scope).

## Known limitations of the evidence
- Pre-existing SPA race: a `/?vehicleId=` deep link on first load can be overwritten by the inventory-list effect in `App.tsx`; it reproduces on unpatched code. The journeys use client-side navigation to avoid it; the product code was not changed.
- Owner/staff full view is certified at API level; the SPA owner flow was only observed.
- Disposable stack has no real CDN/edge cache; cache behavior covers the application Redis cache only.
