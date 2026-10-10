# KAYAD Recovery Build-Stabilization Package

This package is based on the recovered Phase 39 source tree, which already contains the Phase 38 transaction-boundary cleanup and Phase 39 Socket.IO authorization hardening. It then applies the build/test regressions identified during the Phase 37 forensic review.

## Important

- Git metadata is intentionally NOT included. Keep the existing `.git` directory in `C:\Users\hp\Desktop\KAYAD-main`.
- The package includes the exact files that were removed during the recovered Phase 38/39 work. If extracting over an existing checkout, run `APPLY_RECOVERY_TO_REPO.cmd` afterward so those deletions are applied.
- No `git reset`, `git clean`, force push, or history rewrite is required.

## Recovered fixes

- Restored `login`, `register`, and `updateProfile` in `src/services/authApi.ts` using the canonical transport and real `/api/v1/auth/*` routes.
- Fixed the relocated `DealerBusinessView` import.
- Fixed fixture type import depths and retired the orphan `AuctionCalendar` test.
- Removed remaining fabricated private-seller offer/inquiry/sales counters.
- Removed the false financed-vehicle presentation and replaced it with an honest backend-unavailable state.
- Removed synthetic payment wallet balances and duplicate imports.
- Restored missing inspection types.
- Made notification type handling compatible with the backend notification payload.
- Added a fail-closed smart-action handler in the unified communications hub.
- Repaired stale mobile/CMS/component relative imports.
- Removed stale CMS component re-exports from the API service module.
- Fixed backend test contracts to match the current fail-closed M-Pesa and atomic-settlement architecture.
- Added `npm run validate:recovery`.

## Validation completed in this environment

- Recovery validator: PASS (16 checks)
- Phase 37 validator: PASS
- Phase 38 validator: PASS
- Phase 39 validator: PASS
- Relative-import audit: PASS (0 missing relative imports)
- Targeted TypeScript unresolved-name audit: PASS for source files
- Changed backend/test JavaScript syntax checks: PASS

A full dependency-backed `npm run build` / `npm run test` could not be executed here because this environment does not have the repository's complete dependency tree and the package requires Node >=22.22.2 while the available runtime is Node 22.16.0. Run those two commands on the Windows development machine after extraction.
