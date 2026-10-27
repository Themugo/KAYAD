# KAYAD Phase 16B — Staging checklist and account-operation approval gate

**Nothing below has been done. Each numbered gate needs the owner's explicit written approval before it runs.**

## Staging checklist (staging project only, never hosted production first)
1. Back up the staging database; record its migration list.
2. Run `runbooks/phase16b-20261027/pg-tests/registration_dealer_onboarding_pg_checks.sh` against a clone of staging → expect 47/47.
3. Apply the 16B candidate; confirm `kayad_register_identity_atomic` exists with `service_role`-only execute; register a **synthetic** address; confirm `users`+`user_auth` rows.
4. Apply the Phase 5B owner-governance candidate, then the Phase 16 owner-MFA candidate (`runbooks/stage5b-owner-governance-20261019`, `runbooks/phase16-20261026`); set `OWNER_MFA_ENCRYPTION_KEY` (secret manager, never committed) and the MFA policy.
5. Configure a real email provider; send an invitation to a staging mailbox; confirm delivery, expiry and single use (this is the only way to clear "real provider delivery unverified").
6. Re-run the role matrix and the 16B suites against staging.
7. Verify rollbacks on staging.

## Account-operation approval gate (all currently NOT performed)
| # | Operation | Precondition | Approver |
|---|---|---|---|
| G1 | Apply registration/onboarding migration to hosted | staging 1–3 green, backup taken | KAYAD owner |
| G2 | Apply owner-governance + MFA migrations to hosted | staging 4 green | KAYAD owner |
| G3 | Bootstrap `jimmythemugo@gmail.com` as primary owner (membership row; **no `users.role` rewrite**) | G2 | KAYAD owner |
| G4 | Primary owner enrols TOTP and stores recovery codes offline | G3 | primary owner |
| G5 | Primary owner invites `kayadautomotives@gmail.com` through `/admin/owners` (password + typed email + TOTP) | G4 + step 5 delivery verified | primary owner |
| G6 | Second owner accepts while signed in as that mailbox, enrols TOTP | G5 | second owner |
| G7 | Review `kamauwamakena@gmail.com` through the normal dealer verification workflow | G1 | KAYAD owner/admin — **never auto-approved** |
Do not: grant any owner/superadmin role by SQL, derive access from an email domain, share a mailbox between owners, or run any candidate on hosted outside this gate.
