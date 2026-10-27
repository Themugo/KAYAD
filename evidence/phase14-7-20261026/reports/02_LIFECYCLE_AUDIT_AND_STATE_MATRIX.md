# 02 Registration / onboarding lifecycle audit (Orders 3-4)
Verification level: L = local unit/HTTP with mocked persistence; no real DB or staging (see 11).

| Step | Route -> handler -> store -> UI | State persisted | Protections | Level |
|---|---|---|---|---|
| Account type + register | POST /api/auth/register (registrationLimiter, validateAuth) -> authController.register -> RPC kayad_register_identity_atomic (users + user_auth atomically) -> register page | users.status pending (dealer, private seller) or approved (user) | CSRF bootstrap, password rules, 409 on duplicate incl. 23505, reserved owner email blocked, dealer needs businessName + location | L |
| Email verification | GET /api/auth/verify-email/:token, POST /resend-verification (verificationLimiter + authLimiter) | emailVerified | delivery is non-blocking (`void deliver`); resend commits only on provider acceptance (test 5e) | L |
| Login/session | /api/auth/login, refresh, tokenVersion | session | session expiry/refresh-reuse validators pass | L |
| Dealer onboarding | GET/PUT /api/dealer/onboarding (allowRoles dealer) -> dealers row + submitDealerVerification -> DealerOnboarding.jsx | dealers.business fields, payment_details, onboarding_complete(+_at); dealer_verifications pending | zod schema; payment details only ever returned to the owner; **14.7: locked (409) before any write when verification is approved/suspended**; compensation restores prior state if the verification write fails | L |
| Dealership review | /api/verification/admin/* with requireDecisionAuthority("dealer"); transitionDealerVerification | dealer_verifications.verification_status, dealers.approved/is_suspended | compare-and-swap; legal transitions only (pending->approved/rejected/suspended, rejected->pending, approved->suspended, suspended->approved) | L |
| Listing creation | POST /api/cars -> requireDealerVerification -> createCar | cars.status | suspended/rejected blocked with codes; pending allowed only in self_onboarding, max 3; listing status is server-assigned `pending` unless policy auto_publish AND seller approved | L |
| Approval vs listings | transitionDealerVerification | writes only dealer_verifications + dealers | tests stage5f16 prove approval never touches cars/users and never publishes a pending listing under any policy | L |
| Completion screen | DealerOnboarding `?complete=1` | none | **14.7: shows the true state; rejected/suspended no longer read "Submitted for review"** | L |

## State matrix
| From | To | Actor | Effect |
|---|---|---|---|
| (none) | pending | dealer submit | verification row |
| pending | approved | admin (decision authority) | dealers.approved=true; listings unchanged |
| pending | rejected | admin | reason stored; dealer may resubmit |
| rejected | pending | dealer resubmit | |
| approved | suspended | admin | dealers.approved=false, is_suspended=true; listing creation blocked |
| suspended | approved | admin reinstate | explicit only |
| approved/suspended | any via onboarding PUT | dealer | refused 409 DEALER_ONBOARDING_LOCKED (14.7) |
Anything else returns 409.

## Findings
- No confirmed defect in registration, duplicate handling, verification email, or approve/reject/suspend transitions.
- Fixed: onboarding wrote then rolled back (D-1); completion screen misreported rejected/suspended (D-2).
- Observation: GET /api/dealer/onboarding creates an empty dealers row if missing (role dealer only). Left unchanged; the row is required by the onboarding flow and is idempotent.
- Schema concerns (bio, payment_details, onboarding_complete, onboarding_completed_at, suspended status): already present in migrations R12 and R14; no new migration needed.
