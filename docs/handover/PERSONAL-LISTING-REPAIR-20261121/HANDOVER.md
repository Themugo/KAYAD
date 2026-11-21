# KAYARD KE — Personal listing management repair (2026-11-21)

Labels: VERIFIED (executed, evidence) / FIXED / NOT TESTED / BLOCKED / REQUIRES OWNER DECISION.
Nothing here is committed, pushed, deployed, or applied to hosted. Hosted Supabase was read-only.

## 1. Root cause (VERIFIED from hosted API logs, hosted schema, row data)
The My Vehicles route built owner action eligibility from ten record sets and was blanket fail-closed: if ANY one read failed, every listing was marked "unavailable" and Edit details / Manage photos were disabled with "could not load this listing's account records".
The hosted project does not have several tables those reads need (PostgREST 404 / PGRST205), and lacks the lifecycle RPC. So every hosted owner got the warning, even though the listing, owner, bids, escrows and photos were all valid. The earlier "missing migrations" explanation was only part of it: the code treated "table not deployed" the same as "database failed".

Hosted objects absent (cause of the failing reads): personal listing lifecycle events, visibility events, purchase outcomes, offer settlements, seller-capability tables, and function `kayad_personal_listing_lifecycle_atomic`.

## 2. Fix (FIXED, VERIFIED on a hosted-shaped disposable DB)
* Each record set is classified `ok | missing | error`. A missing relation (42P01/PGRST205) cannot hold records, so it is an empty set and reported as `degraded`. Any other read error is unknown and fails closed — but only for the actions that depend on it.
* Edit / photos / remove depend on visibility, bids, escrows, outcomes, settlements. Pause / republish / mark sold additionally need lifecycle events and the status RPC; if absent they return an explicit 503 `LISTING_STATUS_SERVICE_UNAVAILABLE` and the dashboard says so, without disabling edit or photos.
* Ownership is still verified server-side on every operation; browser-supplied listing IDs are never trusted. Photo delete / cover / reorder now also verify the photo identity (`public_id`) to stop acting on a stale index.
* No RLS, auth, permission or rate-limit control was weakened (`createLimiter` 10/min unchanged).
* `uploadMultiple` is now all-or-nothing and removes already-uploaded assets if any file fails.

Files changed: `backend/services/personalListingMutationGuard.service.js`, `personalListingEligibilityProjection.js`, `personalListingLifecycle.service.js`, `backend/controllers/carController.js`, `backend/routes/carRoutes.js`, `backend/config/cloudinary.js`, `src/services/vehicleApi.ts`, `src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx`; tests/CI: `personalListingEligibilityProjection.test.js`, `personalListingLifecycleRoute.test.js`, `personalListingLifecycleServiceUnavailable.test.js` (new), `PersonalListingManagement.test.tsx`, `ci/db-journeys/07_*` (fault case now uses a real read failure), `08_personal_listing_hosted_schema.mjs` (new), `cloudinary_stub.cjs` (new), `run.sh`, `scripts/validate-personal-selling-photo-performance.mjs` (matches new call shape; stricter, not weaker).
No tests were deleted or weakened.

## 3. Database objects / migrations
No new migration was required for edit and photos: they work against the hosted schema as it is.
For pause / republish / mark sold on hosted, the pending repo migrations that create the objects listed in section 1 must be applied (about 82 pending, including `20261121140000_…`). The brand-content migration `20261121150000_…` is also unapplied. REQUIRES OWNER DECISION. Not applied.

## 4. Evidence
* Before: `evidence/repair-BEFORE.txt` (HTTP output showing every action disabled). After: `evidence/repair-AFTER-1.txt`. No "before" screenshot exists.
* Screenshots in `screenshots/`: My Vehicles at 1440/1280/1024/768/390/375/360 (Edit + Manage photos enabled, no account-records warning, no horizontal overflow at any width), edit form and photo manager (1440, 390), a temporary-unavailable state with Try again, and the state after retry (controls enabled again).
* Lifecycle journeys on a migrated disposable DB (207/207 migrations): all 16 journey runners pass, 0 failures; journey 07 42/42, journey 08 39/39 (hosted-shaped schema), 03 33/33, 05 74/74, 06 16/16.
  Covered: owner sees listing, edit persists, cover/reorder/remove persist across re-login, listing stays public and number stable, other users get 4xx, anonymous 401, browser-supplied owner ids cannot transfer a listing, concurrent edits/removals/reorders stay consistent, invalid input rejected with no change, upload failure and part-way failure leave no orphan, genuine read failure fails closed and recovers, mark-sold gives explicit 503 on hosted-shaped schema; on the full schema (journey 07) Active → Sold, Sold section, and accepted-offer settlement lock.

## 5. Test totals (actual runs)
| Suite | Result |
|---|---|
| Frontend vitest | 212 files, 1809 passed, 1 skipped |
| Backend Jest (14 batches of ≤20 files, one at a time) | 4179 total: 4158 passed, 21 skipped, 0 failed |
| Backend node:test | 27/27 |
| Backend vitest | 61/61 (11 files) |
| TypeScript `tsc --noEmit` | clean |
| `vite build` | succeeded |
| Validators (`scripts/validate-*.mjs`) | 358 run; one regression of mine fixed (see above, now 12/12); 3 still fail for infrastructure reasons: `validate-live-runtime` (needs hosted credentials), `validate-communications-provider-certification` and `validate-local-supabase` (script crashes / need external services). These 3 were not caused by this work; the validator list is as run, with logs in the evidence folder.
The full validator sweep was not re-run after the one-line validator fix; that validator was re-run alone (12/12).

## 6. Not tested / limits
* NOT TESTED: real image upload to Cloudinary. Upload ran through the real code path against a loopback stub only.
* NOT TESTED: against the real hosted database (read-only access; no writes allowed).
* NOT TESTED: the GitHub workflow itself.

## 7. Release readiness
NOT READY to be called released. The repair is verified locally, but: (a) it is uncommitted and undeployed; (b) real Cloudinary upload is untested; (c) pause / republish / mark sold stay unavailable on hosted until the pending migrations are applied (owner decision); (d) 3 infra validators fail.
