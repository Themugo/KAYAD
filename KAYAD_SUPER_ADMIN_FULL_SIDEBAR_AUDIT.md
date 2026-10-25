# KAYAD Super Admin — Full Sidebar Audit

Foundation: `KAYAD-SUPER-ADMIN-PHASE12-ADMIN-TOKEN-CONVERGENCE-20261023.zip` (SHA-256 `7690e986688db50363c58058b9e7c76a7125233abc5cec405c06a41eec22c98d`, verified).
Method: source tracing of `AdminRouteSurface → AdminLayout → AdminSidebar → page`, a static scanner over every mounted page, and a real-browser baseline render of every route (built frontend + clearly-labelled test-fixture API responses; NOT production data).

## Audit gate summary (recorded before the first source edit)

| Item | Result |
|---|---|
| Canonical route chain | `/admin` and `/admin/dashboard` → `AdminRouteSurface` (RequireAdmin) → `AdminLayout` + `AdminSidebar` → `AdminCommandCentre` → `AdminView` (`src/features/AdminView.tsx` + `admin-command-centre.css` confirmed mounted). |
| Sidebar destinations | **29** in 4 expandable groups (Command Centre 1, Business Operations 12, Business Management 9, System Administration 7). Role/permission filtering is applied in the sidebar; super-admin sees all. |
| Mounted routes in AdminRouteSurface | 47 registered + the dashboard alias. **19 mounted routes are not in the sidebar** (specialist studios, owners, communications, provider governance, support alias). |
| Broken routes | None unregistered. Unknown `/admin/*` renders a styled "Admin page not found" with a return link. |
| Duplicate routes | `/admin/support` and `/admin/support-tickets` mount the same component (alias; intentional). `/admin/dashboard` aliases `/admin`. No duplicate sidebar entries. Icon duplicates exist (see SA-025). |
| Mobile navigation | Same `AdminSidebar` as a drawer (`mobileOpen`), backdrop, Escape-to-close, focus return (validated by existing validator; browser-verified later). |
| Marketplace return link | **Not present** in the Phase 12 sidebar or header (the brief assumes it exists). Recorded as SA-023. |
| Components with data | See `KAYAD_SUPER_ADMIN_FEATURE_DATA_SOURCE_MAP.csv`. |
| Inconsistent visual patterns | Dark vs light canvas collision (SA-001/003), ~45 undefined legacy CSS classes (SA-002), hard-coded white (SA-004), black Ad Manager page (SA-005), emoji icons (SA-034), duplicated sidebar icons (SA-025). |
| Incomplete / non-functional features | `/admin/ai` cannot render (SA-006); five routes crash on partial responses (SA-007); fabricated sample data in four studios (SA-029); missing-as-zero in two studios (SA-030). |
| Unverified data sources | Dashboard health, alerts and activity have sources but are not surfaced truthfully (SA-019/020). "Active Staff" has no verified count endpoint (kept as link, SA-010). Specialist studios use services whose backend was not exercised here. |
| Baseline tests | typecheck PASS; build PASS; vitest 755 pass / 1 skipped / **13 fail** (all in `adminCommandCentre.test.tsx`, stale vs. current UI); validators: 21/24 PASS, 3 FAIL (Stage 24 historical artifact, Stage 5F.1 and 5F.2 wording of the finite-number check). |
| Files proposed for modification | See "Proposed modification set" below. |

Tier 1 = visible in left sidebar (29). Tier 2 = mounted admin route not exposed in the sidebar (18, plus the support alias). Tier 3 = admin source files never imported by any mounted route (documented only).

### Proposed modification set (admin presentation scope only)

- `src/styles/kayad-admin-shell.css` — light content canvas, shell/header polish, token additions.
- `src/styles/kayad-admin-legacy-surface.css` (**new, admin-scoped**) — defines the legacy class vocabulary used by mounted admin pages, under `.kayad-admin-shell__content`.
- `src/components/admin/AdminLayout.tsx`, `AdminSidebar.tsx` — header/breadcrumb titles, marketplace link, icon uniqueness, shared permitted-path helper.
- `src/features/AdminView.tsx`, `src/features/admin-command-centre.css` — dashboard completion.
- `src/components/admin/AdminRouteSurface.tsx` — admin-native access/not-found/loading presentation only.
- `src/context/AuthContext.tsx` — **presentation-only** change: two denial-screen heading colours (no logic).
- Page-level repairs: `AdminDealerVerifications.jsx`, `AdManager.jsx`, `AIPlatformBuilder.jsx`, `AdminSupportWorkspace.tsx`, `VisualExperienceStudio.jsx`, `ExecutiveIntelligenceCenter.jsx`, `AdminOwnerManagement.jsx`, `AdminCommunications.jsx`, `AdminSettingsOnboarding.jsx`, `IntegrationStudio.jsx`, `ContinuousImprovementCenter.jsx`, `AutomationStudio.jsx`, `ConfigurationCenter.jsx`, `SEOManager.jsx`, plus other pages as the per-destination cycle finds defects.
- Tests/validators: `src/__tests__/features/adminCommandCentre.test.tsx` (stale suite re-targeted), new admin tests, stale-wording updates to Stage 5F.1/5F.2 validators, one new validator.

**Explicitly out of scope and untouched:** backend, API clients, migrations, auth/RBAC logic, payments/escrow/ledger logic, public pages, non-admin dashboards, package manifests and lockfile.

---

## Destination audits

Tier 1 — left sidebar (29):

### 1. Dashboard — `/admin`

1. **Displayed label:** Dashboard (group: Command Centre; icon: LayoutDashboard)
2. **Route / target:** `/admin`
3. **Mounted component:** `AdminView` — `src/features/AdminView.tsx` (509 lines)
4. **Purpose:** Business Command Centre: KPI overview, approval workbench, recent submissions, live auctions, team/RBAC summary, governance rail, specialist-tools disclosure.
5. **Existing functionality / handlers:** adminAPI.stats, adminAPI.users, adminAPI.cars, adminAPI.getAuditLog, adminAPI.toggleBan, adminAPI.approveDealer, adminAPI.verifyDealer, adminAPI.moderateCar, adminAPI.verifyCar
6. **Data sources:** page + children — AdminCommunications.jsx → adminAPI.communicationTemplates, adminAPI.communicationAnalytics, adminAPI.communicationProviderHealth, adminAPI.communicationHistory, adminAPI.communicationRollout, adminAPI.updateCommunicationChannelControl, adminAPI.updateCommunicationEventControl, adminAPI.retryCommunication; AdminNavigationControl.tsx → adminAPI.getConfig, adminAPI.updateConfig; AdminProviderGovernance.tsx → providerGovernanceApi.list, providerGovernanceApi.get, providerGovernanceApi.decideCredential, providerGovernanceApi.decideCapability, providerGovernanceApi.endStaff, providerGovernanceApi.decideProvider; AdminSettingsOnboarding.jsx → adminAPI.getOnboardingSettings, adminAPI.updateOnboardingSettings; AdminOwnerManagement.jsx → ownerAPI.invite, ownerAPI.resend, ownerAPI.revokeInvitation, ownerAPI.removeMember, ownerAPI.recover, ownerAPI.overview
7. **Role / permission:** RequireAdmin only (any staff role); data sources return 403 where a role lacks rights
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:yes
9. **Visual conventions (baseline):** 0 inline-style objects, 13 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 23 aria-labels, 1 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-008** (Medium) Hero initials show 1 letter and role label not title-cased: regex literals written as /\\s+/ and /\\b\\w/ in TSX never match whitespace/word boundaries.
    - **SA-009** (Low) Hero role label ("Superadmin") differs from header label ("Super Admin").
    - **SA-010** (Medium) "Active Staff" KPI renders the text "View staff" in numeric style; there is no verified staff-count source.
    - **SA-012** (Medium) Low-contrast supporting text on dark hero ("Common workspaces", "NAIROBI TIME").
    - **SA-013** (Medium) Data-state indicator has no role="status": loaded/limited state is not announced.
    - **SA-014** (Medium) Specialist-tool disclosure lacks a named navigation region, per-module accessible names and aria-current.
    - **SA-015** (Medium) Approval workbench links lost their documented accessible names and the "each workflow retains its own domain rules" note.
    - **SA-019** (Medium) System Health panel is text-only although existing health sources exist.
    - **SA-020** (Medium) Recent Activity / System Alerts not surfaced although audit-log data is already fetched.
    - **SA-021** (Low) Rail links wrap the chevron to a second line; panel heights leave dead space.
    - **SA-022** (Medium) Only 4 quick actions and none are permission-filtered: unauthorised actions appear available to every staff role.
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Welcome back, Test Administrator.

### 2. Users — `/admin/users`

1. **Displayed label:** Users (group: Business Operations; icon: Users)
2. **Route / target:** `/admin/users`
3. **Mounted component:** `AdminUsers` — `src/pages/admin/AdminUsers.jsx` (157 lines)
4. **Purpose:** Review all accounts; search/filter by role & status; ban/unban; approve dealers.
5. **Existing functionality / handlers:** adminAPI.users, adminAPI.toggleBan, adminAPI.approveDealer
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin, technical_support, hr, moderator; or permission manage_users
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 15 inline-style objects, 0 hard-coded hex values, 7 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 3 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `stat-grid` `stat-box` `stat-value` `stat-label` `data-table-controls` `input` `data-table` `btn` `btn-sm` `btn-outline`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Renders on the dark shell canvas; light-theme content unstyled.
    - **SA-002** (High) Uses undefined classes: page, container, stat-grid, stat-box, stat-value, stat-label, data-table, data-table-controls, input, btn, btn-sm, btn-outline, spinner → stats stack centred, table columns collapse ("RolePhoneJoinedStatus").
    - **SA-034** (Low) Emoji used as icons.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 3. Sellers — `/admin/sellers`

1. **Displayed label:** Sellers (group: Business Operations; icon: UserCheck)
2. **Route / target:** `/admin/sellers`
3. **Mounted component:** `AdminSellers` — `src/pages/admin/AdminSellers.jsx` (220 lines)
4. **Purpose:** Dealer/seller management: approvals, commission, waivers, discounts, suspension.
5. **Existing functionality / handlers:** adminAPI.users, adminAPI.approveDealer, adminAPI.toggleBan, adminAPI.updateSellerSettings
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin, hr; or permission manage_staff
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 29 inline-style objects, 0 hard-coded hex values, 10 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `section-eyebrow` `input` `btn` `btn-sm` `btn-gold` `btn-outline` `table-wrap` `data-table`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas / unstyled.
    - **SA-002** (High) Undefined legacy classes; table headers collapse.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 4. Listings — `/admin/cars`

1. **Displayed label:** Listings (group: Business Operations; icon: Car)
2. **Route / target:** `/admin/cars`
3. **Mounted component:** `AdminCars` — `src/pages/admin/AdminCars.jsx` (129 lines)
4. **Purpose:** Listing inventory management (search, status filter, delete).
5. **Existing functionality / handlers:** adminAPI.cars, adminAPI.deleteCar
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin, moderator, technical_support; or permission manage_cars
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 14 inline-style objects, 0 hard-coded hex values, 6 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 2 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `stat-grid` `stat-box` `stat-value` `stat-label` `data-table-controls` `input` `data-table` `btn` `btn-sm` `btn-outline`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas / unstyled.
    - **SA-002** (High) Undefined legacy classes; list wraps to a 1-word column.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 5. Moderation — `/admin/moderation`

1. **Displayed label:** Moderation (group: Business Operations; icon: ShieldCheck)
2. **Route / target:** `/admin/moderation`
3. **Mounted component:** `AdminCarModeration` — `src/pages/admin/AdminCarModeration.jsx` (312 lines)
4. **Purpose:** Car moderation queue: approve/hide pending listings (bulk selection).
5. **Existing functionality / handlers:** adminAPI.cars, bulkAdminAPI.moderateCars, adminAPI.moderateCar
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin, moderator; or permission manage_moderation
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 43 inline-style objects, 10 hard-coded hex values, 8 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `section-eyebrow` `input` `loading-center` `spinner`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas.
    - **SA-002** (High) Undefined btn* classes; action buttons unstyled.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Car Moderation Queue.

### 6. Auctions — `/admin/auctions`

1. **Displayed label:** Auctions (group: Business Operations; icon: Activity)
2. **Route / target:** `/admin/auctions`
3. **Mounted component:** `AdminAuctions` — `src/pages/admin/AdminAuctions.jsx` (358 lines)
4. **Purpose:** Auction control: start, end, extend, declare winners; bid history.
5. **Existing functionality / handlers:** carsAPI.list, auctionAdminAPI.bidHistory, auctionAdminAPI.start, auctionAdminAPI.end, auctionAdminAPI.extend, auctionAdminAPI.setWinner
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin; or permission manage_auctions
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 47 inline-style objects, 0 hard-coded hex values, 28 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `section-eyebrow` `grid-3` `stat-box` `stat-label` `stat-value` `tabs` `tab-btn` `empty-state` `empty-icon`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas.
    - **SA-002** (High) Undefined classes (stat-*, tab-btn, btn*); emoji status icons.
    - **SA-034** (Low) Emoji used as icons.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 7. Bids — `/admin/bids`

1. **Displayed label:** Bids (group: Business Operations; icon: Gavel)
2. **Route / target:** `/admin/bids`
3. **Mounted component:** `AdminBids` — `src/pages/admin/AdminBids.jsx` (268 lines)
4. **Purpose:** Bid oversight: all bids, suspicious bids, payment status, set winner.
5. **Existing functionality / handlers:** bidApi.fetchAdminBids, bidApi.fetchSuspiciousBids, bidApi.setBidWinner
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin; or permission manage_auctions
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 36 inline-style objects, 0 hard-coded hex values, 26 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `section-eyebrow` `grid-4` `stat-box` `stat-label` `stat-value` `tabs` `tab-btn` `input` `btn` `btn-sm` `btn-gold` `btn-outline` `table-wrap` `empty-state` `empty-icon`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas.
    - **SA-002** (High) Undefined classes; stat tiles unstyled.
    - **SA-034** (Low) Emoji used as icons.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 8. Escrows — `/admin/escrows`

1. **Displayed label:** Escrows (group: Business Operations; icon: Lock)
2. **Route / target:** `/admin/escrows`
3. **Mounted component:** `AdminEscrows` — `src/pages/admin/AdminEscrows.jsx` (173 lines)
4. **Purpose:** Escrow operations centre: custody cases, release/refund/payout, reconciliation and anomaly scans (rights-gated).
5. **Existing functionality / handlers:** escrowAPI.operationsDashboard, escrowAPI.all, escrowAPI.operationsCase, escrowAPI.release, escrowAPI.refund, escrowAPI.runOperationsReconciliation, escrowAPI.runOperationsAnomalyScan, escrowAPI.close, escrowAPI.verifyFunding, escrowAPI.initiateEscrowPayout, escrowAPI.completeRefund
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin, accounts, escrow_officer; or permission view_escrow
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:yes
9. **Visual conventions (baseline):** 60 inline-style objects, 1 hard-coded hex values, 35 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `section-eyebrow` `btn` `btn-outline` `badge` `badge-green` `stat-label` `btn-sm` `tab-btn` `empty-state`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas.
    - **SA-002** (High) Undefined classes (admin-card, btn*, stat-*).
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 9. Transactions — `/admin/transactions`

1. **Displayed label:** Transactions (group: Business Operations; icon: DollarSign)
2. **Route / target:** `/admin/transactions`
3. **Mounted component:** `AdminTransactions` — `src/pages/admin/AdminTransactions.jsx` (159 lines)
4. **Purpose:** Platform-wide payment oversight (list/filter).
5. **Existing functionality / handlers:** adminPaymentsAPI.list
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin, accounts, escrow_officer; or permission manage_finance
8. **State coverage (static):** loading:yes · error:NO · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 23 inline-style objects, 0 hard-coded hex values, 6 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `section-eyebrow` `input` `table-wrap` `data-table`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas.
    - **SA-002** (High) Table header cells collapse ("UserCarAmountTypeStatusDateActions").
    - **SA-034** (Low) Emoji used as icons.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 10. NTSA Queue — `/admin/ntsa-queue`

1. **Displayed label:** NTSA Queue (group: Business Operations; icon: ClipboardCheck)
2. **Route / target:** `/admin/ntsa-queue`
3. **Mounted component:** `AdminNtsaQueue` — `src/pages/admin/AdminNtsaQueue.jsx` (278 lines)
4. **Purpose:** NTSA verification queue: queue a car, process verification.
5. **Existing functionality / handlers:** ntsaAPI.list, ntsaAPI.process, ntsaAPI.queue
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin; or permission manage_inspections
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 55 inline-style objects, 29 hard-coded hex values, 1 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `section-eyebrow` `btn` `btn-gold` `btn-sm` `empty-state`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas.
    - **SA-002** (High) Undefined classes.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 11. Inspections — `/admin/inspections`

1. **Displayed label:** Inspections (group: Business Operations; icon: BarChart3)
2. **Route / target:** `/admin/inspections`
3. **Mounted component:** `AdminInspections` — `src/pages/admin/AdminInspections.jsx` (177 lines)
4. **Purpose:** Inspection orders: list, filter, assign inspector.
5. **Existing functionality / handlers:** inspectionAPI.list, inspectionAPI.availableInspectors, inspectionAPI.assign
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin, ghost_checker; or permission manage_inspections
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 25 inline-style objects, 16 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `section-eyebrow` `empty-state`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas / unstyled.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 12. Dealer Verifications — `/admin/dealer-verifications`

1. **Displayed label:** Dealer Verifications (group: Business Operations; icon: ShieldCheck)
2. **Route / target:** `/admin/dealer-verifications`
3. **Mounted component:** `AdminDealerVerifications` — `src/pages/admin/AdminDealerVerifications.jsx` (341 lines)
4. **Purpose:** Dealer verification applications: list, approve, reject.
5. **Existing functionality / handlers:** adminVerificationAPI.list, adminVerificationAPI.approve, adminVerificationAPI.reject
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** RequireAdminPage default (any staff role) — backend authoritative
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 69 inline-style objects, 32 hard-coded hex values, 15 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 2 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-004** (High) 41 hard-coded white/rgba(255,255,255) values: white cards and fields on a white surface (invisible content).
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Dealer Verifications.

### 13. Inspector Apps — `/admin/inspector-applications`

1. **Displayed label:** Inspector Apps (group: Business Operations; icon: UserCheck)
2. **Route / target:** `/admin/inspector-applications`
3. **Mounted component:** `AdminInspectorApplications` — `src/pages/admin/AdminInspectorApplications.jsx` (169 lines)
4. **Purpose:** Inspector application review: approve/reject.
5. **Existing functionality / handlers:** adminAPI.inspectorApplications, adminAPI.reviewInspector
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** or permission manage_inspections
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 36 inline-style objects, 0 hard-coded hex values, 21 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 2 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `input` `loading-center` `spinner`
10. **Defects / inconsistencies:** 
    - **SA-003** (High) Near-invisible heading/body on light surface.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 14. Reviews — `/admin/reviews`

1. **Displayed label:** Reviews (group: Business Management; icon: Star)
2. **Route / target:** `/admin/reviews`
3. **Mounted component:** `AdminReviews` — `src/pages/admin/AdminReviews.jsx` (150 lines)
4. **Purpose:** Review moderation: approve/hide/delete dealer and listing reviews.
5. **Existing functionality / handlers:** adminAPI.reviews, adminAPI.reviewStatus, adminAPI.deleteReview
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin, moderator; or permission manage_moderation
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 26 inline-style objects, 7 hard-coded hex values, 4 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `spinner`
10. **Defects / inconsistencies:** 
    - **SA-003** (High) Light surface with near-invisible heading/subtitle (inherits shell text #E8F3F5).
    - **SA-002** (High) Undefined classes.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 15. Referrals — `/admin/referrals`

1. **Displayed label:** Referrals (group: Business Management; icon: Gift)
2. **Route / target:** `/admin/referrals`
3. **Mounted component:** `AdminReferrals` — `src/pages/admin/AdminReferrals.jsx` (241 lines)
4. **Purpose:** Referral analytics, payout oversight, credit/expire referrals, per-user lookup.
5. **Existing functionality / handlers:** adminAPI.referralStats, adminAPI.userReferrals, adminAPI.referrals, adminAPI.creditReferral, adminAPI.expireReferral
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin; or permission view_analytics
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 46 inline-style objects, 17 hard-coded hex values, 5 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `btn` `btn-sm` `btn-gold` `btn-outline` `spinner`
10. **Defects / inconsistencies:** 
    - **SA-003** (High) Near-invisible headings/text on light surface.
    - **SA-002** (High) Undefined classes.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 16. Chats — `/admin/chats`

1. **Displayed label:** Chats (group: Business Management; icon: MessageSquare)
2. **Route / target:** `/admin/chats`
3. **Mounted component:** `AdminChatModeration` — `src/pages/admin/AdminChatModeration.jsx` (187 lines)
4. **Purpose:** Read-only conversation moderation: view messages, delete message, block/unblock chat.
5. **Existing functionality / handlers:** adminAPI.chats, adminAPI.chatMessages, adminAPI.deleteChatMessage, adminAPI.blockChat, adminAPI.unblockChat
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin, moderator; or permission manage_moderation
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 36 inline-style objects, 8 hard-coded hex values, 5 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `spinner` `empty-state` `empty-icon`
10. **Defects / inconsistencies:** 
    - **SA-003** (High) Near-invisible heading on light surface.
    - **SA-002** (High) Undefined classes.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 17. Reports — `/admin/reports`

1. **Displayed label:** Reports (group: Business Management; icon: Flag)
2. **Route / target:** `/admin/reports`
3. **Mounted component:** `AdminReports` — `src/pages/admin/AdminReports.jsx` (82 lines)
4. **Purpose:** User-submitted reports triage (admin list + status update).
5. **Existing functionality / handlers:** reportAPI.adminAll, reportAPI.adminUpdate
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** RequireAdminPage default (any staff role) — backend authoritative
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 9 inline-style objects, 3 hard-coded hex values, 2 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `empty-state`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas / unstyled.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Reports.

### 18. Support Tickets — `/admin/support-tickets`

1. **Displayed label:** Support Tickets (group: Business Management; icon: TicketCheck)
2. **Route / target:** `/admin/support-tickets`
3. **Mounted component:** `AdminSupportWorkspace` — `src/features/AdminSupportWorkspace.tsx` (213 lines)
4. **Purpose:** Support workspace (agent/oversight views of customer cases) — same component as /admin/support.
5. **Existing functionality / handlers:** see service imports in source
6. **Data sources:** service module (see source)
7. **Role / permission:** RequireAdminPage default (any staff role) — backend authoritative
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:yes
9. **Visual conventions (baseline):** 0 inline-style objects, 57 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 2 legacy palette utilities, 1 aria-labels, 2 alert/status roles; baseline render: **ErrorBoundary (page crashed)**; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-007** (High) ErrorBoundary ("Cannot read properties of undefined (reading 'map')") when the cases response omits an expected array.
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** SA-007 (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 19. Feedback — `/admin/feedback`

1. **Displayed label:** Feedback (group: Business Management; icon: MessageSquare)
2. **Route / target:** `/admin/feedback`
3. **Mounted component:** `AdminFeedback` — `src/pages/admin/AdminFeedback.jsx` (213 lines)
4. **Purpose:** User feedback inbox (list + status update).
5. **Existing functionality / handlers:** feedbackAPI.adminAll, feedbackAPI.adminUpdate
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** RequireAdminPage default (any staff role) — backend authoritative
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 29 inline-style objects, 0 hard-coded hex values, 12 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `section-eyebrow` `btn` `btn-sm` `btn-gold` `btn-outline` `table-wrap` `loading-center` `spinner`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas / unstyled.
    - **SA-002** (High) Undefined classes (tab-btn, input, btn*).
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 20. Market Data — `/admin/market-data`

1. **Displayed label:** Market Data (group: Business Management; icon: TrendingUp)
2. **Route / target:** `/admin/market-data`
3. **Mounted component:** `AdminMarketData` — `src/pages/admin/AdminMarketData.jsx` (233 lines)
4. **Purpose:** Pricing guide CRUD + bulk import.
5. **Existing functionality / handlers:** adminAPI.marketData, adminAPI.updateMarketData, adminAPI.createMarketData, adminAPI.deleteMarketData, adminAPI.bulkMarketData
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin; or permission view_analytics
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 52 inline-style objects, 16 hard-coded hex values, 4 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `btn` `btn-outline` `btn-sm` `btn-gold` `empty-state` `empty-icon`
10. **Defects / inconsistencies:** 
    - **SA-003** (High) Near-invisible heading on light surface.
    - **SA-002** (High) Undefined classes.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 21. Ad Manager — `/admin/ads`

1. **Displayed label:** Ad Manager (group: Business Management; icon: Megaphone)
2. **Route / target:** `/admin/ads`
3. **Mounted component:** `AdManager` — `src/pages/admin/AdManager.jsx` (210 lines)
4. **Purpose:** Ad campaign manager: list/create/update/remove campaigns.
5. **Existing functionality / handlers:** adsAPI.adminList, adsAPI.update, adsAPI.create, adsAPI.remove
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin, marketing, ad_manager; or permission manage_ads
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 42 inline-style objects, 5 hard-coded hex values, 34 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `section-eyebrow`
10. **Defects / inconsistencies:** 
    - **SA-005** (High) Root background #08090A: a black page inside the light-theme admin workspace; undefined btn classes.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 22. Broadcast — `/admin/broadcast`

1. **Displayed label:** Broadcast (group: Business Management; icon: Radio)
2. **Route / target:** `/admin/broadcast`
3. **Mounted component:** `AdminBroadcast` — `src/pages/admin/AdminBroadcast.jsx` (48 lines)
4. **Purpose:** Compose and send platform announcements.
5. **Existing functionality / handlers:** announcementAPI.create, announcementAPI.send
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** RequireAdminPage default (any staff role) — backend authoritative
8. **State coverage (static):** loading:NO · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 5 inline-style objects, 0 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `input` `btn` `btn-primary`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas / unstyled form (no input styling).
    - **SA-002** (High) Undefined input/btn classes.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Broadcast Message.

### 23. Security Log — `/admin/security-log`

1. **Displayed label:** Security Log (group: System Administration; icon: Shield)
2. **Route / target:** `/admin/security-log`
3. **Mounted component:** `AdminSecurityLog` — `src/pages/admin/AdminSecurityLog.jsx` (326 lines)
4. **Purpose:** Audit/security log viewer with statistics and export.
5. **Existing functionality / handlers:** adminAPI.getAuditLogs, adminAPI.getAuditLogStatistics, adminAPI.exportAuditLogs
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** role allow-list: superadmin, admin; or permission view_logs
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 50 inline-style objects, 1 hard-coded hex values, 44 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `btn` `btn-sm` `btn-outline` `btn-gold` `input`
10. **Defects / inconsistencies:** 
    - **SA-003** (High) Near-invisible heading and filters on light surface.
    - **SA-002** (High) Undefined classes (btn*, input*).
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 24. Settings — `/admin/settings`

1. **Displayed label:** Settings (group: System Administration; icon: Settings)
2. **Route / target:** `/admin/settings`
3. **Mounted component:** `AdminSettings` — `src/pages/admin/AdminSettings.jsx` (500 lines)
4. **Purpose:** Platform configuration (general, onboarding, branding, payments, reconciliation, audit log tabs).
5. **Existing functionality / handlers:** adminAPI.getConfig, adminAPI.getAuditLog, adminAPI.updateConfig, adminAPI.testMpesa
6. **Data sources:** page + children — AdminSettingsBranding.jsx → adminAPI.uploadLogo; AdminSettingsOnboarding.jsx → adminAPI.getOnboardingSettings, adminAPI.updateOnboardingSettings
7. **Role / permission:** role allow-list: superadmin, admin; or permission manage_platform
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 77 inline-style objects, 18 hard-coded hex values, 15 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 1 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `page` `section-eyebrow` `btn` `btn-sm` `btn-gold` `btn-outline` `input-group` `input-label` `input`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas.
    - **SA-002** (High) Undefined classes; emoji tab icons.
    - **SA-034** (Low) Emoji used as icons.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 25. Control Room — `/admin/control-room`

1. **Displayed label:** Control Room (group: System Administration; icon: LayoutDashboard)
2. **Route / target:** `/admin/control-room`
3. **Mounted component:** `OperationsControlRoom` — `src/pages/admin/OperationsControlRoom.jsx` (369 lines)
4. **Purpose:** Operations Control Room: stats, alerts, audit activity, infrastructure health (super admin + admin).
5. **Existing functionality / handlers:** adminAPI.stats, adminAPI.alerts, adminAPI.getAuditLog, adminAPI.getInfrastructureHealth
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage); role allow-list: superadmin, admin
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 25 inline-style objects, 0 hard-coded hex values, 39 CSS-variable refs (39 direct admin tokens), 0 legacy palette utilities, 1 aria-labels, 6 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `admin-page` `admin-header` `admin-title` `admin-subtitle` `btn` `btn-outline` `admin-grid` `admin-grid--metrics` `admin-card` `admin-card--metric` `metric-header` `metric-icon` `metric-value` `metric-label` `admin-grid--main` `card-header` `card-title` `badge` `card-body` `empty-state` `admin-grid--stats` `quick-stat` `quick-stat-label` `quick-stat-value`
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas.
    - **SA-002** (High) Undefined classes (admin-card*, metric-*, admin-grid*, admin-page/header/title): metric cards render as full-width unstyled rows although Phase 12 colours were source-corrected.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Operations Control Room.

### 26. Staff — `/admin/staff`

1. **Displayed label:** Staff (group: System Administration, super-admin item; icon: Crown)
2. **Route / target:** `/admin/staff`
3. **Mounted component:** `AdminStaff` — `src/pages/admin/AdminStaff.jsx` (154 lines)
4. **Purpose:** Staff directory & access: identities, roles, create/update staff, permission matrix (super admin only).
5. **Existing functionality / handlers:** adminAPI.getStaff, adminAPI.getStaffRoleCatalog, adminAPI.createStaff, adminAPI.updateStaff
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage); role allow-list: superadmin, admin, hr
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:yes
9. **Visual conventions (baseline):** 16 inline-style objects, 27 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 1 aria-labels, 3 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-001** (High) Dark canvas; white-on-white tab and card text.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Staff directory & access.

### 27. Staff Permissions — `/admin/staff-permissions`

1. **Displayed label:** Staff Permissions (group: System Administration, super-admin item; icon: Shield)
2. **Route / target:** `/admin/staff-permissions`
3. **Mounted component:** `AdminStaffPermissions` — `src/pages/admin/AdminStaffPermissions.jsx` (225 lines)
4. **Purpose:** Per-staff permission assignment (super admin only).
5. **Existing functionality / handlers:** adminAPI.getStaff, adminAPI.getPermCatalog, adminAPI.setStaffPerms
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:yes
9. **Visual conventions (baseline):** 52 inline-style objects, 21 hard-coded hex values, 42 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 1 aria-labels, 1 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-003** (High) Faint heading on light surface; staff never leave "Loading staff…" with generic fixtures (shape check required).
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 28. Panic Room — `/admin/panic-room`

1. **Displayed label:** Panic Room (group: System Administration, danger styling; icon: AlertTriangle)
2. **Route / target:** `/admin/panic-room`
3. **Mounted component:** `PanicRoom` — `src/pages/admin/PanicRoom.jsx` (157 lines)
4. **Purpose:** Emergency kill switches and recovery (super admin only).
5. **Existing functionality / handlers:** adminAPI.systemHealth, adminAPI.systemKillSwitch, adminAPI.systemRecover
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage); role allow-list: superadmin
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 29 inline-style objects, 25 hard-coded hex values, 4 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-003** (Medium) Light page with faint subtitle; otherwise styled with its own classes.
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Panic Room.

### 29. Webhoist — `/admin/webhoist`

1. **Displayed label:** Webhoist (group: System Administration, super-admin item; icon: Crown)
2. **Route / target:** `/admin/webhoist`
3. **Mounted component:** `WebhoistOverview` — `src/pages/admin/WebhoistOverview.jsx` (141 lines)
4. **Purpose:** Platform-owner overview: platform statistics + recent audit activity (super admin only).
5. **Existing functionality / handlers:** adminAPI.stats, adminAPI.getAuditLog
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage); role allow-list: superadmin
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:yes
9. **Visual conventions (baseline):** 33 inline-style objects, 15 hard-coded hex values, 25 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: `overview-row`
10. **Defects / inconsistencies:** 
    - **SA-004** (Medium) 12 hard-coded white values; white stat tiles are empty (data not displayed with fixture shape).
11. **Required design improvements:** move to light canvas + admin-scoped component vocabulary (cards, tables, controls, badges, empty/loading states); replace hard-coded colours with admin tokens; one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: System Overview.


---

Tier 2 — mounted admin routes not shown in the sidebar (19). These remain reachable by URL and (for several) from the dashboard's specialist-tools disclosure. Adding them to the sidebar is a product/navigation decision and is **not** done here (SA-033).

### 30. Cms — `/admin/cms`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/cms`
3. **Mounted component:** `ContentStudio` — `src/pages/admin/cms/ContentStudio.jsx` (394 lines)
4. **Purpose:** Content Studio: pages, articles, media, SEO, campaigns, banners, calendar (publishing calendar lives here).
5. **Existing functionality / handlers:** cmsApi.getPages, cmsApi.createPage, cmsApi.getDashboardStats
6. **Data sources:** page + children — VisualPageBuilder.jsx → cmsApi.updatePage
7. **Role / permission:** RequireAdminPage default (any staff role) — backend authoritative
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 4 inline-style objects, 93 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 5 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-029** (Medium) Own header/sub-navigation nested inside shell; SEO Manager shows fabricated "Last generated: 2 hours ago".
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** SA-029 (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Content Studio.

### 31. Automation — `/admin/automation`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/automation`
3. **Mounted component:** `AutomationStudio` — `src/pages/admin/automation/AutomationStudio.jsx` (648 lines)
4. **Purpose:** Automation Studio: workflows, rules, approvals, tasks, scheduler.
5. **Existing functionality / handlers:** automationApi.getAutomationStats
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** RequireAdminPage default (any staff role) — backend authoritative
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 2 inline-style objects, 182 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 18 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-029** (High) Recent executions, scheduler jobs and task queue are hard-coded samples presented as live operational data.
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** SA-029 (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Automation Studio.

### 32. Config — `/admin/config`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/config`
3. **Mounted component:** `ConfigurationCenter` — `src/pages/admin/config/ConfigurationCenter.jsx` (600 lines)
4. **Purpose:** Configuration Center: flags, vehicle catalogue, regions, change history.
5. **Existing functionality / handlers:** configApi.getConfigStats, configApi.toggleFeatureFlag
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** RequireAdminPage default (any staff role) — backend authoritative
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 4 inline-style objects, 153 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 17 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-029** (High) Change-history entries are hard-coded samples presented as real activity.
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** SA-029 (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Configuration Center.

### 33. Lowcode — `/admin/lowcode`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/lowcode`
3. **Mounted component:** `BusinessObjectStudio` — `src/pages/admin/lowcode/BusinessObjectStudio.jsx` (755 lines)
4. **Purpose:** Business Object Studio (low-code objects).
5. **Existing functionality / handlers:** lowCodeApi.getPlatformStats, lowCodeApi.getBusinessObjects, lowCodeApi.updateBusinessObject, lowCodeApi.createBusinessObject
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:yes
9. **Visual conventions (baseline):** 6 inline-style objects, 174 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 10 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** none found at baseline beyond shared shell items
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Business Object Studio.

### 34. Vxp — `/admin/vxp`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/vxp`
3. **Mounted component:** `VisualExperienceStudio` — `src/pages/admin/vxp/VisualExperienceStudio.jsx` (978 lines)
4. **Purpose:** Visual Experience Studio (page/experience composition).
5. **Existing functionality / handlers:** vxpApi.getVXPStats, vxpApi.getPages, vxpApi.getThemes, vxpApi.getCards
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 4 inline-style objects, 253 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 13 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: **ErrorBoundary (page crashed)**; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-007** (High) ErrorBoundary ("reading 'total'") on partial response.
    - **SA-029** (Medium) Hard-coded version history.
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** SA-007, SA-029 (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Visual Experience Studio.

### 35. Xos — `/admin/xos`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/xos`
3. **Mounted component:** `ExperienceStudio` — `src/pages/admin/xos/ExperienceStudio.jsx` (848 lines)
4. **Purpose:** Experience Studio.
5. **Existing functionality / handlers:** xosApi.getXOSDashboard, xosApi.getCampaigns, xosApi.getExperiences, xosApi.getAudiences, xosApi.getJourneys, xosApi.getSeasonalThemes, xosApi.getHomepageVariants, xosApi.getAIRecommendations
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 11 inline-style objects, 204 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 20 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** none found at baseline beyond shared shell items
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Experience Studio.

### 36. Ai — `/admin/ai`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/ai`
3. **Mounted component:** `AIPlatformBuilder` — `src/pages/admin/ai/AIPlatformBuilder.jsx` (909 lines)
4. **Purpose:** AI Platform Builder.
5. **Existing functionality / handlers:** aiApi.getAIDashboard, aiApi.getCommandHistory, aiApi.getAISuggestions, aiApi.getPlatformHealth, aiApi.getCommandTemplates, aiApi.approveAICommand, aiApi.rejectAICommand
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 8 inline-style objects, 191 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 27 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: **ErrorBoundary (page crashed)**; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-006** (Critical) ReferenceError: handleSend is not defined — page can never render.
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** SA-006 (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: AI Platform Builder.

### 37. Digital Twin — `/admin/digital-twin`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/digital-twin`
3. **Mounted component:** `DigitalTwinCenter` — `src/pages/admin/digital-twin/DigitalTwinCenter.jsx` (757 lines)
4. **Purpose:** Digital Twin Center.
5. **Existing functionality / handlers:** dtApi.getDigitalTwinDashboard, dtApi.getSimulations, dtApi.getScenarios, dtApi.getScenarioTemplates, dtApi.getSimulationHistory, dtApi.createSimulation, dtApi.runSimulation, dtApi.runScenario, dtApi.whatIfAnalysis
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 10 inline-style objects, 155 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 18 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** none found at baseline beyond shared shell items
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Digital Twin Center.

### 38. Control Center — `/admin/control-center`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/control-center`
3. **Mounted component:** `EnterpriseControlCenter` — `src/pages/admin/control-center/EnterpriseControlCenter.jsx` (696 lines)
4. **Purpose:** Enterprise Control Center.
5. **Existing functionality / handlers:** ecpApi.getExecutiveDashboard, ecpApi.getSystemHealth, ecpApi.getBusinessHealth, ecpApi.getIncidents, ecpApi.getSecurityStatus, ecpApi.getPerformanceMetrics, ecpApi.getSelfHealingRules, ecpApi.askOperationsQuestion
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 2 inline-style objects, 142 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 24 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** none found at baseline beyond shared shell items
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Enterprise Control Center.

### 39. Integration — `/admin/integration`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/integration`
3. **Mounted component:** `IntegrationStudio` — `src/pages/admin/integration/IntegrationStudio.jsx` (41 lines)
4. **Purpose:** Integration Studio: partners, credentials, webhooks telemetry.
5. **Existing functionality / handlers:** see service imports in source
6. **Data sources:** service module (see source)
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 0 inline-style objects, 11 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 4 legacy palette utilities, 0 aria-labels, 1 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-030** (Medium) Missing metric values rendered as 0 (Number(x || 0)).
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** SA-030 (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Integration Studio.

### 40. Governance — `/admin/governance`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/governance`
3. **Mounted component:** `GovernanceStudio` — `src/pages/admin/governance/GovernanceStudio.jsx` (729 lines)
4. **Purpose:** Governance Studio.
5. **Existing functionality / handlers:** govApi.getGovernanceDashboard, govApi.getPolicies, govApi.getChangeRequests, govApi.getRisks, govApi.getApprovalRules, govApi.getFeatureLifecycles, govApi.getStandards, govApi.getReleases, govApi.getDecisions, govApi.getAuditLogs, govApi.getComplianceDashboard, govApi.getGovernanceHelp
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 5 inline-style objects, 188 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 25 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** none found at baseline beyond shared shell items
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Governance Studio.

### 41. Intelligence — `/admin/intelligence`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/intelligence`
3. **Mounted component:** `ExecutiveIntelligenceCenter` — `src/pages/admin/intelligence/ExecutiveIntelligenceCenter.jsx` (42 lines)
4. **Purpose:** Executive Intelligence Center.
5. **Existing functionality / handlers:** see service imports in source
6. **Data sources:** service module (see source)
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 0 inline-style objects, 16 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 2 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: **ErrorBoundary (page crashed)**; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-007** (High) ErrorBoundary ("reading 'gmv'") on partial response.
    - **SA-030** (Medium) Shows zero for missing values elsewhere in the studio family.
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** SA-007, SA-030 (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Executive Intelligence.

### 42. Command Center — `/admin/command-center`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/command-center`
3. **Mounted component:** `EnterpriseCommandCenter` — `src/pages/admin/command-center/EnterpriseCommandCenter.jsx` (86 lines)
4. **Purpose:** Enterprise Command Center.
5. **Existing functionality / handlers:** see service imports in source
6. **Data sources:** service module (see source)
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 0 inline-style objects, 38 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 7 legacy palette utilities, 0 aria-labels, 1 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** none found at baseline beyond shared shell items
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Command Center.

### 43. Improvement — `/admin/improvement`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/improvement`
3. **Mounted component:** `ContinuousImprovementCenter` — `src/pages/admin/improvement/ContinuousImprovementCenter.jsx` (18 lines)
4. **Purpose:** Continuous Improvement Center.
5. **Existing functionality / handlers:** see service imports in source
6. **Data sources:** service module (see source)
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 0 inline-style objects, 14 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 3 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-030** (Medium) Missing metric values rendered as 0 (value ?? 0).
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** SA-030 (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Continuous Improvement.

### 44. Platform Factory — `/admin/platform-factory`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/platform-factory`
3. **Mounted component:** `PlatformFactory` — `src/pages/admin/platform-factory/PlatformFactory.jsx` (672 lines)
4. **Purpose:** Platform Factory.
5. **Existing functionality / handlers:** pfApi.getPlatformDashboard, pfApi.getTemplates, pfApi.getProducts, pfApi.getComponents, pfApi.getSharedServices, pfApi.getBrands, pfApi.getPlatformHealth, pfApi.generateProduct
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 5 inline-style objects, 148 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 27 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** none found at baseline beyond shared shell items
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Platform Factory.

### 45. Owners — `/admin/owners`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/owners`
3. **Mounted component:** `AdminOwnerManagement` — `src/pages/admin/AdminOwnerManagement.jsx` (215 lines)
4. **Purpose:** Owner membership management (owner-only on server).
5. **Existing functionality / handlers:** ownerAPI.invite, ownerAPI.resend, ownerAPI.revokeInvitation, ownerAPI.removeMember, ownerAPI.recover, ownerAPI.overview
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** Super Admin only (RouteAccess + SUPERADMIN_ONLY + RequireAdminPage)
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 43 inline-style objects, 15 hard-coded hex values, 3 CSS-variable refs (0 direct admin tokens), 0 legacy palette utilities, 4 aria-labels, 4 alert/status roles; baseline render: **ErrorBoundary (page crashed)**; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-007** (High) ErrorBoundary ("reading 'filter'") on partial response.
    - **SA-031** (Low) Off-palette blue/green notices (#EFF6FF/#1E3A8A, #ECFDF5/#065F46).
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** SA-007 (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 46. Communications — `/admin/communications`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/communications`
3. **Mounted component:** `AdminCommunications` — `src/pages/admin/AdminCommunications.jsx` (87 lines)
4. **Purpose:** Communications control: templates, rollout, provider health, history, retry.
5. **Existing functionality / handlers:** adminAPI.communicationTemplates, adminAPI.communicationAnalytics, adminAPI.communicationProviderHealth, adminAPI.communicationHistory, adminAPI.communicationRollout, adminAPI.updateCommunicationChannelControl, adminAPI.updateCommunicationEventControl, adminAPI.retryCommunication
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** RequireAdminPage default (any staff role) — backend authoritative
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:no
9. **Visual conventions (baseline):** 0 inline-style objects, 31 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 5 legacy palette utilities, 0 aria-labels, 0 alert/status roles; baseline render: **ErrorBoundary (page crashed)**; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-007** (High) ErrorBoundary ("reading 'find'") on partial response.
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** SA-007 (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: Messaging Operations.

### 47. Provider Governance — `/admin/provider-governance`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/provider-governance`
3. **Mounted component:** `AdminProviderGovernance` — `src/features/AdminProviderGovernance.tsx` (202 lines)
4. **Purpose:** Provider governance records and verification state.
5. **Existing functionality / handlers:** providerGovernanceApi.list, providerGovernanceApi.get, providerGovernanceApi.decideCredential, providerGovernanceApi.decideCapability, providerGovernanceApi.endStaff, providerGovernanceApi.decideProvider
6. **Data sources:** page-level API clients listed above
7. **Role / permission:** RequireAdminPage default (any staff role) — backend authoritative
8. **State coverage (static):** loading:yes · error:yes · empty:NO · 403/restricted:no
9. **Visual conventions (baseline):** 0 inline-style objects, 36 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 3 legacy palette utilities, 5 aria-labels, 2 alert/status roles; baseline render: rendered; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** none found at baseline beyond shared shell items
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** none beyond preserving existing handlers (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).

### 48. Support — `/admin/support`

1. **Displayed label:** (not displayed in sidebar)
2. **Route / target:** `/admin/support`
3. **Mounted component:** `AdminSupportWorkspace` — `src/features/AdminSupportWorkspace.tsx` (213 lines)
4. **Purpose:** Support workspace (alias of /admin/support-tickets; mounted, not in sidebar).
5. **Existing functionality / handlers:** see service imports in source
6. **Data sources:** service module (see source)
7. **Role / permission:** RequireAdminPage default (any staff role) — backend authoritative
8. **State coverage (static):** loading:yes · error:yes · empty:yes · 403/restricted:yes
9. **Visual conventions (baseline):** 0 inline-style objects, 57 hard-coded hex values, 0 CSS-variable refs (0 direct admin tokens), 2 legacy palette utilities, 1 aria-labels, 2 alert/status roles; baseline render: **ErrorBoundary (page crashed)**; undefined CSS classes in DOM: none
10. **Defects / inconsistencies:** 
    - **SA-007** (High) Same as /admin/support-tickets.
11. **Required design improvements:** one icon family, consistent heading/spacing scale, visible focus.
12. **Required functional corrections:** SA-007 (existing actions, API calls and guards preserved).
13. **Required regression tests:** render smoke test for the route inside `AdminRouteSurface` (no ErrorBoundary under populated/empty/partial/403/500 fixtures); route-guard unchanged; accessibility name checks where controls are touched.
14. **Final verification evidence:** Final browser sweep (labelled fixtures, Chromium, build of 2026-10-25): 12 captures across populated (360, 390, 768, 1280, 1440, 1920px), empty, error, forbidden and slow scenarios; page errors 0; error boundaries 0; unnamed controls 0; axe WCAG 2.x A/AA violations 0 (run on populated 1440 and 390); no page-level horizontal overflow; first heading: section heading (no h1).


---

Tier 3 — admin source files never imported by a mounted route (documented, not modified):

- `src/pages/admin/AdminDashboard.jsx` — Legacy dashboard; never imported. Not rendered; left untouched.
- `src/pages/admin/OperationsDashboard.jsx` — Never imported.
- `src/pages/admin/ControlRoom.jsx` — Never imported (superseded by OperationsControlRoom).
- `src/pages/admin/AuctionIntegrityPage.jsx` — Never imported (adminAPI.integrity* exist but no mount).
- `src/pages/admin/MonetizationCenter.jsx` — Never imported.
- `src/pages/admin/ThemeStudio.tsx` — Never imported.
- `src/pages/admin/AdminSettingsGeneral.jsx / Packages / Payments` — Never imported (AdminSettings inlines these tabs).
- `src/pages/admin/AdminDisputes.jsx` — Never imported; AdminDisputes uses #94A3B8 text and emoji.
- `src/components/admin/AdminPage.tsx` — Imported only by src/features/Admin/index.ts; renders fabricated "150-Pt Audited 100%" metric and local-state ads. Not on any mounted route; left untouched, recorded as a risk.
- `src/pages/admin/components/AdminChartsRow.jsx` — Never imported.

---

## Terminology note

The brief lists "CMS / Publishing Calendar", "Permissions", "System Health", "Audit Logs", "Reports / Analytics" and "Communications / Provider Management" as examples. In the actual Phase 12 source these map to: CMS and its Calendar tab → `/admin/cms` (Tier 2); Permissions → Staff Permissions (`/admin/staff-permissions`); System Health → the dashboard panel + Control Room (`/admin/control-room`); Audit Logs → Security Log (`/admin/security-log`); Reports → `/admin/reports` (user reports triage; **not** analytics) and Market Data; Communications / Providers → Tier 2 routes. No destination was invented.
