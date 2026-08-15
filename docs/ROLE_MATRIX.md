# ROLE_MATRIX.md
**KAYAD — Phase 2**

Source of truth for this document: `backend/config/roles.js` (the backend's own explicit comment: "Single source of truth. All middleware imports from here.") cross-referenced against the real database role constraint in `supabase/migrations/..._foundational_tables.sql.sql`. 15 real role values exist (14 database roles + 1 virtual runtime-only role, `webhoist`).

---

## Critical Issue Addressed First

This phase's brief explicitly flags: *"Do NOT map `individual_seller → buyer` or collapse distinct backend roles into unrelated frontend roles."* This is a direct, correct criticism of this program's own earlier work — `src/context/AuthContext.tsx` (built in Fusion Phase 3) does exactly this. That decision was made explicitly and documented at the time (`docs/fusion/phase-03-auth.md` §2: *"individual_seller maps to buyer... rather than force-fitting a nonexistent role"*) rather than hidden, but it was still the wrong call under this phase's stricter, correct standard. **Fixed in this phase** — see §3.

---

## Role Matrix

| Role | Level | Purpose | Dashboard | Key Permissions | Seller? | Staff? |
|---|---|---|---|---|---|---|
| `user` | 0 | Basic authenticated buyer/browser | Buyer dashboard | None (base authenticated actions: bid, favorite, chat, request inspection) | No | No |
| `individual_seller` | 1 | Private party selling their own vehicle(s) | Seller dashboard (private) | `MANAGE_CARS` | **Yes** | No |
| `dealer` | 2 | Registered vehicle dealer | Dealer dashboard | `MANAGE_CARS`, `MANAGE_AUCTIONS` | **Yes** | No |
| `ghost_checker` | 4 | Vehicle inspector / ghost-check staff | Inspection queue dashboard | `MANAGE_INSPECTIONS`, `VIEW_ANALYTICS` | No | **Yes** |
| `moderator` | 5 | Content moderator | Moderation dashboard | `MANAGE_MODERATION`, `VIEW_LOGS` | No | **Yes** |
| `ad_manager` | 6 | Manages ads & placements | Ads dashboard | `MANAGE_ADS`, `VIEW_ANALYTICS` | No | **Yes** |
| `marketing` | 7 | Marketing team | Marketing/analytics dashboard | `VIEW_ANALYTICS`, `MANAGE_ADS` | No | **Yes** |
| `escrow_officer` | 8 | Manages escrow fund releases | Escrow operations dashboard | `MANAGE_ESCROW`, `VIEW_LOGS` | No | **Yes** — highest-sensitivity non-admin role (real money release authority) |
| `technical_support` | 9 | Support team | Support ticket dashboard | `MANAGE_SUPPORT`, `VIEW_LOGS`, `MANAGE_USERS` | No | **Yes** |
| `hr` | 10 | Human resources | Staff records dashboard | `MANAGE_STAFF`, `MANAGE_USERS` | No | **Yes** |
| `accounts` | 11 | Finance & accounts | Finance dashboard | `MANAGE_FINANCE`, `VIEW_ANALYTICS`, `VIEW_LOGS` | No | **Yes** |
| `admin` | 12 | Full platform admin | Full admin panel | All permissions except superadmin-exclusive scope | No | **Yes** |
| `superadmin` | 13 | System superadmin | Full admin panel + staff permission management | All permissions (`Object.values(PERM)`), plus power to grant/revoke individual permissions on staff accounts | No | **Yes** |
| `broker` | — (not in `ROLE_HIERARCHY`) | Kept as a DB-allowed value; confirmed unused anywhere in real application code per the migration's own comment | None | None assigned in `ROLE_PERMISSIONS` | No | No |
| `webhoist` (virtual) | Bypasses hierarchy entirely | Platform owner override — not a stored role, computed at runtime by `middleware/auth.js`'s `protect` based on a matched owner email, layered on top of whatever role is actually in the database for that account | Full admin panel | `FULL_ACCESS` — bypasses every check | No | **Yes**, absolute |

**Sensitive actions requiring explicit note:**
- `escrow_officer`: can release real escrow funds (`MANAGE_ESCROW`) — the single most financially consequential non-admin permission in the system.
- `accounts`: `MANAGE_FINANCE` — transaction/refund/payout authority.
- `hr`/`technical_support`: both carry `MANAGE_USERS` — can affect any user account, not just their own domain.
- `admin`/`superadmin`: `BYPASS_RATE_LIMIT` — a security-relevant permission, not just a convenience.
- Per-user grant/revoke: any staff member's *effective* permission set can differ from their role's defaults via `user.grantedPermissions`/`revokedPermissions` (`getEffectivePermissions()`) — **the role name alone does not fully determine what a given staff account can actually do**. Any future authorization audit must check effective permissions, not just role.

---

## Database Permissions

Per Phase 1's `docs/DATABASE_SOURCE_OF_TRUTH.md` §1 finding: the backend connects to Supabase using the **service-role key**, which bypasses Row Level Security entirely. This means **no role in the table above has database-level permission differentiation today** — every role's actual data-access boundary is enforced entirely by `backend/config/roles.js`'s application-layer checks (`hasPermission`, `isAtLeast`, `isAdminOrAbove`, per-route middleware), not by Postgres RLS policies. This is stated plainly because it directly affects how "database permissions" should be read in the table above: there aren't any yet, in the RLS sense — only application-layer enforcement.

---

## Navigation & Frontend Mapping (Current State, Before This Phase's Fix)

This frontend's own role union (`src/types.ts`, `UserProfile.role`) was, before this phase: `'buyer' | 'dealer' | 'mechanic' | 'bank_officer' | 'admin'` — 5 values, covering none of the 14 real backend roles precisely except `dealer` and `admin`. `mechanic`/`bank_officer` do not correspond to any real backend role at all (likely earlier, speculative frontend design that predates backend role finalization). See §3 for the fix applied this phase.

---

## API Authorization Reference

Confirmed via direct code read of `config/roles.js`'s exported helpers, used across the backend's middleware layer (not individually re-verified per-route this phase — that is Task 3/§2 below):
- `hasPermission(role, permission)` — direct role-default permission check.
- `isAtLeast(role, minRole)` — hierarchy-based check (e.g., "is this role dealer-or-above").
- `isStaff(role)` — membership in `STAFF_ROLES` (10 roles, everything except `user`/`individual_seller`/`dealer`/`broker`).
- `isSeller(role)` — membership in `SELLER_ROLES` (`dealer`, `individual_seller` only).
- `isAdminOrAbove(user)` — the correct helper for admin-tier checks that also honors the `webhoist` bypass (checks `user.effectiveRole`, not just `user.role`).
- `userHasPermission(user, permission)` — the correct, complete check honoring per-user grant/revoke overrides; the one that should be used wherever precise authorization matters, in preference to the simpler `hasPermission(role, permission)`.
