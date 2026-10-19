# Stage 5E — Dealer-to-owner activation: flow, authorization and exact account-field impact

Subject: `jimmythemugo@gmail.com` — selected by the user as the first owner. **Nothing in this document was executed against the real account.** All behaviour below was observed on disposable PostgreSQL (63 SQL checks) and on the disposable real stack (35 HTTP checks, `role_api_j`), using stand-in addresses at `@kayad-test.example`.

## 1. What exists on hosted today (read-only)
`users` row: role `dealer`, status `pending`, `email_verified=false`, not banned. **`dealers` rows: 0. `dealer_verifications` rows: 0.** There is no onboarding data, no listings link, no subscription — the "dealer record" is the single `users` row (plus its `user_auth` credentials). Only 2 users exist in total. Neither `kayadautomotives@gmail.com` nor `kayadaautomotives@gmail.com` exists.

## 2. Why the address cannot simply "register"
Public registration with a designated owner address is refused: `403 OWNER_IDENTITY_RESERVED` (verified, J1.1). Owner status is never derived from the address alone: `kayad_owner_usable()` requires an **active membership row** + the same normalised e-mail + `email_verified` + not banned/deactivated + status not in (suspended, banned, deactivated, rejected). `pending` does not block. The env list `WEBHOIST_EMAIL` only *designates who may be invited* (verified O1.1–O1.3, T1.2).

## 3. Supported sequence (all steps authenticated or token-bound and audited)
1. Operator (server-side, service-role) runs `scripts/owner-bootstrap.mjs --plan` → state `pending_verification` for the existing account (read-only; masked identity).
2. `--apply --operator <name> --confirm-host <db host>` issues a **bootstrap invitation** (7-day maximum; 256-bit token generated in the backend, **only its SHA-256 is stored**), e-mails it to the address. The CLI never prints the token, never sets a password, never promotes the account. Invitation alone changes nothing (J2.5, T2.8).
3. The mailbox holder opens the link (`/owner-invite?token=…`) and accepts with the policy-conforming password they choose. Acceptance runs in **one database transaction** under an advisory lock (`kayad_owner_accept_invitation_atomic`).
4. The bootstrap switch **closes itself** when every *designated* address is an established owner (J5.1). With a single designated address, it closes after this one acceptance; any further owner is added only by an existing owner (step-up with own password, typed e-mail confirmation, reason recorded).
5. Recovery: owner-issued `recovery` invitation after out-of-band identity verification, or the time-boxed emergency CLI (only when **no** usable owner exists, ≤24 h `OWNER_EMERGENCY_RECOVERY_UNTIL`).

## 4. Two activation paths for an existing account — **owner decision D-5E-1**
| | **Path A — verify first (recommended)** | **Path B — takeover by mailbox (what happens today if you just run the bootstrap)** |
|---|---|---|
| Precondition | account's e-mail is verified through the normal verification mail first | account is still unverified |
| Acceptance | requires the person to be **signed in as that account** (`OWNER_LOGIN_REQUIRED` otherwise — T8.1/T8.2); no password prompt | invitation token alone; password **required** |
| Proves | possession of the existing password **and** the mailbox | possession of the mailbox only |
| Password | **unchanged** | **replaced** (new bcrypt hash; `token_version`+1; verify/reset tokens cleared; lockout cleared; `must_change_password=false`) |
| Sessions | **kept** | **all refresh tokens revoked** (`owner_invitation_credential_reset`) |
| `email_verified` | already true | false → **true** |

## 5. Field-impact matrix (Path B = worst case; Path A in the last column)
| Table.field | Before (hosted today) | After acceptance (Path B) | Path A |
|---|---|---|---|
| `users.role` | `dealer` | **`dealer` (unchanged)** — owner authority comes from the membership, not the role column | unchanged |
| `users.status` | `pending` | **`pending` (unchanged)** | unchanged |
| `users.email_verified` | false | **true** | (already true) |
| `users.business_name / name / phone / location / is_banned` | as is | unchanged | unchanged |
| `dealers`, `dealer_verifications` | 0 rows | unchanged — activation **never** approves, creates or edits a dealer decision (J4.5, T5.2) | unchanged |
| `user_auth.password` | current hash | **new hash** | unchanged |
| `user_auth.token_version` | n | **n+1** | unchanged |
| `user_auth.email_verify_token/expire, reset_token/expire` | maybe set | **null** | unchanged |
| `user_auth.login_attempts / lock_until / must_change_password` | as is | **0 / null / false** | unchanged |
| `refresh_tokens` | 0 rows today | all active rows **revoked** | unchanged |
| `owner_invitations` | — | row `pending`→`accepted`, `accepted_user_id` set | same |
| `owner_memberships` | — | **+1 `active`** (user id + normalised e-mail + `added_via=bootstrap`) | same |
| `owner_membership_events` | — | + `invitation_issue`, `invitation_accept` (denied/success), `membership_activate` (metadata `credentials_reset`, **no secrets**) | same, `credentials_reset=false` |
| `owner_bootstrap_state` | `open` | `closed` (single designated address) | same |
| in-memory | — | auth user cache + owner registry invalidated | same |

## 6. Authorization requirements before any real execution (none is met today)
Owner confirms (i) target environment, (ii) exact address character-by-character, (iii) Path A or B, (iv) policy D1; engineering has (v) applied the reviewed migrations to the *named* target, (vi) deployed the matching backend revision, (vii) Brevo credentials + verified sender, (viii) a recoverable backup. **The CLI masks addresses (`ki***@gmail.com`), so a one-letter spelling error in `WEBHOIST_EMAIL` is invisible in `--plan`/`--apply` output — read the configured value aloud against the mailbox before applying** (the repo contains both `kayadautomotives@` and `kayadaautomotives@`).

## 7. Evidence index
`evidence/stage5e-20261019/pg/owner_dealer_activation_pg_tests.run.log` (63 checks: authorization, token security, expiry, replay, identity binding, atomicity with injected failure, concurrency, Path A/B, last-owner, privileges, audit) · `evidence/stage5e-20261019/api/role_api_j.log` (35 checks) · `role_api_d.log` (49).
