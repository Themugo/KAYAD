# KAYAD Phase 16A — Owner identity resolution audit

Scope: exactly how a request becomes "owner", and what the primary's `dealer` label changes. Evidence: code reading + [A] probes on the disposable stack. No hosted change.

## 1. Resolution chain (code)
| Layer | Source | Behaviour |
|---|---|---|
| Designation | `backend/config/owners.js` — `WEBHOIST_EMAIL` | Comma list, normalised (NFKC/trim/lower). **First entry = `MAIN_OWNER_EMAIL` = primary.** |
| Legacy mode (hosted today) | `isOwnerUser` | address in list **and** `email_verified` ⇒ virtual role `webhoist`. Role label ignored. |
| Database mode (after the 5B candidate) | `ownerRegistry.service.js` (5 s TTL, fails closed once it has seen the store) | active `owner_memberships` row bound to the **user id**, user verified, not banned/deactivated (`kayad_owner_usable`). The list then only reserves addresses and bounds bootstrap/emergency. |
| Guards | `requireOwner` / `requireStore` (`/api/owner/*`), `protect` + `effectiveRole==='webhoist'` | Server-side on every route; UI is advisory. |
| Decision authority | `onboardingPolicy.service.js` `mayDecide` | owner-only dealer decisions need `effectiveRole==='webhoist'`; a `superadmin` label alone is refused (`DECISION_AUTHORITY_REQUIRED`). |
| Account shielding | `middleware/protectAccount.js`, `accountDeletionGuard.js` | owners cannot be banned/deactivated/deleted by lower ranks; the MAIN owner is additionally shielded. |
| Supabase Auth | none | Identity is custom (`users` + `user_auth` bcrypt + JWT + `refresh_tokens`); hosted `auth.users` has 0 rows. There is no Auth linkage to repair or break. |
| Constraints | hosted-only CHECK `users_superadmin_flag_consistency` (role `superadmin` ⇔ `super_admin`); `users_role_check`/`profiles_role_check` allow `superadmin` | a half-applied role change is rejected by the database. |
| Triggers (hosted) | only `trg_sync_profile_from_user` (INSERT) and `trg_users_updated_at` | `profiles.role` is **not** synchronised on update ⇒ P1 sets it explicitly. (Repo build has an extra role-sync trigger; P1 is correct under both — dry-run covers both sets.) |

## 2. Is the dealer→owner label change required / safe / sufficient?
* **Required: no** — [A] with membership present and `role='dealer'`: owner routes 200.
* **Sufficient: no** — `superadmin`+flag without membership/designation: owner routes 403; owner-only decisions refused.
* **Safe: yes** (guards, single transaction, reversible) — [D] 24/24 on both trigger sets; [A] existing sessions survive, sign-in works, owner list unaffected.
* Effect that remains after P1: the account still carries `business_name`/`pending` status (not touched; clearing them is a separate, optional identity decision).
* Authentication, owner protection, sessions, relationships (0 dealers/verification rows; 14 audit rows keyed by actor id; profile row), recovery: unaffected — `user_id` never changes.

## 3. Findings that changed the plan
1. The role label is optional hygiene; **authority comes from the membership** — so P1 is moved to an optional, post-verification step.
2. The earlier Phase 16 one-row proposal was incomplete for hosted: it omitted `profiles.role`. Fixed.
3. The old runbook example listed the second owner's address first in `WEBHOIST_EMAIL`, which would have made it the primary. Corrected: primary first, second added after activation.
4. Bootstrap invites *every* designated address, including nonexistent/unverified ones — so the second address must stay out of the list until after the primary is established; the second owner is then invited from the primary's own authenticated session.
5. There is **no permission tier** for owners (peers). Added instead: peer owners cannot remove or ban the primary.

## 4. Code changes in this phase (see change ledger)
`removeOwner` guard (`OWNER_PRIMARY_PROTECTED`, audited, `OWNER_PRIMARY_PROTECTION=off` to disable), `/api/owner` returns `self.primary` + `primaryProtection`, UI labels the primary and hides Remove for peers. Peer **recovery** of the primary remains possible on purpose (lost-access route).
