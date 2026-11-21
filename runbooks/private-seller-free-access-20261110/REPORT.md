# KAYAD free private-seller access correction — source audit report

**Date:** 10 November 2026
**Baseline archive:** `KAYAD-INSPECTION-CANCELLATION-REFUND-FIXED-20261110.zip`
**Project root preserved:** `KAYAD-HOMEPAGE-REDESIGN-WORK/`

## Owner requirement implemented

All personal self-registration and private-seller access is free and approval-free by default. No seller package selection is required. Email verification remains required for seller actions. Vehicle listing moderation remains a separate control and retains its existing `hold_for_review` default. Dealer onboarding and dealer verification are unchanged.

## Corrections

The correction modifies 23 existing project files and adds 4 files (one forward migration, one migration contract test, and two policy/audit documentation files). The project root and existing folder layout are preserved.

### Backend policy and access
- Added `privateSellerApprovalMode` to the existing `system_settings.onboarding_policy` JSON policy; default `disabled`.
- Added `privateSellerPackageMode`; default `free`.
- Older policy JSON rows without the new fields inherit the new free/approval-free defaults.
- Personal accounts resolve to effective seller access in free mode without needing a `private_seller_capabilities` row.
- A confirmed missing-table PostgREST error is treated as an absent optional review row for free-mode resolution. Other database errors still propagate.
- Existing `pending` and `rejected` seller application statuses do not block free mode.
- Explicit `suspended` and `revoked` states remain blocked.
- When approval is enabled, pending/rejected/none states remain restricted; pending legacy individual sellers no longer bypass the approval guard.
- `requireApproved` now recognizes legacy `individual_seller` `pending` status as an old seller-approval flag only while approval mode is disabled.
- Existing `users.status='pending'` individual-seller accounts are normalized by the forward migration.
- New `individual_seller` registrations are created active in free mode. The registration RPC writes a capability row that is `pending` only if the admin has enabled approval at registration time.
- Registration response and welcome email now accurately state that private selling is free, no package or seller approval is required, and email verification remains required.
- Paid package modes (`optional` / `required`) are represented in admin policy, but writes return HTTP 503 until a package catalogue, pricing and provider-confirmed checkout are implemented. No unpaid listing is admitted.

### Admin controls
- Added controls for private-seller approval (`disabled` / `required`).
- The backend prevents enabling approval until `private_seller_capabilities` exists.
- Added package mode (`free` / `optional` / `required`) with a clear warning that paid modes are not operational until checkout is built.
- Existing dealer onboarding, listing moderation, and decision-authority settings remain separate.

### Frontend
- Dashboard seller panel explains free access and no approval/package selection in the default policy.
- Private Seller Studio copy no longer says KAYAD approval is required.
- Existing account dashboard and workspace gates use the effective server capability state.
- Pending/rejected application UI remains available only for the future approval-required mode.

### Tests added/updated
- Added free-mode service and middleware tests.
- Added legacy pending seller access tests.
- Added explicit suspension/revocation retention tests.
- Added approval-required blocking tests.
- Added paid-package fail-closed test.
- Added migration contract tests.
- Updated onboarding policy defaults tests.
- Added dashboard and seller-workspace tests for free policy mode.

## New forward migration

`supabase/migrations/20261110140000_private_seller_free_access_defaults.sql`

The migration:
- Has explicit preflight checks for `users`, `system_settings`, `private_seller_capabilities`, and the expected registration RPC signature.
- Normalizes only `individual_seller` rows whose `users.status` is `pending` to `approved`.
- Changes the capability table default to `approved`.
- Replaces the registration RPC so new private sellers are active by default and dealer registration remains pending.
- Writes a capability row for new `individual_seller` accounts based on the configured approval mode.
- Reasserts least-privilege RPC grants.

**It deliberately fails if the original private-seller capability table or expected RPC is missing.** Production currently lacks `public.private_seller_capabilities`, and the production migration ledger has 38 unresolved remote-only versions. Reconcile the original `20261025100000` migration and its dependencies first. Do not apply this migration to production until a separate staging replay and UAT have passed.

## Boundaries preserved
- No dealer verification or dealer-role behavior was opened.
- No vehicle moderation default was changed.
- No email verification requirement was removed.
- No auction eligibility, custody, escrow, transaction, or payment logic was changed.
- Suspended/revoked sellers remain blocked.
- No production SQL, migration repair, `db push`, commit, push or deployment was performed.

## Validation evidence
- Modified backend JavaScript files: `node --check` passed.
- TypeScript/TSX parse check: no TS1xxx parser errors detected; dependency/type resolution could not complete because project `node_modules` is absent.
- Full Jest/Vitest suites: not run (dependencies absent).
- Full frontend build: not run.
- PostgreSQL migration replay: not run.
- Production and staging database behavior: not certified.

The repository declares Node `>=22.22.2`; the available runtime during this source pass was Node `22.16.0`. Use the declared runtime and install dependencies with the lockfiles before running the full suites.
