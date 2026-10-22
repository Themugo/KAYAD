# KAYAD Stage 5A — change ledger (2026-10-19)

Base: the exact Stage 5 package (`KAYAD-STAGE5-OWNER-CONTROLLED-ONBOARDING-FULL-PROJECT-20261019.zip`). Every change below is narrow and has a test. No hosted change, no migration, no commit/push.

## Source changes
| File | Change | Gate | Tests |
|---|---|---|---|
| backend/config/owners.js | `isUnverifiedOwner`, `OWNER_IDENTITY_UNVERIFIED_*` | A | stage5aOwnerIdentityBootstrap |
| backend/controllers/authController.js | register refuses owner emails (403 `OWNER_IDENTITY_RESERVED`, no side effects); login/refresh refuse unverified owner; resend returns identical 202 for every branch + per-account cooldown | A, B | stage5aOwnerIdentityBootstrap, stage5aEmailVerificationGate |
| backend/middleware/auth.js, services/socketAuth.service.js | unverified owner refused in `protect`, ignored in `optionalAuth`, rejected on sockets | A | same |
| backend/routes/adminRoutes.js | moderate: approve/hide(+reject alias→hidden), truthful messages/audit, sold blocked, **status-only update** (F6); stats/users/approve-dealer made schema-true (F9) | E, F | stage5OwnerOnboardingSettings, stage5aRealSchemaPins |
| backend/controllers/bulkAdminController.js | bulk hide (reject alias), honest labels, dealer-id helper (F7) | E | stage5aBulkModerationAndDuplicates |
| backend/controllers/duplicateController.js | duplicate removal ⇒ `hidden` + soft delete; car saved before log marked reviewed | E | stage5aBulkModerationAndDuplicates, stage4ListingLifecycle |
| backend/routes/dealerRoutes.js, controllers/dealerPlatformController.js | sold listings protected in seller bulk paths; `dealer_id` column (F8) | E | stage5aSellerSelfPublication, stage5aRealSchemaPins |
| backend/middleware/security.js | HPP guard no longer rejects JSON arrays; no double response (F5) | F | stage5aHppBulkBodies |
| backend/services/onboardingPolicy.service.js | any corrupt field ⇒ whole record RESTRICTIVE (F10) | D | stage5OwnerOnboardingSettings |
| src/features/AdminView.tsx | mounts Onboarding tab; Approve/Reject/Hide controls; id normalisation; audit endpoint fix (F1–F4) | D, F | stage5aRealSchemaPins; browser |
| src/pages/admin/AdminCarModeration.jsx | honest Hide/Hidden wording | E | existing UI tests |
| src/pages/admin/AdminSettingsOnboarding.jsx | styling with app Button (F11) | D | AdminSettingsOnboarding.test |

## New tests (backend/tests/regression/)
stage5aOwnerIdentityBootstrap (33), stage5aEmailVerificationGate (13), stage5aSellerSelfPublication (14), stage5aBulkModerationAndDuplicates (9), stage5aHppBulkBodies (3), stage5aRealSchemaPins (6), plus "moderation actions are truthful" inside stage5OwnerOnboardingSettings (now 80). Pre-fix proof for Gate A: `evidence/gateA/prefix_demonstration_FAILS_EXPECTED.log` (10 failed / 20 passed before the fix).

## Existing tests intentionally updated
stage5OwnerOnboardingSettings (unverified owner now 403 at authentication; whole-record restrictive; status-only moderation mock), stage4ListingLifecycle (removal ⇒ hidden), stage4aGateClosure (admin/duplicate no longer write `rejected`; reportController still does), stage1AuthzConvergence (owner fixture verified), loginTimingEnumeration (logger mock gained `logWarn`).

## New documents
runbooks/stage5a-launch-gate-20261019/*, KAYAD_STAGE5A_* reports, evidence/ (logs, browser scripts, screenshots, hosted preflight).

## Not changed
supabase/migrations (181 files, untouched); hosted database; accounts; owner credentials; earlier ZIPs; Git history.

## Final addendum
* `evidence/stage5a-20261019/gateG/run_all.sh` / `run_validators.sh`: extracted-copy runners (300 s guard on node:test with one recorded rerun; validators with absolute output path).
* `evidence/stage5a-20261019/gateG/extracted_checkpoint1/`: logs of the independent run on the checkpoint-1 archive.
* `evidence/stage5a-20261019/gateG/LOCAL_STATE_BACKUP_README.md`: disposition of the two `uploads.sqlite` copies (originals in `KAYAD-STAGE5A-LOCAL-STATE-BACKUP-20261019/`, outside the ZIP).
* No source change after checkpoint 1.
