# File change register (R2 to this release)

Source of truth: `diff -r` of the untouched R2 archive against this tree (node_modules, dist excluded).

| # | File | Change | Why | Tests |
|---|---|---|---|---|
| 1 | `backend/middleware/accountLockout.js` | Modified | Tracked, unref'd, cancellable cleanup timers; same limits | `tests/stage5c/ipKeyingAndThrottling.test.js` (13) |
| 2 | `backend/tests/stage5c/ipKeyingAndThrottling.test.js` | Modified (+4 tests, `afterEach`/`jest` imports) | Timer hygiene and 15-minute window | itself |
| 3 | `backend/controllers/authController.js` | Modified | **Retires `individual_seller` for new accounts** (maps to `user`; log, `Deprecation` header, `compatibility` note; removes seller-policy gates from registration, keeps dealer gates) | registration suites (1,125 passed across 45 suites) |
| 4 | `backend/tests/regression/stage5RegistrationAndLifecycle.test.js` | Modified | Rewritten to the retired-role rule; adds source-level guard | itself (29) |
| 4b | `backend/tests/regression/stage4IdentityLifecycle.test.js`, `backend/tests/registrationSafety.e2e.test.js`, `backend/tests/security/securityCertification.test.js` | Modified (assertions updated) | Previously pinned `individual_seller` creation; now assert the personal-account mapping | themselves |
| 3b | `backend/utils/stepUp.js`, `src/pages/Profile.tsx` | Modified | Personal account is payout-capable: phone-change step-up in API and UI | `accountSecurityPaymentReadiness`, parity test |
| 3c | `backend/services/escrowCapability.service.js`, `backend/services/escrowConfiguration.service.js` | Modified | `user` eligible for escrow capability/validation (still needs staff grant) | `escrowCapability.service` (25), parity test |
| 3d | `backend/routes/ownershipRoutes.js` | Modified | Passport creation allowed for `user` (ownership enforced in service) | parity test |
| 3e | `backend/tests/regression/unifiedPersonalAccountParity.test.js` | **New** (16 tests) | Proves seller-side parity and no buyer-side role split | itself |
| 3f | `backend/tests/escrow/escrowCapability.service.test.js`, `backend/tests/regression/accountSecurityPaymentReadiness.test.js` | Modified | Assertions that pinned the old rule now assert the unified rule | themselves |
| 3g | `backend/middleware/auth.js` | Modified | Removed unused `buyerOnly` / `privateSellerOnly` role gates | parity test (guard) |
| 3h | `backend/services/accountCapabilities.service.js` | Modified | Canonical `personal { buying, selling }`; `buyer`/`privateSeller` flagged deprecated; dealers never reported as personal | `accountCapabilities` (47), parity test |
| 3i | `src/components/DashboardHub.tsx`, `src/components/Navbar.tsx`, `src/context/AuthContext.tsx`, `src/types.ts`, `src/types/index.ts`, `src/features/OwnershipPlatform/pages/BuyerPlatform.tsx` | Modified | Retire the frontend `buyer` role/labels; one "My Dashboard"; remove dead in-place dealer-upgrade branch | frontend suite 1,573 |
| 3j | 7 frontend tests (`DashboardHubStaff`, `DashboardHubUnifiedAccount`, `Phase13iPersonalAccountStates`, `NavbarStaffMenu`, `roleMapping`, 3 fixtures) | Modified | Assert the new wording/role instead of the retired "buyer" role | themselves |
| 5 | `backend/tests/regression/visitorAnalytics.test.js` | Modified (seed helper only) | Removed wall-clock dependence (failed 00:00 to 01:00 EAT); assertions unchanged | 38/38 |
| 6 | `backend/openapi.yaml` | Modified (+5 operations) | Offer negotiation x4, public dealers directory | governance 1,135/1,135; YAML parses; no duplicate operationIds |
| 7 | `src/components/ErrorBoundary.tsx` | Modified | Removed 4 orphaned JSX closing lines (syntax error) | transpile audit clean |
| 8 | `src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx` | Modified | "Buying & transactions" section, lifecycle counts, "Not published" pill | tsc, build, vitest |
| 9 | `src/features/PrivateSellerPlatform/hooks/useBuyingActivity.ts` | **New** | Real-endpoint counters, "Unavailable" on error | `useBuyingActivity.test.tsx` (4) |
| 10 | `src/utils/listingLifecycle.ts` | **New** | DB status to UX state mapping | `listingLifecycle.test.ts` (11) |
| 11 | `src/__tests__/features/useBuyingActivity.test.tsx` | **New** | | itself |
| 12 | `src/__tests__/utils/listingLifecycle.test.ts` | **New** | | itself |
| 13 | `scripts/validate-stage5f5-private-seller-dashboard.mjs` | Modified | Match refactored nav/image structure, same intent | 11/11 |
| 14 | `scripts/validate-private-seller-workspace-shell.mjs` | Modified | Settings nav key | 13/13 |
| 15 | `audit/20261111/*` | **New** | These reports | n/a |

No migration file was added or edited. No dependency or lockfile changed. Excluded from the ZIP: `node_modules`, `dist`, `logs/`, `backend/data/uploads.sqlite`, `backend/uploads/`, any `.env` (only `.env.example` and `.env.production.example` are kept).

## R7 additions
- NEW `backend/utils/companyName.js`, `backend/tests/regression/dealerCompanyNameRule.test.js`
- `backend/controllers/authController.js` (registration + profile company-name rule), `backend/controllers/dealerPlatformController.js` (profile rule, no personal-name fallback, team accept restricted to personal accounts), `backend/routes/dealerRoutes.js` (onboarding rule, dealers-only applicants), `backend/routes/userRoutes.js` (public name), `backend/routes/adminRoutes.js`, `backend/services/dealerApproval.service.js`, `backend/services/accountCapabilities.service.js`
- Tests updated: dealerApplicationRoutes, dealerPaperworkConvergence, accountCapabilities, dealerOnboardingWriteOrder, dealerRegistrationPending.e2e, stage5RegistrationAndLifecycle, stage4IdentityLifecycle, dealerTeamLeastPrivilege (+2)

## R8 additions
NEW: `backend/middleware/dealerWorkspace.js`, `supabase/migrations/20261112090000_dealer_business_name_uniqueness.sql`, `scripts/audit/legacy-account-review.sql`, tests `dealerWorkspaceDelegation`, `companyNameUniquenessMigration`, `announcementAudienceUnified`.
CHANGED: `backend/routes/dealerPlatformRoutes.js` (17 routes use `dealerWorkspaceAccess`), `backend/controllers/authController.js` (COMPANY_NAME_TAKEN 409), `backend/controllers/announcementController.js` (audiences).

## R9 additions
NEW: `src/features/DealershipWorkspace/{DealershipWorkspace.tsx,useMyDealership.ts}`, tests `src/__tests__/features/DealershipWorkspace.test.tsx`, `src/__tests__/components/DashboardHubDealershipEntry.test.jsx`.
CHANGED: `backend/middleware/dealerWorkspace.js` (+`myWorkspaceHandler`), `backend/routes/dealerPlatformRoutes.js` (+`/my-workspace`), `src/services/dealerPlatformApi.js` (+getMyWorkspace/getInventory), `src/App.tsx`, `src/components/DashboardHub.tsx`, `src/components/Navbar.tsx`; hub test mocks updated (DashboardHubStaff, DashboardHubUnifiedAccount, Phase13iPersonalAccountStates); `dealerWorkspaceDelegation` test (+2).
