# KAYAD Phase 16C — MFA and second-owner readiness

## Locking semantics (reviewed in `services/ownerMfa.service.js` `verifyCode`)
Failure charging is a compare-and-set on `owner_mfa_factors(failed_attempts, locked_until)` **before** any code is evaluated, so N concurrent wrong codes cannot evaluate more than the limit (5). A locked factor answers `OWNER_MFA_LOCKED` even to a correct code (no oracle). Success resets the counter. A used TOTP step and a used recovery code are consumed atomically.

## Evidence (disposable stack; real HTTP -> backend -> PostgREST -> PostgreSQL)
| Property | Test | Result |
|---|---|---|
| 12 concurrent wrong codes: <=5 evaluated, rest locked, lock persisted, no invitation created | `e2e_phase16b_owner_dealer_separation.cjs` S7 | pass (41/41) |
| correct code refused while locked | S7 | pass |
| ONE valid TOTP code used by 6 concurrent requests succeeds at most once | `e2e_phase16c_mfa_race_stepup.cjs` M2 | pass (1 of 6) |
| ONE recovery code used by 6 concurrent requests succeeds at most once, consumed once, not reusable | M3 | pass (1 of 6) |
| step-up: owner invitation without a second factor refused, nothing created | M1 | pass |
| owner removal invalidates the removed owner's live session; membership kept as `revoked` | M4 (+ certification E21 token_version bump) | pass |
| no secret/code/token in the owner audit ledger | M5, E22 | pass |
| replay, recovery codes (10, hashed, single use), lockout isolation, MFA reset by recovery | `e2e_owner_identity_governance.cjs` | 73/73 |
| real-stack browser: enrolment with a real TOTP code, MFA challenge at sign-in, wrong code refused, recovery code once | `browser_16c_real_stack.cjs` B2–B4 | pass (35/35) |
Test caveat disclosed: the invitation endpoint spends a bcrypt cost-12 hash before the MFA check, so a very wide burst on a 2-core box can hit the 408 request timeout; those bursts are discarded and re-run (N=6/12). This is a harness limit, not a counter bypass, but it does mean password verification cost precedes the MFA charge (a design observation, not changed).

## Second-owner invitation properties (database function level, `migration_set_certification.sh` E1–E22, `owner_governance_pg_checks.sh` 97/97)
Unusable before the primary exists (E1–E2); bootstrap requires the primary signed in and keeps the same user id (E5–E7); only a usable owner can invite (E12–E13); duplicates refused (E14); expiry bounded 1 minute–7 days (E15); token not usable by another account/without password (E16); single use (E18); account created as `role=user` (E17); last-owner rule (E20); concurrent double-accept → one membership; no credentials or hashes in events (E22).

## UNVERIFIED (must be labelled so until exercised on an approved environment)
* **Real email delivery** of invitation/verification messages — no provider credentials were available; tests use the provider stub path.
* **Real authenticator apps** (Google Authenticator, etc.) — codes were generated with KAYAD's own RFC 6238 implementation; interoperability with a real app is not proven here.
* Hosted behaviour of any of the above; production provider quotas/rate limits.
**No hosted MFA was activated and no second owner was invited.**
