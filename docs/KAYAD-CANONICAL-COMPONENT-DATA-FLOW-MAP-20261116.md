# KAYAD Canonical Component & Data-Flow Map
**Foundation:** `KAYAD-clean-2026-11-16(1).zip`  
**Checkpoint:** Stage 2 architecture convergence + Stage 3 security contract correction  
**Date:** 16 November 2026  
**Scope:** Canonical ownership map and narrowly scoped authorization changes. No redesign of business logic.

## 1. Canonical component map

```text
src/App.tsx
├── TopNoticeStrip
├── Navbar
│   ├── navConfig.ts (NAV_PRIMARY: canonical public destinations)
│   └── Mobile navigation drawer (single drawer)
├── PageJourneyNavigation
├── Canonical surface switch
│   ├── marketplace -> VehicleMarketplace
│   │   ├── Hero composition
│   │   │   ├── campaign feed -> /api/featured-campaigns/current
│   │   │   ├── platform-configured real inventory selection
│   │   │   ├── heroSelection.ts (campaign > inventory > illustrative fallback)
│   │   │   ├── HeroDesktopVehicle
│   │   │   └── backend hero slides (separate editorial slide control plane)
│   │   ├── search bridge
│   │   ├── InventoryFilterPanel (same component, desktop sidebar + mobile sheet)
│   │   ├── category shortcuts (body/fuel aliases)
│   │   ├── serverQuery -> getCars() -> /api/cars
│   │   ├── facets -> getSearchFacets()
│   │   ├── inventory toolbar (sort, page size, grid/list, 3/4/5 columns)
│   │   ├── main inventory card renderer + InventoryCardMedia
│   │   ├── editorial featured picks -> VehicleCard
│   │   ├── HomePageAdminPanel (existing platform config)
│   │   └── quick view -> App vehicle detail handler
│   ├── auctions -> AuctionsView
│   ├── escrow -> EscrowView
│   ├── inspections -> InspectionsView
│   ├── inspection-marketplace -> InspectionMarketplacePage
│   ├── financing -> FinanceMarketplace
│   ├── seller-platform -> PrivateSellerPlatform
│   ├── dealership workspace / dealer dashboard
│   ├── saved -> canonical saved vehicle collection
│   └── other existing protected and public surfaces
└── MobileBottomNav
    ├── buyer dock (Home, Showroom, Auction, Services, Saved)
    └── dealer dock (Dashboard, Inventory, Add, Leads, Analytics)
```

## 2. Canonical ownership decisions

| Concern | Single authority | Must not be duplicated |
|---|---|---|
| Public destinations | `NAV_PRIMARY` in `navConfig.ts` | No second route/menu registry |
| Surface routing | `App.tsx` navigation resolver and route surface | No parallel homepage router |
| Marketplace | `VehicleMarketplace.tsx` | Do not activate legacy Hero/FeaturedVehicles pages |
| Filter controls | `InventoryFilterPanel.tsx` | No mobile-only second filter component |
| Filter state and query | `VehicleMarketplace` filter state + `GetCarsParams` | No separate mobile query pipeline |
| Inventory data | `getCars()` and `/api/cars` | No mock or local-only inventory |
| Search facets | `getSearchFacets()` | Do not derive canonical options only from current page |
| Campaigns | `featuredCampaigns.service.js` and campaign API | Do not replace with hero-slide records |
| Hero campaign priority | `heroSelection.ts` + campaign current feed | No visual-only featured IDs |
| Hero slide content | `/api/hero` and `HeroEditorPanel` | Keep distinct from campaign schedule |
| Platform homepage config | existing platform config for published/admin-managed values | Do not use browser localStorage as global publication |
| Visitor presentation preferences | `useHomePageConfig` localStorage | Do not treat as global admin configuration |
| Main listing cards | existing marketplace renderer + `InventoryCardMedia` | Preserve its complete action set |
| Editorial featured cards | `VehicleCard` | Do not silently replace with inventory card renderer |
| Saved vehicles | `useVehicleCollections` and favorites API | No second favorites store |
| Compare | `CompareContext` | Preserve four-vehicle cap and persistence |
| Seller listing | canonical seller platform + existing car APIs | Do not reactivate legacy SellPage |
| Mobile buyer/dealer navigation | `MobileBottomNav` | Keep role-specific docks and five destinations |

## 3. Canonical buyer flow

1. `App.tsx` mounts the public shell and canonical `Navbar`.
2. `Navbar` reads `NAV_PRIMARY`; clicks resolve through the existing App handler.
3. The Marketplace destination mounts `VehicleMarketplace`.
4. Hero selection resolves in strict priority:
   - active scheduled campaign vehicles, in campaign display order;
   - configured real featured/selected inventory;
   - clearly labelled illustrative showcase artwork only when real eligible inventory is absent and fallback is enabled.
5. Search, category shortcuts and filters produce the same `GetCarsParams`.
6. `getCars()` fetches the paginated real inventory; `getSearchFacets()` supplies canonical options.
7. Inventory toolbar controls sort, page size, grid/list and desktop columns.
8. Main inventory and editorial featured cards retain their own existing action contracts.
9. Detail navigation resolves through the App-level vehicle detail handler and deep-link logic.
10. Save uses backend favorites for signed-in users and guest local storage otherwise; guest saves merge on login.
11. Compare uses one `CompareContext`, persists IDs and caps the selection at four.
12. Buyer dock shortcuts route to the existing Home, Showroom, Auction, Services and Saved destinations.

## 4. Canonical mobile filter contract

- The mobile Filters entry point remains visible in the inventory toolbar at phone widths.
- It opens the same `InventoryFilterPanel` in the existing full-screen sheet.
- Mobile edits are held in a draft copy until Apply Filters is pressed.
- Apply commits the draft to the canonical filter state, resets pagination to page 1, closes the sheet and triggers the existing server query.
- Cancel closes without applying and restores the last applied values.
- Reset All clears the draft to the same canonical defaults; it does not issue a query until Apply is pressed.
- Result count shown in the action footer is labelled as a preview/count for the draft if a count can be safely calculated; otherwise show a neutral Apply Filters label. Never invent a result count.
- Search keyword, selected county/dealer scope and category filters remain part of the same query contract.
- No filter field is dropped: make, model, min/max price, year range, max mileage, body style, fuel, transmission, condition, colour, seller type and live-auction-only remain available.

## 5. Hero and featured-vehicle invariants

### Scheduled campaigns
- Keep campaign table, service, admin screen, history and public feed.
- Preserve date-zone validation, max duration, overlap prevention, vehicle availability checks, pause/resume, end-now, delete confirmation and ordered public IDs.
- Hero layout can display one vehicle, but selection source and priority remain unchanged.
- Public campaign feed failure remains a graceful empty list; it must not break homepage rendering.

### Hero slide and platform config
- Backend hero slides remain a distinct content-control plane.
- Platform-configured hero composition and selected vehicle mode remain separate from browser-local presentation preferences.
- Hero placements remain distinct from both campaigns and hero slides.
- New single-vehicle hero must have explicit source precedence; it must not let a slide or localStorage preference silently override a currently active campaign.

### Editorial featured picks
- Keep the separate editorial featured-picks section and its real inventory signals.
- Preserve `VehicleCard` actions and trust labels.
- Never count showcase artwork as inventory.

## 6. P0/P1 contracts resolved for implementation

### P0 — marketing upload authorization
**Decision:** The `marketing` upload folder requires the existing `manage_ads` permission on both single and multiple upload endpoints. Other authenticated upload folders retain their existing policy. This uses the existing RBAC and does not invent roles or permissions.

**Implemented in this checkpoint:** `backend/routes/uploadRoutes.js` conditionally applies `requirePermission("manage_ads")` when the parsed folder is `marketing`.

### P1 — campaign management authorization
**Decision:** Campaign CRUD uses the same `manage_ads` permission contract already defined for ads/promotions. This enables marketing and ad-manager roles according to existing role permissions, while denying staff without that permission. Superadmin and owner elevation remain governed by the existing RBAC middleware.

**Implemented in this checkpoint:** `backend/routes/featuredCampaignRoutes.js` uses `protect` plus `requirePermission("manage_ads")` instead of a hard-coded admin/superadmin role list.

### P1 — homepage config ownership
**Decision:** `useHomePageConfig` remains a local visitor presentation preference store only. Globally published/admin-managed hero content, campaign data and platform configuration must continue to use their existing backend/platform-config control planes. Do not migrate or merge them in the visual pass.

### P1 — mobile filters
**Decision:** Use draft/apply/cancel/reset semantics in the existing sheet and shared filter component. Keep the same filter shape and `GetCarsParams` mapping.

### P1 — card action parity
**Decision:** Do not unify card renderers in the initial visual pass. Restyle both in place and test their distinct action matrices. A shared primitive is considered only after parity is demonstrated.

### P1 — mobile dock CSS
**Decision:** Preserve existing behavior until browser computed-style evidence identifies the winning declarations. Then consolidate only the proven duplicate rules and keep safe-area, body padding and drawer suppression behavior.

## 7. Stage 3 security patch in this checkpoint

Files changed:
- `backend/routes/uploadRoutes.js`
- `backend/routes/featuredCampaignRoutes.js`
- `backend/tests/regression/featuredCampaigns.test.js`
- `backend/tests/regression/marketingUploadAuthorization.test.js` (new)

Test intent:
- Marketing and ad-manager roles can use campaign management and marketing uploads through `manage_ads`.
- Authenticated users without the capability are denied marketing uploads.
- Ordinary authenticated vehicle uploads retain their existing authorization path.
- Anonymous uploads remain denied.
- Existing campaign scheduling, overlap, status, ordering, history and public fallback tests remain in place.

## 8. Validation

Passed:
- `node --check` for both changed backend routes and both relevant test files.
- 12 existing static validation scripts covering homepage convergence/responsiveness, hero pair/admin/mobile assets, navigation convergence, mobile navigation, saved-vehicle visibility and seller workflow.

Not run:
- Jest/Vitest backend regression suites because dependencies are absent in the extracted foundation.
- Frontend Vitest and Vite production build for the same reason.
- Real browser tests, device viewport tests, live RBAC tests, database tests or Cloudinary upload integration.

## 9. Next visual implementation stages

1. **Stage 4 — Hero composition:** implement the approved compact single-featured-vehicle hero, preserve active campaign priority and keep the hero admin controls operational.
2. **Stage 5 — Desktop marketplace layout:** compact hero, full-height left filter panel, category cards, inventory toolbar and immediate live inventory.
3. **Stage 6 — Mobile marketplace:** compact hero, category row, inventory toolbar and explicit full-screen filter draft/apply/cancel/reset.
4. **Stage 7 — Cards and details:** refine image treatment and card hierarchy while retaining each existing action.
5. **Stage 8 — Navigation and responsive polish:** test all destinations, mobile drawer/dock, safe areas, keyboard and viewport widths.
6. **Stage 9 — Runtime certification:** restore dependencies using the canonical lockfile, run full tests/build, browser journeys and regression checks.

## 10. Non-goals

- No second marketplace.
- No duplicate filter/query engine.
- No duplicate hero/campaign system.
- No mock inventory or fabricated prices.
- No new routes or public APIs unless an existing contract is proven insufficient.
- No replacement of saved or comparison state.
- No redesign of seller/dealer workflows.
- No commit, push or deployment in this checkpoint.
