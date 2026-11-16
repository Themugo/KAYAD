# R16 — Mobile navigation, listing ownership and publishing visibility
**Baseline:** `KAYAD-FULL-CORRECTED-2026-11-14-R15.zip`  
**Prepared:** 14 November 2026  
**Status:** Source-level corrections applied; full runtime certification pending.

## Changes applied

### 1. Mobile navigation consolidation
- The separate account/profile dropdown is hidden below the `sm` breakpoint.
- The existing hamburger drawer remains the single mobile menu and already contains the signed-in account summary, notifications, workspace links and logout.
- Increased mobile bottom-content clearance from 5rem to 7rem plus safe-area and spacing allowance so the fixed five-item dock is less likely to cover filters, buttons or listing content.
- Preserved the existing five destinations and role-aware navigation logic.

### 2. Approved listings not appearing publicly
- Single-listing admin approve/hide now invalidates public listing/search caches immediately after the status write.
- Bulk approve/hide now performs the same public cache invalidation.
- Admin Cars clears the frontend session inventory cache after a successful moderation decision.
- Approval still transitions a listing to `available`; the public listing endpoint continues to enforce its existing public-visibility rules.

### 3. Seller inventory ownership boundary
- The admin single-delete endpoint now returns HTTP 403 `LISTING_OWNER_ACTION_REQUIRED`.
- The bulk admin delete endpoint now returns the same explicit refusal.
- Admin Cars no longer presents a destructive Remove action for seller-owned inventory.
- Platform staff retain the existing approve/hide moderation capability; this is intentionally separate from deleting an owner's listing.
- Duplicate review's legacy `removed` action now hides the listing from public discovery but does not soft-delete the seller's record or stamp `deleted_at`/`deleted_by`.
- Existing owner-scoped listing delete routes remain in place for sellers/dealers.
- The existing user deletion route has a retained-record preflight and refuses deletion when linked business/listing records remain; this was preserved.

### 4. Git conflict and automatic merge behaviour
- Removed `.github/workflows/dependabot-auto-merge.yml`, which enabled auto-merge and attempted a direct squash-merge fallback for Dependabot pull requests.
- Added `docs/handover/GIT_CONFLICT_AND_RELEASE_POLICY_20261114.md` with a safe Windows CMD workflow for non-fast-forward/diverged branches.
- No force-push, branch rewrite, commit, push, merge, deployment or GitHub repository-setting change was performed.
- Important: `deploy.yml` still deploys production on pushes to `main`. Use reviewed pull requests and configure branch protection/required checks in GitHub. Repository-level auto-merge settings are outside this ZIP and must be checked by the repository owner.

## Validation performed

Passed:
- `node scripts/validate-business-ownership-and-mobile-nav.mjs`
- `node scripts/validate-unified-mobile-menu.mjs`
- `node scripts/validate-kayad-navbar-branding.mjs`
- `node --check backend/controllers/duplicateController.js`
- `node --check backend/routes/adminRoutes.js`
- `node --check backend/routes/bulkAdminRoutes.js`
- `node --check backend/controllers/bulkAdminController.js`
- `node --check backend/tests/regression/stage4ListingLifecycle.test.js`
- `node --check backend/tests/regression/stage5aBulkModerationAndDuplicates.test.js`
- `node --check scripts/validate-business-ownership-and-mobile-nav.mjs`

Not run:
- Frontend TypeScript/lint, Vitest, production build, and backend Jest suites were not run.
- The available environment has Node `v22.16.0`; the project requires Node `>=22.22.2`. The first `npm ci` correctly stopped with `EBADENGINE`. A retry with engine strictness disabled did not complete within the execution window. No test/build pass is claimed.
- Real-device browser QA, live API/cache verification, live Supabase checks, and production checks remain pending.

## Required local validation on the user's Windows machine

Use Node `v22.22.2` or later, then from the extracted `KAYAD` root:

```cmd
node -v
npm ci
npm run validate:business-ownership-and-mobile-nav
npm run validate:unified-mobile-menu
npm run validate:kayad-navbar-branding
npm run lint
npm test -- --run
```

Then run the backend regressions from `KAYAD\backend` using that folder's own package manager setup:

```cmd
npm ci
npm run test:jest -- --runInBand tests\regression\stage4ListingLifecycle.test.js tests\regression\stage5aBulkModerationAndDuplicates.test.js tests\regression\stage5OwnerOnboardingSettings.test.js
```

If any command fails, stop and preserve the full output. Do not deploy until the full frontend and backend suites pass and mobile browser checks confirm 320px, 360px, 390px and 430px layouts.

## Change-control statement
This archive is a separate working copy based on R15. It does not change the user's Windows checkout or hosted services. No production database, payment, messaging provider, deployment, commit, push or merge was touched.
