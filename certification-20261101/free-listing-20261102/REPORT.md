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
tsc 0; build 0; frontend vitest 1384 passed/1 skipped (166 files); backend jest 3834 passed + 1 failed (known baseline `stage5f5RoleRouteMatrix`, D-11); backend vitest 36; node:test pass. New: jest dealerListingPolicy (15), vitest AdminSettingsListing (3), DealerAccountStatus (6).
Validators: 14 non-zero, all in the baseline failing set or live/production aggregates needing real environments (certify:*, verify:*, validate:live-runtime, validate:release).

## NOT verified
Real browser run; real hosted DB (no writes by me); Cloudinary upload; Brevo delivery. OpenAPI doc does not list the 2 new admin routes (wave3 route-doc validator already failing in baseline). Invited team members still have no Dealer Hub workspace.

## Follow-up (same day): "Failed to create car" (D-79)
Root cause: the dealer listing is created by the DB function `kayad_create_dealer_listing_atomic`, which enforces a subscription itself and raised a plain error that the controller returned as a generic 500. Free mode now bypasses that function (normal create path); required mode still uses it, and its errors map to a clear 402.

## Super Admin immutability, employment levels, company e-mail (D-76..D-78)
- Owner and superadmin-role accounts cannot be suspended, banned, deactivated, deleted, re-roled or re-emailed through any admin route, by anyone including other owners (403 IMMUTABLE_ACCOUNT). API-level only; a direct database edit is not blocked.
- Owner-only Employment levels (Admin > Staff): name + supported base role + exact permission set; never admin/owner authority.
- Company e-mail domain with optional enforcement. Creates the login address only: no mailbox, no invitation e-mail.

## Listing audit against the REAL schema (D-80..D-86)
Method: `scripts/rehearse-listing-local.sh` builds a throwaway local PostgreSQL from all 191 migrations (Supabase stubs only) and runs the real validateCar -> createCar/updateCar -> Car model -> db layer and the real `kayad_create_dealer_listing_atomic` against it (21 cases). It never touches a hosted database. The persisted-listing, edit, duplicate-VIN, blank-field, overflow and subscription-required paths were exercised; photo upload to Cloudinary, email and the browser were not.
New listings are created `pending` by default (Admin > Settings > Onboarding > listing moderation = hold for review). Switch to auto-publish there if approved dealers should appear publicly immediately.

## Branding end to end (D-87..D-91)
Settings > Branding writes platform_config.branding (PUT /api/admin/config, validated server side). The site reads it from /api/admin/public/config. New: logo/name/tagline appear on login, register, admin, Dealer Hub and Private Seller portal via BrandMark; navbar bar/text/menu strip and footer bg/text/accent are saved server-side and applied as CSS variables; saves refresh the running site. Not verified: a real browser render, the hosted database, a live logo upload. Theme Studio (browser-only colours) is not routed in the app and was left untouched.
