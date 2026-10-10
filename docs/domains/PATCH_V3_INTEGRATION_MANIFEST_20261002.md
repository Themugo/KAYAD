# KAYAD Escrow/Onboarding Patch v3 — Integration Manifest
Date: 2026-10-02

## Integration policy
This patch was treated as an overlay against:
`KAYAD-RUNTIME-PRODUCTION-CONVERGENCE-FOUNDATION-20261002.zip`

Only files that differed from the foundation were integrated. Files in the uploaded patch that were byte-identical to the foundation were not replaced. Four legacy validation contracts were then updated because they contradicted the newly integrated non-blocking registration-delivery contract.

## Integrated changes
- `src/components/OnboardingFlow.tsx` — integrated or aligned to the canonical foundation contract.
- `backend/controllers/inspectorApplicationController.js` — integrated or aligned to the canonical foundation contract.
- `backend/controllers/authController.js` — integrated or aligned to the canonical foundation contract.
- `backend/controllers/carController.js` — integrated or aligned to the canonical foundation contract.
- `backend/middleware/dealerVerification.js` — integrated or aligned to the canonical foundation contract.
- `backend/tests/transactions/paymentHistory.test.js` — integrated or aligned to the canonical foundation contract.
- `backend/tests/transactions/transactionLifecycleIntegrity.test.js` — integrated or aligned to the canonical foundation contract.
- `backend/tests/validation/registrationContract.test.js` — integrated or aligned to the canonical foundation contract.
- `backend/tests/onboarding/onboardingFlow.test.js` — integrated or aligned to the canonical foundation contract.
- `backend/tests/security/securityCertification.test.js` — integrated or aligned to the canonical foundation contract.
- `backend/routes/inspectorApplicationRoutes.js` — integrated or aligned to the canonical foundation contract.
- `scripts/validate-registration-onboarding.mjs` — integrated or aligned to the canonical foundation contract.
- `scripts/validate-registration-role-matrix.mjs` — integrated or aligned to the canonical foundation contract.
- `scripts/validate-email-only-launch.mjs` — integrated or aligned to the canonical foundation contract.
- `scripts/validate-email-reliability.mjs` — integrated or aligned to the canonical foundation contract.

## Explicitly preserved
The following patch areas were already identical to the foundation and were therefore preserved without duplicate implementations:
- escrowController.js
- escrowAccess.js
- escrowRoutes.js
- validate.js
- response.schema.js
- escrowActions.test.js
- escrowAccess.test.js
- escrowAuthorization.test.js

## Key convergence changes
- Registration verification email dispatch remains non-blocking; provider failure cannot delete a committed account.
- Email/reset expiry comparisons use Date values.
- Inspector approval cannot overwrite an existing dealer/private-seller/staff account sharing an email.
- Newly created inspector accounts receive a single-use password setup link.
- Inspector application endpoint supports optional authentication without weakening its public application contract.
- Mounted listing creation detection now correctly handles Express router paths.
- Dealer entitlement errors preserve their deliberate 4xx status/code.
- Onboarding copy explicitly covers inspectors/mechanics.
- Added onboarding coverage and updated security/registration/transaction contract tests to current canonical migrations/RPCs.

## Certification note
This is a source integration pass. Runtime/provider certification still requires Node >=22.22.2 and the real staging/provider environment.
