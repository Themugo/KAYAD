# KAYAD Stage 5 — Onboarding state machines (as implemented)

Server state is the only authority. No client-supplied role, status, approval, verification or `isVerifiedDealer` value is read from any request body for these transitions (mass-assignment tests: `stage5RegistrationAndLifecycle`, `onboardingFlow`).
HTTP codes are the codes the implementation returns. "Evidence" names the test file that pins the behaviour.

## Where state lives
| Concept | Storage | Values |
|---|---|---|
| Email verified | `users.email_verified` (+ hashed token/expiry in `user_auth`) | false → true |
| Account gate | `users.status` | `pending` (seller/dealer at signup), `approved`, `rejected`, `suspended`, `banned` flags separate |
| Dealer application/approval | `dealer_verifications.verification_status` + `dealers.approved/is_suspended` | `pending → approved/rejected/suspended`, `rejected → pending`, `approved → suspended`, `suspended → approved` |
| Listing | `cars.status` | `pending`, `available`, `hidden`, `draft`, `reserved`, `sold`; `rejected` only after decision D3 |
| Owner policy | `system_settings['onboarding_policy']` | 5 enumerated fields + `revision` |

## 1. Private seller flow
| # | Transition | Actor | Required prior state | Authorization | DB writes | Audit | Notification | Idempotency / duplicates | HTTP | Rollback / recovery |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Registration submitted → account created (`pending`, unverified) | Anonymous | policy `privateSellerRegistration=enabled` and policy readable; email unused | Public route, rate limited, CSRF/origin middleware; role limited to `individual_seller` by DB function | One DB function: `users` + `user_auth`(hashed token, 24h) | Application log; no admin audit row | Verification email (async); welcome email (seller wording); admin notice of pending seller | Duplicate/normalised email → unique violation → 409; concurrent duplicates: one winner (real PG test A8) | 201; 403 `SELLER_REGISTRATION_DISABLED`; 503 `ONBOARDING_POLICY_UNAVAILABLE`; 409 | Atomic: failure leaves no orphan (PG test A6) |
| S2 | Email verification pending → verified | Token holder | unexpired, unconsumed token | Possession of single-use token (stored as SHA-256) | token consumed atomically, then `email_verified=true` | Application log | none | Replay → 400; two simultaneous uses → exactly one 200 | 200 / 400 generic | If the post-consume write fails the user requests a new link (resend) |
| S2f | Verification expired / delivery failed | User | unverified | — | — | — | — | Resend: generic 202, new token committed only after provider acceptance; old token stays valid if delivery fails; rate limited | 202 | Resend; owner can check delivery in the communications ledger |
| S3 | Verified → eligible for seller actions | System | `email_verified=true` | `dealerOnly` gate: **always** enforced for seller roles, independent of the Brevo/flag configuration | none | — | — | — | 403 `EMAIL_VERIFICATION_REQUIRED` until verified | — |
| S4 | Listing creation | Verified seller | S3 + not suspended/banned | `protect → dealerOnly → requireDealerVerification` | `cars` row | listing-created audit | — | Client `status` ignored | 201 | — |
| S5 | Moderation outcome → publication | System, then reviewer | policy | `hold_for_review` (default, and whenever policy unreadable): created `pending`. `auto_publish`: `available` only if seller `users.status='approved'`, else `pending` | `cars.status` | listing decision audit (existing) | seller notice (existing) | — | — | Reviewer may hide/reject; sold listings are protected |
| S6 | Review by authorized decider | Owner (default) or admins if delegated | listing `pending` | `requireDecisionAuthority('listing')` | `cars.status = available/rejected*` | "Listing decision" via existing moderation audit | seller notice | Repeat approve on `available` is a no-op write; sold → 409 | 200 / 403 `DECISION_AUTHORITY_REQUIRED` / 409 | *`rejected` fails the DB constraint until D3 is applied (bulk reject writes `hidden`)* |
| S7 | Seller approval (account gate) | Owner (default) | `users.status=pending` | decision-authority guard on all three approval endpoints | `users.status=approved` (all endpoints now consistent) | "Dealer decision"/"Dealer verification" | in-app + communications | Verification routes use `Idempotency-Key` + atomic transition | 200 / 403 / 409 | Reject/suspend routes available |
| S8 | Suspended / banned | Admin per existing policy | any | existing | status flags | existing | existing | — | 403 on next request (protect re-reads account state) | Reinstate |
| S9 | Self-publish attempts | Seller | any | `sellerMayPublishDirectly` | none | — | — | — | 403 `LISTING_PUBLICATION_REQUIRES_REVIEW` from `dealer/cars/bulk-status`, `dealer-platform inventory/bulk` (status available/active); duplicate listing is created `pending` under hold | — |

## 2. Dealer flow
| # | Transition | Actor | Required prior state | Authorization | DB writes | Audit | Notification | Idempotency | HTTP | Rollback / recovery |
|---|---|---|---|---|---|---|---|---|---|---|
| D1 | Application: registration | Anonymous | `dealerOnboardingMode` ∈ {`self_onboarding`,`approval_required`}; policy readable; business name + location supplied | public | `users`(dealer, pending, unverified) + `user_auth` + trigger-created `dealers`(approved=false) | log | verification email; welcome (dealer wording: "not approved yet"); admin notice | duplicate email 409 | 201 message "Dealer application received… not approved until…"; 403 `DEALER_REGISTRATION_CLOSED` (mode `closed`); 503 | atomic |
| D2 | Email verification | Token holder | as S2 | as S2 | `email_verified=true` | log | none | as S2 | as S2 | resend |
| D3 | Documents submitted (application) | Verified dealer | `dealerOnly` passed (email verified); verification absent or `rejected`/`pending` | `protect`+`dealerOnly` | `dealer_verifications` pending | action log | **"Dealer application received"** acknowledgement (not an approval) | repeat while pending updates documents; approved/suspended → 409 | 200 | — |
| D4a | **Mode `approval_required`:** pending dealer tries to list | Dealer | pending | `requireDealerVerification` | none | — | — | — | 403 `DEALER_APPROVAL_PENDING` (no progressive access) | — |
| D4b | **Mode `self_onboarding`:** pending dealer lists | Dealer | pending/under_review, fewer than 3 cars | `requireDealerVerification` progressive access | `cars` (status per moderation) | — | — | — | 201 up to 3 listings, then 403 | Dealer remains **unverified**: no verified flag, no unrestricted publication |
| D4c | Policy unreadable/corrupt | — | — | treated as `approval_required` | — | — | — | — | 403 | — |
| D5 | Approval | Owner (default) or admins (if delegated) | verification `pending` (or `suspended` via reinstate) | `requireDecisionAuthority('dealer')` on `/api/verification/admin/:id/approve|reinstate`, `/api/admin/users/:id/verify-dealer`, `/approve-dealer` | atomic conditional update on current status; `dealers.approved=true`; `users.status=approved`; `cars.isVerifiedDealer=true`; pending cars published **only if** moderation is `auto_publish` and the policy is readable | `logActionFromReq` + admin audit | in-app: "Your dealer application has been approved…"; communications on `approve-dealer` | repeated approve → 409; concurrent approve/reject → one 200, one 409 (`stage5DealerDecisions`) | 200 / 403 / 404 / 409 | Suspend (not decision-gated: protective) |
| D6 | Rejection | same | `pending` | same | status `rejected`, reason stored; `dealers.approved=false`; `users.status=rejected` | yes | in-app with reason | 409 on repeat | 200 | Resubmit (D7) |
| D7 | Resubmission | Dealer | `rejected` | as D3 | status → `pending` | log | acknowledgement | — | 200 | — |
| D8 | Suspension | Admin (protective, existing rule) | `pending` or `approved` | `allowRoles(admin, superadmin)` | `suspended`, `dealers.is_suspended` | yes | in-app | 409 if already suspended | 200 | Reinstate (D5) |
| D9 | Revocation of capability | — | — | There is no separate "revoke" state: suspension is the revocation mechanism | | | | | | |
| D10 | Failed verification (email) | Dealer | unverified | `dealerOnly` | none | — | — | — | 403 `EMAIL_VERIFICATION_REQUIRED` | resend |

### Derived stage returned to the dealer UI (`GET /api/verification/status → onboardingStage`)
`email_unverified` → `application_not_submitted` → `pending_approval` → `approved` | `rejected` | `suspended`. Email-unverified always wins, so a dealer is never shown as approved while the email is unverified.

### What a dealer ability does **not** grant
Listing ability (`requireDealerVerification`) is separate from payouts, escrow, finance, admin and staff permissions, which are governed by `config/roles.js` permissions and `escrow_capability_status` (decision D14) and were not changed. Email verification never changes `role` or `users.status` (test: "valid token verifies the email and nothing else").

## 3. Owner-policy transitions
| Transition | Actor | Rule | HTTP |
|---|---|---|---|
| Read | admin/superadmin with `MANAGE_SETTINGS` | read-only unless owner | 200 / 401 / 403 |
| Change | Platform owner (email in `WEBHOIST_EMAIL(S)` **and verified**) | validated enums, unknown keys rejected, `expectedRevision` required, compare-and-swap | 200 / 400 / 403 `OWNER_ONLY` / 403 `OWNER_EMAIL_UNVERIFIED` / 409 / 500 / 503 |
| Row missing | — | launch defaults (not open) | — |
| Read error / corrupt | — | restrictive values: sellers closed, dealers closed, listings held, owner-only authority | — |
