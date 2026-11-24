# 17 — Changed files inventory (working tree vs HEAD 5bbf2843, 2026-11-24)

Generated from `git status --short`. **Nothing is staged or committed.** The list covers the whole uncommitted tree (earlier tasks A–G plus this closure). Files created or changed *by this closure* are marked ★ in the notes below the table of groups.

## Groups
| Area | Files |
|---|---|
| backend/config | 1 |
| backend/controllers | 5 |
| backend/middleware | 4 |
| backend/node_modules | 1 |
| backend/routes | 19 |
| backend/server.js | 1 |
| backend/services | 8 |
| backend/tests | 23 |
| backend/utils | 1 |
| ci/browser | 8 |
| ci/db-journeys | 17 |
| node_modules/ | 1 |
| public/hero | 1 |
| reports/ADMIN-CONSOLE | 1 |
| scripts/admin-audit-matrix.mjs | 1 |
| scripts/admin-audit-notes.json | 1 |
| scripts/admin-closure-route-certification.mjs | 1 |
| scripts/admin-completion-matrix.mjs | 1 |
| scripts/admin-completion-notes.json | 1 |
| scripts/admin-ownership-matrix.mjs | 1 |
| src/App.tsx | 1 |
| src/__tests__ | 25 |
| src/api | 2 |
| src/components | 5 |
| src/context | 1 |
| src/features | 8 |
| src/pages | 17 |
| src/services | 2 |
| src/styles | 2 |
| src/utils | 3 |
| supabase/migrations | 5 |

## Closure-specific changes ★
* ★ `src/utils/authRoutes.ts`, `src/__tests__/utils/authIntent.test.ts` — role-aware landing
* ★ `src/components/navigation/PageJourneyNavigation.tsx`, `src/components/admin/AdminLayout.tsx`, `src/App.tsx` — admin navigation
* ★ `src/utils/permissions.ts`, `src/context/AuthContext.tsx`, `src/features/AdminSystemHealthPanel.tsx`, `src/features/AdminView.tsx` — guard + health tile
* ★ `backend/services/privateSellerCapability.service.js`, `backend/routes/privateSellerCapabilityRoutes.js`, `src/services/privateSellerCapabilityApi.ts`, `src/pages/admin/AdminPersonalAccounts.tsx`, `src/pages/admin/AdminUsers.jsx`, `src/components/admin/AdminRouteSurface.tsx` — Personal Accounts
* ★ `supabase/migrations/20261124120000_dealer_suspension_requests.sql`, `backend/services/dealerSuspensionRequest.service.js`, `backend/controllers/verificationController.js`, `backend/routes/verificationRoutes.js`, `backend/routes/adminRoutes.js`, `src/api/api.exports.ts`, `src/pages/admin/AdminDealerVerifications.jsx` — dealer suspension
* ★ `backend/routes/ntsaVerificationRoutes.js` — NTSA permission
* ★ `backend/routes/bidRoutes.js`, `adSlotRoutes.js`, `walletRoutes.js`, `adminRoutes.js` (referrals, system/health) — read-side permission tightening (journey 32 finding)
* ★ `backend/services/review.service.js` — review moderate/delete dealer-id defect
* ★ Tests: `src/__tests__/{components,context,features,pages}/…` (PageJourneyNavigationAdmin, RequireAdminPageGuard, adminHealthTileGate, AdminPersonalAccounts, DealerSuspensionWorkflow, adminTables, adminOperationalFailureMatrix) and backend `stage5f5AdminStatsContract`, `stage5f5RoleRouteMatrix`, `dealerIndependentApproval`
* ★ Journeys/scripts: `ci/db-journeys/30_…`, `31_…`, `32_…`, `run.sh`; `ci/browser/admin-closure.mjs`, `admin-sweep.mjs`, `admin-a11y.mjs`; `scripts/admin-closure-route-certification.mjs`
* ★ Docs: `docs/admin-console-closure/00…19`, `route-classification.json`, `evidence/**`

## Attention before staging
* Four tracked files show as **deleted** in the working tree and were not deleted by this closure: `docs/handover/PRODUCTION-READINESS-20261123/{CI-DB-JOURNEYS,DEPLOYMENT-TOPOLOGY,LISTING-RPC-COMPATIBILITY,LOGIN-ROOT-CAUSE}.md`. Decide deliberately whether to keep the deletion; do not stage them by accident.
* Evidence PNGs/JSON add weight; stage `docs/admin-console-closure/evidence` only if wanted in the repo.

## Full list
```
 M backend/config/featureFreezePolicy.js
 M backend/controllers/chatController.js
 M backend/controllers/dealerPlatformController.js
 M backend/controllers/reportController.js
 M backend/controllers/securityLogController.js
 M backend/controllers/verificationController.js
 M backend/middleware/dealerOrgAccess.js
 M backend/middleware/dealerWorkspace.js
 M backend/middleware/rateLimiter.js
 M backend/routes/adSlotRoutes.js
 M backend/routes/adminRoutes.js
 M backend/routes/aiDecisionRoutes.js
 M backend/routes/aiPlatformRoutes.js
 M backend/routes/automationRoutes.js
 M backend/routes/bidRoutes.js
 M backend/routes/cmsRoutes.js
 M backend/routes/configurationRoutes.js
 M backend/routes/dealerPlatformRoutes.js
 M backend/routes/dealerRoutes.js
 M backend/routes/digitalTwinRoutes.js
 M backend/routes/lowCodeRoutes.js
 M backend/routes/ntsaVerificationRoutes.js
 M backend/routes/privateSellerCapabilityRoutes.js
 M backend/routes/securityLogRoutes.js
 M backend/routes/verificationRoutes.js
 M backend/routes/vxpRoutes.js
 M backend/routes/walletRoutes.js
 M backend/routes/xosRoutes.js
 M backend/server.js
 M backend/services/dealerApproval.service.js
 M backend/services/dealerTeamRoles.service.js
 M backend/services/email.service.js
 M backend/services/privateSellerCapability.service.js
 M backend/services/review.service.js
 M backend/tests/inspection/dealerInspectionPrivacy.test.js
 M backend/tests/regression/dealerIndependentApproval.test.js
 M backend/tests/regression/dealerProfileAndTeamAuthorization.test.js
 M backend/tests/regression/dealerTeamInvitationLifecycle.test.js
 M backend/tests/regression/dealerTeamLeastPrivilege.test.js
 M backend/tests/regression/dealerTeamRoles.test.js
 M backend/tests/regression/dealerTeamRoutePolicyMatrix.test.js
 M backend/tests/regression/dealerWorkspaceDelegation.test.js
 M backend/tests/regression/featureFreezeEnforcement.test.js
 M backend/tests/regression/phase13dDealerIsolation.test.js
 M backend/tests/regression/stage3aReportQueueGuards.test.js
 M backend/tests/regression/stage4aGateClosure.test.js
 M backend/tests/regression/stage5f5AdminStatsContract.test.js
 M backend/tests/regression/stage5f5RoleRouteMatrix.test.js
 M ci/browser/team-invitation.mjs
 M ci/db-journeys/16_isolation_and_sessions.mjs
 M ci/db-journeys/17_team_invitation_lifecycle.mjs
 M ci/db-journeys/18_dealer_command_centre.mjs
 M ci/db-journeys/99_browser_hold.mjs
 M ci/db-journeys/run.sh
 M docs/handover/PRODUCTION-READINESS-20261123/CHANGED-FILES.md
 D docs/handover/PRODUCTION-READINESS-20261123/CI-DB-JOURNEYS.md
 D docs/handover/PRODUCTION-READINESS-20261123/DEPLOYMENT-TOPOLOGY.md
 M docs/handover/PRODUCTION-READINESS-20261123/INVITATION-ACCEPTANCE-AUDIT.md
 D docs/handover/PRODUCTION-READINESS-20261123/LISTING-RPC-COMPATIBILITY.md
 D docs/handover/PRODUCTION-READINESS-20261123/LOGIN-ROOT-CAUSE.md
 M docs/handover/PRODUCTION-READINESS-20261123/README.md
 M docs/handover/PRODUCTION-READINESS-20261123/TEST-RESULTS.md
 M docs/handover/PRODUCTION-READINESS-20261123/evidence/browser-invitation-run.txt
 M docs/handover/PRODUCTION-READINESS-20261123/evidence/browser-invitation/01-owner-pending.png
 M docs/handover/PRODUCTION-READINESS-20261123/evidence/browser-invitation/04-owner-after-accept.png
 M docs/handover/PRODUCTION-READINESS-20261123/evidence/browser-invitation/results.json
 M docs/handover/PRODUCTION-READINESS-20261123/evidence/jest-final-full.txt
 M docs/handover/PRODUCTION-READINESS-20261123/evidence/journeys-final.txt
 M docs/handover/PRODUCTION-READINESS-20261123/evidence/vitest-final-full.txt
 M src/App.tsx
 M src/__tests__/components/admin/AdminShell.test.tsx
 M src/__tests__/components/admin/AdminSidebarOrganization.test.tsx
 M src/__tests__/features/DealershipWorkspace.test.tsx
 M src/__tests__/features/adminCommandCentre.test.tsx
 M src/__tests__/pages/AdminPrivateSellerApplications.test.tsx
 M src/__tests__/pages/admin/AdminBroadcast.test.jsx
 M src/__tests__/pages/admin/AdminSettingsOnboarding.test.jsx
 M src/__tests__/pages/admin/adminOperationalFailureMatrix.test.jsx
 M src/__tests__/pages/admin/adminTables.test.jsx
 M src/__tests__/pages/dealer/DealerSectionContracts.test.tsx
 M src/__tests__/pages/dealer/DealerTeamInvite.test.tsx
 M src/__tests__/pages/dealer/DealerTeamRolesPanel.test.tsx
 M src/__tests__/pages/dealer/DealerWorkflowWrites.test.tsx
 M src/__tests__/pages/dealer/DealerWorkspaceNavigation.test.tsx
 M src/__tests__/utils/adminLoadFailure.test.ts
 M src/__tests__/utils/authIntent.test.ts
 M src/api/api.exports.ts
 M src/api/httpClient.ts
 M src/components/OnboardingFlow.tsx
 M src/components/admin/AdminLayout.tsx
 M src/components/admin/AdminRouteSurface.tsx
 M src/components/admin/AdminSidebar.tsx
 M src/components/navigation/PageJourneyNavigation.tsx
 M src/context/AuthContext.tsx
 M src/features/AdminAlertsPanel.tsx
 M src/features/AdminDepartmentCapabilities.tsx
 M src/features/AdminSystemHealthPanel.tsx
 M src/features/AdminView.tsx
 M src/features/DealershipWorkspace/DealershipWorkspace.tsx
 M src/features/DealershipWorkspace/useMyDealership.ts
 M src/features/admin-command-centre.css
 M src/pages/admin/AdminBroadcast.jsx
 M src/pages/admin/AdminDealerVerifications.jsx
 M src/pages/admin/AdminEscrowCustody.jsx
 M src/pages/admin/AdminPrivateSellerApplications.tsx
 M src/pages/admin/AdminSecurityLog.jsx
 M src/pages/admin/AdminSettingsOnboarding.jsx
 M src/pages/admin/AdminUsers.jsx
 M src/pages/admin/WebhoistOverview.jsx
 M src/pages/admin/components/AdminStaffOrgChart.jsx
 M src/pages/dealer/DealerTeamInvite.jsx
 M src/pages/dealer/dashboard/CommandCentrePanel.tsx
 M src/pages/dealer/dashboard/DealerDashboard.tsx
 M src/pages/dealer/dashboard/DealerTeamPanel.tsx
 M src/services/dealerPlatformApi.js
 M src/services/privateSellerCapabilityApi.ts
 M src/styles/dark-theme.generated.css
 M src/styles/kayad-admin-shell.css
 M src/utils/adminLoadFailure.ts
 M src/utils/authRoutes.ts
 M src/utils/permissions.ts
?? backend/middleware/provisioningGuard.js
?? backend/node_modules
?? backend/services/dealerEmployment.service.js
?? backend/services/dealerSuspensionRequest.service.js
?? backend/services/dealerTemporaryDuties.service.js
?? backend/tests/regression/adminConsoleCompletionGuards.test.js
?? backend/tests/regression/authIdentitySource.test.js
?? backend/tests/regression/dealerApprovalReleasesHeldListings.test.js
?? backend/tests/regression/dealerEmploymentLifecycle.test.js
?? backend/tests/regression/dealerLaunchFlowsContracts.test.js
?? backend/tests/regression/dealerOrgSelector.test.js
?? backend/tests/regression/dealerTemporaryDuties.test.js
?? backend/tests/regression/emailIdentity.test.js
?? backend/tests/regression/teamInvitationEmails.test.js
?? backend/utils/emailIdentity.js
?? ci/browser/admin-a11y.mjs
?? ci/browser/admin-closure.mjs
?? ci/browser/admin-console.mjs
?? ci/browser/admin-sweep.mjs
?? ci/browser/convergence.mjs
?? ci/browser/dealer-launch.mjs
?? ci/browser/team-employment.mjs
?? ci/db-journeys/21_invitation_first_onboarding.mjs
?? ci/db-journeys/22_employment_lifecycle.mjs
?? ci/db-journeys/23_dealer_launch_flows.mjs
?? ci/db-journeys/24_scope_correction.mjs
?? ci/db-journeys/25_temporary_duties_bulk.mjs
?? ci/db-journeys/26_admin_console.mjs
?? ci/db-journeys/27_customer_care.mjs
?? ci/db-journeys/28_support_and_moderation.mjs
?? ci/db-journeys/29_permission_matrix.mjs
?? ci/db-journeys/30_personal_accounts_and_dealer_suspension.mjs
?? ci/db-journeys/31_admin_workflow_closure.mjs
?? ci/db-journeys/32_route_api_authorization.mjs
?? docs/admin-console-closure/
?? docs/handover/ADMIN-CONSOLE-20261124/
?? docs/handover/ADMIN-CONSOLE-COMPLETION-20261124/
?? docs/handover/CONVERGENCE-20261123/
?? docs/handover/DEALER-LAUNCH-20261123/
?? docs/handover/PRODUCTION-READINESS-20261123/DEALER-TEAM-ONBOARDING-AND-PRIVACY-AUDIT.md
?? docs/handover/PRODUCTION-READINESS-20261123/MERGE-RECONCILIATION.md
?? docs/handover/PRODUCTION-READINESS-20261123/evidence/backend-jest-full-v5-2026-11-23.txt
?? docs/handover/PRODUCTION-READINESS-20261123/evidence/browser-invitation-v2-run.txt
?? docs/handover/PRODUCTION-READINESS-20261123/evidence/browser-invitation-v2/
?? docs/handover/PRODUCTION-READINESS-20261123/evidence/browser-invitation/08-wrong-account-desktop.png
?? docs/handover/PRODUCTION-READINESS-20261123/evidence/browser-invitation/09-wrong-account-mobile.png
?? docs/handover/PRODUCTION-READINESS-20261123/evidence/build-final.txt
?? docs/handover/PRODUCTION-READINESS-20261123/evidence/vitest-full-v5-2026-11-23.txt
?? docs/handover/SCOPE-CORRECTION-20261123/
?? docs/handover/TEAM-EMPLOYMENT-20261123/
?? node_modules
?? public/hero/kayad-showroom-backdrop.svg
?? reports/ADMIN-CONSOLE/
?? scripts/admin-audit-matrix.mjs
?? scripts/admin-audit-notes.json
?? scripts/admin-closure-route-certification.mjs
?? scripts/admin-completion-matrix.mjs
?? scripts/admin-completion-notes.json
?? scripts/admin-ownership-matrix.mjs
?? src/__tests__/components/PageJourneyNavigationAdmin.test.tsx
?? src/__tests__/context/RequireAdminPageGuard.test.tsx
?? src/__tests__/features/adminHealthTileGate.test.tsx
?? src/__tests__/onboarding/OnboardingInvitation.test.tsx
?? src/__tests__/pages/AdminPersonalAccounts.test.tsx
?? src/__tests__/pages/admin/DealerSuspensionWorkflow.test.jsx
?? src/__tests__/pages/dealer/DealerLaunchUi.test.tsx
?? src/__tests__/pages/dealer/StaffEmployment.test.tsx
?? src/__tests__/utils/adminPageAccessMirror.test.ts
?? src/features/DealershipWorkspace/StaffProfile.tsx
?? src/pages/admin/AdminPersonalAccounts.tsx
?? src/pages/dealer/dashboard/LeadConversation.tsx
?? src/pages/dealer/dashboard/VehicleRequestsPanel.tsx
?? src/pages/dealer/dashboard/team/
?? supabase/migrations/20261123200000_dealer_employment_and_staff_identity.sql
?? supabase/migrations/20261123210000_lead_create_find_before_insert.sql
?? supabase/migrations/20261123220000_dealer_temporary_duties.sql
?? supabase/migrations/20261124100000_admin_customer_care_and_market_tables.sql
?? supabase/migrations/20261124120000_dealer_suspension_requests.sql
```
