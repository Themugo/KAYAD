# KAYAD Phase 16C — Owner activation: exact operation sequence

**Status: PROPOSAL ONLY. Nothing here has been run against any hosted, staging or production system. Each gate needs the KAYAD owner's explicit written approval.**
Run every step on an **approved staging project first**; the same sequence is repeated on hosted only after staging evidence is accepted.

## Identity model being activated
| Address | Intended role | How it gets there |
|---|---|---|
| `jimmythemugo@gmail.com` | Primary System Owner | **Existing account, never recreated.** An `owner_memberships` row is created for the existing user id through the bootstrap invitation (the owner signs in as that account to accept). `users.role` is **not** changed (hosted carries a legacy `dealer` label; membership, not the label, grants owner authority). |
| `kayadautomotives@gmail.com` | Second System Owner | Invited **by the signed-in primary owner** from `/admin/owners` (password + typed address + TOTP). Never listed in `WEBHOIST_EMAIL`, never inserted by SQL. Account is created as `role=user`. |
| `kamauwamakena@gmail.com` | Test dealer | Unchanged. Activated only through the normal dealer verification workflow (see the dealer staging procedure). |

Why the order matters (certified in `migration_set_certification.sh` E1–E22): before any owner exists a no-actor or non-owner invitation is refused (`OWNER_ACTOR_REQUIRED` / `OWNER_ACTOR_NOT_OWNER`); the bootstrap path is open only until a usable owner exists; a verified existing account must be signed in to accept (`OWNER_LOGIN_REQUIRED`); the second invitation can only be issued by a usable owner.

## Gate 0 — read-only pre-flight (no writes)
```sql
-- 0.1 the three accounts as they are (record the output; compare after every gate)
select id,email,role,status,email_verified,created_at from users
 where lower(email) in ('jimmythemugo@gmail.com','kayadautomotives@gmail.com','kamauwamakena@gmail.com');
-- expect: primary present, email_verified=true, status not banned/suspended; kayadautomotives ABSENT or unverified; kamauwamakena unchanged
-- 0.2 NEW IN 16C — email case hygiene. kayad_register_identity_atomic lower-cases only the NEW address.
select count(*) from users where email <> lower(btrim(email));                       -- expect 0
select lower(btrim(email)), count(*) from users group by 1 having count(*) > 1;      -- expect 0 rows
-- 0.3 candidates not yet applied
select to_regclass('public.owner_memberships'), to_regclass('public.owner_mfa_factors'),
       (select count(*) from pg_proc where proname='kayad_register_identity_atomic');  -- expect NULL, NULL, 0
-- 0.4 prerequisites
select to_regclass('public.communication_event_controls'),
       (select count(*) from information_schema.columns where table_name='user_auth' and column_name='token_version');  -- expect non-NULL, 1
-- 0.5 snapshot of identity/session/dealer rows for later byte comparison
select md5(string_agg(t::text, '|' order by id)) from users t;
select md5(string_agg(t::text, '|' order by user_id)) from user_auth t;
select md5(string_agg(t::text, '|' order by id)) from dealer_verifications t;
```
Also run `runbooks/stage5b-owner-governance-20261019/MIGRATION_PREFLIGHT_READONLY_5B.sql`. **Stop** if 0.2 returns anything: resolve the duplicate/mixed-case rows by an approved data fix first (not part of these migrations).
Take a database backup and record the migration list.

## Gate 1 — M1 registration + dealer onboarding (self-contained, has its own preflight)
`psql -v ON_ERROR_STOP=1 -f runbooks/phase16b-20261027/migration-candidate/20261027120000_phase16b_registration_and_dealer_onboarding_CANDIDATE.sql`
Adds four `dealers` columns, the `suspended` verification status, `kayad_register_identity_atomic` (service_role-only). Verify: function exists, `anon/authenticated/PUBLIC` cannot execute (certification D); 0.5 hashes unchanged.
Rollback: `…_ROLLBACK.sql` (refuses while `suspended` rows exist — no silent data loss).

## Gate 2 — M2 owner governance (**must be applied with `psql -1`**)
`psql -v ON_ERROR_STOP=1 -1 -f runbooks/stage5b-owner-governance-20261019/migration-candidate/20261019120000_stage5b_owner_governance_CANDIDATE.sql`
The file has no BEGIN/COMMIT. Certified C1–C3: with `-1` a failure leaves nothing behind; **without `-1` a late failure leaves a half-applied schema**. Verify: `select count(*) from owner_memberships` = 0 (no owner is created by the migration; a verified designated address is **not** auto-promoted).
Rollback: `…_ROLLBACK_CANDIDATE.sql` with `psql -1 -v confirm_events_exported=yes` (psql only — uses `\if`). **Irreversible: drops the owner audit ledger and every membership.**

## Gate 3 — M3 owner MFA (self-contained, has BEGIN/COMMIT)
`psql -v ON_ERROR_STOP=1 -f runbooks/phase16-20261026/migration-candidate/20261026120000_phase16_owner_mfa_CANDIDATE.sql`
16C hardening: `service_role` is revoked before the CRUD grant so Supabase default privileges do not leave TRUNCATE/REFERENCES/TRIGGER. Verify with certification D checks.
Rollback: `…_ROLLBACK_CANDIDATE.sql` — **irreversible: drops every owner MFA enrolment and recovery code** (owners must re-enrol).
M1, M2, M3 apply in any order with an identical final catalog (certification B1–B6).

## Gate 4 — configuration (secrets via the secret manager, never committed)
* `OWNER_MFA_ENCRYPTION_KEY` — new 32-byte key, stored in the secret manager. Losing it makes every enrolled secret unreadable.
* `WEBHOIST_EMAIL=jimmythemugo@gmail.com` — **primary only**. Do **not** list `kayadautomotives@gmail.com` (the bootstrap invites every listed address).
* A real email provider (`BREVO_API_KEY`, `BREVO_FROM_EMAIL`). **Delivery is unverified until exercised here.**

## Gate 5 — primary owner established
1. `npm run owner:bootstrap -- --plan` (read-only; expect one identity, state word only, no tokens).
2. `npm run owner:bootstrap -- --apply --operator "<name>" --confirm-host <host>` → a mailbox-bound invitation goes to the primary address.
3. The primary signs in **as the existing account** and accepts the link.
Verify:
```sql
select user_id,email,status,added_via from owner_memberships;            -- one active row, user_id = the pre-existing id from 0.1
select kayad_owner_usable(user_id) from owner_memberships;                -- t
select role,status,email_verified from users where lower(email)='jimmythemugo@gmail.com';  -- role UNCHANGED vs 0.1
select (select md5(string_agg(t::text,'|' order by user_id)) from user_auth t where user_id=(select user_id from owner_memberships));  -- credentials row unchanged by activation (refresh token still valid)
select status from owner_bootstrap_state;                                 -- closed
```
**Stop condition:** the user id differs from 0.1, or `users.role` changed → roll back the gate and investigate.

## Gate 6 — primary enrols TOTP
`/admin/owners` → Set up authenticator → store the 10 recovery codes offline. Verify `owner_mfa_factors.status='active'` and `left(secret_enc,3)='v1:'`. A real authenticator app has **not** been exercised by any KAYAD test (tests generate codes with the same algorithm): confirm with a real app here.

## Gate 7 — second owner
From the primary's signed-in session: Invite owner → `kayadautomotives@gmail.com` (typed twice, password, TOTP). The mailbox owner opens the link, accepts (creates the account, `role=user`) and enrols TOTP.
Verify: two usable owners; `select role from users where lower(email)='kayadautomotives@gmail.com'` = `user`; invitation row `accepted`, replay refused; `owner_membership_events` shows invite/accept with no secrets.

## Gate 8 — dealer (separate): see `KAYAD_PHASE16C_DEALER_ACTIVATION_STAGING_PROCEDURE.md`.

## Never
Grant owner/superadmin by SQL; change the primary's `users.role` (it would mirror into `profiles.role` and make DB-layer `is_admin()` true — demonstrated on a throwaway user in `e2e_phase16c_dealer_staff_separation.cjs` C5); derive access from an email domain; share a mailbox between owners; run any candidate on hosted outside an approved gate.
