# Phase 17 — Test commands, exit codes and counts

Run from the Phase 17 workspace (node_modules symlinked from the Phase 16D install; nothing added or upgraded). Baseline = Phase 16D.

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | exit 0 |
| Production build | `npx vite build` (baseline and final) | exit 0 both |
| Frontend tests | `npx vitest run` | **125 files, 1008 passed, 1 skipped** (baseline 124 files / 996 passed / 1 skipped; +1 file, +12 tests: 9 classifier, 3 marketplace) |
| Focused | `npx vitest run src/__tests__/features/InventoryFailureStates.test.ts src/__tests__/components/VehicleMarketplace.test.tsx` | 2 files, all passed |
| Validators | every `validate:*` script (143) -> `evidence/data/validators_exit_codes.txt` | **141 pass**; 2 fail exactly as at baseline for missing credentials only: `validate:communications:providers`, `validate:live-runtime`. `validate:mobile-navigation-polish` failed 34/36 after the intentional header/CTA changes, its two pinned strings were updated to the new values -> 36/36. Homepage/nav set all exit 0: `homepage-convergence`, `hero-mobile-assets`, `hero-admin-control`, `frontend-runtime-contracts`, `brand-palette-convergence`, `mobile-navigation-polish`. |
| Changed-file lint | `npx eslint --no-ignore <changed files + runbook scripts>` | **0 errors in application, test and runbook files; 34 warnings**, all in the pre-existing 1,960-line `VehicleMarketplace.tsx` (`no-unused-vars` 22, `set-state-in-effect` 6, `exhaustive-deps` 4, `no-explicit-any` 1, `purity` 1). Not separately baselined; the one possible addition is the `setServerFailure(null)` reset that mirrors the existing `setServerError(null)`. 3 `no-undef` errors exist in the unchanged part of `scripts/validate-mobile-navigation-polish-20261012.mjs` (it is normally ignored by the project lint config; `--no-ignore` surfaces them; pre-existing). |
| Backend tests | **not re-run** | No backend file changed (diff vs checkpoint contains none). Baseline 179 suites / 3153 passed stands for Phase 16D. |
| Real-stack browser | `runbooks/phase17-mobile-landing-20261027/ui/browser_*.cjs` | shots/metrics, six inventory states, featured binding, failed image, axe, nav/history — see responsive results and investigation. Mocks used only for network abort, 403, 504 and one aborted image, all labelled `MOCK`. |
| Naming/manifest | `scripts/validate-repository-naming-and-paths.mjs --base <ckpt> --manifest <file>` | see final report |

Reproduce browser checks: build with `vite build --outDir <dist>`; serve with `ui/test_spa_server.cjs <dist> <port>` (static SPA + `/api` proxy to the backend on 5055); seed `ui/LOCAL_TEST_FIXTURES_ONLY_seed_vehicles.sql` into a **disposable** DB only; then `node ui/browser_shoot.cjs <base> <outDir> <label>`, `browser_states.cjs`, `browser_behaviour.cjs`, `browser_featured.cjs`.
