# KAYAD Stage 5E.3 — Email delivery, session-table recovery and staff menu fix (2026-10-20)

Status: owner sign-in RECOVERED on hosted. Staff menu fix PREPARED (not yet merged). Production readiness NOT certified.
Live main at start: a88eaf37. Backend build in production: a88eaf37.

## 1. Root causes (each confirmed by read-only hosted queries run by the owner)
1. No email ever reached Brevo: hosted `communication_deliveries` lacked `idempotency_key` and its status rule lacked `dead_letter`, so every
   send failed when recording the delivery, before Brevo was called (first recorded 2026-10-13, never repaired). Channel/event controls were already enabled.
2. Password reset ended in "An error occurred" AFTER saving the password: the handler then revokes sessions in `refresh_tokens`, whose hosted shape was the
   legacy one (plaintext `token`; no `token_hash`, `family_id`, `session_id`, `replaced_by`, `revoked_at`, `revoke_reason`, `reuse_detected_at`).
3. Sign-in returned 500 after verification for the same reason (session creation inserts the missing columns).

## 2. Hosted changes (by the owner, Supabase SQL editor, one statement at a time; none by Claude)
See `runbooks/stage5e3-hosted-recovery-20261020/`. Preflight: `communication_deliveries` 0 rows; `refresh_tokens` guard aborts when non-empty.
Tested beforehand on a throwaway local Postgres 16 copy (login-style insert, revoke update, rotation, replay detection, idempotent re-run, guard).

## 3. Observed results
Reset email recorded `sent` 11:45 EAT and arrived from KAYAD <no-reply@kayad.space> (inbox). Owner address ji***@gmail.com: reset applied, owner-unverified
gate shown, resend-verification 202, verification link 200, sign-in succeeded, role Superadmin. Decision D-5E2-1 (verification click = owner activation in
legacy mode) was exercised by the owner on this account. Second designated owner (ka***@gmail.com) NOT done.

## 4. Staff menu / dashboard fix
Navbar recognised only role `admin`; `superadmin` and other staff fell into "Private Seller / Buyer" with buyer/seller shortcuts, and DashboardHub showed the buyer
auction journey and bidder card to every role. New helper derives from the canonical STAFF_ROLES in `utils/authRoutes.ts` (excludes `ghost_checker`).
Observed: new tests 20 pass; negative control: menu tests fail 6 of 10 on the original Navbar; mobile-menu validator kept satisfied by retaining the literal
`user?.role === 'admin'` (assertion not weakened); eslint 0 errors; tsc error count unchanged (197 before and after, none in changed files).
Unchanged: dealer/mechanic menus still show buyer items; inspectors unchanged.

## 5. Lessons
Supabase SQL editor shows only the last result of a batch and a `begin/commit` batch once reported success without persisting: run one statement at a time and
verify with a SELECT. Public `/health` does not report communications readiness (admin-only `/health/deep`). Never paste reset links or tokens in chat.

## 6. Still open
Hosted DB still behind the code elsewhere (63 repo migrations not on hosted per the 2026-10-13 audit); dashboard tiles "—"; `/api/hero` and
`/api/admin/public/config` 500. Second owner. Brevo key is Full access (Restricted recommended). `BREVO_WEBHOOK_TOKEN` unconfirmed. Findings F-5E1-03..14 remain.
