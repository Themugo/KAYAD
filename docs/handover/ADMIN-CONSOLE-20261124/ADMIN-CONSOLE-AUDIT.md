# Super Admin Console audit and corrections (2026-11-24)

Status labels: VERIFIED (executed, evidence) / NOT VERIFIED / NOT TESTED. Local results only; nothing here is production evidence.

## 1. Navigation audit (source: `AdminSidebar.tsx`, `AdminRouteSurface.tsx`, `utils/permissions.ts`)
| Group | Item | Route | Page-permission mirror | Status |
|---|---|---|---|---|
| Command Centre | Dashboard, Traffic Analytics | `/admin`, `/admin/traffic-analytics` | none / Super Admin only | present |
| Marketplace | Listings, Moderation, Featured Vehicles, Auctions, Bids, Inspections, NTSA Queue | `/admin/cars` ... | MANAGE_CARS/MODERATION/ADS/AUCTIONS/INSPECTIONS | present |
| Accounts & Onboarding | Users, **Dealers** (was "Sellers"), Dealer Verifications, **Personal Accounts** (was "Private Seller Applications"), **Inspector Applications** (was "Inspector Apps") | `/admin/users`, `/admin/sellers`, `/admin/dealer-verifications`, `/admin/private-seller-applications`, `/admin/inspector-applications` | unchanged | labels corrected, routes unchanged |
| Finance | Escrows, Transactions | | VIEW_ESCROW / MANAGE_FINANCE | present |
| Customer Care | Support Tickets, Reports, Chats, Reviews, Feedback | | | present |
| Growth & Insight | Market Data, Ad Manager, Broadcast, Referrals | | | present |
| Platform & Security | Security Log, Control Room, Staff, Staff Permissions, Panic Room, Site Designs, Platform Recovery, System Overview | | Super Admin only for staff/panic/control/webhoist | present |
| Platform | View marketplace, Settings (pinned footer) | | MANAGE_PLATFORM | present |

All destinations exist exactly once (enforced by `AdminSidebarOrganization.test.tsx`). Route paths were NOT changed, so bookmarks, permission maps and history keep working.

## 2. Findings and corrections
| # | Finding | Evidence | Correction |
|---|---|---|---|
| F1 | Obsolete "Private Seller Applications" label contradicted the unified free personal account rule | sidebar label; backend `privateSellerApprovalMode` default is open (409 `SELLER_APPROVAL_NOT_REQUIRED` on apply) | Renamed nav to "Personal Accounts"; page retitled "Personal accounts: selling status" with copy stating no approval is needed by default and that suspend/revoke/restore + history remain. No data, route, endpoint or table removed. |
| F2 | "Sellers" label ambiguous (page is the dealer workspace) | `AdminSellers.jsx` fetches `role: 'dealer'` | Nav label "Dealers"; dashboard workflow tab "Dealer Accounts" |
| F3 | Active Staff tile showed a link label, not a number | `AdminView.tsx` | `/admin/stats` now returns `activeStaff` (platform staff roles only, not banned; dealer-team members live in `dealer_teams` and are never counted). null when unreadable; tile shows Unavailable, never 0 |
| F4 | Quick action "Approve Dealer" implied one-click approval; approval is owner-reserved | `requireDecisionAuthority("dealer")` | Label "Review Dealers" (same route) |
| F5 | Live Auctions rows come from the latest 50 vehicle records | `AdminView.tsx` | Panel now states the authoritative server count and that rows are from loaded records |
| F6 | No counters in sidebar | | Link counters (Dealer Verifications, Escrows, Support Tickets) and group sums from `/admin/stats`; unavailable metrics show no counter |
| F7 | RBAC / Team panels count the loaded user sample | `AdminView.tsx` | Already disclosed in the UI ("current loaded user sample"); left unchanged, authoritative lists are on Staff / Staff Permissions |

Verified already correct (no change): stats degrade per metric (`stage5f5AdminStatsContract`), unavailable != zero, System Health only from a verified health check (`AdminSystemHealthPanel`), activity shows "Actor not recorded" rather than inventing an actor, per-source restricted vs failed states, collapsible groups (independent), mobile drawer with focus trap, Settings pinned.

## 3. Roles and permissions (no new definitions)
Platform staff roles come from `backend/config/roles.js` `STAFF_ROLES` (admin, superadmin, marketing, technical_support, hr, accounts, escrow_officer, ad_manager, moderator, ghost_checker). Dealer staff are `dealer_teams` members with the 8 dealer permission keys and never appear in platform staff counts or lists. Personal accounts are `role=user`; dealers `role=dealer`; inspectors are a separate application workflow. Frontend visibility (`PAGE_PERMISSIONS`, `SUPERADMIN_ONLY`) is a display convenience; backend `requirePermission`, `staffRole`, `requireDecisionAuthority` remain authoritative (`stage5f5RoleRouteMatrix`).

## 4. Database changes
None. No migration added or applied.

## 5. Known limitations / not done
- Per-page deep audit of the remaining ~35 specialist pages was limited to routing, permission mirror and label/terminology review; their internal workflows were not re-engineered.
- Dashboard panels Team Members / Role-Based Access Control / Recent Vehicle Submissions remain sample-based (disclosed).
- Sidebar group collapse state is not persisted across reloads.
- Email delivery, hosted behaviour and PR 266: NOT VERIFIED.
