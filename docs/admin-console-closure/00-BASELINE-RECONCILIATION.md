# 00 — Baseline reconciliation (2026-11-24, Africa/Nairobi)

Status vocabulary: IMPLEMENTED / LOCALLY TESTED / ISOLATED-DB TESTED / SIMULATED / HOSTED READ-ONLY VERIFIED / PRODUCTION VERIFIED / NOT VERIFIED.
Nothing in this document is PRODUCTION VERIFIED. No commit, push, merge, deploy, hosted write or migration was performed.

## 1. Checkout state
| Item | Value |
|---|---|
| Checkout | git worktree `/home/claude/p12`, **detached HEAD** at `5bbf2843` ("Release/kayard combined 20261123 (#269)") |
| Working tree | 194 modified/untracked paths (uncommitted work from the Admin Console tasks A–G plus this closure) |
| Owner pushes known | `74948eebc..9d377b1ac` pushed to main by the owner earlier. Whether the *finalisation* commit was pushed is **NOT VERIFIED** (no remote access from here). |
| PR 266 | state **NOT VERIFIED** — keep open. |
| Last delivered ZIP | `KAYARD-KE-full-project-admin-console-finalisation-20261124.zip`, SHA-256 `46197b58…55aa`. Superseded by this closure's ZIP. |

## 2. Counts recalculated (not assumed)
* Registered admin routes: **53** (`/admin` + 52 entries in `ADMIN_ROUTE_COMPONENTS`, counted by the sweep from `AdminRouteSurface.tsx`).
* Workflow-verified count: the earlier "16" is **not carried forward**. See 06 for the recalculated table.

## 3. Previously completed work present in this checkout
Moderator guard (`ADMIN_ROLE_ONLY`, `PAGE_ANY_PERMISSIONS`, `canOpenAdminPage`), health-tile gating, role-aware post-login landing, admin navigation, Personal Accounts page + API, dealer suspension-request workflow, NTSA queue tightening, review moderation fix — all present, see 17.

## 4. Existing models (verified by reading code and by journeys)
* **Account model.** One unified personal account (`users.role='user'`, buy + sell). Legacy `individual_seller` rows remain readable. Dealers need approval (`dealer_verifications`), registration is free, no fees/packages. `privateSellerApprovalMode` ≠ "required" ⇒ `resolveSellerState` reports `approved/policy_default`.
* **Dealer suspension.** Mechanism `transitionDealerVerification` (approved→suspended, compare-and-swap; sets `dealers.is_suspended`, `users.status='suspended'`, notification). Now gated by the request/approval workflow (05).
* **Personal account API/page.** `GET /api/private-seller/admin/accounts` + `src/pages/admin/AdminPersonalAccounts.tsx` (04).
* **Auth redirect.** `getPostAuthPath` in `src/utils/authRoutes.ts` (01).
* **Admin navigation.** `PageJourneyNavigation` + `AdminLayout` (01).
* **Permissions.** UI mirror `src/utils/permissions.ts`; server authority `middleware/rbac.js` (`requirePermission`), `adminOnly`, `adminOrSuper`, `staffRole`, owner decision authority in `onboardingPolicy.service.js`.

## 5. Dependency map
```
Authentication (cookie session + CSRF, /api/v1/auth/*)
  → Identity (users row: role, status, email_verified, dealer link)
  → Workspace (personal | dealer | staff/admin; getPostAuthPath decides landing)
  → Permissions (UI mirror canOpenAdminPage; server requirePermission/adminOnly/adminOrSuper/owner authority)
  → Admin routes (53, RequireAdminPage → AdminRouteSurface)
  → API (/api/admin/*, /api/private-seller/admin/*, /api/dealer-verifications/*, …)
  → Database (users, dealers, dealer_verifications, dealer_suspension_requests*, private_seller_capabilities*, reviews, audit_logs)
  → Audit history (securityLogger → security_logs, falling back to audit_logs)
```
`*` = not present on hosted today (13).

Personal-account flow: register (role=user) → verify email → list/sell immediately (policy default) → optional legacy capability row → staff suspend/restore via `toggle-ban` (sessions revoked, rank boundary, `protectAccount`).
Dealer-suspension flow: staff files request (reason ≥10 chars) → pending row (unique open request per dealer) → Super Admin (owner authority) approves/rejects → on approve `applyVerificationTransition` suspends once → audit; requester cannot decide own request; replays return 409.

## 6. Defects found and status
| # | Defect | Status |
|---|---|---|
| D1 | Super Admin landed on "My Account" after login | FIXED (01) |
| D2 | Moderator saw/opened Super-Admin-only routes; health tile 403 | FIXED (02) |
| D3 | Personal Accounts page 500 (missing optional table on hosted) | FIXED (04) |
| D4 | Purity shown "Pending approval" from legacy `users.status` | FIXED in labels (03); data untouched |
| D5 | Dealer could be suspended directly by Admin / via toggle-ban / reinstate | FIXED (05) |
| D6 | NTSA queue server broader than UI | FIXED (08) |
| D7 | Review moderate/delete failed 400 "Invalid identifier" (reviews rows expose dealer id as `dealer`, not `dealerId`; `recalculateDealerRating(undefined)` → uuid "") | FIXED in `review.service.js`, journey 31 B3/B5 |
| D8 | `/admin/bids` suspicious-bid and 7 studios return 503 FEATURE_NOT_PROVISIONED | DELIBERATE (11) |
| D9 | Hosted `transition_escrow` drift | NOTED, not replaced (07) |

## 7. Risks / blockers
* Hosted lacks 4 local migrations (13); hosted migration history table ends at `20260922060457`.
* No restore rehearsal ⇒ backup not relied upon (13/14).
* Jest must run alone (OOM at 137 when chained).
* No production authentication available — production behaviour is NOT VERIFIED.
