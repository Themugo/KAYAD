# KAYAD Phase 16A — Main test dealer: preservation and the normal activation path

Account: `3ef47f31-0254-44a5-b141-4634ed9671c8` (`ka***@gmail.com`). **Current hosted state [H-RO]: role dealer, status pending, e-mail NOT verified, never signed in, 0 sessions, 0 `dealers` rows, 0 `dealer_verifications` rows.** This package does not change it and does not call it active.

## Preservation (tested [A] and [D])
* Byte-identical `users` + `user_auth` + `profiles` rows and unchanged absence of dealership/verification rows after: owner bootstrap, primary accept, MFA, second-owner invite/accept/revoke/re-invite, squatted-address linking, expired/duplicate invitations, and the proposed P1 update ([D] 24/24 includes the dealer's `profiles` row).
* Holds no owner membership; owner routes 403; admin routes 403; cannot create listings while unverified/pending.

## Normal user-driven activation (rehearsed end to end [A])
| # | Actor | Action | Result observed |
|---|---|---|---|
| 1 | dealer | request a new verification e-mail | generic enumeration-safe answer (200/202) |
| 2 | dealer | open the e-mailed link | mailbox verified; `email_verified=true` |
| 3 | dealer | sign in → **Dealer onboarding** (business, location, payment, ID documents) | `dealers` row + `dealer_verifications` row `pending`; still not approved; no listing rights |
| 4 | ordinary admin | try to approve | **403 `DECISION_AUTHORITY_REQUIRED`** |
| 5 | owner | `POST /api/verification/admin/:id/approve` | verification `approved`, dealer `approved` |
| 6 | — | check | role stays `dealer`; **no owner membership; owner routes 403** |

## Hosted blocker [H-RO] — must be resolved before step 3 can work on hosted
Hosted `dealers` is missing `bio, onboarding_complete, onboarding_completed_at, payment_details`; `dealer_verifications.verification_status` CHECK allows only `pending/approved/rejected`. Repo migrations that fix this: `20261012140000_dealer_onboarding_columns_r12.sql`, `20261012140100_dealer_verification_suspended_status_r14.sql` (after drift reconciliation). Not proposed for execution; needs its own approval. Steps 1–2 work without them. Do **not** insert dealer/verification rows by SQL to "speed it up" — that would fake the activation.
Also: hosted lacks `kayad_register_identity_atomic`, so *new* public sign-ups fail there; this does not affect the existing test-dealer row.
