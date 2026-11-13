# KAYAD incremental corrected project package — 2026-11-10

## Baseline
Built from the user-provided `KAYAD-main (3)(1).zip` archive (uploaded 2026-11-10 17:20 UTC; 3,795 ZIP entries). The original project root `KAYAD-main/` and directory structure are preserved.

## Incremental corrections merged
- `backend/services/accountCapabilities.service.js`: keeps the legacy `individual_seller` pending marker from incorrectly disabling the independent buyer capability; suspended/rejected identity statuses remain inactive.
- `backend/middleware/dealerVerification.js`: personal seller capability is not treated as dealership identity; stale Dealer / DealerVerification records no longer block a valid personal seller. Legacy records are not mutated.
- `backend/services/onboardingPolicy.service.js`: direct personal-seller publication now requires email verification, free package mode and appropriate approval state; suspension/revocation is enforced; missing capability table is tolerated only when approval is not required; dealer approval path remains distinct.
- `backend/tests/regression/phase13dDealerIsolation.test.js`: expanded personal-seller isolation regression coverage.
- `backend/tests/regression/phase13eSellerCapability.test.js`: expanded direct-publication policy coverage.
- `backend/tests/regression/phase13fAccountCapabilities.test.js`: new buyer-capability independence regression tests.
- `PRIVATE_SELLER_REPAIRS_APPLY_AND_TEST.txt`: application and test instructions.

## Validation performed for this package
- Both source ZIPs passed archive integrity checks before extraction.
- JavaScript syntax check (`node --check`) passed for all six merged JavaScript files.
- Final ZIP integrity and file listing checked after packaging.

## Not claimed / outstanding
- Jest tests were not executed in this packaging environment.
- Full frontend/backend install, lint, build, browser/device tests and live Supabase tests were not executed.
- No database migrations or production database changes are included or applied.
- No Git commit, push, or deployment was performed.
- The live registration RPC stub and missing `private_seller_capabilities` table remain separate production blockers; do not replay migrations blindly. Reconcile against the live schema and validate on staging first.
