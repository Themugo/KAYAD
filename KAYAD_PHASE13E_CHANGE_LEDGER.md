# KAYAD Phase 13E — Change Ledger
Compared with the verified 13D foundation (`diff -rq`, excluding `node_modules`, `dist`, test-generated `logs/`/`uploads/`). **8 files modified, 11 added source/test/migration files, 0 deleted, 0 renamed.** `package.json` and lockfiles are unchanged. `src/App.tsx` is unchanged.

## Modified
| Path | Kind | Existing behaviour → new behaviour | Tests | Security / data notes | Rollback |
|---|---|---|---|---|---|
| backend/routes/carRoutes.js | backend | `dealerOnly` on listing writes and two own-data reads → `sellerListingAccess` (dealers/staff delegated to `dealerOnly`) | phase13eSellerCapability; full backend Jest | closes DI-5 for sellers; role-user sellers need an approved capability | restore file |
| backend/middleware/dealerVerification.js | backend | private-seller pass-through for `individual_seller` → also approved role-`user` sellers (no Dealer row created) | 13D + 13E suites, onboardingFlow | no dealer record, no dealer privilege | restore file |
| backend/controllers/carController.js | backend | `isSeller` = `individual_seller` → also approved personal seller (private-seller listing limits/trial rules) | full backend Jest | escrow derivation untouched (role `user` ⇒ no escrow) | restore line 349 |
| backend/routes/adminRoutes.js | backend | seller approval updates `users.status` → also syncs a pending/rejected capability row | n/a beyond import/typing: **INT** (no dedicated test of this handler) | keeps the two approval surfaces consistent | remove import + one line |
| backend/server.js | backend | → mounts `/api/private-seller-capability` | route tests via router | new authenticated surface | remove two lines |
| src/components/DashboardHub.tsx | frontend | seller-only view for `individual_seller` → unified personal dashboard + `SellerCapabilityPanel` | DashboardHubUnifiedAccount, DashboardHubStaff | no seller/dealer controls for other roles | restore file |
| src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx | frontend | workspace only for role `individual_seller`; others "contact support" → capability-driven admission, application panel for personal accounts | PrivateSellerPlatformGate | legacy sellers not regressed | restore file |
| scripts/validate-premium-sell-auth-public-convergence-20261012.mjs | validator | pinned the exact old line `sellerWorkspaceAllowed = normalizedRole === 'individual_seller'` → asserts the capability-aware gate (still requires the role check and `capability.status === 'approved'`) | that validator 23/23 | the old contract is intentionally replaced; not weakened (checks are stricter on the capability) | restore with PrivateSellerPlatform |

## Added
| Path | Why |
|---|---|
| supabase/migrations/20261025100000_private_seller_capability.sql | C1 capability table + idempotent legacy backfill (**not applied**) |
| supabase/rollbacks/20261025100000_private_seller_capability.down.sql | rollback |
| backend/services/privateSellerCapability.service.js | lifecycle, transitions, state resolution |
| backend/middleware/sellerCapability.js | listing-route guard |
| backend/routes/privateSellerCapabilityRoutes.js | apply / me / admin review |
| backend/tests/regression/phase13eSellerCapability.test.js | 25 backend tests |
| src/services/privateSellerCapabilityApi.ts, src/hooks/usePrivateSellerCapability.ts, src/components/SellerCapabilityPanel.tsx | frontend state + UI |
| src/__tests__/components/DashboardHubUnifiedAccount.test.jsx, src/__tests__/features/PrivateSellerPlatformGate.test.tsx | 24 frontend tests |
Plus the 13 `KAYAD_PHASE13E_*` evidence files and `validation-logs/` (documentation, not source).

## Deleted / renamed
None.


## Completion follow-up changes after the original Phase 13E report
### Added source and migration files
- `supabase/migrations/20261025113000_private_seller_listing_visibility.sql` — status-transition trigger and visibility event ledger for hiding/restoring eligible listings; **not applied**.
- `supabase/rollbacks/20261025113000_private_seller_listing_visibility.down.sql` — restore still-hidden policy records and remove trigger/table.
- `src/pages/admin/AdminPrivateSellerApplications.tsx` — dedicated application review UI inside the existing admin shell.
- `src/__tests__/pages/AdminPrivateSellerApplications.test.tsx` — UI tests for list, decisions, reason requirement, confirmation and error state.
- `scripts/validate-phase13e-listing-visibility.mjs` — 14 static contract checks.

### Additional modifications
- `backend/services/privateSellerCapability.service.js` — invalidate public listing caches on suspension/revocation and restoration transitions.
- `src/services/privateSellerCapabilityApi.ts` — typed admin list/decision methods.
- `src/components/SellerCapabilityPanel.tsx` — communicate listing visibility policy in suspended/revoked states.
- `src/components/admin/AdminRouteSurface.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/context/AuthContext.tsx`, `src/utils/permissions.ts` — register the new route, navigation and `MANAGE_USERS` guard.
- `src/__tests__/components/admin/AdminRouteSurface.test.tsx` — register route in canonical route coverage.
- `backend/tests/regression/phase13eSellerCapability.test.js` — service-level test for legacy approval synchronization.
- `package.json` — adds `validate:phase13e-listing-visibility` script.

### Follow-up validation caveat
The original Claude-reported 2,772 backend Jest tests, 832 frontend tests, typecheck and build are pre-follow-up results. They were not rerun after these additional changes because the available Node.js is 22.16.0 (required >=22.22.2) and dependency installation timed out. Static validator 14/14, existing premium sell/auth validator 23/23, migration hygiene (186 files), backend `node --check`, and TS/TSX transpile syntax checks passed.
