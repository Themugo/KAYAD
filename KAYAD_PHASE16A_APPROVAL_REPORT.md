# KAYAD Phase 16A — Hosted-operation approval report

**Status: NOTHING IN THIS REPORT HAS BEEN EXECUTED ON ANY HOSTED SYSTEM.** No SQL (other than `SELECT`), migration, role change, invitation, configuration change or deployment was made. Everything below is a *proposal* that waits for your explicit approval of each numbered operation (`H0 … H12`). Approving the account arrangement is not approval of these operations.

Evidence tiers used throughout: **[D]** disposable PostgreSQL 16 · **[A]** local application stack (backend → PostgREST → disposable PostgreSQL) · **[H-RO]** hosted read-only observation (`SELECT` only, project `ubvgixwhfybbyjuvxboj`, 2026-10-26 ~23:15 Africa/Nairobi).

---

## 1. Exact primary-owner row and identity mapping (redacted) — [H-RO]

| Item | Primary owner candidate | Main test dealer |
|---|---|---|
| `users.id` | `dad5a03a-8181-45d7-b540-798c01874a21` | `3ef47f31-0254-44a5-b141-4634ed9671c8` |
| e-mail (masked) | `ji***@gmail.com` (= jimmythemugo) | `ka***@gmail.com` (= kamauwamakena) |
| `role` / `super_admin` | `dealer` / `false` | `dealer` / `false` |
| `status` / `email_verified` | `pending` / **true** | `pending` / **false** |
| banned / deactivated | no / no | no / no |
| `business_name` | present | present |
| `profiles` row (role) | 1 (`dealer`) | 1 (`dealer`) |
| `user_auth` (own credential) | 1 | 1 |
| sessions total / live | 38 / 2 | 0 / 0 |
| `dealers` / `dealer_verifications` rows | 0 / 0 | 0 / 0 |
| Supabase Auth (`auth.users`) rows | 0 (this system does not use Supabase Auth for identity) | 0 |
| Owner membership | none (no owner tables exist on hosted) | none |

`public.users` has exactly these two rows. The second-owner address (`kayadautomotives@gmail.com`) exists in **no** table, so it is a new identity, created only by invitation acceptance (no duplicate is possible; if it did exist the flow links to it — proven in [A] test "squatted address").

**How "owner" is resolved (audit, code-level):** owner authority is a *virtual* role (`webhoist`) computed by `backend/config/owners.js`. Before the governance migration (hosted today) it is *"address is in `WEBHOIST_EMAIL` AND `email_verified`"*. After the governance migration it is *"active `owner_memberships` row bound to this user id, verified, not banned/deactivated"* — the `WEBHOIST_EMAIL` list then only reserves addresses and limits bootstrap/emergency recovery. The `users.role` label and `super_admin` flag **do not** grant owner authority and **are not required** for it.

## 2. Is changing `dealer` → `superadmin` required, safe and sufficient?

| Question | Answer | Evidence |
|---|---|---|
| **Required** for owner authority? | **No.** With an active membership, the account is recognised as owner while still labelled `dealer` (owner routes 200). | [A] `NECESSITY` check in `e2e_phase16a_arrangement.cjs` |
| **Sufficient** to make an owner? | **No.** `superadmin` + `super_admin=true` alone leaves owner routes at 403 and `DECISION_AUTHORITY_REQUIRED` on owner-only decisions. A membership (or, today, the designated address) is what makes an owner. | [A] "a superadmin role alone does not make an owner" |
| **Safe?** | Yes, if done as in P1 below: one guarded transaction, touches exactly 1 `users` row + 1 `profiles` row, leaves credentials/sessions/status/business name/relationships untouched, existing sessions keep working, sign-in unaffected, fully reversible. | [D] `primary_owner_update_dryrun.sh` 24/24 (hosted trigger set **and** repo trigger set) · [A] session/sign-in checks |
| Why do it at all? | Identity hygiene only: it removes the "owner is labelled dealer, has dealer business metadata" confusion that Phase 16 flagged. The hosted `profiles.role` copy is **not** synchronised on update (hosted has no role-sync trigger), so the operation must set it explicitly, which P1 does. | [H-RO] trigger inventory · [D] |
| Recommendation | **P1 is optional.** Owner access does not depend on it. If you approve it, run it *after* the membership is verified (so authority never rests on the label). If you decline it, nothing in the owner/second-owner path changes. | |

## 3. Proposed operations (exact text)

### H0 — Preconditions and safety (no change)
1. Written approval of the specific operations below (reply with the operation ids).
2. A restorable backup / PITR marker is taken immediately before H3.
3. The hosted schema drift is reconciled and authorised (`KAYAD_MIGRATION_DRIFT_ACKNOWLEDGED=reconciled-and-authorized` is a deliberate human act; `scripts/apply-schema.sh` refuses otherwise).
4. **Fresh [H-RO] prerequisite check for the governance candidate** — hard dependencies present, two soft ones absent:

| Prerequisite | Hosted now | Effect |
|---|---|---|
| `users.deactivated_at / granted_permissions / revoked_permissions / last_active` | present | hard dependency of `kayad_owner_usable()` — **met** |
| `refresh_tokens.session_id / family_id` | present | session revocation — **met** |
| `kayad_register_identity_atomic` | **absent** | soft: *public sign-up* of new accounts is broken on hosted today (existing code reports "DATABASE MIGRATION REQUIRED"). Owner acceptance uses its own function, so the owner path is unaffected. |
| case-insensitive unique e-mail index | **absent** (only plain `users_email_key`) | soft: the owner service normalises addresses to lower case and the table has two lower-case rows; recommended to add (`20260930112000_identity_email_normalization.sql`) as its **own** decision. |

5. E-mail delivery must work on the hosted backend (invitation and verification links are *only* e-mailed — the CLI and logs never print a token). Not verified here.
6. Dealer-onboarding schema (needed for H-TD below) is **not** present on hosted — see §6.

### H1 — Secrets and configuration (hosted environment; no database change)
| Variable | Value | Note |
|---|---|---|
| `WEBHOIST_EMAIL` | `jimmythemugo@gmail.com` (only) | **first address = primary owner.** Keep the second address out of the list during bootstrap so the bootstrap cannot invite it before the primary is proven. (The old runbook example listed `kayad…` first — do not copy it.) |
| `OWNER_MFA_ENCRYPTION_KEY` | 32 random bytes, base64 (`openssl rand -base64 32`) | stored in the secret manager **and** backed up offline; loss = owners must re-enrol |
| `OWNER_MFA_POLICY` | `enrolled_only` (default) | raise to `required` only after both owners are enrolled |
| `OWNER_PRIMARY_PROTECTION` | unset (rule on) | `off` disables the primary-removal rule |
| deployment | the Phase 16A build | **needs your separate deploy approval; I do not deploy** |

### H2 — Apply the owner-governance migration (Stage 5B candidate)
`runbooks/stage5b-owner-governance-20261019/migration-candidate/20261019120000_stage5b_owner_governance_CANDIDATE.sql` — additive, idempotent, one transaction; creates `owner_memberships`, `owner_invitations`, `owner_membership_events` (append-only), `owner_bootstrap_state` and 12 `kayad_owner_*` functions; touches no existing table. Read-only preflight first: `MIGRATION_PREFLIGHT_READONLY_5B.sql`.
Expected after: 4 new tables, 12 functions, bootstrap `open`, 0 memberships; until a membership exists the designated primary keeps working. [D] 97/97 + 15/15.

### H3 — Bootstrap the primary (operator CLI, one invitation)
```
cd backend
node scripts/owner-bootstrap.mjs --plan                       # read-only; expect: primary = account_verified_not_owner, bootstrap open
node scripts/owner-bootstrap.mjs --apply --operator "<your name>" --confirm-host <host of SUPABASE_URL>
```
Effect: **one** e-mailed invitation to `jimmythemugo@gmail.com`; no password is set, no token printed, the operator is written to the append-only ledger; a wrong `--confirm-host` is refused [A]. The primary must be signed in **as that same account** when opening the link (otherwise `OWNER_LOGIN_REQUIRED`). On acceptance: a membership is created, **no new user row, no credential change**, the three pre-existing sessions kept working [A]; the bootstrap switch closes itself.

### H4 — Apply the owner-MFA migration
`runbooks/phase16-20261026/migration-candidate/20261026120000_phase16_owner_mfa_CANDIDATE.sql` — two new tables (`owner_mfa_factors`, `owner_mfa_recovery_codes`), RLS on, service-role only. Then the primary enrols in **Admin → Owners → Your two-factor sign-in**; from then on every owner-changing action needs password + authenticator (or recovery) code [A]. Store the 10 recovery codes offline. [D] 23/23.

### H5 — (Optional) P1: primary role/profile correction
```sql
-- PRECONDITION (must return exactly 1 row; otherwise STOP)
SELECT id, role, super_admin, email_verified, is_banned, deactivated_at
  FROM public.users
 WHERE id = 'dad5a03a-8181-45d7-b540-798c01874a21'
   AND role = 'dealer' AND super_admin = false AND email_verified = true
   AND is_banned IS NOT TRUE AND deactivated_at IS NULL;

-- OPERATION (single transaction, guarded; reports row counts)
BEGIN;
WITH u AS (
  UPDATE public.users SET role = 'superadmin', super_admin = true
   WHERE id = 'dad5a03a-8181-45d7-b540-798c01874a21'
     AND role = 'dealer' AND super_admin = false AND email_verified = true
     AND is_banned IS NOT TRUE AND deactivated_at IS NULL
  RETURNING id),
p AS (
  UPDATE public.profiles SET role = 'superadmin'
   WHERE id = 'dad5a03a-8181-45d7-b540-798c01874a21'
     AND role IN ('dealer','superadmin') AND EXISTS (SELECT 1 FROM u)
  RETURNING id)
SELECT 'users=' || (SELECT count(*) FROM u) || ' profiles=' || (SELECT count(*) FROM p);
-- must print: users=1 profiles=1   -> COMMIT;   anything else -> ROLLBACK;
COMMIT;
```
**Expected before → after:** `users.role dealer→superadmin`, `users.super_admin false→true`, `profiles.role dealer→superadmin`; `updated_at` moves (trigger); nothing else changes. The hosted CHECK `users_superadmin_flag_consistency` makes a half-applied change impossible. Existing sessions are not revoked and keep working [A]; business name, status (`pending`), credentials and all 38 session rows stay byte-identical [D].

**Verification (SELECT only):**
```sql
SELECT u.id, u.role, u.super_admin, p.role AS profile_role, u.status, u.email_verified, u.business_name IS NOT NULL AS has_business_name
  FROM public.users u JOIN public.profiles p ON p.id = u.id
 WHERE u.id = 'dad5a03a-8181-45d7-b540-798c01874a21';          -- superadmin | true | superadmin | pending | true | true
SELECT (SELECT count(*) FROM public.user_auth WHERE user_id = 'dad5a03a-8181-45d7-b540-798c01874a21') AS auth_rows,       -- 1
       (SELECT count(*) FROM public.refresh_tokens WHERE "user" = 'dad5a03a-8181-45d7-b540-798c01874a21') AS sessions;   -- 38 (+ any new sign-ins)
SELECT id, role, super_admin, status, email_verified FROM public.users WHERE id = '3ef47f31-0254-44a5-b141-4634ed9671c8'; -- unchanged: dealer | false | pending | false
```
**Rollback (exact):**
```sql
BEGIN;
UPDATE public.users    SET role = 'dealer', super_admin = false WHERE id = 'dad5a03a-8181-45d7-b540-798c01874a21' AND role = 'superadmin' AND super_admin = true;
UPDATE public.profiles SET role = 'dealer'                       WHERE id = 'dad5a03a-8181-45d7-b540-798c01874a21' AND role = 'superadmin';
COMMIT;
```
Rollback restores every column but `updated_at` [D]. Note: if candidate H2 is later rolled back while P1 stays applied, the primary remains a plain `superadmin` (admin access, no decision authority) — acceptable, but include the P1 rollback in any full back-out.

### H6 — Invite the second owner (from the primary's own session — never from the CLI)
**Admin → Owners → Invite owner**: type `kayadautomotives@gmail.com` twice, enter the primary's password and an authenticator code. The server first verifies the caller is a recognised, usable owner (a non-owner, including an admin, gets 403 and no invitation row [A]). One pending invitation per address (a second attempt returns `OWNER_INVITATION_PENDING`) [A]; the address is reserved immediately (public sign-up of it is refused) [A]; the link expires (default **24 h**, `OWNER_INVITE_TTL_HOURS` 1–168) and is **single use** (token stored only as SHA-256) [A].

### H7 — Second owner activates
Opens the e-mailed link → chooses **their own** password (weak ones refused, link stays valid) → account is created (`role user`, `approved`, e-mail verified by the link; no shared or invented credential exists) → signs in → enrols their own authenticator (different secret) → from then on is challenged at sign-in [A]. If an account with that address already exists it is **linked** (same id, no duplicate; an unverified one is verified by the mailbox link and its password reset by the mailbox holder) [A].

### H8 — Primary manages the second owner (audited)
* **Remove / revoke** (password + typed address + authenticator/recovery code + reason): ends the membership and all of that person's sessions at once; their user account remains as an ordinary user [A].
* **Recover** (lost credentials/mailbox): end access, re-invite with credential reset.
* **Resend / revoke a pending invitation.**
* Every action is an append-only ledger row naming the actor; refusals are recorded too.
* **There is no partial-permission tier.** Owners are peers: this system has one owner capability. "Change the second owner's permissions" is therefore *remove / recover / re-invite*, not a per-permission editor. A restricted second-owner role would be a new feature (needs your design decision) and is **not** in this package.
* **Phase 16A addition:** a peer owner **cannot remove the primary** (`OWNER_PRIMARY_PROTECTED`, audited), cannot ban/deactivate it, and the UI hides the button; the primary can still remove the second owner. A lost-access recovery of the primary by the second owner remains allowed on purpose.

### H9 — Hardening after both are enrolled
Add the second address to `WEBHOIST_EMAIL` **after** the primary (`jimmythemugo@gmail.com,kayadautomotives@gmail.com`) so it is also covered by emergency recovery; then optionally `OWNER_MFA_POLICY=required`.

### H-TD — Test dealer (no operation proposed)
No statement touches `3ef47f31-…`. See §6.

## 4. Recovery routes preserved (at least one viable at every step)
1. Peer recovery: either owner can recover the other (primary-removal protection deliberately does not block recovery).
2. Authenticator recovery codes (10 per owner, hashed, single use).
3. Last-usable-owner rule enforced **in the database**: removing/recovering the last verified active owner is refused (`OWNER_LAST_USABLE`) [A, D].
4. Emergency CLI (`--emergency`) for designated addresses only, requires an explicit time-boxed environment authorisation and is audited.
5. Application rollback to the Phase 15 build ignores all new tables; candidate rollbacks are rehearsed (§5).

## 5. Rollback and verification map
| Step | Rollback | Evidence |
|---|---|---|
| H5 (P1) | SQL above | [D] 24/24 |
| H4 (MFA) | `…/20261026120000_phase16_owner_mfa_ROLLBACK_CANDIDATE.sql` (drops only the two MFA tables → password-only sign-in again) | [D] 23/23 · [D] live rollback rehearsal |
| H2 (governance) | `…/20261019120000_stage5b_owner_governance_ROLLBACK_CANDIDATE.sql` with `-v confirm_events_exported=yes` (refuses without it; **export `owner_membership_events` first**); memberships do not come back — run bootstrap again | [D] 15/15 · live rehearsal: identity data byte-identical, candidates re-apply |
| H1/H3 | revert env; an accepted invitation is reversed by removing the membership | [A] |

Verification queries after H2/H3/H6 (all `SELECT`): memberships, invitations, ledger tail, bootstrap state, function count (12), table list (6 `owner_*` + 2 MFA) — see `KAYAD_PHASE16A_MIGRATION_AND_ROLLBACK_INSTRUCTIONS.md` §4.

## 6. Test dealer `kamauwamakena@gmail.com` — unchanged, not active
* No operation in this phase touches it; in the [A] rehearsal its `users`, `user_auth`, `profiles` rows and the *absence* of `dealers`/`dealer_verifications` rows were byte-identical after every owner operation.
* It is **not** verified, **not** onboarded, **not** approved, holds no owner permission. This package does not mark it active.
* Normal user-driven activation (rehearsed [A], 6 steps): ① resend verification (generic answer) → ② open the e-mailed link (mailbox verified) → ③ sign in, complete **dealer onboarding** (creates the dealership + a `pending` verification) → ④ still blocked from publishing → ⑤ an ordinary admin **cannot** approve (`DECISION_AUTHORITY_REQUIRED`) → ⑥ an owner approves through `POST /api/verification/admin/:id/approve`; afterwards the account is a dealer and **still not an owner**.
* **Hosted blocker found [H-RO]:** hosted `dealers` lacks `bio, onboarding_complete, onboarding_completed_at, payment_details` and `dealer_verifications.verification_status` CHECK allows only `pending/approved/rejected`. Step ③ cannot succeed on hosted until `20261012140000_dealer_onboarding_columns_r12.sql` and `20261012140100_dealer_verification_suspended_status_r14.sql` (plus the drift reconciliation) are authorised and applied — **separate approval, not proposed here**. Steps ①–② do not depend on them.

## 7. Risks and dependencies
| # | Risk / dependency | Mitigation |
|---|---|---|
| R1 | Hosted drift (38 hosted-only / 63 repo-only migrations) unreconciled | H0.3 gate; nothing is applied until reconciled |
| R2 | E-mail delivery unverified on hosted | stage first; never print tokens |
| R3 | `WEBHOIST_EMAIL` order decides the primary | primary first; documented; the bootstrap `--plan` shows the mapping |
| R4 | Wrong person opens the primary link | link is bound to the invited address and requires sign-in as that account |
| R5 | Loss of `OWNER_MFA_ENCRYPTION_KEY` | secret manager + offline backup; policy not `required` until enrolled |
| R6 | Owner lock-out | routes in §4; last-owner rule in the DB |
| R7 | Registry cache (5 s) | by design; fails closed once it has seen the store |
| R8 | P1 changes the label of an account with 2 live sessions | sessions unaffected [A]; optional |
| R9 | Operator CLI can show a transient error right after a PostgREST restart | idempotent; re-run [A] |

## 8. Required staging checks and safe execution order
**Order:** H0 → (separate approvals for drift reconciliation and, if wanted, the two soft prerequisites) → staging dress rehearsal of H1–H9 with the same build → backup → H1 → deploy (separate approval) → H2 → verify → H3 → primary accepts → verify → H4 → primary enrols → verify → *(optional)* H5 → verify → H6 → H7 → verify → H8 drill on staging only → H9.
Staging checks are enumerated in `KAYAD_PHASE16A_STAGING_CHECKLIST.md`.

## 9. What I need from you
Reply with the ids you approve, e.g. *"Approve H1, H2, H3 only"*. Each hosted step then needs its own go-ahead in the moment it is run. Until then the hosted state remains exactly as observed in §1.
