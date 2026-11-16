# KAYAD Admin Dashboard — End-to-End Audit & Synchronization Pass

**Date:** 16 November 2026  
**Scope:** Existing authenticated admin command centre, shared admin shell, sidebar alert indicator, route registry and existing dashboard data/control-plane APIs.  
**Baseline:** `KAYAD-featured-campaign-governance-pass2.zip` supplied in the preceding work.  
**Change policy:** Extend existing systems. No duplicate dashboard, API, permission model, or database tables introduced.

## 1. Canonical dashboard finding

The live `/admin` and `/admin/dashboard` routes are mounted by `src/components/admin/AdminRouteSurface.tsx` as `AdminCommandCentre`, which renders `src/features/AdminView.tsx` inside the canonical `AdminLayout` and `AdminSidebar`.

`src/pages/admin/AdminDashboard.jsx` is a separate legacy dashboard implementation and is not the current `/admin` route target. It was deliberately not substituted or deleted. This avoids two competing dashboard experiences and preserves compatibility with existing source references.

## 2. Existing data and operational contracts

The command centre already reads the existing sources:

- `adminAPI.stats()` → `/api/admin/stats` for platform and queue counts.
- `adminAPI.users(...)` → `/api/admin/users` for the current user sample and pending-dealer preview.
- `adminAPI.cars(...)` → `/api/admin/cars` for vehicle submissions and auction preview.
- `adminAPI.getAuditLog(...)` → the existing admin audit endpoint for recent activity.
- `AdminSystemHealthPanel` → its existing infrastructure-health source; infrastructure status is not inferred from marketplace counts.
- `adminAPI.alerts(...)` in the sidebar → unread admin alert count.

The `/api/admin/stats` handler uses independent settled metric reads. Failed source metrics are returned as unavailable (`null`) and listed in `unavailable`; a real zero remains zero. The dashboard retains that contract and does not manufacture values.

## 3. Changes made

### Command centre data synchronization

- Added a 60-second automatic refresh using the existing admin APIs.
- Pauses polling while the browser tab is hidden; refreshes when the tab becomes visible or receives focus.
- Added a visible Pause/Resume auto-sync control and kept manual Refresh and Retry.
- Displays the last checked time in `Africa/Nairobi` (EAT).
- Added an authenticated subscription to the existing `controlPlaneUpdated` Socket.IO room for `admin` and `superadmin`, the roles admitted by `backend/server.js` for the `admins` room.
- Existing server-side admin mutations that broadcast `controlPlaneUpdated` now trigger a dashboard refresh. The 60-second refresh remains the fallback if realtime is disconnected.
- Socket channel listeners are removed on cleanup.
- User, vehicle, and audit API requests are skipped when the dashboard's existing route-permission mirror says the user cannot open those destinations; their data is reported as restricted rather than as an outage.
- Existing approval-workflow links are filtered through the same `canOpen` check.

### Sidebar alert synchronization

- The unread alert count now refreshes every 60 seconds and when the tab becomes visible.
- It listens for the existing `adminAlert` and `controlPlaneUpdated` events when the realtime transport is connected.
- If the alert request fails, the last verified count is retained; a network failure is not shown as zero alerts.
- The sidebar's existing role-filtered navigation, collapse behavior, mobile drawer, and pinned settings entry are retained.

### Test coverage added

- Added `scripts/validate-admin-command-centre-live-sync.mjs` with source-contract checks for polling, visibility handling, realtime subscription and role restrictions, manual controls, timestamps, permission-aware requests, sidebar alert refresh and cleanup.
- Updated `src/__tests__/features/adminCommandCentre.test.tsx` to mock the existing SocketContext and test the visible auto-sync controls and timestamp state.
- Updated `src/__tests__/components/admin/AdminSidebarOrganization.test.tsx` to mock the shared SocketContext used by the sidebar while preserving its real navigation/permission assertions.

## 4. Validation results

### Passed

- New live-sync validator: **20/20**.
- Existing admin dashboard mobile validator: **17/17**.
- Admin navigation/page coverage: **34/34**.
- Admin route convergence: **14/14**.
- Admin control-plane end-to-end source validator: **11/11**.
- Admin control-room end-to-end validator: **18/18**.
- Admin users surface validator: **10/10**.
- Additional admin validators across ads, auctions, bids, chat, dealer verification, escrow, feedback, inspections, listings, market data, mobile shell, NTSA, referrals, reports, reviews, security log, sellers, settings, staff, permissions, support, and transactions were also executed.

Across the 37 admin validator files, 33 passed and four failed. The same four failures were reproduced against the untouched clean source ZIP, so they are **pre-existing baseline failures**, not introduced by this pass:

1. `validate-admin-broadcast-end-to-end.mjs` — dealer audience does not include individual sellers.
2. `validate-admin-inspector-applications.mjs` — 32/34 checks; two existing source-contract expectations fail.
3. `validate-admin-moderation-page.mjs` — 13/14 checks; prior records retention after refresh error fails.
4. `validate-admin-settings-logo-flow.mjs` — expected logo upload FormData field contract fails.

### Build/test limitation

- `tsc --noEmit` was attempted. It cannot complete because root and backend `node_modules` are absent; the output contains missing React, React Router, Vitest, testing-library and other package/type declarations. No dashboard-specific diagnostic was emitted beyond missing packages/JSX runtime.
- The two changed TSX files were independently transpiled with the globally installed TypeScript compiler; both reported **TSX syntax OK**.
- Vitest/Jest, browser/device E2E, live database, realtime socket authentication, and live infrastructure/payment-provider certification were not run. Those require installed dependencies and configured environments.

## 5. Deliberately unchanged

- Existing specialist admin pages and their domain-specific APIs/actions.
- Existing route URLs and sidebar destinations.
- Existing role/permission definitions and server authorization rules.
- Existing admin stats endpoint and its partial-source/unavailable contract.
- Existing control-plane schema, Socket.IO room, audit event broadcasts, and alert API.
- Legacy `AdminDashboard.jsx` remains in place but is not promoted as a second live dashboard.

## 6. Remaining system-level items

This pass synchronizes the canonical dashboard and sidebar with the existing admin data and control-plane events. It does not claim every specialist page is a realtime client: most specialist pages continue to use their own existing fetch/refresh behavior. Their actions and access remain governed by their own backend APIs and permissions. Full browser certification and a dependency-backed build/test run remain necessary before production release.
