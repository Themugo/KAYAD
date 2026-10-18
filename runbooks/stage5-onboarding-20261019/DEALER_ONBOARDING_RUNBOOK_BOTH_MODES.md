# Dealer onboarding — runbook for both modes

Distinguish four things in every message, screen and conversation: **application received** → **email verified** → **dealer approved** → **listings published**. Email verification never approves a dealer; approval never publishes listings under *hold_for_review*.

## Mode 1 — `self_onboarding`
| Step | Dealer | System | Owner |
|---|---|---|---|
| 1 | Registers as *Dealer* (business name + location) | 201; account `pending`; dealer profile `approved=false`; message "Dealer application received… not approved until reviewed" | Receives pending-seller notice |
| 2 | Verifies email | verified; still pending | — |
| 3 | Submits dealer documents | Acknowledgement notification ("received… does not mean approved"); verification `pending` | Reviews in Admin → Dealer verifications |
| 4 | Lists vehicles | **Up to 3** while pending; each follows the moderation setting; no verified flag; further listings 403 | — |
| 5 | — | — | Approve or reject (owner by default) |
Not granted in this mode: verified status, more than 3 listings, payouts, escrow, finance, admin, unrestricted publication.

## Mode 2 — `approval_required`
| Step | Dealer | System | Owner |
|---|---|---|---|
| 1–3 | as above | as above | — |
| 4 | Tries to list | 403 `DEALER_APPROVAL_PENDING` ("wait for review") — no progressive access | — |
| 5 | — | — | Approve (dealer can now list) or reject (dealer is told the reason and can resubmit) |

## Decisions (both modes)
- Endpoint of record: **Admin → Dealer verifications** (`/api/verification/admin/:id/approve|reject|suspend|reinstate`). `verify-dealer` and `approve-dealer` remain available and now behave consistently (set `users.status`) and obey the same authority setting.
- **Authority:** default `owner_only`. An ordinary admin receives 403 `DECISION_AUTHORITY_REQUIRED` unless the owner delegates to `admins` in Settings → Onboarding. Suspension remains available to admins (protective).
- **Duplicate/concurrent decisions:** the second decision receives 409; the stored state is the winner's.
- **Audit:** every decision is logged with actor and target (`verification_approve|reject`, `dealer_suspend|reinstate`, "Dealer decision: approve-dealer", "Dealer verification: …"); critical ones retry once and alert (`AUDIT_WRITE_FAILED_AFTER_COMMIT`).
- **Approval wording the dealer receives:** "Your dealer application has been approved. Your listings are published according to the platform's listing review process." Rejection includes the reason.
- **After approval under `hold_for_review`:** pending listings stay pending for explicit review. Under `auto_publish`: pending listings from that dealer are published in one step (sold listings untouched).

## Switching modes at runtime
Settings → Onboarding → Dealer onboarding. Effective for new requests at once (≤5 s elsewhere). Existing approved dealers are unaffected; pending dealers gain/lose the limited access; `closed` stops only *new* registrations.

## One-dealer acceptance script (supervised)
1. Confirm mode on the page. 2. Dealer registers. 3. Dealer verifies email. 4. Dealer submits documents; confirm the acknowledgement arrives. 5. Dealer tries to list (expect 403 in `approval_required`, up to 3 in `self_onboarding`). 6. Owner approves. 7. Dealer lists; listing `pending` (hold) → owner approves listing. 8. Owner suspends then reinstates to prove reversibility (optional). 9. Record outcomes.

## Evidence status
Both modes are proven by automated tests on emulated persistence (`onboardingFlow`, `stage5RegistrationAndLifecycle`, `stage5DealerDecisions`, `stage5OwnerOnboardingSettings`). Atomic registration and the settings compare-and-swap are proven on real PostgreSQL (disposable). **Not run:** a browser journey, a hosted database, live email.
