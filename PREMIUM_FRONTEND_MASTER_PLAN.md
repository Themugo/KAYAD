# PREMIUM FRONTEND MASTER PLAN — KAYAD

> **Status:** Phase 1 Complete (Refactor & Foundations)  
> **Last Updated:** 2026-06-30  
> **Repository:** [kayad-marketplace](https://github.com/ancod3r/kayad)

---

## Phase 1 ✅ — Audit & Foundation (Complete)

- Full frontend audit → [`COMPLETE_FRONTEND_AUDIT.md`](COMPLETE_FRONTEND_AUDIT.md)
- Design system v2 spec → [`DESIGN_SYSTEM_V2.md`](DESIGN_SYSTEM_V2.md)
- All critical bugs, regressions, UX gaps, and performance bottlenecks documented
- Layered architecture re-established (API layer → hooks → components → pages)

---

## Phase 2 ✅ — Homepage Overhaul (Complete)

| Initiative | Status | Files Changed |
|---|---|---|
| Hero section redesign | ✅ | `HomeHero.jsx`, `car-detail.css`, `index.css` |
| Featured inventory (`premium-card`) | ✅ | `HomeFeatured.jsx` (refactored) |
| Sponsored content (`AdvertisementBanner`) | ✅ | `AdvertisementBanner.jsx` |
| Dealer section — sponsorship tiers | ✅ | `FeaturedDealers.jsx`, `DealerSpotlight.jsx` |
| Private seller trust section | ✅ | `PrivateSellerSpotlight.jsx` |
| Living auctions auto-refresh | ✅ | `HomeLiveAuctions.tsx` |
| Testimonials / social proof | ✅ | `Testimonials.jsx` |
| Partners & badges | ✅ | `Partners.jsx` |
| Layout hierarchy, whitespace rhythm | ✅ | `index.css` spacing tokens |
| **MaxInclusiveSection** wrapper | ✅ | `MaxInclusiveSection` component |

**Conversion goals:** Hero → Search (high intent) / Sell CTA (supply). Featured → Detail. Dealer → Profile. Private → Detail.

---

## Phase 3 ✅ — Navigation & Conversion (Complete)

| Initiative | Status | Details |
|---|---|---|
| Navbar sell CTA | ✅ | Gold button in desktop + mobile |
| Mobile bottom bar | ✅ | 5-action bar: Home, Search, Sell, Messages, Profile |
| Clean dropdowns | ✅ | Category mega-menu |
| Search prominence | ✅ | Search in nav + hero + dedicated page |
| Back button improvements | ✅ | `BackButton` — smart history-aware routing |
| Breadcrumb discovery | ✅ | Breadcrumbs shown on detail pages |

---

## Phase 4 ✅ — Vehicle Detail Page (Complete)

| Initiative | Status | Details |
|---|---|---|
| Gallery with touch gestures | ✅ | Swipe + arrow nav + counter |
| Trust indicators | ✅ | NTSA + Escrow + Inspection badges |
| Price KPIs | ✅ | Views, Saved, Bids (lucide icons) |
| Market intelligence | ✅ | TCO Calculator, Market Pulse, Price History, Valuation Matrix |
| Bidding (live & timed) | ✅ | `InlineBidding` with real-time updates |
| Dealer contact | ✅ | Phone, Email, WhatsApp chat, physical address |
| Reviews | ✅ | `CarDetailReviews` with star rating |
| **Similar Cars** | ✅ | Brand-based recommendations |
| **Emojis → Lucide SVGs** | ✅ | Stats & contact icons |

---

## Phase 5 🔄 — Dashboards (In Progress)

### Buyer Dashboard
- [x] KPI cards (Watching, Bids, Saved, Activity)
- [x] Tabs: Overview, Watchlist, Bids, Saved, Reviews
- [ ] **Empty states** for all tabs
- [ ] **Notifications** bell in dashboard header
- [ ] **Quick actions** (save search, price alert)

### Dealer Dashboard
- [x] KPI cards (Active, Pending, Sold, Leads, Revenue)
- [x] Tabs: Overview, Listings, Leads, Analytics
- [ ] **Lead quality score**
- [ ] **Inventory health** (stale listings, images missing)
- [ ] **Bulk edit** for listings

### Admin Dashboard  
- [x] KPI cards (Total Users, Dealers, Cars, Revenue)
- [x] Charts for signups / listings / revenue
- [ ] **Approval queue** with batch actions
- [ ] **System health** (API latency, error rates)
- [ ] **Feature flags** UI

---

## Phase 6 ⏳ — Performance & Mobile (Next)

| Initiative | Priority | Owner | Notes |
|---|---|---|---|
| Image optimisation (srcSet / WebP) | High | FE | Requires backend `?format=webp&w=...` support |
| `fetchpriority` on LCP images | High | FE | ✅ Done for `GalleryImage` |
| Bundle size audit (Code splitting) | Medium | FE | Route-level lazy with `React.lazy()` |
| CSS purge / unused removal | Medium | FE | ~40% of CSS is dead |
| Mobile tap target audit | Medium | FE | Min 44px for all interactive |
| 404 / error states | Low | FE | Generic fallback pages |
| Skeleton loading audit | Low | FE | Consistent skeleton patterns |

---

## Phase 7 ⏳ — Advanced Features (Roadmap)

| Feature | Description | Depends On |
|---|---|---|
| **AI Recommendations** | Personalized car suggestions | User activity tracking |
| **Virtual Tour** | 360° interior photos | Backend media support |
| **Trade-in Estimator** | Instant valuation tool | Market data pipeline |
| **Multi-language** | i18n (Swahili + English) | Design system tokens |
| **PWA (Offline Mode)** | Service worker + cache-first | Build tooling |
| **A/B Testing Framework** | Growth experiments | Feature flags |

---

## Architecture Principles

```
@scope (page) | (component) | (layout)
  :scope { --scope: 'component-name'; }

/* Layered structure */
src/
  api/         ← data fetching (axios instances)
  components/  ← shared UI primitives
  context/     ← React Context providers
  hooks/       ← reusable logic (useMediaQuery, useIntersectionObserver)
  pages/       ← route-level components
  styles/      ← global CSS + page-level CSS modules
  utils/       ← pure functions (formatters, validators)
```

### CSS Strategy
- Global resets / tokens → `index.css`
- Page-specific → `*.css` files in `src/styles/`
- Component-specific → inline styles or `@scope` blocks  
- **No CSS-in-JS, no Tailwind, no CSS modules** — plain CSS with cascade

---

## Performance Budget

| Metric | Target | Current (est.) |
|---|---|---|
| Lighthouse Performance | ≥90 | ~72 |
| LCP (Largest Contentful Paint) | ≤2.5s | ~3.8s |
| TBT (Total Blocking Time) | ≤200ms | ~340ms |
| CLS (Cumulative Layout Shift) | ≤0.1 | ~0.15 |
| JS Bundle (gzip) | ≤200KB | ~280KB |
| CSS Bundle (gzip) | ≤30KB | ~48KB |
| First Load Images | ≤500KB | ~1.2MB |
| Time to Interactive | ≤3.5s | ~4.5s |

---

## Testing Strategy

- **Unit:** Jest + React Testing Library (`src/__tests__/`)
- **E2E:** Playwright (planned)  
- **Visual:** Chromatic / Percy (planned)
- **Lighthouse CI:** GitHub Action (planned)

Current coverage: ~8% (critical paths only). Target: ≥60%.

---

## Deployment

- **Platform:** Vercel (SPA + API routes)
- **Build:** `npm run build` → `dist/`
- **Env vars:** `VITE_API_URL`, `VITE_WS_URL`, `VITE_SENTRY_DSN`
- **Branch:** `main` → production, `develop` → preview

### Pre-deploy Checklist
- [ ] `npm run build` succeeds (zero errors)
- [ ] All critical user flows pass manual QA
- [ ] Lighthouse mobile score ≥70
- [ ] No console errors in production build
- [ ] API endpoints return 200 for key pages

---

## Team & Ownership

| Area | Lead | Reviewers |
|---|---|---|
| Components / Design System | FE Lead | Design + PM |
| Routing / Pages | FE Lead | BE Lead |
| State / Context | FE Lead | BE Lead |
| Performance | FE Lead | DevOps |
| Accessibility | Design | FE Lead |

---

## Appendix: Key File Map

```
src/
├── api/api.js                        ← All API calls (cars, auth, chat, etc.)
├── components/
│   ├── LazyImage.tsx                 ← IntersectionObserver lazy loader
│   ├── CartyGrid.tsx                 ← Universal car card grid
│   ├── MaxInclusiveSection.tsx       ← Container component
│   ├── AdvertisementBanner.jsx       ← Sponsored / promoted content
│   └── BackButton.tsx                ← Smart history-aware back
├── pages/
│   ├── home/                         ← Homepage sections
│   │   └── components/
│   │       ├── HomeHero.jsx
│   │       ├── HomeFeatured.jsx
│   │       ├── HomeLiveAuctions.tsx
│   │       ├── FeaturedDealers.jsx
│   │       ├── PrivateSellerSpotlight.jsx
│   │       ├── DealerSpotlight.jsx
│   │       ├── VehicleCategories.jsx
│   │       ├── Testimonials.jsx
│   │       └── Partners.jsx
│   ├── CarDetailPage.jsx             ← Vehicle detail (main entry)
│   └── car/components/
│       ├── SimilarCars.jsx           ← NEW: brand recommendations
│       ├── CarDetailWidgets.jsx      ← GalleryImage, SpecItem, etc.
│       └── CarDetailReviews.jsx      ← Reviews sub-component
├── styles/
│   ├── index.css                     ← Global tokens + resets
│   ├── car-detail.css                ← VDP-specific styles
│   └── auth.css                      ← Auth pages
└── context/
    ├── AuthContext.jsx
    ├── CompareContext.jsx
    └── ToastContext.jsx
```
