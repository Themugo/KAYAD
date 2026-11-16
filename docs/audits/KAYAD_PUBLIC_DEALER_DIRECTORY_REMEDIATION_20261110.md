# KAYAD public dealer directory remediation — 10 November 2026

## Scope
Addressed the highest-priority public dealer directory findings from the 9 November public-surface audit. Changes are limited to the dealer directory's public data contract, visitor-facing presentation and showroom navigation.

## Changes

1. Added public `GET /api/users/dealers` in `backend/routes/userRoutes.js`.
   - Returns dealer accounts only when `role=dealer`, `status=approved`, `dealerApprovedAt` is present and `isBanned` is not true.
   - Projects only public profile fields: id, display/business name, avatar, location, bio, approval timestamp.
   - Does not return email, phone, password, identity documents or internal account data.
   - Caps the public response at 200 records and applies short-lived public cache headers plus existing dealer-search caching/latency instrumentation.
2. Reworked `DealersView` into a visitor-first public directory.
   - Loads actual records from `/users/dealers` with loading, error/retry and empty states.
   - Removes the management-console toggle from this public surface. Dealer management remains a separate authenticated workspace.
   - Removes the unsupported “100% Audited Sellers” claim and broad claim that all sellers are verified.
   - Shows “KAYAD approved dealer” only when the backend record carries an approval timestamp. Copy explicitly limits what account approval means.
   - Removes unsupported public ratings, review counts, response-time claims and contact details from the card presentation.
3. Updated showroom navigation.
   - The card passes the backend dealer user ID and display name to the app.
   - `App.tsx` sets the existing `dealerScope` and opens Marketplace, which already filters by dealer ID. This avoids ambiguous name-only search results.
4. Added `scripts/validate-public-dealer-directory.mjs` and `npm run validate:public-dealer-directory`.

## Validation performed

- `node --check backend/routes/userRoutes.js` — passed.
- `node scripts/validate-public-dealer-directory.mjs` — passed (15 assertions).
- `node scripts/validate-unified-mobile-menu.mjs` — passed.
- ZIP integrity and SHA-256 recorded at delivery.

## Not certified in this pass

- Frontend TypeScript/lint, Vite production build and Vitest suite were not run: the workspace has no `node_modules`, and the container runtime is Node v22.16.0 while `.node-version` specifies v22.22.2.
- No live API/database call was made. The public endpoint's returned dealer records and production database field availability therefore still require environment-backed verification.
- No browser/device visual QA or authenticated dealer-scoped showroom end-to-end test was run.
- No commit, push or deployment was performed.

## Operational note

The endpoint intentionally returns no fabricated dealers. If the production database has no dealer users satisfying the approval criteria, the directory will correctly show an empty state until real dealer records meet those criteria.
