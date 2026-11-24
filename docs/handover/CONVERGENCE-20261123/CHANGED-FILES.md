# Changed files — convergence (relative to the scope-correction ZIP)
Backend: backend/controllers/dealerPlatformController.js; backend/routes/dealerPlatformRoutes.js; backend/middleware/dealerOrgAccess.js; backend/services/dealerTemporaryDuties.service.js (new)
Migration (not applied): supabase/migrations/20261123220000_dealer_temporary_duties.sql (new)
Frontend: src/pages/dealer/dashboard/DealerDashboard.tsx; src/pages/dealer/dashboard/team/TemporaryDuties.tsx (new); src/pages/dealer/dashboard/team/StaffDetail.tsx; src/pages/dealer/dashboard/team/teamShared.ts; src/services/dealerPlatformApi.js; src/styles/dark-theme.generated.css (regenerated)
Tests: backend/tests/regression/dealerTemporaryDuties.test.js (new); backend/tests/regression/dealerTeamRoutePolicyMatrix.test.js; backend/tests/regression/phase13dDealerIsolation.test.js; src/__tests__/pages/dealer/DealerLaunchUi.test.tsx; src/__tests__/pages/dealer/DealerWorkspaceNavigation.test.tsx; src/__tests__/pages/dealer/StaffEmployment.test.tsx
CI: ci/db-journeys/25_temporary_duties_bulk.mjs (new); ci/db-journeys/run.sh; ci/browser/convergence.mjs (new); ci/browser/dealer-launch.mjs
Docs: docs/handover/CONVERGENCE-20261123/ (new); docs/handover/DEALER-LAUNCH-20261123/evidence/browser (regenerated screenshots)
