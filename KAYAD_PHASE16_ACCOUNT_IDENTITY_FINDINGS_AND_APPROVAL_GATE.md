# KAYAD Phase 16 — Account identity findings, record-level dependency report and approval gate

Scope: the two accounts named in the Phase 16 brief. Evidence tier: **read-only SELECTs against the hosted project** (project `ubvgixwhfybbyjuvxboj`, 2026-10-26), plus a disposable-database dry run. **Nothing was inserted, updated, deleted or migrated on hosted.** Addresses are masked (`k***a@gmail.com`); identifiers are shortened to 8 characters. No password hash, token or secret was read or is reproduced.

## 1. Hosted population (why this is a small, clean case)
| Fact | Value |
|---|---|
| Rows in `public.users` | **2** (both the accounts below; both `role='dealer'`, `status='pending'`) |
| Rows in `auth.users` / `auth.identities` | 0 / 0 — the platform uses its own `user_auth` (bcrypt) + JWT, not Supabase Auth |
| Rows in `public.dealers` | 0 |
| Any `superadmin` role row | none |
| Owner-governance database functions (`kayad_owner_*`) | 0 — hosted runs the **legacy** owner mode (`WEBHOIST_EMAIL` designation + verified mailbox) |
| Unique e-mail | `users_email_key` exists; each address has exactly **one** `users` row |

## 2. Account A — `k***a@gmail.com` (id `3ef47f31…`) — the intended **main test dealer**
| Check | Finding |
|---|---|
| Role / status | `dealer` / `pending` |
| E-mail verified | **false** |
| Ever signed in | no (`last_login_at` null); 0 refresh tokens |
| Credentials | 1 `user_auth` row (password set), 1 profile |
| Dealer business data | `business_name` = “MAKENA DEALERS”; `dealer_approved_at` null; `escrow_approved` false; `listing_count` 0 |
| Dealership record (`dealers`) | **none** |
| Verification record (`dealer_verifications`) | **none** |
| Cars / teams / payouts / payments | none |
| Owner membership / designation | not an owner (no `WEBHOIST_EMAIL` match, no membership) |

**Why it does not behave as an active dealer.** Dealer capability in this code base is derived from authoritative records (an approved `dealers` row, approved status, verified e-mail), not from the `role` label. This account has the label and a business name but **no dealership record, no verification record, an unverified mailbox and a pending status**. The local reproduction (`e2e_identity_integrity.cjs`) shows the same shape cannot create listings and cannot reach owner or admin routes.

**Smallest safe correction (no data is edited by us):**
1. The owner of the mailbox opens a fresh verification e-mail (“Resend verification”) and confirms the address — only the mailbox owner can do this.
2. The normal dealer onboarding/verification workflow creates the `dealers` + `dealer_verifications` records.
3. An administrator approves it in the normal admin screen (audited).
No role edit, no deletion and no re-registration is needed or proposed. **This account is preserved untouched.**

## 3. Account B — `j***o@gmail.com` (id `dad5a03a…`) — the **system owner**
| Check | Finding |
|---|---|
| Rows for this address | **one** canonical `users` row (no second identity store) |
| Role | `dealer` (label), `super_admin` false, status `pending` |
| E-mail verified | **true**; last sign-in 2026-10-23 |
| Where owner privilege comes from | the `WEBHOIST_EMAIL` designation + verified mailbox → virtual role `webhoist` at request time (not from the stored role) |
| Where the “dealer” side comes from | **only** the stored label `role='dealer'` and `business_name` = “F******* ltd”. There is no `dealers` row, no verification, no listing, no payment, no payout |
| Dependencies that must survive | 1 `user_auth`, 1 profile, **38 `refresh_tokens`** (2 active), **14 `audit_logs`** as actor (2026-10-25: admin POST, kill-switch activate/recover for auctions and payments), **4 `communication_deliveries`** (FK `ON DELETE SET NULL`) |
| FK behaviour on the users row (**repo schema**, read from the fully migrated disposable DB; hosted FK actions were not separately enumerated) | profiles / user_auth / refresh_tokens / dealers / dealer_verifications are `ON DELETE CASCADE` → **deleting this row would destroy the owner’s credentials, sessions and profile**. Deletion is therefore refused as a remedy |

**Conflict, stated precisely.** It is not two accounts and not two stores. It is one user that is *simultaneously labelled* “dealer” in the database and *privileged* as owner by configuration. The dealer label is stale metadata. It is harmful because (a) the owner screens and APIs have to special-case a “dealer” who is also the owner, (b) the label contradicts the platform rule that an owner is not a dealer, and (c) the database CHECK `users_superadmin_flag_consistency` expects an owner-level account to be `role='superadmin' ⇔ super_admin=true`.

## 4. Proposed operation — **NOT EXECUTED, awaiting your explicit approval**
Record-level, one transaction, guarded by the expected before-image, on **one** row:
```sql
BEGIN;
UPDATE public.users
   SET role = 'superadmin', super_admin = true
 WHERE id = 'dad5a03a-8181-45d7-b540-798c01874a21'
   AND role = 'dealer' AND super_admin = false AND email_verified = true;   -- must report UPDATE 1
-- verify: SELECT role, super_admin, status, business_name FROM users WHERE id = '…';
COMMIT;   -- ROLLBACK if the row count is not exactly 1
```
Not touched: `user_auth`, profile, refresh tokens (the 2 active sessions stay valid), audit logs, deliveries, `status`, `business_name`. (Clearing `business_name` / fixing `status` is a **separate optional decision**; default is to leave them.)

**Rollback (from the recorded before-image):**
```sql
UPDATE public.users SET role='dealer', super_admin=false WHERE id='dad5a03a-8181-45d7-b540-798c01874a21' AND role='superadmin';
```
**Why SQL and not the API:** by design `protectAccount` forbids changing an owner account’s role through the application, so this is a reviewed database operation.

**Rehearsal evidence:** `runbooks/phase16-20261026/identity/dealer_separation_dryrun.sh` → `evidence/phase16-20261026/dealer_separation_dryrun.txt`, **10/10 PASS** on a disposable database carrying the hosted constraint set: only that row changes; auth/profile/38 sessions/4 deliveries unchanged; Account A byte-identical; idempotent; partial change rejected by the CHECK; rollback restores the exact original.

**Also required for it to be valid:** the user-side check that owner sign-in still works afterwards (owner is recognised by designation + verified e-mail, so it is unaffected by the role label; confirmed locally where owners are `superadmin`).

### Approval gate (please answer before anything is changed on hosted)
1. Approve the single-row `UPDATE` above? (yes / no / change)
2. Leave `business_name` and `status` as they are? (default yes)
3. Confirm Account A stays exactly as is, to be verified/approved through the normal workflow.

## 5. Drift discovered while doing this (reported, not changed)
* `users_superadmin_flag_consistency` exists on hosted but **no repo migration creates it** (the disposable DB built from the repo has no such constraint).
* 38 hosted-only migrations / 63 repo migrations unapplied; `scripts/apply-schema.sh` still refuses `db push` without the drift acknowledgement.
