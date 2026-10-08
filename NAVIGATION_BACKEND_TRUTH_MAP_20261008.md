# NAVIGATION BACKEND TRUTH MAP — 2026-10-08

What the backend/app actually provides for navigation, traced before any
source was changed. Only facts found in code are listed.

## 1. How navigation actually works (frontend)

- There is **no React Router `<Routes>` tree**. `App.tsx` keeps one
  `activeNav` string and renders one surface per value in a manual switch.
  `?nav=<id>` in the URL is read on location change (`normalizeNav`), and a
  few legacy paths (`/auctions`, `/escrow`, `/support` …) canonicalise into it.
- `Navbar.tsx` is the only global header. `MobileBottomNav.tsx` is the only
  mobile dock (Home/Search/Auction/Inspection/Menu); its Menu tab fires a
  window event that opens the Navbar's existing drawer (one menu
  implementation). `TopNoticeStrip.tsx` is the ticker, rendered by
  `App.tsx` above the Navbar and suppressed for private workspaces.
- `src/components/layout/Header.tsx`, `AppLayout.tsx` (Navbar with stub
  props), `layout/MobileBottomNav.tsx` are unreachable duplicates (see the
  IA audit). Not touched.

## 2. Authority table

| Concern | Source of truth | Who can change it | Notes |
|---|---|---|---|
| Ticker content, order, colours, speed, visibility | `GET /api/ads?placement=top_ticker` slots + `PlatformConfig.heroPresentation.ticker*` via `GET /admin/public/config` | Admin (Ad Manager, Hero/Home admin panel) | Already fully admin-controlled. Public read, admin write. |
| Brand: logo type/text/image, tagline, palette | `PlatformConfig.branding` via `GET /admin/public/config` → `BrandingContext` | Admin (Admin Settings → Branding, Theme Studio) | Already admin-controlled; header consumes `branding.logoType/logoText/logoUrl/brandTagline`. |
| Which destinations exist in the primary nav, their order, grouping, labels | **Hardcoded in React** (Navbar.tsx before this stage; `navigation/navConfig.ts` now) | Developers | No backend model, table, setting or API exists for navigation items. |
| Role/section visibility inside the account menu (dealer, mechanic, admin blocks) | `useAuth()` role from `/api/v1/auth/me` | Backend role assignment | Presentation filter only. |
| Access to protected destinations | `App.tsx` `protectedNavs` effect + per-route backend `protect`/role middleware | Backend | Authoritative. A hidden menu item is never the protection. |
| Feature visibility flags | `backend/services/featureFlagService.js`, `routes/featureFlagRoutes.js` (`GET /user` for signed-in users; everything else `adminOnly`), `configurationRoutes` `/features` | Admin | Exists on the backend; **no frontend consumer exists** and no flag is keyed to navigation. |
| Site-wide configuration entries | `configurationController` entries/reference/countries/audit | Admin | Generic key/value + audit + rollback; contains no navigation keys. |
| Public shell config whitelist | `adminRoutes.js` `/public/config` selects `platformName galleryTitle gallerySubtitle fontDisplay fontBody fontSizePct baseFontSize lineHeight branding allowGuestBrowsing heroCarIds heroFeaturedMode heroPresentation heroCardContent` | Backend code | No navigation field in the whitelist. |

## 3. Public vs authenticated vs admin

- **Public**: Marketplace, Auction, Pre-Purchase Inspection, Escrow (view),
  Support, Financing, Inspection provider marketplace, ticker, branding.
- **Authenticated** (App gate redirects to `/login`): saved, chat,
  dashboard, payments, profile, buyer-platform, dealer-dashboard.
- **Role-gated**: `admin` (admin roles), `dealer-dashboard` (dealer/admin).
- Escrow "Protected deals" and Auction "Saved for you" content is
  user-specific; the header shows those two entries only when signed in.

## 4. Findings

1. Ticker and brand are already admin-controlled — the redesign keeps
   consuming them unchanged and adds **no** new fetch (header makes zero
   network calls; verified by `validate-navigation-convergence`).
2. Navigation structure has no backend authority. This is documented as a
   gap, not filled (see the admin control audit).
3. `GET /admin/public/config` is requested independently by
   `BrandingContext`, `TopNoticeStrip`, `VehicleMarketplace` and the
   (unused) `AppLayout` — four requests for one document. Pre-existing;
   not introduced or worsened here. Candidate for a shared cache later.
4. Backend feature-flag system exists and could, in principle, gate
   navigation entries; it has no frontend consumer, so wiring it would be
   new architecture and was not attempted.
5. `DealersView` is routed (`activeNav === 'dealers'`) but App passes
   `dealers={[]}`, so a nav entry would lead to an empty page; no menu
   entry points to it.
6. Nested `<main>` landmarks (`App` main + page-level `<main>` in several
   views) exist app-wide. Pre-existing accessibility debt, outside the
   header; recorded for a later pass.
