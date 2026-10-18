# KAYAD — Stage 5 Baseline Report (owner-controlled onboarding, email verification, first-seller readiness)

**Date of work:** Sunday 18 October 2026 (Africa/Nairobi). The brief and the required archive name say 19 October 2026; the archive keeps the name given (`…-20261019.zip`).
**Runtime:** Node.js 22.22.2, npm 10.9.4.
**Honesty note on ordering.** The brief asks for this baseline *before* any code change. The audit findings below were recorded before the first source file was edited, but this document was *written up* during the work, after the first service file had been created. No source file other than the new `onboardingPolicy.service.js` had been modified when the audit conclusions were fixed. The pre-change test numbers are taken from the Stage 4A evidence logs, not re-run on a reconstructed pre-change tree.

## 1. Foundation provenance (Workstream A)
| Item | Result |
|---|---|
| Foundation archive | `KAYAD-STAGE4A-GATE-CLOSURE-FULL-PROJECT-20261018.zip`, SHA-256 `ab0740a7b9a00e10648b0f3a579e98445c30f867d55058b293d79b6a541e3716` (matches the Stage 4A certification file; archive test and manifest verification passed at Stage 4A packaging and were re-verified at Stage 5 start) |
| Working tree | Stage 4A tree copied to an isolated directory; scratch Git baseline, HEAD `70f843d` (Stage 4A), earlier commits Stage 3A `a4ade61`, Stage 4 `d4da1cb`. Scratch history only — **nothing was committed or pushed to the real repository.** |
| Windows working tree (`C:\Users\hp\Desktop\kayad-fresh`) | **NOT REACHABLE.** The device bridge reported "not connected" at the start and when retried. The Windows Git state, the backup, the two odd path artifacts (`"t proxy\357\200\242"`, `tatus --short`) and the five previously-missing files were **not inspected** (gate G0 stays open). The five files are not present in any archive held. |
| Package manager | npm (`package-lock.json`, `backend/package-lock.json`); `bun.lock` retained but non-authoritative (decision D13). |
| Dependencies | Not changed. No `npm audit fix`. |

## 2. Pre-change test baseline (from Stage 4A evidence)
Frontend Vitest 81 files / 643 passed / 1 skipped · backend Jest 109 suites / 1586 passed · backend Vitest 36 · node:test 1 · `tsc` and `vite build` clean · 8 live/hosted validators exit non-zero by design (they need a hosted environment): `validate:communications:providers`, `verify:production`, `validate:live-runtime`, `certify:v14:live-api`, `certify:v14:production-runtime`, `certify:phase6:live`, `verify:backup`, `certify:buyer-portal:staging`.

## 3. Repository-evidence facts used for the design (no hosted state is assumed)
- **Registration** is one atomic database function, `kayad_register_identity_atomic` (migration `20261001090000`): allows roles `user`, `individual_seller`, `dealer`; `status='approved'` for `user`, `'pending'` otherwise; `email_verified=false`; inserts `users` and `user_auth` (hashed verification token) in one transaction; a trigger creates an unapproved `dealers` row for dealers.
- **Email verification** is *provider-gated*: `login` and `protect()` enforce it only if `REQUIRE_EMAIL_VERIFICATION=true`, or if unset and `BREVO_API_KEY` is set. With neither, verification is enforced **nowhere**.
- **Owner** = email in `WEBHOIST_EMAIL(S)`; exempt from the verification gate; no database flag.
- **Settings:** two existing mechanisms — singleton `platform_config` (admin config API) and key/value `system_settings` (kill-switch, `ghostCheckFee`).
- **Listing status** is set in `createCar`: `approved` seller ⇒ `available`, else `pending`. `cars_status_check` excludes `rejected` (decision D3, gated).

## 4. Defects and gaps found by the audit (all fixed or documented in the Stage 5 report)
| # | Finding | Severity |
|---|---|---|
| A1 | The admin "Require Dealer Approval" toggle is dead: stored, never read | High (owner believes they control something they do not) |
| A2 | Seller email verification is off whenever Brevo is not configured | High |
| A3 | `individual_seller` is auto-approved as a dealer at first listing with no review and no email check | High |
| A4 | Three different dealer-approval endpoints, all usable by any `admin`; one (`verify-dealer`) does not set `users.status`; one bulk-publishes pending listings and would bypass a hold-for-review policy | High |
| A5 | `transitionDealerVerification` is read-then-write: concurrent approve/reject can both "succeed" | Medium |
| A6 | A seller can self-publish through `dealer/cars/bulk-status`, `dealer-platform inventory/bulk` and `dealer/cars/:id/duplicate`, bypassing moderation | High |
| A7 | No dealer application acknowledgement; welcome email says "Your account is ready" to unapproved dealers | Medium |
| A8 | The raw email-verification token is part of the URL path of `GET /auth/verify-email/:token` and is written to request/access logs | High |
| A9 | The owner is exempt from verification and identified by email only; if the owner address is unregistered, anyone registering it inherits owner power | High (pre-existing; mitigated for the new controls, **launch-checklist item**) |
| A10 | The migration chain had never been replayed on a database; `system_settings` final state is service-role only | Information |
