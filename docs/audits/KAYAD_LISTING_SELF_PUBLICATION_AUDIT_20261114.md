# KAYAD R18 — Listing self-publication and business ownership audit

**Baseline:** `KAYAD-FULL-CORRECTED-2026-11-14-R17.zip`  
**Release candidate:** `KAYAD-FULL-CORRECTED-2026-11-14-R18.zip`  
**Date:** 14 November 2026  
**Scope:** Ensure eligible personal sellers and dealer businesses can publish and manage their own listings without per-listing administrator approval.

## 1. Required operating policy

### Personal accounts
- Every eligible personal account (`user`, with `individual_seller` retained only for legacy compatibility) can list vehicles from the same account.
- Private selling remains free by default; no seller application, seller capability approval or per-listing approval is required.
- Email verification remains mandatory before seller actions.
- Explicit account suspension/revocation remains enforceable.
- Existing legacy `private_seller_capabilities` rows with `pending` or `rejected` status no longer create an approval gate. `suspended` and `revoked` remain blocking states.

### Dealer businesses
- Dealer remains a separate business account and retains its own business profile, inventory and ownership boundaries.
- New dealer onboarding defaults to `self_onboarding`.
- A dealer must submit the configured business-verification information. While that verification is `pending` or `under_review`, the dealer can publish and manage its own listings without waiting for an administrator to approve each vehicle or the business application.
- The previous arbitrary three-listing progressive limit has been removed.
- `rejected` and `suspended` dealer verification states remain blocked.
- Sensitive auction, payout, escrow and finance operations retain their stricter verification guards; self-service inventory publication does not grant those privileges.
- Closing dealer onboarding prevents new dealer applications. It does not stop an existing dealer already under verification from managing its own inventory.

### Platform moderation
- New eligible listings are assigned `available` by the server, not by a client-supplied status.
- Administrator moderation remains available after publication for reports, fraud, safety, policy violations and legacy pending records.
- This is not an administrator approval queue for each new listing.

## 2. Code changes

1. `backend/services/onboardingPolicy.service.js`
   - `listingModeration` is fixed to `auto_publish`.
   - `privateSellerApprovalMode` is fixed to `disabled`.
   - `dealerOnboardingMode` defaults to `self_onboarding`; only `self_onboarding` and `closed` can be saved.
   - Legacy stored `hold_for_review`, private-seller `required`, and dealer `approval_required` values normalize to the new self-service defaults without requiring a database migration.
- The personal-seller package setting does not gate dealer listings; dealer entitlements remain a separate control.
   - The shared publication decision admits pending dealers only when the dealer-verification middleware has explicitly admitted a submitted verification record.

2. `backend/middleware/dealerVerification.js`
   - Pending/under-review dealers may access an explicit self-service inventory allowlist after submitting verification.
   - Removed the three-listing cap.
   - Missing verification, rejected verification and suspended verification remain blocked.
   - Sensitive routes are not added to the self-service allowlist.

3. `backend/routes/dealerRoutes.js` and `backend/routes/dealerPlatformRoutes.js`
   - Pending dealers are admitted only through the verification middleware for their own inventory/profile/dashboard routes.
   - Inventory read/update/delete/bulk actions are scoped to the dealer identity and require submitted verification for pending dealers.
   - Approved dealers and authorized staff retain their existing route behavior.

4. `backend/controllers/carController.js` and `backend/controllers/dealerPlatformController.js`
   - New listing status is server-derived.
   - Dealer publication receives the explicit verification context; a pending dealer cannot self-assert verification.

5. `backend/routes/webhookRoutes.js`
   - New dealer webhook inventory records are created as `available`.
   - Webhook requires a verified email, active dealer identity and a submitted/approved dealer-verification record.
   - Public inventory/search caches are invalidated after successful inventory writes.
   - Existing listing moderation status is not overwritten during webhook updates.

6. Admin and dealer UX
   - Removed the admin controls that could re-enable per-listing review or personal seller approval.
   - The admin listing page now explains self-publication and retains safety moderation for flagged/legacy records.
   - Dealer onboarding/dashboard copy explains that inventory can be published while business verification is in progress, while sensitive features remain restricted.

7. Regression coverage
   - Updated onboarding, dealer access, personal seller publication and admin-settings expectations.
   - Added pending-dealer inventory allowlist checks and tests for no three-listing cap.
   - Added `scripts/validate-listing-self-publication.mjs` and `npm run validate:listing-self-publication`.

## 3. Validation results

Source-level checks completed in this workspace:
- Listing self-publication validator: **21/21 PASS**.
- Business ownership/mobile navigation validator: PASS.
- Private seller listing workflow validator: PASS (12 workflow stages).
- Phase 13E listing visibility validator: **14/14 PASS**.
- Registration role matrix validator: **34/34 PASS**.
- System handover core validator: **14/14 PASS**.
- Database contract alignment: **8/8 PASS**.
- Runtime integrity: **7/7 PASS**.
- Write-route coverage: **76/76 PASS**.
- Migration hygiene: **198 migration files scanned; no exact duplicate bodies or duplicate table creators**.
- `node --check` passed for the modified backend JavaScript and validation script files.

## 4. Not certified in this environment

The R17 source archive did not contain installed root or backend `node_modules`. Therefore the following have **not** been run or certified in this pass:
- Full backend Jest suite.
- Backend Vitest suite.
- Frontend Vitest suite.
- Frontend TypeScript check and production Vite build.
- Real browser/device testing of pending dealer registration, verification submission, inventory publication and cross-account ownership.
- Live Supabase/RLS verification, real dealer webhook, or public-cache provider integration test.

Run on Node `>=22.22.2` with network access, install dependencies using the lockfiles, then run the complete root and backend test/build commands before deployment.

## 5. Database and release controls

- No database migration was added. Existing stored onboarding settings are normalized at runtime; the next owner settings save will persist the normalized values.
- No live database was contacted or changed.
- No commit, push, merge, GitHub settings change or deployment was performed.
- Do not treat the source-level validators as a substitute for full Jest/Vitest/build or live verification tests.

## 6. Required manual acceptance tests

1. Register a personal user, verify email, publish a vehicle and confirm public inventory shows it immediately.
2. Confirm the same personal account can edit, hide, mark sold and delete only its own listing.
3. Register a dealer, verify email, complete and submit business verification, then publish more than three vehicles while verification remains pending.
4. Confirm the dealer dashboard and inventory are usable while verification is pending, but auction/payout/escrow/finance actions remain restricted until verification is approved.
5. Confirm another dealer cannot edit, hide, delete or transfer the first dealer's listings.
6. Confirm a rejected or suspended dealer cannot publish, and a reported/unsafe listing can still be hidden by authorized moderation.
7. Confirm new webhook inventory appears publicly after successful sync and public caches refresh.
8. Confirm legacy `hold_for_review`, private-seller `required` and dealer `approval_required` settings normalize to the new policy.

**Release status:** Source-level policy and static validation passed. Full automated and live certification remain pending.
