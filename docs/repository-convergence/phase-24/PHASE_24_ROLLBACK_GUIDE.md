# Phase 24 Rollback Guide

Phase 23 is the authoritative immediate recovery checkpoint and must remain unchanged.

To reverse the Phase 24 structural moves in an isolated working copy:
1. Verify the Phase 23 ZIP against SHA-256 `9275b9a91216b257d4525cf42a7f448f086d1c6fcf7ef19fef2a45b9c8579247`.
2. Restore `load-tests/legacy-api-load-test.js` to `load-test.js` only if rolling back Phase 24 in full.
3. Restore the original `eslint.config.js` from the Phase 23 archive if reverting the associated ignore change.
4. Restore the five visual assets from `evidence/legacy-visual-assets/` to their original root paths if reverting Phase 24 in full.
5. Do not run the historical phase wrappers or any operational scripts as part of recovery.
6. Recompute SHA-256 values and regenerate the manifest after any rollback.

No database, payment, deployment or production state was changed by Phase 24.
