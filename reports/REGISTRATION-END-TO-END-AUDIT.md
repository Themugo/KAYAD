# Registration end-to-end audit

Base `origin/main` bfe3735, worktree `/home/claude/p10` (branch-less, created for this task; `p8`/`p9` and every v2/v3 deliverable untouched). Status labels: VERIFIED (executed here, with evidence) / FAILED / BLOCKED / NOT TESTED. **Production verification: BLOCKED** (see Blockers). Nothing was committed, pushed, merged, deployed or applied to a hosted database.

## Headline finding
**The hosted registration function is a placeholder, so every registration against that database fails.** `public.kayad_register_identity_atomic` on the hosted Supabase project (`ubvgixwhfybbyjuvxboj`, "KAYAD EA"), read through `pg_get_functiondef` (read-only), contains only a role check between the comments `-- Other function logic` and `-- Remaining registration logic`, then `END`. It never inserts into `users`/`user_auth` and never returns the `jsonb` it declares. PostgreSQL raises 2F005 ("control reached end of function without RETURN"); PostgREST answers 400; the backend catches it as a generic failure.
* Evidence it is live, not theoretical: the hosted API log shows `POST /rest/v1/rpc/kayad_register_identity_atomic` → **400 twice, 2026-11-22 13:11:10 and 13:11:40 UTC** (30 s apart: a person retrying). No other call to that function is in the retained window.
* The cause of the 400 was **inferred** from the function body; no Postgres log line was retained for it (VERIFIED: body; NOT OBSERVED: the exact error text on hosted).
* Hosted data is consistent with a once-working function that was later overwritten: 3 users, all verified, last created 2026-11-09 07:17 UTC; 0 users without a credential row; 0 credential rows without a user. The hosted migration history (`list_migrations`) ends at 2026-09-22: none of the October/November migrations (including `20261001090000_registration_onboarding_integrity.sql`) is recorded, so the function was changed outside migrations. Of all `public` functions, only this one matched a scan for placeholder markers ("Other function logic", "Remaining … logic", TODO, placeholder).
* Assumption to confirm: that this project is the database behind the live site (the 400s at 13:11 UTC say somebody is registering against it).

## What the code does (VERIFIED by reading, and by journey 20 on a disposable stack)
| Step | Behaviour |
|---|---|
| Entry | `POST /api/v1/auth/register` (CSRF, registration rate limiter, validation, optional `Idempotency-Key`). |
| Validation | name/email/password required; password ≥ 8 with upper, lower, digit, special; email NFKC-lowercased; reserved owner addresses refused; dealers need business name (validated) and location; dealer onboarding policy gate (503 if the policy cannot be trusted, 403 if closed). |
| Roles | `dealer` → dealer identity (status `pending`, separate verification). **Everything else, including the retired `individual_seller`, becomes a personal `user`** (compatibility note + `Deprecation` header). Unified-account architecture intact: no separate buyer/private-seller account system exists or was added. |
| Persistence | One database transaction: `kayad_register_identity_atomic` writes `users` (+ profile/dealer triggers) and `user_auth` (bcrypt hash, SHA-256 of the verification token, 24 h expiry). No half-created accounts possible. |
| Duplicates | Unique email → 409. A retry of the **same** attempt (same idempotency key, same derived token) is answered as the original success (200, `replayed: true`) without a second account. A different attempt against an existing unverified account gets 409. |
| Email | Verification and welcome emails are dispatched asynchronously **after** the commit; provider failure never rolls the account back or blocks the response. |
| Supabase Auth | **Not used.** KAYARD KE runs its own cookie/JWT auth over PostgREST tables; Supabase Auth settings, SMTP and email templates are therefore irrelevant to registration (VERIFIED by reading; no `supabase.auth.*` sign-up path). The only email provider is Brevo (transactional API). |
| Login gate | Login is refused (403, "verify your email") until verified when `REQUIRE_EMAIL_VERIFICATION=true`, or when it is unset and `BREVO_API_KEY` exists. Verification does **not** sign the person in. |
| Frontend | `OnboardingFlow`: success screen says "We sent a verification link…" with resend; 409 → "exists" screen with resend and sign-in; a 503 that carries a backend code → "We couldn't create your account right now… Nothing was created."; unknown outcomes (network drop) are retried with the same idempotency key. `VerifyEmailPage`: runs once per link (guarded against double submit), success → sign-in, failure → resend form. `LoginPage`: verification-required notice with resend. |

## Defects found
| # | Finding | Severity | Status |
|---|---|---|---|
| R1 | Hosted registration function is a placeholder (above). | Critical, blocks all sign-up | Repair written (`20261122200000_restore_register_identity_atomic.sql`), **not applied** (needs owner approval). |
| R2 | The backend turned that failure into a generic 500 "Registration could not be completed. Please try again." which invites endless retries and gives operators no instruction. | High | FIXED in code: 2F005, or a function that returns no user row, now answers 503 `DATABASE_MIGRATION_REQUIRED` (the frontend already renders this as "Nothing was created") and logs the restore instruction. |
| R3 | `verifyEmail` consumed the single-use token first and marked the user verified second; a database failure in between burned the link and left the account unverified. | Medium | FIXED: the token is restored if the second step fails; journey 20 F1–F3. |
| R4 | A registration function that returned HTTP 200 with a null body would have been treated as success, crashing later. | Medium | FIXED (R2). |

## What was not a defect (checked)
Resend never invalidates the link a person holds unless the provider accepted the replacement; resend, forgot-password and unknown/verified addresses return identical generic responses; verification/reset email bodies are not persisted in the delivery ledger (tokens never stored); the raw tokens and the provider key do not appear in logs or ledger rows (journey 20 H1–H3).

## Blockers (cannot be done from this environment)
* No authorised test mailbox, no Brevo credentials, no production API URL or credentials. The sandbox's outbound network is allow-listed: `curl` to the site returns a proxy 403 and the web-fetch tool refuses the domain.
* No DNS tooling and no outbound DNS: SPF, DKIM and DMARC for the sender domain were **not inspected** (NOT TESTED).
* Hosted writes and migrations are forbidden by the task rules, so the repair cannot be applied or verified on hosted.

See `EMAIL-DELIVERY-AUDIT.md` and `REGISTRATION-REPAIR-REPORT.md`.
