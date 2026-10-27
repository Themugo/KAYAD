# KAYAD Phase 16 — Known gaps and staging checklist

## What each evidence tier means in this phase
| Tier | Used for | NOT proof of |
|---|---|---|
| Unit / Jest / Vitest (mocked) | TOTP vectors, crypto helpers, policy matrix, UI behaviour with stubbed API | real database or provider behaviour |
| **Real local stack** (app → PostgREST → PostgreSQL 16, disposable) | owner invite/accept/recover, MFA enrol/login/replay/lockout, role escalation, identity integrity, 786×16 probe | hosted behaviour, hosted data, drift |
| Mocked browser check | owner screen screenshots (API intercepted) | the live screens with live data |
| Hosted read-only SELECTs | the two-account findings | anything about changed behaviour |
| **Live provider certification** | **none performed** (Brevo e-mail, real authenticator app, M-Pesa) | — |

## Known gaps (no overclaiming)
1. **Hosted state unchanged.** Owner governance and MFA tables are candidates; hosted keeps legacy owner mode and password-only owner sign-in until authorised and applied.
2. **jimmythemugo role/dealer separation not executed** — awaits explicit approval (see the identity findings report).
3. **kamauwamakena account is incomplete, not broken**: needs mailbox verification + normal dealer verification/approval; only its owner can do the first step.
4. **Hosted migration-history drift** (38 hosted-only / 63 repo-only) still unreconciled; `users_superadmin_flag_consistency` exists only on hosted. 20 tables used by routes exist hosted-only; 126 route-referenced tables exist nowhere.
5. **238 routes still return 500 in some role/fixture** (classified, none an authorisation bypass); 66 are real code defects.
6. **MFA covers owners only**; TOTP verified against RFC vectors and by self-generated codes, not with a physical authenticator app; no QR image; no SMS/e-mail OTP by design.
7. **`OWNER_MFA_ENCRYPTION_KEY` custody** is operational: lose it and every stored factor is unreadable (recovery exists, see MFA report).
8. **Dormant unsafe stub** `backend/identity/services/identityService.js` (`isValid = true` placeholder) is unimported — must stay unimported; recommend deleting it in a reviewed change.
9. Credential-dependent validators (two) still fail honestly without provider credentials.
10. **Test-suite caveat:** one frontend test (`DealerWorkflowWrites`, “creates once …”) failed once when run concurrently with other heavy jobs and passed 2/2 in isolation; the final sequential run is reported in the test evidence.
11. Brevo invitation delivery was never exercised live (`emailDelivered:false` locally).

## Staging checklist (owner action)
- [ ] Reconcile drift; set `KAYAD_MIGRATION_DRIFT_ACKNOWLEDGED=reconciled-and-authorized` deliberately.
- [ ] Run `MIGRATION_PREFLIGHT_READONLY_5B.sql`; take backup/PITR marker.
- [ ] Set `WEBHOIST_EMAIL`, `OWNER_MFA_ENCRYPTION_KEY` (backed up), `BREVO_*`.
- [ ] Apply 5B candidate, then the MFA candidate (both idempotent); re-run `owner_governance_pg_checks.sh` and `owner_mfa_pg_checks.sh` against staging clone.
- [ ] `npm run owner:bootstrap -- --plan`, `--apply`; both owners accept links; `--plan` shows both active.
- [ ] Each owner enrols an **actual authenticator app**, saves recovery codes, signs out/in, checks replay refusal.
- [ ] Second owner: invite a test mailbox you control; confirm single-use link, removal notice, last-owner refusal.
- [ ] Decide `OWNER_MFA_POLICY` (`required` once both enrolled).
- [ ] Approve (or amend) the single-row jimmythemugo `UPDATE`; execute in a transaction; confirm owner sign-in; keep the rollback statement.
- [ ] kamauwamakena: verify mailbox → dealer onboarding → admin approval; confirm it can list as dealer.
- [ ] Re-run the role probe on staging and diff against `KAYAD_PHASE16_ROLE_ROUTE_PROBE_MATRIX.csv`.
