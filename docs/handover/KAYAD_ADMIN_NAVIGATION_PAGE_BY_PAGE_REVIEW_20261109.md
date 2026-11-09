# KAYAD Admin Navigation & Page-by-Page Improvement Register

**Date:** 9 November 2026  
**Base candidate:** KAYAD Admin Mobile Navigation Repair worktree, based on the unified account/provider onboarding candidate.  
**Scope:** Canonical admin navigation, route registry, shared shell, shared specialist-page responsive treatment, and command-centre mobile layout.  
**Safety:** No route paths, backend APIs, role definitions, permission grants, database records or deployment settings were changed.

## Screenshot finding

The supplied screenshot shows seven navigation groups expanded and the Accounts & Onboarding heading entering the bottom of the drawer while the utility footer is pinned. The drawer's scroll region existed, but the initial information density made later groups look inaccessible. The mobile initial state is now one expanded group (the current route's group); other groups remain available as disclosure buttons. The active route is revealed within the drawer scroll region when it opens.

## Page-by-page navigation register

| Group | Page | Existing route | Existing page component | Access handling |
|---|---|---|---|---|
| Pinned | Dashboard | `/admin` | `AdminView` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Traffic Analytics | `/admin/traffic-analytics` | `AdminTrafficAnalytics` | Super Admin route guard |
| Pinned | Listings | `/admin/cars` | `AdminCars` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Moderation | `/admin/moderation` | `AdminCarModeration` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Featured Vehicles | `/admin/featured-vehicles` | `AdminFeaturedVehicles` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Auctions | `/admin/auctions` | `AdminAuctions` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Bids | `/admin/bids` | `AdminBids` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Inspections | `/admin/inspections` | `AdminInspections` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | NTSA Queue | `/admin/ntsa-queue` | `AdminNtsaQueue` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Users | `/admin/users` | `AdminUsers` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Sellers | `/admin/sellers` | `AdminSellers` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Dealer Verifications | `/admin/dealer-verifications` | `AdminDealerVerifications` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Private Seller Applications | `/admin/private-seller-applications` | `AdminPrivateSellerApplications` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Inspector Apps | `/admin/inspector-applications` | `AdminInspectorApplications` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Escrows | `/admin/escrows` | `AdminEscrows` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Transactions | `/admin/transactions` | `AdminTransactions` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Support Tickets | `/admin/support-tickets` | `AdminSupportWorkspace` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Reports | `/admin/reports` | `AdminReports` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Chats | `/admin/chats` | `AdminChatModeration` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Reviews | `/admin/reviews` | `AdminReviews` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Feedback | `/admin/feedback` | `AdminFeedback` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Market Data | `/admin/market-data` | `AdminMarketData` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Ad Manager | `/admin/ads` | `AdManager` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Broadcast | `/admin/broadcast` | `AdminBroadcast` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Referrals | `/admin/referrals` | `AdminReferrals` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Security Log | `/admin/security-log` | `AdminSecurityLog` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Control Room | `/admin/control-room` | `OperationsControlRoom` | Super Admin route guard |
| Pinned | Staff | `/admin/staff` | `AdminStaff` | Super Admin route guard |
| Pinned | Staff Permissions | `/admin/staff-permissions` | `AdminStaffPermissions` | Super Admin route guard |
| Pinned | Panic Room | `/admin/panic-room` | `PanicRoom` | Super Admin route guard |
| Pinned | Site Designs | `/admin/site-designs` | `AdminSiteDesigns` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | Platform Recovery | `/admin/platform-recovery` | `PlatformRecovery` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |
| Pinned | System Overview | `/admin/webhoist` | `WebhoistOverview` | Super Admin route guard |
| Pinned | Settings | `/admin/settings` | `AdminSettings` | Existing admin guard + PAGE_PERMISSIONS / SUPERADMIN_ONLY |

**Coverage:** 34/34 sidebar destinations have a registered page component or the canonical command-centre root. The Settings destination remains pinned and permission-filtered. No sidebar destination was removed or renamed.

## Registered specialist pages not currently in the sidebar

These routes already exist in the route registry but are not represented in the visible navigation list. They have been left intact and were not added to the sidebar because adding them without confirming intended staff discoverability and permissions would alter the navigation model.

| Existing direct route | Page component | Access handling |
|---|---|---|
| `/admin/cms` | `ContentStudio` | Existing admin guard + permission map |
| `/admin/automation` | `AutomationStudio` | Existing admin guard + permission map |
| `/admin/config` | `ConfigurationCenter` | Existing admin guard + permission map |
| `/admin/lowcode` | `BusinessObjectStudio` | Super Admin route guard |
| `/admin/vxp` | `VisualExperienceStudio` | Super Admin route guard |
| `/admin/xos` | `ExperienceStudio` | Super Admin route guard |
| `/admin/ai` | `AIPlatformBuilder` | Super Admin route guard |
| `/admin/digital-twin` | `DigitalTwinCenter` | Super Admin route guard |
| `/admin/control-center` | `EnterpriseControlCenter` | Super Admin route guard |
| `/admin/integration` | `IntegrationStudio` | Super Admin route guard |
| `/admin/governance` | `GovernanceStudio` | Super Admin route guard |
| `/admin/intelligence` | `ExecutiveIntelligenceCenter` | Super Admin route guard |
| `/admin/command-center` | `EnterpriseCommandCenter` | Super Admin route guard |
| `/admin/improvement` | `ContinuousImprovementCenter` | Super Admin route guard |
| `/admin/platform-factory` | `PlatformFactory` | Super Admin route guard |
| `/admin/owners` | `AdminOwnerManagement` | Super Admin route guard |
| `/admin/communications` | `AdminCommunications` | Existing admin guard + permission map |
| `/admin/provider-governance` | `AdminProviderGovernance` | Existing admin guard + permission map |
| `/admin/support` | `AdminSupportWorkspace` | Existing admin guard + permission map |


## Code improvements applied

1. **Drawer initial state:** mobile opens only the group containing the current route; all other groups are collapsed but remain accessible. Desktop expansion defaults are preserved.
2. **Active destination reveal:** when the drawer opens or the route changes, the current active link is brought into view inside the drawer without scrolling the page behind it.
3. **Touch scroll and footer:** bounded flex navigation (`min-height:0`, `flex:1 1 0%`, `overflow-y:auto`), touch momentum, `touch-action:pan-y`, contained overscroll; footer remains pinned and safe-area-aware.
4. **Single page scroll owner:** document/window is the sole vertical scroll owner across mobile and desktop; per-history scroll restoration is retained on the document only.
5. **Focus and lock lifecycle:** modal semantics, inert background, initial focus, Tab/Shift+Tab containment, Escape close, focus restoration after inert removal, and exact restoration of the prior inline body overflow value.
6. **Every specialist page's shared presentation:** common responsive input sizing, table horizontal scrolling, tab-strip horizontal scrolling, touch overscroll and visible keyboard focus styling. Existing data-table wrappers remain the horizontal scroll owners for wide tables.
7. **Dashboard:** compact mobile hero, tighter identity/status spacing, preserved four quick actions, and earlier KPI visibility.
8. **Preservation:** no changes to route strings, component ownership, APIs, role lists, permission maps or backend authorization.

## Validation

| Check | Result |
|---|---:|
| Admin shell regression | 12/12 PASS |
| Admin navigation/page coverage | 34/34 route mapping PASS |
| Dashboard mobile source contract | 17/17 PASS |
| Admin route convergence | 14/14 PASS |
| Business command centre phase 04 | 13/13 PASS |
| Public navigation convergence | 43/43 PASS |
| Chromium layout matrix | 9/9 viewports PASS |

### Browser layout matrix

| Viewport | Drawer nav reaches end | Footer stays visible | Long page reaches end | Horizontal overflow |
|---|---|---|---|---|
| 320x640 | Pass | Pass | Pass | None |
| 360x740 | Pass | Pass | Pass | None |
| 375x812 | Pass | Pass | Pass | None |
| 390x844 | Pass | Pass | Pass | None |
| 430x900 | Pass | Pass | Pass | None |
| 768x900 | Pass | Pass | Pass | None |
| 1024x900 | Pass | Pass | Pass | None |
| 1366x900 | Pass | Pass | Pass | None |
| 1440x900 | Pass | Pass | Pass | None |

Chromium 144.0.7559.96 was used with the current candidate CSS, representative long navigation groups and long dashboard/specialist-page content. This validates layout and scroll geometry, not authenticated React interactions or physical Android touch behaviour.

## Remaining page-level certification

The route register confirms every visible navigation destination resolves to a registered component. The shared responsive styles improve all routes consistently, but this environment cannot certify each page's live API data, permission-specific empty/error states, mutations or complex workflows. Those require authenticated staging users with each staff role. The project requires Node >=22.22.2; the current runtime is Node 22.16.0 and dependencies are unavailable, so full Vitest, typecheck, production build and authenticated E2E remain outstanding.

## Modified files

- `src/components/admin/AdminSidebar.tsx`
- `src/styles/kayad-admin-shell.css`
- `src/styles/kayad-admin-legacy-surface.css`
- `scripts/validate-admin-navigation-page-coverage.mjs` (new)
- `package.json`
- `docs/handover/admin-mobile-scroll-qa/` (final viewport screenshots and metrics)
- `docs/handover/KAYAD_ADMIN_NAVIGATION_PAGE_BY_PAGE_REVIEW_20261109.md` (this report)