# Frontend Route Audit Report

## Summary
- **Total lazy imports in `App.tsx`:** 76
- **Files matched on disk:** 76/76 (100%)
- **Missing files (import exists, file doesn't):** 0
- **Orphan route-level pages (file exists, no import):** 0
- **Navigation links pointing to non-existent routes:** 0
- **Issues found:** 7 (5 fixed, 2 noted)

---

## Issues Found & Fixed

### Fixed

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| 1 | **High** | `src/utils/permissions.ts` | 4 admin routes missing from `PAGE_PERMISSIONS`: `/admin/operations-dashboard`, `/admin/disputes`, `/admin/auction-integrity`, `/admin/dealer-verifications` — accessible to **all staff roles** without restriction | Added entries mapped to appropriate permissions |
| 2 | **High** | `src/context/AuthContext.tsx` | Same 4 routes + `/admin/inspector-applications` missing from `ADMIN_PAGE_ROLES` | Added role-based allow-lists |
| 3 | **High** | `src/context/AuthContext.tsx` | Dynamic admin routes (e.g. `/admin/disputes/:id`) bypassed `ADMIN_PAGE_ROLES` + `PAGE_PERMISSIONS` because they didn't match exact paths | Added `parentPath` fallback in `RequireAdminPage`: strips last segment and retries lookup |
| 4 | **Medium** | `src/utils/authRoutes.ts` | `getPostAuthPath` sent unapproved sellers to `/` instead of `/dealer/onboarding` | Changed to `return '/dealer/onboarding'` |
| 5 | **Low** | `src/context/AuthContext.tsx` | Unused `user` variable in `RequireSeller` | Removed |
| 6 | **Low** | `src/components/MobileBottomNav.tsx` | "Sell" tab sent logged-in `individual_seller` to `/register?role=dealer` (confusing — already logged in) | Changed check from `user?.role === 'dealer'` to `isSellerRole(user?.role)` so both `dealer` and `individual_seller` go to `/dealer/add-car` |

### Noted (not fixed — by-design or low-risk)

| # | Severity | Issue | Rationale |
|---|----------|-------|-----------|
| 7 | **Low** | `ghost_checker` passes `RequireAdmin` and can see `/admin` dashboard | Sidebar already filters links by permission; ghost_checkers see only their relevant pages. The dashboard itself is a harmless overview. |
| 8 | **Low** | `getPostAuthPath` line 54 redirects `ghost_checker` to `/inspector` instead of `/inspector/dashboard` | Both `/inspector` and `/inspector/dashboard` render the same component. Redirect to short form is intentional. |

---

## Route Coverage by User Flow

### Guest (unauthenticated)
- `/` — HomePage
- `/showroom` — Showroom (car listings)
- `/cars/:id`, `/car/:id` — CarDetailPage
- `/compare` — ComparePage
- `/auctions`, `/auctions/calendar` — AuctionCalendar
- `/auction/:id`, `/auctions/live/:id` — AuctionLivePage
- `/escrow-vault`, `/escrow-vault/:id` — EscrowVaultPortal
- `/terms`, `/privacy`, `/contact`, `/about` — Legal/info pages
- `/ghost-checker` — GhostCheckerInfo
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` — Auth pages
- All navigation links verified: ✓

### Buyer (logged-in `user` role)
- All guest routes + `/dashboard`, `/profile`, `/payments`, `/chat` + `/:threadId`, `/notifications`, `/favorites`, `/escrow/:id`, `/disputes` + `/:id`
- Navigation: desktop navbar (Home, Gallery, Auctions, Ghost Check), user dropdown (Profile, Dashboard, Saved Cars), mobile bottom nav, mobile menu (Notifications, Payments, Messages, Disputes)
- All links verified: ✓
- Escrow visible but backend gated to `individual_seller` only — frontend correctly shows the page

### Seller (`dealer` / `individual_seller`)
- All buyer routes + `/dealer`, `/dealer/onboarding`, `/dealer/setup`, `/dealer/add-car`, `/dealer/edit-car/:id` + `/dealer/edit/:id`, `/dealer/auction-setup` + `/dealer/auctions`, `/dealer/analytics`, `/dealer/settlement`, `/dealer/team`, `/dealer/activity-log`, `/dealer/settings`, `/dealer/choose-plan`
- DealerSidebar: 8 links (Dashboard, Add Listing, Auction Setup, Analytics, Settlement, Team, Activity Log, Settings) + conditional Onboarding
- All links verified: ✓

### Staff (`admin`, `superadmin`, `moderator`, `escrow_officer`, `ghost_checker`, etc.)
- 33 admin routes all resolve to existing components
- AdminSidebar: 23 links dynamically filtered by `permissions.ts` role/permission checks
- `SecureAdmin` wrapper enforces per-page role/permission gates
- Unapproved sellers can now navigate to `/dealer/onboarding` directly

### Inspector (`ghost_checker`)
- `/inspector/apply`, `/inspector`, `/inspector/dashboard`
- Also has access to `/admin/inspections` and `/admin/ntsa-queue` via permissions
- All links verified: ✓

---

## Verification Summary

| Check | Result |
|-------|--------|
| All lazy imports resolve to files | ✅ 76/76 |
| No orphan route-level pages | ✅ |
| No navigation links to non-existent routes | ✅ |
| No redirect loops | ✅ |
| `PAGE_PERMISSIONS` covers all admin routes | ✅ (4 added) |
| `ADMIN_PAGE_ROLES` covers all admin routes | ✅ (5 added) |
| Dynamic admin route permission enforcement | ✅ (parentPath fallback) |
| `getPostAuthPath` sends unapproved sellers to onboarding | ✅ (fixed) |
