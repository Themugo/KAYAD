# KAYAD Phase 16C — Owner identity architecture and dealer/staff separation proof

Evidence tier: **A/D** (real HTTP → backend → PostgREST → disposable PostgreSQL 16, ground truth read from the database). Not hosted, not staging.

## 1. Where owner authority actually lives (source audit)
| Layer | Finding |
|---|---|
| Owner authority | **Membership, not a role label.** Database mode: an `owner_memberships` row with `status='active'`, whose user is mailbox-verified, not banned/suspended and whose email still equals the membership email (`kayad_owner_usable`). Legacy mode: a verified address in `WEBHOIST_EMAIL` (first entry = primary). |
| Middleware (`middleware/auth.js`) | Raises `req.user.role` to `superadmin` / `effectiveRole` to `webhoist` **in memory only** for a usable owner. `users.role` is never rewritten. |
| `users.role` / `profiles.role` | `profiles.role` is a one-way mirror of `users.role` (SECURITY DEFINER trigger `trg_sync_profile_role_from_user`). Both tables have RLS enabled with **zero policies**: anon/authenticated hold grants but see no rows (C5). Hosted lacks the on-update mirror trigger (16A). |
| DB-layer `is_admin()` | Reads `profiles.role in (admin,superadmin)`. **False for the owner and for dealers** (C5), because the owner's `users.role` is `user`. Consequence: writing `superadmin` into the primary's `users.role` *would* mirror into `profiles` and make `is_admin()` true (demonstrated on a throwaway user). This is why the primary's role must not be changed to "make owner work". |
| Dealer team roles | Closed allow-list `manager, sales_agent, lot_agent, finance_officer, viewer`; only the dealership owner may invite/promote managers (`TEAM_ROLE_OWNER_ONLY`); permissions are an allow-list (`UNKNOWN_PERMISSION`), a non-owner cannot grant what it lacks, nobody edits/removes their own row; accepting an invitation never touches `users.role`. |
| Config ownership | Only `WEBHOIST_EMAIL` (legacy) and `owner_memberships` (database). No email-domain rule exists; four look-alike domains tested (S6). |

## 2. Attack surface → test → result
| Vector | Test (all pass) |
|---|---|
| Registration mass assignment (`role: superadmin/webhoist/admin/owner`, `super_admin`, `isOwner`, `effectiveRole`, `emailVerified`, `status`, `permissions`) | 16B S1 (7 roles): stored role never elevated; no membership created |
| Role updates via profile / onboarding | S2, S3: role, super_admin, status, email unchanged; dealer cannot self-approve |
| Email-domain membership | S6: `gmail.com`, `kayad.co.ke`, `kayadautomotives.com`, `gmail.com.evil.test` addresses are plain users with no owner/admin/staff surface |
| Team invitations | 16B S3 + **16C C1**: 12 owner-like role strings (incl. `owner`, `webhoist`, `superadmin`, `System Owner`, trailing-space and traversal variants) → **exactly** 400 "Invalid team role", no row; positive control: the same dealer can invite a `sales_agent` (201); even an admin cannot create an owner-grade team role |
| Staff management | S4: admin and superadmin-*labelled* non-owners cannot create/promote to superadmin/webhoist/owner; a "superadmin" label alone grants no owner authority |
| Employee journey | **C2**: invite → accept with mass-assigned `role/userRole/super_admin/isOwner/status/permissions` → membership stays `manager`, `users.role`/`profiles.role` stay `user`, mass-assigned permissions ignored; refused every owner/staff surface; manager cannot edit own row, invite managers or owners, grant unknown permissions (`isOwner`, `superadmin`) or set role `superadmin`; removed employee's live session loses access |
| Stale sessions | S5 (demoted/banned admin), **C4** (staff demoted to user: access before → 403 after), M4 (removed owner's session) |
| Account recovery | **C3**: reset with privilege fields in the body succeeds but changes no role/owner state; reset token single use; a dealer cannot reset an owner; forgot-password gives no owner enumeration |
| Direct DB access | **C5**: anon and authenticated cannot read or update `profiles`/`users`; `is_admin()` false for dealer and owner, true for a real admin (positive control) |
| Owner invitation misuse | `migration_set_certification.sh` E1–E22 (see MFA/second-owner readiness) |
Results: `e2e_phase16b_owner_dealer_separation.cjs` **41/41**; `e2e_phase16c_dealer_staff_separation.cjs` **40/40**; `e2e_phase16c_mfa_race_stepup.cjs` **8/8**; `e2e_owner_identity_governance.cjs` **73/73**; `e2e_phase16a_arrangement.cjs` **58/58**.

## 3. Limits of this proof
Local disposable stack only; hosted `profiles`/RLS/trigger state was last read in 16A and not re-queried; legacy (`WEBHOIST_EMAIL`) mode and database-membership mode were both exercised, hosted mode is not known. A mocked or local test is not certification of staging or production.
