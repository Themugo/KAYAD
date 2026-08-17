# KAYAD PROVIDER LIFECYCLE - IMPLEMENTATION AND HARDENING SUMMARY

Extends the existing provider architecture (inspection_providers,
providerService.js, providerController.js - activated in an earlier
pass). No second provider system was created.

---

## Headline finding: a systemic authorization gap, not an isolated one

Every :providerId-parameterized route in inspection/routes/inspectionRoutes.js
had requireAuth (confirms the requester is logged in) but no ownership
check at all. Confirmed by reading all 13 affected routes directly
before writing any fix: any authenticated user could view or modify
ANY provider's profile, dashboard, earnings, transactions, and
settlements - not a single-endpoint bug, a missing layer across the
entire provider-scoped API surface.

**Fixed** with one reusable middleware (`inspection/middleware/requireProviderOwnership.js`)
applied consistently across all 13 routes, rather than patching each
controller function individually. Admins (role `admin`/`superadmin`,
the real values confirmed against the `users` table's own CHECK
constraint) pass through regardless of ownership - required for this
task's own admin-review capabilities. Settlement generation
(`POST /provider/:providerId/settlements`) is deliberately admin-only,
not ownership-gated - a provider self-triggering their own commission/
payout calculation is a financial-integrity risk this task's security
requirements argue against, even for their own account.

Verified directly (not just read): the ownership comparison's 4 core
cases (owner/owner, owner/non-owner, admin/non-owner, superadmin/non-owner)
tested and confirmed correct.

---

## The 7-stage lifecycle

The existing `inspection_providers` table had two simpler fields
(`status`: pending/active/suspended, `verification_status`: unverified/
verified) - too coarse to represent REGISTERED -> PROFILE_COMPLETED ->
CREDENTIALS_SUBMITTED -> UNDER_REVIEW -> VERIFIED -> ACTIVE ->
SUSPENDED/INACTIVE as distinct, server-tracked states.

**Extended**, not replaced: a new `lifecycle_stage` column (with a
CHECK constraint restricting it to the 8 named stages) plus a database
trigger that keeps the existing `status`/`verification_status` columns
automatically in sync - every existing piece of application code that
reads those two columns (e.g. `bookingService.js`'s
`provider.status !== 'active'` check) continues to work unchanged.

A private `#transitionLifecycle()` method in `providerService.js` is
the one real gate every lifecycle-changing function goes through -
validates the requested transition against an explicit allowed-transitions
map before writing anything, and writes a real audit row to
`inspection_status_history` (reused, not duplicated - the same table
already generalized with `entity_type`/`entity_id` in the prior domain-model
pass) for every transition.

Tested directly against a real, running PostgreSQL database: a fresh
provider correctly starts at REGISTERED; moving it to ACTIVE correctly
and automatically syncs `status`/`verification_status` via the
trigger; an invalid stage value is correctly rejected by the CHECK
constraint.

### New capabilities (provider self-service)
- `completeProfile()` / `POST .../lifecycle/complete-profile`
- `submitCredentials()` / `POST .../lifecycle/submit-credentials` - checked directly against real `provider_credentials` rows, not trusted from the caller

### New capabilities (admin-only, per this task's explicit requirements)
- `reviewProvider()` / `POST .../lifecycle/review`
- `verifyProvider()` / `POST .../lifecycle/verify` (existing function, rewritten)
- `activateProvider()` / `POST .../lifecycle/activate`
- `rejectVerification()` / `POST .../lifecycle/reject` - requires a reason, returns provider to CREDENTIALS_SUBMITTED for resubmission
- `requestAdditionalInfo()` / `POST .../lifecycle/request-info` - stays in UNDER_REVIEW, a distinct capability from rejection
- `suspendProvider()` / `POST .../lifecycle/suspend` (existing function, rewritten) - requires a reason
- `reactivateProvider()` / `POST .../lifecycle/reactivate`

None of these 7 admin routes are reachable by `requireProviderOwnership`
- only `allowRoles('admin', 'superadmin')` - directly satisfying "provider
cannot self-verify" / "provider cannot modify verification status" at
the route layer, not by omission.

---

## 3 further real bugs found and fixed while implementing this

1. `verifyProvider()`/`suspendProvider()` wrote to `verified_at`,
   `verified_by`, `suspension_reason` - none of which were ever real
   columns on `inspection_providers`, confirmed directly against the
   schema. These functions have never correctly persisted that data.
   Fixed using the real columns (`reviewed_at`/`reviewed_by`,
   `suspended_reason`/`suspended_at`/`suspended_by`, all added this
   pass).
2. `addCredential()` wrote to `type`/`name`/`issuing_body`/`issue_date`/
   `expiry_date`/`is_verified` - none of which are real columns on
   `provider_credentials` (the real names are `credential_type`/`title`/
   `issued_by`/`issued_at`/`expires_at`/`verification_status`).
   Confirmed this function has never correctly persisted a credential.
   Fixed with the real column names; added a genuinely missing
   `certificate_number` column rather than silently dropping that data.
3. `getProviderProfile()` (the buyer-facing view) filtered credentials
   on `is_verified` (not a real column) and read reviews via
   `overall_rating`/`review_text` (the real columns are `rating`/
   `comment`). The verified-only credential filter has never actually
   worked - a real, confirmed gap against this task's own "buyer-facing
   profiles must show only approved information" requirement, not a
   cosmetic issue.

---

## "Verified Independent Inspector" - the required distinction

`getProviderProfile()`'s `verification` block now returns 3 explicit
fields: `status`, a `label` (`'Verified Independent Inspector'`, only
when genuinely verified), and a `disclaimer` - a fixed, explicit
sentence stating the inspector is an independent business, not a KAYAD
employee, and that KAYAD verifies identity/credentials but does not
guarantee or endorse the professional conclusions in any report. All 3
are returned as separate fields specifically so no frontend consuming
this can display the badge label while accidentally dropping the
disclaimer.

`getProviderProfile()` also now refuses to return a profile at all
(404) unless the provider's `lifecycle_stage` is `ACTIVE` or `VERIFIED`
- a provider still in REGISTERED/PROFILE_COMPLETED/CREDENTIALS_SUBMITTED/
UNDER_REVIEW is not yet approved for public/buyer visibility.

---

## What was deliberately not built

Per this task's own "do not introduce unrelated provider-management
features" instruction: no new provider-facing UI, no notification/email
system for lifecycle transitions, no bulk-admin-review dashboard. This
pass is the domain logic and its HTTP surface, matching exactly the
capabilities this task names - not more.

---

## Verification

| Check | Result |
|---|---|
| Migration applied against a real, running PostgreSQL 16 database | 0 errors |
| Lifecycle trigger (status/verification_status auto-sync) | Tested directly: REGISTERED -> ACTIVE correctly syncs both fields |
| CHECK constraint (valid lifecycle_stage values) | Tested directly: an invalid value is correctly rejected |
| Ownership middleware's 4 core security cases | Tested directly, all correct |
| Backend syntax validation (every file) | 0 errors |
| Backend unit test suite (Jest) | 216/216 passing |
| Frontend TypeScript | 0 errors |
| Frontend production build | Succeeds |
| Existing data | Preserved - every schema change is additive; existing rows backfilled to a sensible lifecycle_stage derived from their prior status/verification_status, not silently regressed to REGISTERED |
