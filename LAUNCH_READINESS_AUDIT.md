# KAYAD LAUNCH READINESS AUDIT

> **Date:** 2026-06-30  
> **Type:** Pre-launch frontend audit  
> **Scope:** Hardcoded data, placeholders, duplication, responsive issues  

---

## Hardcoded Data Found

| Location | Issue | Severity |
|---|---|---|
| `Partners.jsx` | 6 hardcoded partner companies (Toyota Kenya, Safaricom, KCB, Equity, Absa, Co-op) | CRITICAL |
| `Partners.jsx` | All logos use `via.placeholder.com` — nonexistent in production | CRITICAL |
| `TrustBar.jsx` | Values hardcoded: 12,000+, 500+, 100%, 4.8★ | CRITICAL |
| `TransactionStats.jsx` | Values hardcoded: KES 2.4B+, 8,500+, 24h, 98.7% | CRITICAL |
| `Testimonials.jsx` | Metric values hardcoded: 4.8/5, 100%, 8,500+, 98% | HIGH |
| `HomeHero.jsx` | Fallback images are hardcoded Unsplash URLs | MEDIUM |
| `VehicleCategories.jsx` | Category counts hardcoded (150, 89, 45, etc.) | MEDIUM |
| `GhostCheckerInfo.jsx` | Full page with hardcoded pricing, features, FAQ | MEDIUM |
| `InspectionButton.tsx` | References "Ghost Checker" brand name | LOW |
| `Navbar.tsx` | Has "Ghost Check" in mobile nav link text | LOW |

---

## Duplicate Navigation Found

| Location | Issue |
|---|---|
| `Navbar.tsx` | "Sell" appears in both desktop nav bar AND user dropdown menu for sellers |
| `Navbar.tsx` | Two "Sell" buttons when user is not logged in (nav-sell-btn + Sign In page link) |
| `Navbar.tsx` | Mobile menu has "List Your Vehicle" gold CTA + "Sell" in top section |
| `Footer.tsx` | "List a Vehicle" and "Sell Privately" both in Sell section |
| `Footer.tsx` | "Ghost Check" AND "Vehicle Inspection" under Services (same service) |

---

## Visual Clutter / Card Fatigue

| Section | Issue |
|---|---|
| Featured Collection | 4 cards in grid | Acceptable |
| Live Auctions | Up to 4 auction cards | Acceptable if few |
| Dealers (old) | 4 inventory-style dealer cards | Reduced to 3 in Phase 1 |
| Categories (old) | 6 large image cards | Already reduced to pills |
| Total cards visible | 14+ before scrolling | Improved in Phase 1 |

---

## Missing Real Data Sources

| Data | Current Source | Required Source |
|---|---|---|
| Total vehicles | Hardcoded or demo count | `carsAPI.list()` count |
| Verified dealers | Hardcoded | `adminAPI.stats()` or computed from cars |
| Completed transactions | Hardcoded | `adminAPI.stats()` or `transactionsAPI` |
| Escrow protected sales | Hardcoded | `escrowAPI` stats |
| Partners list | Hardcoded array | Admin-managed config |
| Hero images | Unsplash fallbacks | Featured/promoted vehicle images |
| Platform rating | Hardcoded 4.8★ | Computed from reviews |

---

## Ghost Checker → Pre-Inspection Rename Required

| File | Line | Current Text | Target Text |
|---|---|---|---|
| `Navbar.tsx` | 318 | `Ghost Check` | `Pre-Inspection` |
| `Footer.tsx` | 105 | `Ghost Check` | `Pre-Inspection` |
| `CarDetailPage.jsx` | 665-666 | Link to `/ghost-checker` text | `Pre-Inspection` |
| `InspectionButton.tsx` | 72 | `Ghost Checker` | `Pre-Inspector` |
| `InspectionButton.tsx` | 99 | `certified Ghost Checker` | `certified Pre-Inspector` |
| `GhostCheckerInfo.jsx` | ~200 | Page title / content | Rename to `PreInspectionInfo` (route kept) |
| `GhostCheckOrderModal.tsx` | 186 | `ghost checker` | `pre-inspection` |
| `GhostCheckOrderModal.tsx` | 314 | Link text | Update |
| `InspectorDashboard.jsx` | 203 | `Ghost Checkers` | `Pre-Inspectors` |
| `AdminDashboard.jsx` | 30 | `ghost_checker` label | `Inspector` (acceptable) |
| `AdminLayout.tsx` | 11 | `ghost_checker: 'Ghost Checker'` | `ghost_checker: 'Inspector'` |

---

## Responsive Issues Found

| Issue | Location | Impact |
|---|---|---|
| Gallery thumbnails overflow on small screens | `CarDetailPage.jsx` | Scrollable but no visual hint |
| Premium card grid single column on mobile | `HomePage.jsx` | Acceptable |
| Navbar hamburger may overlap with Sell button | `Navbar.tsx` | Minor |
| Mobile bottom bar (CarDetailPage) overlaps content | `CarDetailPage.jsx` | Handled via padding |

---

## Summary

**Critical fixes needed:**
1. Remove all hardcoded partner companies → dynamic system
2. Remove all hardcoded statistics → computed from real data  
3. Hero images → live from featured vehicles
4. Ghost Checker → Pre-Inspection (frontend UI only)
5. Navigation deduplication

**Medium fixes:**
6. Marketing claims → real platform capability descriptions
7. Admin monetization console backing (use config API)
8. Responsive polish on gallery thumbnails

**Low fixes:**
9. Category counts → dynamic or remove
10. Fallback images → branded placeholder
