# KAYAD Phase 14.3 — Full Test Command and Exit-Code Matrix

Runtime: Node v22.23.4 (meets `>=22.22.2`); dependencies per the unchanged lockfile; Chromium via Playwright. Logs: `validation-logs-phase14-3/`.

| Command | Exit | Result | Baseline (14.1 source, same environment) | Note |
|---|---|---|---|---|
| `npx tsc --noEmit` | 0 | pass | 0 | |
| `npm run build` | 0 | pass | not run | |
| `npx vitest run` | 0 | 113 files, 909 passed, 1 skipped | 110 files, 879 passed, 1 skipped | +30 tests across 14.2 and 14.3 (15 + 11 + 4); none removed |
| `npx eslint src` | 0 | 0 errors, 1,556 warnings | 0 errors, 1,556 warnings | unchanged |
| Dealer source checks | 0 | 26/26 | 19/19 (14.1 report) | |
| Backend `npm run test:jest` | 0 | 160 suites, 2,841 passed | backend source identical to 14.1 and 14.2 | includes Phase 13D–13K suites (lifecycle, Seller Studio, visibility, saved-search, dealer isolation, auction-registration and public allowlists, VIN/phone hiding, cache invalidation, auth/CSRF) |
| `validate:*` (142 run) | 135 pass, 7 fail | same 7 as baseline | 7 fail | `communications:providers`, `live-runtime`, `v14:live-certification-contract`, `v14:release-candidate`, `brand-palette-convergence`, `stage24-theme-convergence`, `stage5f7-private-auction-contract`; pre-existing, identical on the 14.1 source, not altered |
| Browser: dashboard sections (14.2 script) | pass | 28 views clean | — | mocked API |
| Browser: all dealer routes × desktop/tablet/mobile × dealer and buyer (14.3 script) | pass | dealer routes render; axe 0 on dashboard, onboarding, notifications; auction pages show shared-component contrast findings; buyer redirected to `/` | — | mocked API |

**Not run:** `eslint .`; backend Vitest; `node:test`; database-backed and live-API tests; repo `e2e/` Playwright suites; real-session logout; staging; per-section tablet pass for the 14 dashboard sections; screen-reader testing.
