# Changed files versus origin baseline (not committed by Claude)
Code: `backend/controllers/dealerPlatformController.js` (atomic claim, resend rollback, explicit 404, fingerprint logs) · `src/pages/dealer/DealerTeamInvite.jsx` (visible button, already-used state, clearer 404) · `src/pages/dealer/dashboard/DealerTeamPanel.tsx` (resend messages) · `backend/db/index.js` ($or operators, already on the release branch).
Tests: `backend/tests/regression/dealerTeamInvitationLifecycle.test.js` (new, 13) · `dealerTeamLeastPrivilege.test.js` · `dbOrRangeOperators.test.js` · `src/__tests__/pages/dealer/DealerTeamInvite.test.tsx` (12) · `ci/db-journeys/17_team_invitation_lifecycle.mjs` (B5-B7) · `ci/browser/team-invitation.mjs` (new real-browser journey).
Docs: everything under `docs/handover/PRODUCTION-READINESS-20261123/` (evidence includes browser screenshots).
No migration, financial, or production file changed.
