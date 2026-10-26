# KAYAD Phase 14.1 — Workflow Test Matrix and Execution Evidence

Date: 2026-10-26
Environment: Node.js `v22.16.0`, npm `10.9.2`; project requires Node.js `>=22.22.2`; `.npmrc` sets `engine-strict=true`.

| Check | Result | Evidence / reason |
|---|---|---|
| Foundation ZIP SHA-256 | PASS | Independently calculated hash matched the supplied checkpoint hash |
| Foundation ZIP integrity | PASS | `ZipFile.testzip()` returned no corrupt member |
| Phase 13K source manifest | PASS | All 8,626 recorded files existed and matched their recorded hashes before edits |
| Existing Phase 14 source checks | PASS | Initial checkpoint baseline was 9/9 |
| Expanded Phase 14.1 source checks | PASS | `node runbooks/phase14-20261026/phase14_dealer_dashboard_source_checks.mjs` exited 0; 19/19 checks |
| Source manifest diff review | PASS | Only the intended canonical dashboard source differs from Phase 13K's original source manifest; additive Phase 14.1 evidence files are documented |
| Dependency installation (`npm ci --ignore-scripts --prefer-offline --no-audit --no-fund`) | BLOCKED | Exited 1 with `EBADENGINE`: required Node `>=22.22.2`, actual `v22.16.0`; no engine-strict bypass attempted |
| Typecheck | NOT RUN | Dependency installation blocked by required runtime |
| Production build | NOT RUN | Dependency installation blocked by required runtime |
| Frontend Vitest | NOT RUN | Dependencies unavailable |
| Backend Jest/Vitest and `node:test` suites | NOT RUN | Full runtime/dependency setup unavailable |
| Playwright/Chromium | NOT RUN | Browser dependencies/runtime unavailable |
| Accessibility/axe | NOT RUN | Browser dependencies/runtime unavailable |
| DB-backed dealer authorization / cross-organization tests | NOT RUN | No approved configured test database/service was available |
| Phase 13I–13K full regression suites | NOT RUN | Dependency/runtime setup unavailable; historical Phase 13K results are not represented as rerun |
| `eslint src` / `eslint .` | NOT RUN | Dependencies unavailable |
| Historical `validate:stage5f7-private-auction-contract` | NOT RUN in this pass | Known historical missing-planning-document failure remains recorded in Phase 14 baseline; not altered |

## Source check details
The expanded source contract covers dashboard retry loading, loading-finally behavior, missing-value semantics, locale-formatted revenue, safe inventory values, team empty state, responsive grids, retry-trigger state transitions, analytics unknown values, explicit overview empty states, missing listing status, and active-navigation accessibility state.

## Interpretation
The 19/19 PASS result is a focused source-contract check only. It does not replace TypeScript, build, API, integration, database, browser, or accessibility certification. Full phase status remains PARTIAL because required validation could not run under the repository's declared runtime constraints.
