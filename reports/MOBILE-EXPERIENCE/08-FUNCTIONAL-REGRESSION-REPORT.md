# 08 — Functional regression report
| Check | Command / method | Result | Evidence |
|---|---|---|---|
| Frontend Vitest (all) | `npx vitest run` | PASS 224 files, 1,879 passed, 1 skipped | run log |
| Typecheck | `npm run typecheck` | PASS | — |
| Build | `npm run build` | PASS | — |
| Brand/PWA validators | `scripts/validate-kayard-brand-identity-phase2`, `-kayad-navbar-branding`, `-pwa-mobile-contract` | PASS (13/13 PWA) | — |
| Browser smoke 390px | Playwright | PASS: 8 cards; category filter (SUV→0 empty, All→8); grid↔list layouts 8/8; View Details opens `?vehicleId=…`; no overflow, no page errors | `/tmp/func.mjs` |
| 15 widths + 4 landscape | `ci/browser/responsive.mjs` | PASS: 34 runs, 0 overflow, 0 errors | `evidence/after/metrics.json` |
| Backend Jest / node:test / DB journeys | NOT RE-RUN | Backend changed only by a one-line icon path (`outputAdapters.js`); previous run on same base: Jest 4,185 passed, journeys PASS | prior FINAL-COMPLETION reports |
| Search, sort, pagination, favourite, contact seller, offer workflow, bottom-nav destinations, refresh of direct routes | NOT TESTED in this pass (code paths unchanged; existing Vitest covers them) | — | — |
