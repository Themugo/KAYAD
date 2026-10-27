# Account deletion, password and profile security audit (Phase 14.9)

## 1. Account deletion
**Finding: no self-service account deletion exists** (no route, no frontend control). It was not invented. Deletion paths that do exist, all staff-only:
| Path | Model | Before 14.9 | After 14.9 |
|---|---|---|---|
| DELETE /api/admin/users/:id (superadmin, protectAccount) | hard delete | Soft-deleted the user's cars, then failed 500 on FKs (partial failure); where it succeeded it silently CASCADE-deleted payments, dealer_payouts, auction registrations/holds, team rows and the dealer row; concurrent duplicates both returned 200 | Preflight dependency inspection (56 FK-derived entries, six categories). Any retained dependency -> 409 ACCOUNT_DELETE_BLOCKED with counts only and the instruction to deactivate. Otherwise: freeze (deactivate, bump tokenVersion, revoke refresh tokens, drop cache) -> re-inspect (restore if a record appeared) -> FK-safe delete -> 404 if 0 rows -> audit. Check failure -> 503 (fails closed). Dealership owners are always blocked: no transfer, succession or closure workflow exists |
| DELETE /api/admin/staff/:id (system owner) | soft delete | Soft-deleted users still authenticated (protect, login, refresh ignored deletedAt) | Sessions revoked at deletion; protect returns 401 AUTH_SESSION_EXPIRED; login 401 generic; refresh 403; forgot-password generic |
| PUT /api/admin/users/:id/deactivate | toggle | unchanged | unchanged (recommended alternative) |
Identifier substitution: the target id comes from the path only for superadmin; non-superadmin callers get 403 (tested). CSRF enforced by the existing middleware (tested: missing token rejected). Audit records hold codes and counts, never personal data. No retention period was invented; no transaction record is deleted to let a deletion pass.
Residual: atomicity between the re-check and the delete is application-level. A database BEFORE DELETE trigger is recommended (not applied; it is a schema change needing authorization).

## 2. Passwords
- changePassword: current password verified, strength enforced, tokenVersion bumped, refresh tokens revoked. Gap fixed: no throttle on wrong current password -> `passwordChangeLimiter` (key per user, successful requests skipped).
- Reset: hashed token, single use (compare-and-set), expiry, sessions revoked; concurrent resets with one token yield exactly one success (tested). No change needed.
- No compromised-password list exists in the codebase, so none was applied.
- Secrets are not logged; pino redaction now covers passwords, passkey, consumer secret, security credential.

## 3. Profile and business details
- PUT /api/auth/profile uses an allowlist; email is not editable; phone change resets phoneVerified (Phase 14.6 invalidation preserved and re-tested).
- Gap fixed: the account phone is the dealer/private-seller payout destination (B2C payouts read users.phone), so changing it with only a live session would let a session holder redirect payouts. Phone change by `dealer` / `individual_seller` now needs the current password (403 STEP_UP_REQUIRED / STEP_UP_FAILED, nothing written before the check, `stepUpLimiter` caps wrong guesses). UI (dealer settings, personal profile) asks for the password and shows the server result.
- Personal identity (users), private-seller capability and dealer business identity (dealers.business_name) stay separate; ownership/identity fields are not writable through profile endpoints (tested directly).
- Open product decision (unchanged): editing businessName after approval does not trigger re-verification.
