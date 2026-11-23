# Changed files versus baseline 0a3cc4ad (not committed)
Code: `backend/db/index.js` ($or operators) · `backend/controllers/dealerPlatformController.js` (atomic invitation claim) · `src/pages/dealer/DealerTeamInvite.jsx` (visible shared Button, styled link).
Tests: `backend/tests/regression/dbOrRangeOperators.test.js` (new, 6) · `backend/tests/regression/dealerTeamLeastPrivilege.test.js` (+2, mock `updateMany`) · `src/__tests__/pages/dealer/DealerTeamInvite.test.tsx` (+4).
Docs: everything under `docs/handover/PRODUCTION-READINESS-20261123/` (evidence/ includes final test outputs).
No migration, financial, or production file changed.
