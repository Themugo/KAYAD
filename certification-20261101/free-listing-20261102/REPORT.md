# Free listing by default; subscription optional (2026-11-02)

## Root causes
- D-73: `assertDealerCanCreateListing` hard-coded SUBSCRIPTION_REQUIRED for any dealer without a plan; no admin switch existed.
- D-74: sidebar "Verification: Pending" read `user.status/approved` (not populated); now uses the verification-status service (same as Settings).
- D-75: Account status / Settings>Plan assumed the gate was always on.

## Behaviour now
- Default (nothing saved): approved dealers list free, no plan, no cap/expiry. `listingsLocked` admin switch still blocks.
- Admin > Settings > Listing & Plans: "Require an active subscription to list vehicles" (MANAGE_PAYMENTS, audited). When ON: previous rules (402 no plan / expired / cap).
- Admin still grants/removes plans per dealer (User Management > Plan) and bulk via zero-cost onboarding.
- Storage: `system_settings` key `dealer_listing_policy`. No migration, no SQL for you to run.
- Unreadable settings store fails OPEN to free listing (logged).

## Evidence (logs/)
tsc 0; build 0; frontend vitest 1379 passed/1 skipped (165 files); backend jest 3815 passed + 1 failed (known baseline `stage5f5RoleRouteMatrix`, D-11); backend vitest 36; node:test pass. New: jest dealerListingPolicy (15), vitest AdminSettingsListing (3), DealerAccountStatus (6).
Validators: 14 non-zero, all in the baseline failing set or live/production aggregates needing real environments (certify:*, verify:*, validate:live-runtime, validate:release).

## NOT verified
Real browser run; real hosted DB (no writes by me); Cloudinary upload; Brevo delivery. OpenAPI doc does not list the 2 new admin routes (wave3 route-doc validator already failing in baseline). Invited team members still have no Dealer Hub workspace.
