# 09 — Change ledger (this phase; uncommitted)
Backend: `middleware/auth.js` (optionalAuth reads session cookie); `controllers/dealerPlatformController.js` (profile allowlist, visibility, logo/banner validation and write, image-host policy); `services/communicationGateway.service.js`, `notification.service.js`, `dealershipNotifications.service.js` (new), `leadService.js`, `adminRoutes.js`, `dealerRoutes.js`, `verificationController.js` (previous pass: persistent, targeted notifications).
Database: `supabase/migrations/20261125090000_dealer_public_storefront.sql` (NEW, additive, not applied anywhere).
Frontend: `components/dealer/DealerProfilePage.tsx` (storefront), `App.tsx` (route, showroom link), `utils/knownRoutes.ts`, `pages/dealer/dashboard/DealerSettingsPanel.tsx` (logo/banner/preview), `styles/dark-theme.generated.css` (regenerated).
Tests: `dealershipNotifications.test.js`, `dealerProfileAndTeamAuthorization.test.js` (+5), `dealerApprovalWorkflow.test.js`, `phase13dDealerIsolation.test.js`, `DealerStorefront.test.tsx` (new), journeys 36 (seed fix) and 37 (new), `ci/db-journeys/run.sh`, `ci/browser/launch-storefront-bell.mjs`.
Docs: `docs/launch-readiness/*`, `docs/dealer-dashboard-upgrade/07-FIRST-DEALER-READINESS-AUDIT.md`.
Not changed on purpose: auction/escrow/inspection code, payments, hosted data, the approved homepage, navigation.
