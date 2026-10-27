# KAYAD Phase 16C — Migration and rollback certification (disposable PostgreSQL 16.15)

Scope: M1 `20261027120000_phase16b_registration_and_dealer_onboarding_CANDIDATE.sql` (`kayad_register_identity_atomic`, four `dealers` columns, `suspended` status), M2 `20261019120000_stage5b_owner_governance_CANDIDATE.sql`, M3 `20261026120000_phase16_owner_mfa_CANDIDATE.sql`.
Base: the repository schema replay (181 migrations) = the Phase 16B baseline; "hosted-shaped" = that base with the register function, owner/MFA tables and the 4 columns/suspended value removed, plus **synthetic** seeded rows (a primary-like dealer-labelled verified user, an unverified test dealer, staff). **No hosted database was read or written.**

## Results — `runbooks/phase16c-20261027/pg-tests/migration_set_certification.sh`: **99 pass / 0 fail**
| Group | What was proven |
|---|---|
| A fresh install | M1, M2 (`-1`), M3 apply; a second full pass is a catalog no-op (repeat application). M1 on a fresh repo base only hardens the function `search_path` to `public, pg_temp`; ACL, CHECK, columns identical. |
| B upgrade from hosted shape | All **six** apply orders give an identical final catalog; users, user_auth, refresh_tokens, profiles, dealer_verifications, dealer_teams are **byte-identical** before/after. Upgrade vs fresh differs in exactly 3 objects (the two hosted-absent sync triggers and the normalised-email unique index — deliberately not in M1). |
| C atomicity | M2 with `-1` and a missing prerequisite table: fails and leaves nothing. **Without `-1` it leaves a half-applied schema (documented risk → `-1` is mandatory).** M1 preflight refuses and changes nothing when a prerequisite column is missing. |
| D RLS/grants | RLS on all six owner tables; anon/authenticated/PUBLIC have no table privilege and cannot execute any `kayad_owner_*` / `kayad_register_identity_atomic`; service_role has the intended privileges only; the events ledger rejects UPDATE/DELETE/TRUNCATE even for the table owner. |
| E activation | Owner activation semantics on seeded rows (E1–E22): see operation sequence and second-owner readiness. Primary rows/credentials/refresh token unchanged by activation; role label untouched. |
| F rollback | M2 rollback refuses without `confirm_events_exported=yes`; M3 rollback drops only MFA tables; M2 rollback removes owner tables/functions/event controls and leaves users, profiles, sessions, dealers untouched; re-apply gives bootstrap open again with zero owners; M1 rollback refuses while `suspended` rows exist, otherwise succeeds and roll-forward restores everything. |
Existing suites re-run from the 16C tree: `owner_governance_pg_checks.sh` **97/97**, `owner_governance_pg_upgrade_rollback.sh` **15/15**, `owner_mfa_pg_checks.sh` **23/23**, `registration_dealer_onboarding_pg_checks.sh` **47/47**.

## Defect found and fixed in 16C
**M3 left extra `service_role` privileges** (TRUNCATE, REFERENCES, TRIGGER) on `owner_mfa_factors` / `owner_mfa_recovery_codes`: Supabase default privileges grant ALL on new public tables to `service_role`, and M3 revoked only PUBLIC/anon/authenticated. Fixed by adding `service_role` to the REVOKE before the CRUD GRANT (idempotent; `M3 23/23` and certification D re-pass). Impact was low (service_role bypasses RLS and is the trusted backend role) but it contradicted the stated "CRUD only" contract.

## Irreversible operations and data-loss risks (explicit)
1. **M2 rollback destroys the owner audit ledger and all memberships.** Export `owner_membership_events` first (the script enforces the confirmation variable). After rollback + reapply there are zero owners and bootstrap is open again — the primary must be re-established.
2. **M3 rollback destroys every MFA enrolment and recovery code**; owners must re-enrol.
3. **M2 must be run with `psql -1`; its rollback needs psql (`\if`).** Running M2 without `-1` can leave a half-applied schema.
4. **M1 rollback refuses once any `suspended` verification exists** (it will not silently rewrite data); the roll-forward path is the supported recovery.
5. Rollbacks never restore revoked sessions (token_version bumps are not undone).
6. **Email-case gap (new, hosted not queried):** `kayad_register_identity_atomic` lower-cases only the *new* address. If hosted already holds mixed-case or case-duplicate emails, registration for the lower-case form will not conflict and the normalised unique index is deliberately excluded. Run Gate 0.2 queries (operation sequence) before M1; fix data under a separate approval.
7. `OWNER_MFA_ENCRYPTION_KEY` loss makes all enrolled secrets unreadable (operational, not a migration risk).

## Not certified
Supabase-hosted behaviour (extensions, role grants, PostgREST schema cache reload timing, pooler), hosted data volume/locking, and any staging environment. A disposable local PostgreSQL is not a staging certification.
