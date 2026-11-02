# Dealer onboarding end to end, 2026-11-02

## What was wrong
1. **Approve asked a question, then did nothing.** The page collected the audit reason with `window.prompt` (blocked or dismissed silently in some browsers and embedded views) and offered Approve for every pending dealer, even though the server had already said their application was incomplete.
2. **The two pending dealers cannot be approved yet, correctly.** Read-only SELECTs on the hosted DB show both have no `dealers` row and no application. The approval gate refuses with "dealer profile missing".
3. **Why they have no profile:** the hosted database's migrations stop at 20260922. It lacks `kayad_register_identity_atomic` (the registration function that creates the dealer profile), the dealer-profile trigger, and the `dealers.bio / payment_details / onboarding_complete / onboarding_completed_at` columns that the dealer's own onboarding save writes. A dealer registering today against that database would fail at registration, and one who got in could not save onboarding.
Ban was not changed.

## What changed (local only)
- `DealerApprovalDialog`: in-page dialog, blockers shown before submit, reason field, inline server errors, row hint "Application incomplete".
- `GET /api/admin/dealer-onboarding/readiness`: read-only probe; its RPC calls use invalid arguments the database rejects before any write. User Management shows a notice naming anything missing.
- `runbooks/dealer-onboarding-hosted-patch-20261102/APPLY_dealer_onboarding_minimum.sql`: idempotent, additive; adds the columns, trigger, backfills a missing `dealers` row for existing dealer users, registration function + grant, allows 'suspended'. NOT applied by me.

## To onboard the first dealer today (owner actions)
1. Run `runbooks/dealer-onboarding-hosted-patch-20261102/APPLY_dealer_onboarding_minimum.sql` to the hosted database (SQL editor or your normal migration process). Reload User Management: the red notice disappears when it worked.
2. Each pending dealer signs in (e-mail must be verified; one pending dealer has not verified), opens Dealer Onboarding, completes the business profile and uploads the required paperwork, and submits.
3. Admin: User Management, Approve; the dialog shows nothing blocking; enter a reason; Approve dealer.

## Evidence
Evidence (./logs): tsc exit 0; vite build exit 0; frontend vitest 155 files / 1327 passed / 1 skipped; backend jest 3758 passed, 1 failed (stage5f5RoleRouteMatrix, D-11, fails identically in the untouched baseline); backend vitest exit 0; node --test pass 1 / fail 0; validators 27 failing vs 28 before, none newly failing.
Tests changed because the prompt was replaced by a dialog (same assertions kept): AdminUsersIndependentApproval, adminTables. The hosted patch lives in runbooks/ (not supabase/migrations) because stage4IdentityLifecycle forbids a second definition of the registration function in the chain. NOT verified: any run against the hosted DB, a real browser, real e-mail/SMS delivery, the patch executing (reviewed, not run).

## Live outcome (2026-11-02, hosted DB, read-only verification by me; SQL run by the owner)
- Owner ran the hosted patch: registration function, onboarding column, dealer trigger, 2 dealer profiles, 'suspended' status all verified present.
- First approval was refused (ADMIN_ACCOUNT_REQUIRED): the hosted DB had NO admin/superadmin row; the owner e-mail passes in the app but the approval function authorises against the DB row. Owner promoted their account with a single UPDATE on users (the matching profiles update fails on a pre-existing profiles trigger that references a missing updated_at column; skipped).
- Approval then succeeded: user approved, dealers.approved, verification approved with reviewer/timestamp, audit rows 'admin_dealers_manage_approve' and 'Dealer decision: approve-dealer' (outcome success). Earlier refusals are also in the audit log.
- Added readiness check 'An active administrator account'. Jest after this change: 3760 passed, 1 failed (stage5f5RoleRouteMatrix, D-11, baseline).
- Open: Brevo delivery feedback webhook not wired (no email has ever been recorded as delivered); verification mail arrived late; sender-domain authentication not verified by me.
