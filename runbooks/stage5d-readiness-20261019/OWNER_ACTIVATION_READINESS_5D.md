# Stage 5D — Owner activation readiness (Gate 7)

Real accounts were **not** created, activated, invited or modified. No password was generated or stored.

## Procedure verification (disposable identities, tier R + P)
role_api_d: 49 pass / 0 fail on the 5D tree — designated address without membership is an ordinary user (O1); `--plan` read-only, bootstrap `--apply`, hashed single-use invitation tokens, replay refused, accept → login for two owners (O2); owner surfaces, stale-revision rejection, refresh consistency (O3); non-owners refused (O4); step-up and typed-email confirmation, third owner, removal with immediate live-session cut-off, last-owner protection (O5); existing verified account must sign in to accept, recovery with out-of-band verification, old password dead (O6); no token/password material in `owner_membership_events` (O7).

## Per address (status only)
| | `kayadautomotives@gmail.com` (as configured in repo runbook `WEBHOIST_EMAIL`) | `kayadaautomotives@gmail.com` (as typed in the 5D prompt) | `jimmythemugo@gmail.com` |
|---|---|---|---|
| Account exists (hosted, H) | no | no | **yes** — role `dealer`, status `pending`, unverified |
| Mailbox verified | unknown | unknown | no (unverified in DB) |
| Invitation path | 5B bootstrap `--apply` after 5B migration | not designated unless `WEBHOIST_EMAIL` is changed | same |
| Membership verified | no | no | no |
| Login tested | no | no | no |

**Spelling mismatch (blocker A6):** the designated list is `kayadautomotives@gmail.com,jimmythemugo@gmail.com`; the prompt says `kayadaautomotives`. The owner must confirm which is the real mailbox *before* bootstrap, because the invitation is sent to the configured address.

## What activation will do to the existing `jimmythemugo` row (from the 5B accept function)
The row is unverified → treated as possibly squatted: the holder of the mailbox who presents the invitation token **replaces the credentials** (password set at acceptance), `email_verified` becomes true, all refresh tokens are revoked, `token_version` incremented, an active owner membership is added. The function does **not** change `users.role` (stays `dealer`) or the dealer/pending status. If that account is a real dealer application, decide first whether to keep it (owner then has a dealer row too) or use a different address. Decision D-5D-1.

## Owner steps (not executed)
1. Confirm address spelling and mailbox control. 2. Approve and apply the 5B migration on staging first, then production (A3). 3. Set `WEBHOIST_EMAIL`, Brevo credentials (A4). 4. Run bootstrap `--plan`, review, then `--apply`; open the invitation from the mailbox, choose a password yourself (never shared, never stored in repo). 5. Sign in, verify Admin → Owners, then the second owner. 6. Recovery: invitation `recovery` kind by the other owner, or the time-boxed emergency procedure in `OWNER_BOOTSTRAP_AND_RECOVERY_RUNBOOK.md`.
Active owner login is **not** claimed.
