# KAYAD Phase 14.2 — Validation and Test Matrix

Environment: Node v22.23.4 (meets the `>=22.22.2` engine requirement; Phase 14.1 had v22.16.0), dependencies from the unchanged `package-lock.json` (`node_modules` reused from the identical-lockfile 13E workspace). Baseline = the verified Phase 14.1 source, run in this same environment (`validation-logs-phase14-2/baseline/`). Logs: `validation-logs-phase14-2/`.

| Check | Phase 14.1 baseline (this environment) | Phase 14.2 final | Difference / note |
|---|---|---|---|
| `npx tsc --noEmit` | exit 0 | exit 0 | none (14.1's own report: exit 2, dependencies absent) |
| `npm run build` | not run in baseline | exit 0 | — |
| Frontend Vitest | 110 files, 879 passed, 1 skipped, exit 0 | 111 files, 894 passed, 1 skipped, exit 0 | +1 file, +15 tests (`DealerWorkspaceNavigation.test.tsx`); nothing removed or weakened |
| `eslint src` | exit 0; 0 errors, 1,556 warnings | exit 0; 0 errors, 1,556 warnings | none (the dealer file went from 20 to 19 `no-unused-vars` warnings) |
| Dealer source-contract checks | 19/19 in 14.1 | 26/26 | +7 checks |
| Backend Jest (full) | backend source byte-identical to 14.1 | 160 suites, 2,841 tests passed, exit 0 | single run on the unchanged backend; covers 13D–13K regression suites |
| Validators (`validate:*`, 128 run) | 7 fail | same 7 fail | `communications:providers`, `live-runtime`, `v14:live-certification-contract`, `v14:release-candidate`, `brand-palette-convergence`, `stage24-theme-convergence`, `stage5f7-private-auction-contract`; all 7 fail identically on the 14.1 source (pre-existing, not investigated or altered) |
| Browser (Chromium, real bundle, mocked API) | not run in 14.1 | 28 page views (14 sections × desktop 1280 / mobile 390): 0 load failures, 0 page-level horizontal scroll, 0 axe serious/critical; Back/Forward/Refresh/direct link/keyboard pass | script `runbooks/phase14-2-20261026/dealer_workspace_browser_check.cjs`; **mocked API** |

## Not run
Tablet-width browser pass; `eslint .`; backend Vitest and `node:test` runners; database-backed and live-API tests; Playwright suites under `e2e/`; real-session logout; staging.
No test, validator, lint rule or TypeScript setting was weakened. Two existing source-contract entries were added to, none removed.
