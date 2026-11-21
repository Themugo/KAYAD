# Stage 5E.1 — Root cause of the owner sign-in block, with Brevo as the recovery channel

Evidence tiers: **S** source · **L** local/disposable run (stub providers) · **M** mocked HTTP · **H** hosted read-only (carried from earlier stages, **not re-run**) · **U** unknown.
Owner addresses are masked in documents: owner-1 = `ji***@gmail.com` (existing dealer account), owner-2 = `ka***@gmail.com` (second *intended* owner, two "a"s in the second word). Neither is proven to be controlled by anyone yet.

## 1. Source cause — **CONFIRMED (S + L)**
The exact message is `OWNER_IDENTITY_UNVERIFIED_RESPONSE.message` in `backend/config/owners.js`. It is returned with **HTTP 403 and `code:"OWNER_IDENTITY_UNVERIFIED"`** by `authController.login` after the password has been checked, when
`isUnverifiedOwner(user)` is true = *the normalised address is designated an owner* **and** `users.email_verified !== true`.

Request path: `LoginPage.jsx` → `authApi.login` (`authFetch`) → `POST /api/auth/login` → `authController.login`: user + credential lookup → lockout/ban/deactivation checks → **bcrypt compare** → `isUnverifiedOwner` → 403. Frontend mapping: `AuthApiError.kind`. Same predicate (one function, `config/owners.js`) also guards `refreshToken`, `middleware/auth.protect`, `optionalAuth` and socket auth, so there is no divergent predicate (L: K1.2–K1.5, K7).
A **wrong password returns the generic 401**, so the message proves the typed password was right.

## 2. Candidate causes you asked about
| Candidate | Verdict | Why |
|---|---|---|
| Actual verification state | **Most likely (inferred)** | Prior hosted read-only evidence (H, earlier stage): owner-1 existed as `dealer / pending / email unverified`. The condition needs only designation × unverified |
| Owner-email configuration mismatch (typo, wrong list) | **Possible, undetermined (U)** | A mis-spelled entry silently designates a different address; the new offline `--verify-designated` command (booleans only) distinguishes "my address is designated exactly" from "something else is". It must be run on the host |
| Divergent owner predicates (login vs middleware vs `/auth/me` vs sockets) | **Ruled out (S, L)** | single shared predicate; tests A3/A6, K1, K7 |
| Missing schema / governance records | **Not the cause of this 403 (S)** | the gate runs after a successful user + credential read; missing schema would surface as 500s. Hosted *does* lack the governance tables (H), which only means **legacy mode** (designated + verified = owner) |
| Missing or invalid verification token | **Possible, undetermined (U)** | the link may have been used/expired/replaced; each variant gives 400 "Invalid or expired" (M: E5) |
| Broken resend implementation | **One real defect found and fixed in Stage 5E; verified again here (M)** | with the old code, when email-verification was not "required" a failed send still replaced the stored token. Now the provider-acceptance check is unconditional |
| Provider (Brevo) configuration / delivery failure | **Does not cause the block; can prevent recovery (U)** | the owner message is independent of Brevo, but without a working Brevo path the "Resend verification email" cannot succeed; readiness on the deployed backend is unknown |
| Stale deployed revision | **Undetermined (U)** | message + code exist only in Stage 5A+ source ⇒ deployed ≥ 5A. The frontend panel/resend button for this error exists only from Stage 5E.2 (`0a3d10bb`) |
| Frontend defect | **Real, fixed in 5E.2 (L, B)** | the login screen told the owner to use a button it did not render for this error |

## 3. Owner recognition for both intended identities (disposable execution only)
| Question | Legacy mode (**hosted today**) | Database mode (after governance migration + bootstrap) |
|---|---|---|
| owner-1 and owner-2 listed in `WEBHOIST_EMAIL` | each is *designated* | each is *reserved*; the list only limits who may be invited at bootstrap |
| Unverified | blocked with the 403 above | blocked with the same 403 (membership may exist but is not honoured until the mailbox is verified) |
| Verified | **becomes owner on the next request, silently** | becomes owner **only** with an active, verified membership created by accepting an invitation |
| `users.role` / `users.status` / dealer rows | unchanged by verification | unchanged by acceptance (new second owner is created as `user/approved`) |
Evidence: `role_api_k` 93/93 (K1 gate, K4 invitation, K5 preservation, K6 bootstrap, K7 last-owner/recovery), UI 35/35, PG 63/63 — all on a disposable stack with stub providers, from the 5E.2 package; unchanged here.

## 4. Brevo-first recovery for the login block (design, not executed)
1. The login screen now shows the **"Resend verification email"** panel for `OWNER_IDENTITY_UNVERIFIED` (5E.2).
2. `POST /api/auth/resend-verification` → generic **202** (no oracle) → real gateway → **Brevo** → *only if Brevo accepts* the replacement token is committed (M: E1–E4).
3. The owner opens the link (`FRONTEND_URL/verify-email?token=…`); the token is single-use, 24 h, hash-stored. Acceptance by Brevo ≠ delivery ≠ click (M: E7).
4. In **legacy mode** this click **is** owner activation (D-5E2-1 — decision pending). In database mode it only proves the mailbox; the invitation grants the authority.
Whether step 2 can succeed on the deployed backend depends on Brevo being configured and the sender validated: **UNKNOWN**. `backend/scripts/brevo-readiness.mjs --live-readonly` (GET-only, no email) answers it from an operator's machine with the real environment.

## 5. Runbook `runbooks/identity-staging/01_OWNER_RECOVERY_GATE.md` — classification (carried from `RECOVERY_RUNBOOK_CLASSIFICATION_5E.md`)
Read-only inspection and disposable rehearsal steps are safe; every step that writes `users`, owner tables, sessions or sends a real message is **hosted mutation requiring explicit authorisation**, and the "force-verify email by SQL" style shortcuts are **unsafe under current authorisation** (they would make an email-only ownership claim). None was executed.

## 6. Safe next action for the login error (needs the owner, nothing hosted by Claude)
1. Owner confirms what the hosted project is (production/staging) and the deployed commit (host dashboard).
2. On the host shell or a trusted machine: `node backend/scripts/owner-bootstrap.mjs --verify-designated "<typed address>"` and `node --env-file=<env file> backend/scripts/brevo-readiness.mjs --live-readonly` (both print booleans only).
3. Decide D-5E2-1. Only then does the owner click **Resend verification email** from the login page.
