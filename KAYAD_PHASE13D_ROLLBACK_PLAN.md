# KAYAD Phase 13D — Rollback Plan
Nothing was deployed, migrated or committed, so rollback is a source revert only. No data was changed, so there is nothing to restore.

1. **Full revert:** extract the verified foundation ZIP (SHA-256 `2a9b65a53156cd000568b830c5648ddf196639c9c8c4acd8f17674f40003a7ca`) or the 13C ZIP, or restore the six modified files from it, and delete the two new files (`backend/middleware/dealerIsolation.js`, `backend/tests/regression/phase13dDealerIsolation.test.js`).
2. **Per-correction revert** (independent of each other):
   - C-1/C-2/C-5: restore `dealerRoutes.js`, `dealerPlatformRoutes.js`, `searchAnalyticsRoutes.js` (each only gained one import and `dealerBusinessOnly` guards).
   - C-3: restore `listingQualityRoutes.js`.
   - C-4: restore `dealerVerification.js` **and** the original `onboardingFlow.test.js` case (otherwise that updated test would fail). Reverting re-enables auto-provisioned dealership rows.
3. After any revert run `cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand <authz subset>` (list in the validation document).
4. If a release later includes these changes and a legitimate user is blocked: the symptom is a 403 `Dealer access only` on a route in the inventory CSV marked TIGHTENED; revert only that route's guard (step 2) rather than the whole phase. Because no data was altered by the old or new code path, no cleanup is required after revert.
5. Rows created in the past by the old auto-provisioning stay as they were; they are neither removed by the change nor by rollback.
