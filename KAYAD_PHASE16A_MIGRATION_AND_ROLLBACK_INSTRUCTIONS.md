# KAYAD Phase 16A — Migration, rollback and verification instructions

**Nothing here has been applied to any shared/hosted database.** Phase 16A adds **no new migration**; it re-uses the two Phase 16 candidates unchanged (SHA-256s in the source manifest) and adds one optional data operation (P1).

## 1. Order (each step needs your approval when run on hosted)
| Step | What | File / command | Rollback |
|---|---|---|---|
| H0 | backup/PITR, drift reconciled & acknowledged, prerequisites re-checked | `runbooks/stage5b-owner-governance-20261019/MIGRATION_PREFLIGHT_READONLY_5B.sql` (SELECT only) | — |
| H1 | env: `WEBHOIST_EMAIL` (primary only), `OWNER_MFA_ENCRYPTION_KEY`, `OWNER_MFA_POLICY=enrolled_only`; deploy 16A build | secret manager | revert env / redeploy Phase 15 build |
| H2 | owner governance | `…/migration-candidate/20261019120000_stage5b_owner_governance_CANDIDATE.sql` | `…_ROLLBACK_CANDIDATE.sql -v confirm_events_exported=yes` (export events first) |
| H3 | bootstrap primary | `node scripts/owner-bootstrap.mjs --plan` then `--apply --operator "<name>" --confirm-host <host>` | remove the membership (UI) / rollback H2 |
| H4 | owner MFA | `runbooks/phase16-20261026/migration-candidate/20261026120000_phase16_owner_mfa_CANDIDATE.sql` | `…_ROLLBACK_CANDIDATE.sql` |
| H5 | optional primary role/profile correction (P1) | SQL in `KAYAD_PHASE16A_APPROVAL_REPORT.md` §3 H5 | rollback SQL there |
| H6–H8 | second-owner invite / activate / manage | UI (Admin → Owners) | remove / recover in the same screen |
| H9 | `WEBHOIST_EMAIL=primary,second`; optional `OWNER_MFA_POLICY=required` | secret manager | revert env |

Apply with `psql -v ON_ERROR_STOP=1 -1 -f <file>` (the MFA file contains its own BEGIN/COMMIT: apply it **without** `-1`).

## 2. Rollback procedures
* **MFA (H4):** run the MFA rollback → owners sign in with password only; nothing else depends on it; re-applying later requires re-enrolment.
* **Governance (H2):** export `owner_membership_events` (`\copy … to …`), then run the rollback with `-v confirm_events_exported=yes`; it **refuses** without the variable [D]. After rollback the registry returns to legacy (designated-address) mode; memberships do not return; run bootstrap again. Rolling back never edits `users.role`, credentials or sessions [D].
* **Restart note:** after any schema rollback restart the backend (owner registry) and PostgREST schema cache.
* **Full back-out order:** H5 rollback → H4 rollback → H2 rollback → revert env/redeploy.

## 3. Rehearsal evidence
| Check | Result |
|---|---|
| 5B apply/privileges/constraints/atomic functions [D] | 97 / 97 |
| 5B upgrade + rollback [D] | 15 / 15 |
| MFA fresh install, re-apply, RLS, cascade, rollback + idempotency [D] | 23 / 23 |
| Live rollback of MFA then governance on a **populated clone** [D] | 10 / 10 — identity data byte-identical, candidates re-apply, bootstrap re-opens with 0 active members |
| P1 apply/guard/idempotency/CHECK/rollback/roll-forward, hosted + repo trigger sets [D] | 24 / 24 |

## 4. Hosted verification queries (SELECT only) — run after the matching step
```sql
-- after H2
SELECT count(*) FILTER (WHERE table_name IN ('owner_memberships','owner_invitations','owner_membership_events','owner_bootstrap_state')) AS tables_4 FROM information_schema.tables WHERE table_schema='public';  -- 4
SELECT count(*) AS fns_12 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'kayad_owner%';            -- 12
SELECT status FROM public.owner_bootstrap_state;                                                                                                              -- open
-- after H3
SELECT email IS NOT NULL AS has_email, status, created_at FROM public.owner_memberships;                                                                      -- 1 row, active
SELECT status FROM public.owner_bootstrap_state;                                                                                                              -- closed
SELECT action, result, actor_label, at FROM public.owner_membership_events ORDER BY id DESC LIMIT 10;
-- after H4
SELECT user_id, status, activated_at IS NOT NULL AS active FROM public.owner_mfa_factors;                                                                      -- primary: active
SELECT count(*) FROM public.owner_mfa_recovery_codes WHERE used_at IS NULL;                                                                                   -- 10 per enrolled owner (column names per the migration)
-- after H6/H7
SELECT status, expires_at, accepted_at FROM public.owner_invitations ORDER BY created_at DESC LIMIT 3;
SELECT count(*) FROM public.users WHERE lower(email) = 'kayadautomotives@gmail.com';                                                                          -- 1 (never 2)
-- always: test dealer untouched
SELECT id, role, status, email_verified FROM public.users WHERE id='3ef47f31-0254-44a5-b141-4634ed9671c8';                                                    -- dealer | pending | false (until the user verifies)
SELECT (SELECT count(*) FROM public.dealers WHERE "user"='3ef47f31-0254-44a5-b141-4634ed9671c8') AS dealers, (SELECT count(*) FROM public.dealer_verifications WHERE "user"='3ef47f31-0254-44a5-b141-4634ed9671c8') AS verifications;  -- 0 | 0 until onboarding
```
(All queries above were executed against the disposable database built from these candidates and run without error; they never select hashes or tokens.)
