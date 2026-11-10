# KAYAD private-seller free-access policy correction

**Date:** 10 November 2026
**Baseline:** `KAYAD-INSPECTION-CANCELLATION-REFUND-FIXED-20261110.zip`
**Scope:** Private-seller self-registration, listing access, admin policy controls and migration preparation.

## Required launch behavior

- Personal-account self-registration remains open by default.
- Private selling is free by default.
- No seller package selection is shown or required in free mode.
- No seller application or administrator approval is required in free mode.
- Email verification remains required for seller actions.
- Vehicle listing moderation remains a separate policy. The existing `hold_for_review` default is unchanged.
- Dealer registration and dealer verification remain separate and are not opened by this correction.
- Explicit seller suspension and revocation remain enforceable.

## Implementation changes

The correction modifies 23 existing project files and adds 4 files (one forward migration, two regression tests, and this policy/audit documentation). The project root and existing folder layout are preserved.

1. `onboardingPolicy.service.js` adds `privateSellerApprovalMode` (default `disabled`) and `privateSellerPackageMode` (default `free`) to the existing `system_settings` JSON policy. Older settings rows without these fields inherit the new defaults.
2. `privateSellerCapability.service.js` resolves ordinary personal accounts as seller-enabled when approval is disabled. Pending/rejected application states do not block free selling. Suspended/revoked states remain blocked. Missing `private_seller_capabilities` table errors from PostgREST are treated as an absent optional review record only for the free-mode lookup; other database errors still propagate.
3. `sellerCapability.js` enforces the policy and blocks paid package modes until package catalogue and provider-confirmed checkout are implemented.
4. `auth.js` allows legacy `individual_seller` accounts whose `users.status` is `pending` through `requireApproved` only while private-seller approval is disabled. Other roles and statuses retain the normal gate.
5. `accountCapabilities.service.js` treats the legacy pending individual-seller account as active under free mode.
6. `SellerCapabilityPanel` and Private Seller Studio copy explain the free/no-approval experience.
7. Admin Onboarding settings expose approval mode and package mode. Admin can enable the future approval switch. Paid package modes are visible as reserved controls but safely block seller writes until the real catalogue and payment verification workflow exists.
8. Tests cover free access, legacy pending sellers, pending/rejected capability records, suspension/revocation, approval-mode enforcement and the fail-closed paid-package boundary.

## Database migration

Added:

`supabase/migrations/20261110140000_private_seller_free_access_defaults.sql`

It is a forward-only migration that:

- Requires `public.users`, `public.private_seller_capabilities`, `public.system_settings`, and the expected identity-registration RPC signature.
- Changes only legacy `individual_seller` rows with `users.status = 'pending'` to `approved`.
- Changes the default status for new capability rows to `approved`.
- Replaces `kayad_register_identity_atomic` so new `individual_seller` registrations are active (`approved`) while dealer registrations remain `pending`.
- Keeps email verification false at registration; the existing verification workflow remains in force.

The migration deliberately raises a preflight exception if the capability table or expected RPC is missing. This is important because production currently lacks `public.private_seller_capabilities` and has 38 unresolved remote-only migration versions. The original `20261025100000_private_seller_capability.sql` and its dependencies must be reconciled and replayed in a disposable staging project before this migration is applied anywhere.

## Important boundaries

- `privateSellerPackageMode` supports `free`, `optional`, and `required` in the policy model. `optional` and `required` are not operational yet. The API returns HTTP 503 for seller listing writes under those modes until a real package catalogue, price configuration, payment checkout and provider confirmation exist. This prevents unpaid listings from being admitted.
- `privateSellerApprovalMode=required` activates the existing application/review workflow. Enabling it before the capability table migration is deployed will not work; the migration must be staged first.
- Listing moderation remains independent. Free seller access does not guarantee automatic publication.
- No production database changes, migration repair, push, Git commit, or deployment were performed.

## Validation status

Source-level checks and JavaScript syntax checks are performed separately from runtime test execution. Full Jest/Vitest suites, frontend build, PostgreSQL migration replay and staging UAT must be run in a Node.js environment meeting the repository engine requirement and against a separate staging Supabase project. Do not report those as passed unless their actual command output is captured.
