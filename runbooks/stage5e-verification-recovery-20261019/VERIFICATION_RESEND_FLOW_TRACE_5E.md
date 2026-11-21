# Verification & resend-verification flow — end-to-end trace (Stage 5E)

Tiers: **S** source · **M** mocked jest · **R** disposable real stack with *stub* provider (NOT live Brevo) · **U** unknown.
**A stub pass is not proof that the owner can receive an email.** No real mail, no live endpoint was used.

| # | Concern | Implementation (file) | Verdict | Evidence |
|---|---|---|---|---|
| 1 | Route registration | `POST /api/v1/auth/resend-verification`, `GET /api/v1/auth/verify-email/:token` — both behind `verificationLimiter` (default 8 / window, `VERIFICATION_RATE_LIMIT_MAX`) **and** `authLimiter` (`routes/authRoutes.js`) | OK | S |
| 2 | Account lookup / identity binding | `User.findOne({email: normalizeEmail(email)})` (NFKC+trim+lower); token is bound to the `user_auth` row of that user | OK. Note hosted has **no `lower(email)` unique index** (H, prior stage) — duplicates are theoretically possible; the code takes the first match | S, H |
| 3 | Enumeration resistance | unknown, already-verified, no-credential-row, cooldown and "sent" all return **202 with the identical body** | OK | M (stage5aEmailVerificationGate B1), **R K2.1** |
| 4 | Token generation / storage | `crypto.randomBytes(32)` hex (64 chars); only `sha256(token)` is stored (`email_verify_token`); expiry 24 h | OK | S, M (B3), R K2.2 |
| 5 | Cooldown | per-account, stateless (issued-at = expiry − 24 h), default 60 s (`VERIFICATION_RESEND_COOLDOWN_SECONDS`) — suppresses the mail **silently** with the same 202 | OK; UX consequence: a second click within 60 s looks identical to success | M (B2), **R K2.3** |
| 6 | Replacement semantics | new token committed **only after provider acceptance**; superseded link stops working | **Defect found & fixed** (F-5E2-02): the acceptance assertion ran only if `requiresEmailVerification()`; with the gate off / provider unconfigured a failed send still replaced the stored token. Now unconditional | **M red→green** (`stage5eResendCommitOnProviderAcceptance`: 4 fail before, 13 pass after), R K2.4–K2.5 |
| 7 | Single use / replay | `verifyEmail` atomically clears token+expiry (`findOneAndUpdate`) then sets `email_verified=true`; replay → 400 | OK. Residual: the two writes are not one transaction — if the second fails the link is consumed and the account stays unverified (owner must resend). Low | S, **R K2.11** |
| 8 | Expiry | `emailVerifyExpire > now` in the update filter → expired link 400, account unchanged | OK | **R K2.7–K2.8** |
| 9 | Verification-link origin | `${FRONTEND_URL || "https://www.kayad.space"}/verify-email?token=…` — origin comes from env; **fallback is the production domain** if `FRONTEND_URL` is unset (staging would mail production links). No allow-list. Low/Info | S |
| 10 | Provider configuration & failure handling | `deliver()` → `sendRawEmail` (Brevo v3 `smtp/email`, `api-key` header, 30 s abort). Unconfigured ⇒ fails before any network call. Failure is logged, response stays generic. Resend is fire-and-forget (`void (async()…)`) — on a serverless/short-lived host the work can be cut when the response ends | Source-OK; deployment-dependent risk **U** | S, M (B4) |
| 11 | DB schema dependencies | `users.email_verified`, `user_auth.email_verify_token/_expire`, `communication_deliveries` (+ idempotency unique). Hosted has these per the prior read-only inventory except the items listed in the reconciliation matrix | OK for verify path; `communication_deliveries` presence on hosted not re-checked this stage | H(prior) |
| 12 | Audit events | no dedicated audit row for resend/verify (log lines only: `account.email_verification`); owner-governance audit starts at invitation/accept | Gap (Info) — see F-5E2-07 | S |
| 13 | Error reporting | 202 generic; 400 "Invalid or expired verification link. Request a new one."; 500 generic in production | OK | S |
| 14 | Frontend: success / failure / expired | `VerifyEmailPage`: `loading → success` (button "Continue to sign in", `?verified=1` banner) / `error` (server message) / `missing`; error and missing states offer an **email box + Resend** (generic result shown) | OK | S, M |
| 15 | Frontend: owner-unverified login | **Gap fixed** (F-5E2-01): `LoginPage` now recognises `code:OWNER_IDENTITY_UNVERIFIED`, keeps the owner explanation visible **and** renders *Resend verification email* | fixed | M red→green (3/6 fail → 13/13 pass incl. neighbours) |

## Disposable-stack walk-through (tier R, `role_api_k.mjs` K2)
resend for owner ⇒ 202; unknown ⇒ identical; verified ⇒ identical; exactly one mail captured for the owner and none for the others; immediate second resend ⇒ no second mail; after cooldown a new, different link; **old link now 400**, account still unverified; expired link 400; fresh link verifies (200); replay 400; afterwards the verified designated address signs in with its *old* password and holds **no owner authority** until it holds a membership (database mode).

## What this does **not** prove
Live Brevo delivery, DKIM/SPF/sender-domain status, spam placement, that `BREVO_API_KEY`/`BREVO_FROM_EMAIL`/`FRONTEND_URL` are set on the deployed backend, or that the deployed backend runs this code (**U**). Required evidence is in gate G12.
