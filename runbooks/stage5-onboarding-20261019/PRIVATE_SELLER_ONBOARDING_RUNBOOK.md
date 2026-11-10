# Private seller — controlled onboarding runbook (exactly one seller)

Scope: one real private seller, supervised by the owner. Do not create or alter real customer accounts in automated tests; all automated evidence in this delivery uses emulated or disposable data.

## Preconditions (see Launch-day checklist)
Owner settings saved (private sellers `enabled`); email provider verified (live delivery test done, or the owner has decided to onboard with manual support); owner account verified; migrations in place (registration function present).

## Acceptance journey
| Step | Seller does | Expected | If not |
|---|---|---|---|
| 1 | Registers as *Private seller* | Message: "Seller account created. Please verify your email… New listings may be reviewed before publication." Account `approved`, unverified in free launch mode | 403 `SELLER_REGISTRATION_DISABLED` = owner closed registration; 503 = settings unavailable; 409 = email exists |
| 2 | Opens the verification email and clicks the link | Success page; `email_verified=true`; role and status unchanged | Expired/used: *Resend*. No email: provider checklist |
| 3 | Signs in | Signed in | Login blocked only if the generic gate is on and email unverified |
| 4 | Tries a seller action **before** step 2 (for the supervised test) | 403 `EMAIL_VERIFICATION_REQUIRED` | — |
| 5 | Creates the first listing | 201; listing `pending` under the unchanged *hold_for_review* default. Seller account approval is not required in free mode. | 403 with a clear code if a real prerequisite is missing |
| 6 | Tries to publish the listing themselves (bulk status → available) | 403 `LISTING_PUBLICATION_REQUIRES_REVIEW` | — |
| 7 | **Owner** reviews the listing (Admin → Cars moderation) and approves | Listing `available`, publicly visible | 403 `DECISION_AUTHORITY_REQUIRED` if a non-owner admin tried while *owner_only* |
| 8 | Seller logs out; reuses the old session | Old session rejected (existing session revocation) | — |

## Fields the seller cannot self-assign
`role`, `status`, `approved`, `emailVerified`, `isVerifiedDealer`, listing `status`, `ntsaVerified`, `logbookVerified`, `dutyStatus`, `isPromoted`, `escrowEnabled` — server overrides or rejects (tests: `stage5RegistrationAndLifecycle`, `onboardingFlow`, existing Stage 1 listing-boundary tests).

## Approving the seller account
**Current policy correction (2026-11-10):** self-registration and private selling are free and approval-free by default. `individual_seller` identities are created `approved` while email verification remains false until the existing verification flow completes. The default listing moderation policy remains `hold_for_review`; this is separate from seller-account approval. Dealer accounts remain pending until their independent verification is completed. Administrators can enable private-seller approval later through **Admin → Settings → Onboarding**. Paid package modes are not operational until catalogue/pricing and provider-confirmed checkout are implemented.

## Rollback / recovery
- Wrong listing published: hide it (Admin → Cars) — reversible. Sold listings cannot be moderated.
- Seller registered by mistake: suspend; do not delete accounts that have history.
- Close the door: Settings → Onboarding → Private seller registration `disabled`.

## Evidence status
Journey steps 1–8 are covered by automated tests on emulated persistence (mocked tier). **No live provider, hosted database or browser run was performed in this delivery.** The supervised first-seller session is the first live evidence; record it in the evidence matrix.
