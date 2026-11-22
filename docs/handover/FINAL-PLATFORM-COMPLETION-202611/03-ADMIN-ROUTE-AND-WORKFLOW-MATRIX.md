# 03 - Admin route and workflow matrix

Generated from the REAL route table (`ADMIN_ROUTE_COMPONENTS`), sidebar source and the frontend permission mirror by `src/__tests__/components/admin/AdminRouteInventory.test.ts` (run with `WRITE_ROUTE_MATRIX=<file>`). The test also asserts: every route has a component; no sidebar link lacks a route; superadmin-only pages are denied to every other role; the unlinked set is pinned by a snapshot (any new unlinked route fails the test until reviewed).

Counts: 52 registered routes (plus `/admin` and `/admin/dashboard`, both the command centre); 33 linked from the sidebar; **19 unlinked** (D-21: owner decision required; none removed). Unknown path renders "Admin page not found" with a link back (VERIFIED by existing `AdminRouteSurface.test.tsx`).

Meaning of "open/denied": what the frontend mirror allows (the backend remains authoritative and is exercised in doc 08). "shared guard + backend" means no page permission is recorded in the mirror, so the page opens and every API call is authorised by the backend.

| Route | Component source | Sidebar | Gate | admin | superadmin | marketing | technical_support | hr | accounts | escrow_officer | ad_manager | moderator | ghost_checker |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /admin/ads | lazy page | yes | manage_ads | open | open | open | denied | denied | denied | denied | open | denied | denied |
| /admin/ai | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/auctions | lazy page | yes | manage_auctions | open | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/automation | lazy page | NO (D-21) | shared guard + backend | open | open | open | open | open | open | open | open | open | open |
| /admin/bids | lazy page | yes | manage_auctions | open | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/broadcast | lazy page | yes | shared guard + backend | open | open | open | open | open | open | open | open | open | open |
| /admin/cars | lazy page | yes | manage_cars | open | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/chats | lazy page | yes | manage_moderation | open | open | denied | denied | denied | denied | denied | denied | open | denied |
| /admin/cms | lazy page | NO (D-21) | shared guard + backend | open | open | open | open | open | open | open | open | open | open |
| /admin/command-center | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/communications | lazy page | NO (D-21) | shared guard + backend | open | open | open | open | open | open | open | open | open | open |
| /admin/config | lazy page | NO (D-21) | shared guard + backend | open | open | open | open | open | open | open | open | open | open |
| /admin/control-center | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/control-room | lazy page | yes | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/dealer-verifications | lazy page | yes | shared guard + backend | open | open | open | open | open | open | open | open | open | open |
| /admin/digital-twin | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/escrows | lazy page | yes | view_escrow | open | open | denied | denied | denied | open | open | denied | denied | denied |
| /admin/featured-vehicles | lazy page | yes | manage_ads | open | open | open | denied | denied | denied | denied | open | denied | denied |
| /admin/feedback | lazy page | yes | shared guard + backend | open | open | open | open | open | open | open | open | open | open |
| /admin/governance | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/improvement | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/inspections | lazy page | yes | manage_inspections | open | open | denied | denied | denied | denied | denied | denied | denied | open |
| /admin/inspector-applications | lazy page | yes | manage_inspections | open | open | denied | denied | denied | denied | denied | denied | denied | open |
| /admin/integration | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/intelligence | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/lowcode | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/market-data | lazy page | yes | view_analytics | open | open | open | denied | denied | open | denied | open | denied | open |
| /admin/moderation | lazy page | yes | manage_moderation | open | open | denied | denied | denied | denied | denied | denied | open | denied |
| /admin/ntsa-queue | lazy page | yes | manage_inspections | open | open | denied | denied | denied | denied | denied | denied | denied | open |
| /admin/owners | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/panic-room | lazy page | yes | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/platform-factory | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/platform-recovery | lazy page | yes | platform_recovery | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/private-seller-applications | lazy page | yes | manage_users | open | open | denied | open | open | denied | denied | denied | denied | denied |
| /admin/provider-governance | lazy page | NO (D-21) | shared guard + backend | open | open | open | open | open | open | open | open | open | open |
| /admin/referrals | lazy page | yes | view_analytics | open | open | open | denied | denied | open | denied | open | denied | open |
| /admin/reports | lazy page | yes | shared guard + backend | open | open | open | open | open | open | open | open | open | open |
| /admin/reviews | lazy page | yes | manage_moderation | open | open | denied | denied | denied | denied | denied | denied | open | denied |
| /admin/security-log | lazy page | yes | view_logs | open | open | denied | open | denied | open | open | denied | open | denied |
| /admin/sellers | lazy page | yes | manage_staff | open | open | denied | denied | open | denied | denied | denied | denied | denied |
| /admin/settings | lazy page | yes | manage_platform | open | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/site-designs | lazy page | yes | manage_platform | open | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/staff | lazy page | yes | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/staff-permissions | lazy page | yes | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/support | lazy page | NO (D-21) | shared guard + backend | open | open | open | open | open | open | open | open | open | open |
| /admin/support-tickets | lazy page | yes | shared guard + backend | open | open | open | open | open | open | open | open | open | open |
| /admin/traffic-analytics | lazy page | yes | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/transactions | lazy page | yes | manage_finance | open | open | denied | denied | denied | open | denied | denied | denied | denied |
| /admin/users | lazy page | yes | manage_users | open | open | denied | open | open | denied | denied | denied | denied | denied |
| /admin/vxp | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/webhoist | lazy page | yes | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |
| /admin/xos | lazy page | NO (D-21) | superadmin | denied | open | denied | denied | denied | denied | denied | denied | denied | denied |

Routes: 52; sidebar-linked: 33; unlinked: 19

## Status per requirement (honest)
| Item | Status |
|---|---|
| Route exists and correct component registered, no dead sidebar links, superadmin-only protected, unlinked set pinned | VERIFIED (unit tests, this phase) |
| Permissions per role by page (mirror) | VERIFIED (table above); backend enforcement per role: see doc 08 |
| Active state, mobile drawer, grouping, no duplicate links | VERIFIED by `AdminSidebarOrganization.test.tsx` (existing) |
| Direct URL, refresh, loading/empty/error/retry in a real browser for every route | Carried from the previous phase (`BRAND-ADMIN-CONSOLIDATION-20261122` doc 11, `evidence/admin-ui-<role>.json`); NOT re-run on the final code this phase: IMPLEMENTED BUT NOT VERIFIED on 0400502+changes |
| Purpose / data source / API per route | NOT DOCUMENTED per route in this phase beyond component name; the data comes from the page's own API client (real backend); see source |
| Removal of any route | NOT DONE (needs usage evidence, D-21) |
