# KAYAD Stage 17 — Auto Services Public-Surface Audit

**Date:** 2026-10-12  
**Foundation:** `KAYAD-STAGE16-MESSAGES-NOTIFICATIONS-CONVERGENCE-20261012.zip`  
**Foundation SHA-256:** `809820cde6c613c26cbda7dc98670a6742b488e2566afadebdac4369b66c1fe4`  
**Scope:** Public Auto Services hub, public provider discovery/profile contracts, private inspection records routing, account-switch privacy, and regression checks.

## Executive summary

Stage 17 continues the existing KAYAD architecture. It does not create a new inspection service, provider network, booking API or report store. The public Auto Services page is now a service-discovery surface only. Personal inspection requests, provider bookings, payment status and reports are rendered inside the authenticated My Garage workspace.

The sweep also fixes a client-side account-boundary weakness in the inspection record loader: the prior loader keyed its request lifecycle on a boolean signed-in state, so changing from one authenticated identity to another did not necessarily reload or immediately mask records. The loader is now bound to the account ID, hides records owned by a different identity immediately, and discards stale responses.

Public provider discovery routes were reviewed at source level. Search is server-constrained to active, verified providers in the `ACTIVE` lifecycle and serializes results through an explicit public projection. Public profile lookup independently rejects inactive, unverified or non-active providers. Customer bookings and provider-management routes remain authenticated; provider-management routes also require provider ownership where applicable.

## Changes implemented

### Public Auto Services page

- Removed the public tab strip for `Services`, `My inspections` and `Reports`; public visitors now see service information and discovery actions, not private-record navigation tabs.
- Kept the existing honest service descriptions: independent providers perform repair/inspection work; KAYAD does not promise roadside dispatch or repair booking/payment that is not available.
- Added a signed-in-only call to action to open the user's inspection and report workspace.
- Removed the `My business and affiliations` control from the public service content. The provider application remains a public entry point that requires authentication and review.
- Retained the existing canonical provider finder and taxonomy routes.

### Authenticated My Garage workspace

- Added the existing inspection journey component in account mode inside My Garage.
- The account view provides the existing `My inspections` and `Reports` tabs, merged from the canonical KAYAD inspection order API and authenticated provider-bookings API.
- Existing payment, cancellation and report actions remain backed by their existing APIs; no mock rows were added.
- The navigation child `My requests and reports` now targets `/?nav=buyer-platform` and remains marked `requiresAuth`.
- Existing in-app routes that request the `mine` or `reports` tab are redirected into My Garage. Booking completion's `View my inspections` action therefore lands in the private account workspace.

### Account isolation and error handling

- Inspection data state now carries an `ownerKey` rather than only a signed-in boolean.
- Data from the prior account is masked immediately when the owner key changes, before the next request resolves.
- Sequence and active-effect guards prevent older account requests from overwriting the current account's records.
- API error text is normalized to customer-safe messages rather than exposing arbitrary server/database error details.
- The two canonical sources still load independently, so a failure in one source does not erase records successfully loaded from the other.

### Backend/public route review

- `GET /api/inspection/providers` uses server-side active/verified/lifecycle eligibility and an explicit public item projection.
- `GET /api/inspection/providers/:providerId` rejects ineligible providers and emits the intended business-directory profile shape.
- `GET /api/inspection/bookings`, booking-by-reference, report-by-ID and provider dashboard/capability routes retain authentication; provider business routes require ownership middleware.
- Public business contact details and business locations are intentionally part of the provider profile. The public DTO does not include the provider account's user ID, registration/tax IDs, internal verification evidence, rejection/suspension details or customer booking records.
- The share-token report endpoint remains an intentional public, token-authorized route; its report-share policy should continue to be included in the separate document/report security sweep.

## Validation evidence

- New Auto Services boundary validator: **17/17 PASS**.
- Existing inspection marketplace validator: **37/37 PASS**.
- Inspection marketplace activation validator: **16/16 PASS**.
- Inspection QA contract validator: **10/10 PASS**.
- Inspection-domain RLS enablement static validator: **8/8 PASS**.
- Public Support validator: **21/21 PASS**.
- Public Escrow boundary validator: **14/14 PASS**.
- Public Auction error-state validator: **14/14 PASS**.
- Messages/Notifications surface validator: **30/30 PASS**.
- JavaScript/MJS syntax check: **1,232/1,232 PASS**.
- TypeScript/TSX/JSX syntax parsing: **691/691 PASS**.
- `package.json` JSON parse: PASS.

These are source/static checks. They do not establish full runtime or hosted authorization behavior.

## Not run / not certified

- Vitest/Jest execution, semantic TypeScript typecheck and Vite production build were not run: dependencies are absent in this extracted workspace.
- Current Node is `v22.16.0`; the project declares `>=22.22.2` and `.npmrc` enforces strict engines.
- Browser/Playwright testing and real two-account IDOR testing were not run.
- Live Supabase RLS, deployed public provider endpoints, payment callbacks and provider portal authorization were not exercised.
- No production database or provider configuration was changed.

## Follow-up risks

1. A dedicated inspection-provider portal has not yet been audited. The legacy `/?nav=inspections&action=manage-business` return path still opens the authenticated provider-services modal; it is not shown on the public page by default, but its eventual portal placement should be resolved during the provider-portal sweep rather than breaking the existing affiliation return path prematurely.
2. Public provider profiles intentionally expose business contact channels and business location details. Confirm provider onboarding/terms make that publication expectation clear; if contact-publication consent is modeled, use it as an additional filter.
3. Public report sharing is token-authorized. Audit token entropy, expiry/revocation, response projection and document storage separately before claiming shared reports are private.
4. Run the new frontend regression tests and full release gates on Node `>=22.22.2`, then perform signed-in/signed-out browser checks with two independent accounts.

## Operational boundaries

No commit, push, deployment, database migration, payment, refund, payout, provider application or customer message was performed. No real secrets were included in the package.
