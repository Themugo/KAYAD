# Changed files (working tree vs the pre-v5 base checkout)

Includes BOTH the v5 invitation-first work and this Team & Employment continuation. Continuation-only files are marked ★. Excludes node_modules, build output, journey out/ folders and earlier handover evidence.

M ★ backend/controllers/dealerPlatformController.js
M ★ backend/middleware/dealerOrgAccess.js
M ★ backend/middleware/dealerWorkspace.js
M  backend/middleware/rateLimiter.js
M ★ backend/routes/dealerPlatformRoutes.js
M  backend/routes/dealerRoutes.js
M ★ backend/server.js
A ★ backend/services/dealerEmployment.service.js
M ★ backend/services/dealerTeamRoles.service.js
M  backend/services/email.service.js
M  backend/tests/inspection/dealerInspectionPrivacy.test.js
A ★ backend/tests/regression/dealerEmploymentLifecycle.test.js
A ★ backend/tests/regression/dealerOrgSelector.test.js
M  backend/tests/regression/dealerProfileAndTeamAuthorization.test.js
M  backend/tests/regression/dealerTeamInvitationLifecycle.test.js
M  backend/tests/regression/dealerTeamLeastPrivilege.test.js
M ★ backend/tests/regression/dealerTeamRoles.test.js
M  backend/tests/regression/dealerTeamRoutePolicyMatrix.test.js
M ★ backend/tests/regression/dealerWorkspaceDelegation.test.js
M ★ backend/tests/regression/phase13dDealerIsolation.test.js
A  backend/tests/regression/teamInvitationEmails.test.js
A ★ ci/browser/team-employment.mjs
M  ci/browser/team-invitation.mjs
M ★ ci/db-journeys/16_isolation_and_sessions.mjs
M  ci/db-journeys/17_team_invitation_lifecycle.mjs
M ★ ci/db-journeys/18_dealer_command_centre.mjs
A  ci/db-journeys/21_invitation_first_onboarding.mjs
A ★ ci/db-journeys/22_employment_lifecycle.mjs
M ★ ci/db-journeys/run.sh
A ★ docs/handover/TEAM-EMPLOYMENT-20261123
M  src/App.tsx
M  src/__tests__/features/DealershipWorkspace.test.tsx
A  src/__tests__/onboarding/OnboardingInvitation.test.tsx
M ★ src/__tests__/pages/dealer/DealerSectionContracts.test.tsx
M  src/__tests__/pages/dealer/DealerTeamInvite.test.tsx
M ★ src/__tests__/pages/dealer/DealerTeamRolesPanel.test.tsx
M ★ src/__tests__/pages/dealer/DealerWorkflowWrites.test.tsx
M ★ src/__tests__/pages/dealer/DealerWorkspaceNavigation.test.tsx
A ★ src/__tests__/pages/dealer/StaffEmployment.test.tsx
M ★ src/api/httpClient.ts
M  src/components/OnboardingFlow.tsx
M ★ src/features/DealershipWorkspace/DealershipWorkspace.tsx
A ★ src/features/DealershipWorkspace/StaffProfile.tsx
M ★ src/features/DealershipWorkspace/useMyDealership.ts
M  src/pages/dealer/DealerTeamInvite.jsx
M ★ src/pages/dealer/dashboard/DealerDashboard.tsx
M ★ src/pages/dealer/dashboard/DealerTeamPanel.tsx
A ★ src/pages/dealer/dashboard/team
M ★ src/services/dealerPlatformApi.js
M ★ src/styles/dark-theme.generated.css
A ★ supabase/migrations/20261123200000_dealer_employment_and_staff_identity.sql
