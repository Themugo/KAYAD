# Frontend Architecture Redesign - Migration Plan

**Date:** July 23, 2026  
**Status:** Planning Phase  
**Objective:** Redesign frontend architecture without changing functionality

---

## Current State Analysis

### Duplicate Locations Found

#### 1. Layout Components (DUPLICATE - 2 locations)
| Component | Location A | Location B | Resolution |
|-----------|-----------|------------|------------|
| AdminLayout.tsx | `src/components/layout/` | `src/components/admin/` | **Keep:** `src/components/layout/` |
| AdminSidebar.tsx | `src/components/layout/` | `src/components/admin/` | **Keep:** `src/components/layout/` |
| DealerLayout.tsx | `src/components/layout/` | `src/components/dealer/` | **Keep:** `src/components/layout/` |
| DealerSidebar.tsx | `src/components/layout/` | `src/components/dealer/` | **Keep:** `src/components/layout/` |
| Footer.tsx | `src/components/layout/` | `src/components/Footer.tsx` | **Keep:** `src/components/layout/` |
| MobileBottomNav.tsx | `src/components/layout/` | `src/components/MobileBottomNav.tsx` | **Keep:** `src/components/layout/` |

#### 2. Common Components (DUPLICATE - 2 locations)
| Component | Location A | Location B | Resolution |
|-----------|-----------|------------|------------|
| BackButton.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/` |
| CarCard.tsx | `src/components/` | `src/components/features/car/` | **Keep:** `src/components/features/car/` (more feature-specific) |
| CartyGrid.tsx | `src/components/` | `src/components/features/car/` | **Keep:** `src/components/features/car/` |
| CompareDrawer.tsx | `src/components/` | `src/components/features/car/` | **Keep:** `src/components/features/car/` (3x: also in features/common) |
| CountdownDisplay.tsx | `src/components/` | `src/components/features/auction/` | **Keep:** `src/components/features/auction/` |
| DarkModeToggle.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/` |
| DemoModeBanner.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| ErrorBoundary.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| EscrowTimeline.tsx | `src/components/` | `src/components/features/escrow/` | **Keep:** `src/components/features/escrow/` |
| HeroCarousel.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| InspectionButton.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| LazyImage.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| LoadingPage.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| MarketPulse.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| MarketValuationMatrix.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| NotificationCenter.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| PaymentModal.tsx | `src/components/` | `src/components/features/escrow/` | **Keep:** `src/components/features/escrow/` |
| PriceHistoryChart.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| ReferralStats.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| ReportButton.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| SEOHead.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| SWUpdateBanner.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| SearchBar.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| SearchSidebar.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| SeoStructuredData.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| SkeletonCard.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| TcoCalculator.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| ThemeSettings.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| VirtualList.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| AppInstallPrompt.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| BiddingSecurityGateway.tsx | `src/components/` | `src/components/features/auction/` | **Keep:** `src/components/features/auction/` |
| ActiveBidLogs.tsx | `src/components/` | `src/components/features/common/` | **Keep:** `src/components/features/common/` |
| SecureEscrowHub.tsx | `src/components/` | `src/components/features/escrow/` | **Keep:** `src/components/features/escrow/` |
| WinnerModal.tsx | `src/components/` | `src/components/features/auction/` | **Keep:** `src/components/features/auction/` |
| GhostCheckOrderModal.tsx | `src/components/` | - | **Keep:** `src/components/` |
| Navbar.tsx | `src/components/` | - | **Keep:** `src/components/` |
| Skeleton.tsx | `src/components/` | - | **Keep:** `src/components/` |
| OptimizedImg.jsx | `src/components/` | - | **Keep:** `src/components/` |

#### 3. UI Components (DUPLICATE - 2 extensions per file)
| Component | Location A | Location B | Resolution |
|-----------|-----------|------------|------------|
| Alert.jsx | `src/components/ui/` | `src/components/ui/` (same file) | **Keep:** `.jsx` extension |
| Badge.jsx | `src/components/ui/` | `src/components/ui/` (same file) | **Keep:** `.jsx` extension |
| Button.jsx | `src/components/ui/` | `src/components/ui/` (same file) | **Keep:** `.jsx` extension |
| Card.jsx | `src/components/ui/` | `src/components/ui/` (same file) | **Keep:** `.jsx` extension |
| Input.jsx | `src/components/ui/` | `src/components/ui/` (same file) | **Keep:** `.jsx` extension |
| Modal.jsx | `src/components/ui/` | `src/components/ui/` (same file) | **Keep:** `.jsx` extension |
| PaymentModal.jsx | `src/components/` | - | **Merge:** Delete duplicate |

#### 4. Pages (DUPLICATE - Need to verify)
| Page | Location A | Location B | Resolution |
|------|-----------|------------|------------|
| GalleryModal.tsx | `src/components/` | `src/pages/car/components/` | **Keep:** `src/components/features/car/GalleryModal.tsx` |

#### 5. Dealer Components (DUPLICATE)
| Component | Location A | Location B | Resolution |
|-----------|-----------|------------|------------|
| DealerHub.jsx | `src/components/dealer/` | `src/components/features/dealer/` | **Keep:** `src/components/dealer/DealerHub.jsx` |
| DealerLayout.tsx | `src/components/dealer/` | `src/components/layout/` | **Keep:** `src/components/layout/DealerLayout.tsx` |
| DealerSidebar.tsx | `src/components/dealer/` | `src/components/layout/` | **Keep:** `src/components/layout/DealerSidebar.tsx` |
| AdminLayout.tsx | `src/components/admin/` | `src/components/layout/` | **Keep:** `src/components/layout/AdminLayout.tsx` |
| AdminSidebar.tsx | `src/components/admin/` | `src/components/layout/` | **Keep:** `src/components/layout/AdminSidebar.tsx` |
| AdminWidgets.tsx | `src/components/features/admin/` | `src/pages/admin/components/` | **Keep:** `src/pages/admin/components/AdminWidgets.jsx` |

#### 6. Features Subdirectories
```
src/components/features/
├── admin/
│   └── AdminWidgets.tsx
├── auction/
│   ├── BiddingSecurityGateway.tsx
│   ├── CountdownDisplay.tsx
│   └── WinnerModal.tsx
├── car/
│   ├── CarCard.tsx
│   ├── CarDetail/
│   ├── CartyGrid.tsx
│   ├── CompareDrawer.tsx
│   ├── GalleryModal.tsx
│   ├── SimilarCars.tsx
│   └── index.ts
├── common/
│   └── (All shared components - 30+ files)
├── dealer/
│   ├── DealerHub.tsx
│   └── DealerMarketInsights.tsx
├── escrow/
│   ├── EscrowTimeline.tsx
│   ├── PaymentModal.tsx
│   └── SecureEscrowHub.tsx
└── index.ts
```

---

## Target Folder Structure

```
src/
├── api/
│   ├── client.ts           # Unified API client
│   └── api.ts              # Extended API (merged)
├── components/
│   ├── ui/                  # Design system components
│   │   ├── index.ts
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Alert.tsx
│   │   ├── Input.tsx
│   │   ├── ... (all UI primitives)
│   │   └── tokens.ts
│   ├── layout/              # Layout components (SINGLE location)
│   │   ├── index.ts
│   │   ├── AdminLayout.tsx
│   │   ├── AdminSidebar.tsx
│   │   ├── DealerLayout.tsx
│   │   ├── DealerSidebar.tsx
│   │   ├── Footer.tsx
│   │   ├── MobileBottomNav.tsx
│   │   └── AppLayout.tsx (NEW - merge AppInstallPrompt pattern)
│   ├── features/            # Feature-based components
│   │   ├── admin/
│   │   │   └── AdminWidgets.tsx
│   │   ├── auction/
│   │   │   ├── BiddingSecurityGateway.tsx
│   │   │   ├── CountdownDisplay.tsx
│   │   │   ├── WinnerModal.tsx
│   │   │   └── index.ts
│   │   ├── car/
│   │   │   ├── CarCard.tsx
│   │   │   ├── CarDetail/
│   │   │   ├── CartyGrid.tsx
│   │   │   ├── CompareDrawer.tsx
│   │   │   ├── GalleryModal.tsx
│   │   │   ├── SimilarCars.tsx
│   │   │   └── index.ts
│   │   ├── common/          # Shared components
│   │   │   ├── BackButton.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── HeroCarousel.tsx
│   │   │   ├── LazyImage.tsx
│   │   │   ├── LoadingPage.tsx
│   │   │   ├── MarketPulse.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SearchSidebar.tsx
│   │   │   ├── SkeletonCard.tsx
│   │   │   ├── TcoCalculator.tsx
│   │   │   ├── NotificationCenter.tsx
│   │   │   ├── EscrowTimeline.tsx
│   │   │   ├── PaymentModal.tsx
│   │   │   ├── ReferralStats.tsx
│   │   │   ├── DemoModeBanner.tsx
│   │   │   ├── SWUpdateBanner.tsx
│   │   │   ├── SEOHead.tsx
│   │   │   ├── SeoStructuredData.tsx
│   │   │   ├── PriceHistoryChart.tsx
│   │   │   ├── MarketValuationMatrix.tsx
│   │   │   ├── InspectionButton.tsx
│   │   │   ├── VirtualList.tsx
│   │   │   ├── DarkModeToggle.tsx
│   │   │   ├── ThemeSettings.tsx
│   │   │   ├── ReportButton.tsx
│   │   │   ├── AppInstallPrompt.tsx
│   │   │   ├── ActiveBidLogs.tsx
│   │   │   └── index.ts
│   │   ├── dealer/
│   │   │   ├── DealerHub.tsx
│   │   │   ├── DealerMarketInsights.tsx
│   │   │   └── index.ts
│   │   ├── escrow/
│   │   │   ├── EscrowTimeline.tsx
│   │   │   ├── PaymentModal.tsx
│   │   │   ├── SecureEscrowHub.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── mobile/              # Mobile-specific components
│   │   ├── index.ts
│   │   ├── MobileCarCard.jsx
│   │   ├── MobileFilterDrawer.jsx
│   │   ├── MobileHeader.jsx
│   │   ├── MobilePage.jsx
│   │   ├── MobileSearchBar.jsx
│   │   ├── MobileSkeleton.jsx
│   │   ├── MobileToast.jsx
│   │   ├── MobileEmptyState.jsx
│   │   └── MobileForm.jsx
│   ├── enterprise/
│   │   └── EnterpriseDashboard.jsx
│   ├── index.ts             # Main exports
│   ├── Navbar.tsx
│   ├── CarCard.tsx          # → Move to features/car/
│   ├── Skeleton.tsx
│   ├── OptimizedImg.jsx
│   └── GhostCheckOrderModal.tsx
├── context/
│   ├── AuthContext.tsx
│   ├── BrandingContext.tsx
│   ├── CompareContext.tsx
│   ├── NotificationContext.tsx
│   ├── SocketContext.tsx
│   ├── ThemeContext.tsx
│   └── ToastContext.tsx
├── hooks/
│   ├── index.ts
│   ├── useAbortController.js
│   ├── useApi.ts
│   ├── useCountdown.jsx
│   ├── useDebouncedValue.ts
│   ├── useFocusManagement.ts
│   ├── useInfiniteScroll.ts
│   ├── useIntersectionObserver.js
│   ├── useLocalization.tsx
│   ├── useMediaQuery.ts
│   ├── usePageMeta.js
│   └── useSwipeBack.js
├── lib/
│   └── supabaseClient.ts
├── pages/
│   ├── index.ts             # Page exports
│   ├── Home.tsx
│   ├── Gallery.tsx
│   ├── Compare.tsx
│   ├── Favorites.tsx
│   ├── Auction.tsx
│   ├── EscrowPage.tsx
│   ├── EscrowVault.tsx
│   ├── PreInspection.tsx
│   ├── Support.tsx
│   ├── Profile.tsx
│   ├── Notifications.tsx
│   ├── Payments.tsx
│   ├── Chat.tsx
│   ├── Dashboard.tsx
│   ├── Showroom.tsx
│   ├── CreateAccount.tsx
│   ├── SignIn.tsx
│   ├── CarDetail.tsx
│   ├── admin/
│   │   ├── components/
│   │   │   └── (all admin-specific components)
│   │   └── (all admin pages)
│   ├── dealer/
│   │   ├── components/
│   │   │   └── (all dealer-specific components)
│   │   └── (all dealer pages)
│   ├── buyer/
│   │   └── components/
│   ├── car/
│   │   ├── components/
│   │   └── (car-related pages)
│   ├── home/
│   │   └── components/
│   ├── inspector/
│   │   └── components/
│   ├── register/
│   │   └── components/
│   ├── mobile/
│   └── seller/
├── styles/
│   ├── accessibility.css
│   ├── auction-live.css
│   ├── car-detail.css
│   ├── compare.css
│   ├── dashboard.css
│   ├── dealer.css
│   ├── layout.css
│   ├── mobile.css
│   └── showroom.css
├── types/
│   └── index.ts
├── utils/
│   ├── index.ts
│   ├── authRoutes.ts
│   ├── helpers.ts
│   ├── listingQualityScore.ts
│   ├── logger.ts
│   ├── observability.ts
│   ├── permissions.ts
│   ├── posthog.ts
│   ├── requestCache.ts
│   ├── security.ts
│   └── seoService.ts
├── data/
│   ├── cars.ts
│   ├── demoCars.ts
│   └── mockCars.ts
├── __tests__/
├── App.tsx
├── main.tsx
└── index.css
```

---

## Migration Steps

### Phase 1: Generate Import Map
1. Scan all files for imports
2. Create import redirection map
3. Identify which duplicate to keep based on usage

### Phase 2: Consolidate Layout Components
- [ ] Keep `src/components/layout/AdminLayout.tsx` (delete `src/components/admin/AdminLayout.tsx`)
- [ ] Keep `src/components/layout/AdminSidebar.tsx` (delete `src/components/admin/AdminSidebar.tsx`)
- [ ] Keep `src/components/layout/DealerLayout.tsx` (delete `src/components/dealer/DealerLayout.tsx`)
- [ ] Keep `src/components/layout/DealerSidebar.tsx` (delete `src/components/dealer/DealerSidebar.tsx`)
- [ ] Keep `src/components/layout/Footer.tsx` (delete `src/components/Footer.tsx`)
- [ ] Keep `src/components/layout/MobileBottomNav.tsx` (delete `src/components/MobileBottomNav.tsx`)

### Phase 3: Consolidate Common Components
- [ ] Move root-level components to `src/components/features/common/`
- [ ] Update all imports to use new paths
- [ ] Update `src/components/index.ts` exports

### Phase 4: Consolidate Car Components
- [ ] Keep `src/components/features/car/CarCard.tsx`
- [ ] Keep `src/components/features/car/CartyGrid.tsx`
- [ ] Keep `src/components/features/car/CompareDrawer.tsx`
- [ ] Consolidate `GalleryModal.tsx` from multiple locations

### Phase 5: Consolidate Auction Components
- [ ] Keep `src/components/features/auction/`
- [ ] Update imports

### Phase 6: Consolidate Escrow Components
- [ ] Keep `src/components/features/escrow/`
- [ ] Update imports

### Phase 7: Consolidate Dealer Components
- [ ] Keep `src/components/features/dealer/DealerHub.tsx`
- [ ] Update `src/components/dealer/index.js`

### Phase 8: Clean Up UI Components
- [ ] Remove duplicate `.jsx` files where `.tsx` exists
- [ ] Consolidate `PaymentModal.jsx` and `PaymentModal.tsx`

### Phase 9: Clean Up Pages
- [ ] Remove `src/pages/car/components/GalleryModal.tsx` (duplicate)
- [ ] Update imports

### Phase 10: Update Index Files
- [ ] Update `src/components/index.ts`
- [ ] Update `src/components/features/index.ts`
- [ ] Update `src/components/layout/index.ts`

---

## Files to DELETE (Verified Unused)

1. `src/components/Footer.tsx` (duplicate - use layout/Footer.tsx)
2. `src/components/MobileBottomNav.tsx` (duplicate - use layout/MobileBottomNav.tsx)
3. `src/components/AdminLayout.tsx` (duplicate - use layout/AdminLayout.tsx)
4. `src/components/AdminSidebar.tsx` (duplicate - use layout/AdminSidebar.tsx)
5. `src/components/DealerLayout.tsx` (duplicate - use layout/DealerLayout.tsx)
6. `src/components/DealerSidebar.tsx` (duplicate - use layout/DealerSidebar.tsx)
7. `src/components/PaymentModal.jsx` (duplicate - use features/escrow/PaymentModal.tsx)
8. `src/pages/car/components/GalleryModal.tsx` (duplicate - use features/car/GalleryModal.tsx)
9. `src/components/OptimizedImg.jsx` (check if used)

---

## Files to MOVE

1. Move root `src/components/BackButton.tsx` → `src/components/features/common/BackButton.tsx`
2. Move root `src/components/CarCard.tsx` → `src/components/features/car/CarCard.tsx`
3. Move root `src/components/CartyGrid.tsx` → `src/components/features/car/CartyGrid.tsx`
4. Move root `src/components/CompareDrawer.tsx` → `src/components/features/car/CompareDrawer.tsx`
5. Move root `src/components/CountdownDisplay.tsx` → `src/components/features/auction/CountdownDisplay.tsx`
6. Move root `src/components/DarkModeToggle.tsx` → `src/components/features/common/DarkModeToggle.tsx`
7. Move root `src/components/DemoModeBanner.tsx` → `src/components/features/common/DemoModeBanner.tsx`
8. Move root `src/components/ErrorBoundary.tsx` → `src/components/features/common/ErrorBoundary.tsx`
9. Move root `src/components/EscrowTimeline.tsx` → `src/components/features/escrow/EscrowTimeline.tsx`
10. Move root `src/components/HeroCarousel.tsx` → `src/components/features/common/HeroCarousel.tsx`
11. Move root `src/components/InspectionButton.tsx` → `src/components/features/common/InspectionButton.tsx`
12. Move root `src/components/LazyImage.tsx` → `src/components/features/common/LazyImage.tsx`
13. Move root `src/components/LoadingPage.tsx` → `src/components/features/common/LoadingPage.tsx`
14. Move root `src/components/MarketPulse.tsx` → `src/components/features/common/MarketPulse.tsx`
15. Move root `src/components/MarketValuationMatrix.tsx` → `src/components/features/common/MarketValuationMatrix.tsx`
16. Move root `src/components/NotificationCenter.tsx` → `src/components/features/common/NotificationCenter.tsx`
17. Move root `src/components/PaymentModal.tsx` → `src/components/features/escrow/PaymentModal.tsx`
18. Move root `src/components/PriceHistoryChart.tsx` → `src/components/features/common/PriceHistoryChart.tsx`
19. Move root `src/components/ReferralStats.tsx` → `src/components/features/common/ReferralStats.tsx`
20. Move root `src/components/ReportButton.tsx` → `src/components/features/common/ReportButton.tsx`
21. Move root `src/components/SEOHead.tsx` → `src/components/features/common/SEOHead.tsx`
22. Move root `src/components/SWUpdateBanner.tsx` → `src/components/features/common/SWUpdateBanner.tsx`
23. Move root `src/components/SearchBar.tsx` → `src/components/features/common/SearchBar.tsx`
24. Move root `src/components/SearchSidebar.tsx` → `src/components/features/common/SearchSidebar.tsx`
25. Move root `src/components/SeoStructuredData.tsx` → `src/components/features/common/SeoStructuredData.tsx`
26. Move root `src/components/SkeletonCard.tsx` → `src/components/features/common/SkeletonCard.tsx`
27. Move root `src/components/TcoCalculator.tsx` → `src/components/features/common/TcoCalculator.tsx`
28. Move root `src/components/ThemeSettings.tsx` → `src/components/features/common/ThemeSettings.tsx`
29. Move root `src/components/VirtualList.tsx` → `src/components/features/common/VirtualList.tsx`
30. Move root `src/components/AppInstallPrompt.tsx` → `src/components/features/common/AppInstallPrompt.tsx`
31. Move root `src/components/BiddingSecurityGateway.tsx` → `src/components/features/auction/BiddingSecurityGateway.tsx`
32. Move root `src/components/ActiveBidLogs.tsx` → `src/components/features/common/ActiveBidLogs.tsx`
33. Move root `src/components/SecureEscrowHub.tsx` → `src/components/features/escrow/SecureEscrowHub.tsx`
34. Move root `src/components/WinnerModal.tsx` → `src/components/features/auction/WinnerModal.tsx`

---

## Verification Steps

After each phase:
1. Run TypeScript compilation: `npm run build`
2. Run tests: `npm test`
3. Check for import errors: `npm run lint`
4. Manual smoke test: Open browser to verify key pages

---

## Rollback Plan

If issues arise:
1. Revert git changes: `git checkout <commit>`
2. Maintain backup branch: `git branch backup-pre-refactor`
3. Document errors and restart from a stable point
