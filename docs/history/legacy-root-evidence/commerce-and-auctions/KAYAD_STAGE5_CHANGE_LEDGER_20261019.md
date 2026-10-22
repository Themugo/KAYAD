# KAYAD Stage 5 — Change ledger (relative to the Stage 4A archive)

No dependency, lockfile, migration, `.env`, or configuration-template change. No file was renamed or deleted. Stage 4A changes are preserved (the 4A tree differs from this one only in the files listed).

| Type | File | Purpose |
|---|---|---|
| NEW | `backend/services/onboardingPolicy.service.js` | Owner policy: enums, defaults, restrictive fallbacks, cached fail-safe read, revision compare-and-swap update, decision-authority guard, self-publication rule, test seam (test env only) |
| M | `backend/routes/adminRoutes.js` | `GET/PUT /admin/settings/onboarding`, public `GET /admin/public/onboarding-policy`; decision-authority guard on `moderate`, `verify-dealer`, `approve-dealer`; `users.status` set consistently; `approve-dealer` refuses non-seller accounts; audit entries |
| M | `backend/routes/verificationRoutes.js` | Decision-authority guard on approve / reject / reinstate |
| M | `backend/routes/bulkAdminRoutes.js` | Guard on bulk moderation |
| M | `backend/controllers/authController.js` | Registration policy enforcement before any side effect; role-aware responses and welcome email |
| M | `backend/middleware/auth.js` | `req.user.emailVerified` (strict boolean); always-on verified-email gate for seller roles in `dealerOnly` |
| M | `backend/middleware/dealerVerification.js` | Progressive (pre-approval) listing access only in `self_onboarding`; `DEALER_APPROVAL_PENDING` |
| M | `backend/controllers/carController.js` | Listing status from the moderation setting |
| M | `backend/routes/dealerRoutes.js`, `backend/controllers/dealerPlatformController.js` | Close self-publication paths (bulk status, inventory bulk, duplicate listing) |
| M | `backend/controllers/verificationController.js` | Bulk publish on approval only under `auto_publish`; application acknowledgement; approval wording; `onboardingStage` in status |
| M | `backend/services/dealerVerificationService.js` | Atomic conditional transition (409 on loss); `deriveDealerOnboardingStage` |
| M | `backend/services/email.service.js` | Seller/dealer welcome wording (no "account is ready") |
| NEW | `backend/utils/redactUrl.js`; M `backend/infrastructure/logging/{index,serializers,child-logger}.js`, `backend/server.js` | Redact path/query tokens from logs and the production access log |
| M | `backend/utils/auditAfterCommit.js` | `onboarding policy`, `dealer decision`, `listing decision` are critical audit actions (retry once, alert marker) |
| NEW | `src/pages/admin/AdminSettingsOnboarding.jsx`; M `AdminSettings.jsx`, `AdminSettingsGeneral.jsx`, `src/api/api.exports.ts` | Owner UI tab; dead toggle removed; API client |
| NEW tests | `backend/tests/regression/stage5{OwnerOnboardingSettings,RegistrationAndLifecycle,DealerDecisions,LogRedaction}.test.js`; `src/__tests__/pages/admin/AdminSettingsOnboarding.test.jsx` | New coverage (see evidence matrix) |
| M tests | `onboardingFlow`, `stage1ListingWriteBoundaries`, `stage4IdentityLifecycle`, `securityCertification` | Set the policy explicitly in fixtures (previously implicit); new mode/moderation tests in `onboardingFlow`. Assertions were not weakened; the 'progressive access' test now states it applies only in `self_onboarding` |
| NEW docs | `KAYAD_STAGE5_*`, `runbooks/stage5-onboarding-20261019/*`, `evidence/stage5-20261019/*` | Reports, runbooks, evidence |

## Behaviour changes the owner should know about
1. A seller/dealer with an unverified email now gets 403 on seller routes even when Brevo is not configured.
2. New dealers in the default mode cannot list until approved (previously could list 3).
3. New listings are `pending` by default even for approved sellers (previously `available`).
4. Dealer/seller approval and listing moderation are owner-only by default (previously any admin).
5. Approving a dealer no longer publishes their pending listings unless moderation is `auto_publish`.
6. Sellers can no longer set their own listings to `available` via the bulk endpoints under `hold_for_review`.
Each is reversible from the Settings page, except 1 (always on by design).
