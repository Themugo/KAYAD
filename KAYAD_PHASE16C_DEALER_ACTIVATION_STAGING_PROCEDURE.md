# KAYAD Phase 16C — Proposed staging procedure: activate the test dealer through the normal workflow

**PROPOSAL ONLY. Hosted `kamauwamakena@gmail.com` and all its records are untouched; nothing here was run on hosted or staging.** No verification or approval is bypassed, and no activation is fabricated.

## What local evidence exists (disposable stack, tier A/D)
`e2e_dealer_lifecycle.cjs` — **50/50**: registration (201, pending, unverified), weak password / missing business fields / self-registration as admin refused, duplicate email (case-insensitive) 409 and a concurrent-duplicate race yields exactly one account, password stored as a hash, verification token single use, login/session/CSRF, an unapproved dealer cannot create listings (403 `DEALER_APPROVAL_PENDING`), onboarding validation (400, nothing persisted) and resumability, idempotent resubmission, a dealer cannot approve itself, **a non-owner superadmin cannot approve under the default `owner_only` policy (403 `DECISION_AUTHORITY_REQUIRED`)**, approval does not publish inventory, approved dealers cannot rewrite payment details, rejection with reason then resubmission, suspension (`DEALER_ACCOUNT_SUSPENDED`), explicit reinstatement, illegal transitions refused.
`registration_dealer_onboarding_pg_checks.sh` — **47/47** for M1 (atomic register function, rollback of a failed second insert, duplicate handling, suspended status).
Not exercised: real email delivery of the verification link, real Cloudinary photo upload, hosted data.

## Preconditions on the staging project
1. M1 applied and verified (`kayad_register_identity_atomic` present, four `dealers` columns, `suspended` accepted by the verification CHECK).
2. **A usable owner exists** (operation sequence Gates 2–5), because the default dealer-approval policy is `owner_only`: only an owner can approve. Approval is therefore the *last* step, after the primary owner is established.
3. A staging email provider is configured and a mailbox you control receives the verification link.

## Procedure
| # | Action | Actor | Expected |
|---|---|---|---|
| 1 | Use a **staging copy** of the dealer (a fresh, clearly synthetic address, e.g. `dealer.staging+16c@<your domain>`), not the hosted account. To exercise the hosted address itself, that is a separate, explicitly approved gate. | tester | — |
| 2 | Register as dealer (business name, location, phone) | tester | 201; `users.role='dealer'`, `status='pending'`, `email_verified=false`; no password/token in the response |
| 3 | Open the emailed verification link once | tester | verified; replay refused |
| 4 | Complete onboarding at `/dealer/onboarding` (business, payment details) and submit | tester | `dealer_verifications` row `pending`; page is resumable |
| 5 | An owner opens the dealer verification queue and reviews | owner | decision requires owner authority |
| 6 | Approve (or reject with a reason; test both on separate synthetic dealers) | owner | approved dealer reaches dashboard; **no listing is auto-published**; payment details become read-only (409 on rewrite) |
| 7 | Suspend then reinstate once | owner | `DEALER_ACCOUNT_SUSPENDED` on write attempts; reinstatement explicit |
| 8 | Error recovery: submit invalid onboarding, repeat registration with the same address, resubmit after rejection | tester | 400 nothing persisted / 409 / back to `pending` |
Verification queries after each step: `select role,status,email_verified from users where email=…; select status,reviewed_by from dealer_verifications where dealer=…; select count(*) from owner_memberships` (must not change).

## Hosted `kamauwamakena@gmail.com`
Currently (Phase 16 read-only evidence, not re-queried in 16C) it cannot complete registration/onboarding because the hosted schema lacks M1. After M1 is approved and applied on hosted, activation follows steps 4–6 through the normal workflow, performed by an owner. **Never** set its status or verification by SQL.
