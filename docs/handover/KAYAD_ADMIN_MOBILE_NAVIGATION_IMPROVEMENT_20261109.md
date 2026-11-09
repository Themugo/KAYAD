# KAYAD Admin Mobile Navigation & Dashboard Improvement

**Date:** 9 November 2026  
**Base:** `KAYAD-UNIFIED-ACCOUNT-PROVIDER-ONBOARDING-REMEDIATION-1109.zip`  
**Scope:** Existing authenticated admin shell, sidebar drawer, document scroll ownership and command-centre mobile presentation.  
**Safety:** No routes, roles, permission tables, APIs, backend records, accounts, database migrations, deployments, commits or pushes were changed.

## Implementation summary

### 1. Drawer touch scrolling and pinned footer

Updated `src/styles/kayad-admin-shell.css`:
- Sidebar navigation is now a bounded flex child with `min-height: 0`, `flex: 1 1 0%`, `overflow-y: auto` and `min-width: 0`.
- Added `-webkit-overflow-scrolling: touch`, `touch-action: pan-y` and `overscroll-behavior-y: contain`.
- Header, alert strip and footer are non-shrinking; the footer remains pinned outside the scrollable navigation list.
- Added safe-area-aware footer padding for mobile devices.
- Drawer sizing follows the dynamic viewport height with `100vh` fallback and `100dvh` support.

No navigation destinations or route definitions were removed or renamed.

### 2. One vertical page-scroll owner

Updated `src/components/admin/AdminLayout.tsx` and shell CSS:
- The document/window is now the only vertical scroll owner for both mobile and desktop.
- `.kayad-admin-shell__content` no longer creates a second independent vertical scroll region.
- Per-history-entry scroll restoration is preserved using the React Router location key, but stores/restores only `window.scrollY`.
- Removed the old dual window/content scroll listeners and obsolete content scroll ref.
- Desktop sidebar and header remain sticky; mobile header remains at the top of the document flow/sticky presentation.

This is intended to make long specialist pages behave consistently and remove the previous ambiguity between document and nested content scrolling.

### 3. Focus, modal semantics and scroll-lock cleanup

Updated the canonical sidebar and layout:
- The open mobile drawer is exposed as a labelled modal dialog.
- The background admin main area becomes `inert` while the drawer is open.
- Initial focus moves to the drawer's close control.
- Tab and Shift+Tab are contained within the drawer; Escape closes it.
- Focus returns to the menu trigger after the inert state is removed.
- Body scroll lock restores the exact previous inline `overflow` value instead of unconditionally clearing it.
- Existing backdrop, route-change close behaviour and navigation link destinations are retained.

### 4. Compact mobile command centre

Updated `src/features/admin-command-centre.css`:
- Reduced mobile hero padding, heading scale, identity chip and metadata spacing.
- Kept the Nairobi time and live operational-data status visible.
- Retained all four existing quick actions and their original routes.
- Tightened quick-action panel spacing while keeping two columns.
- Reduced KPI card height and brought the metric grid closer to the hero.
- Preserved the desktop hero layout, image treatment, colours and live data contracts.

### 5. Regression validation

Added:
- `scripts/validate-admin-mobile-shell-scroll.mjs`
- `npm run validate:admin-mobile-shell-scroll`

Updated the admin route-convergence source contract to verify the stronger scroll-lock/focus behaviour rather than the previous fragile implementation.

## Validation results

| Check | Result |
|---|---:|
| New admin shell regression contract | **12/12 PASS** |
| Dashboard mobile source contract | **17/17 PASS** |
| Admin route convergence | **14/14 PASS** |
| Business command-centre phase 04 | **13/13 PASS** |
| Unified onboarding regression | **12/12 PASS** |
| Public navigation convergence | **43/43 PASS** |
| Chromium CSS/layout matrix | **8/8 viewports PASS** |
| ZIP integrity | To be confirmed at packaging |

### Chromium layout matrix

A synthetic browser fixture loaded the actual updated admin shell and dashboard styles with a long navigation list, pinned footer, dashboard hero/KPIs and long-page content. Chromium 144.0.7559.96 was used.

Tested widths/heights:
- 320 × 640
- 360 × 740
- 390 × 844
- 430 × 900
- 768 × 900
- 1024 × 900
- 1366 × 900
- 1440 × 900

At all eight viewports:
- The long navigation list had a scrollable region and could be programmatically scrolled to its final item.
- The pinned footer remained visible within the drawer viewport.
- The document could scroll to the end of long page content.
- The content region computed to `overflow-y: visible`.
- No horizontal document overflow was detected.

Screenshots and measurements are in `docs/handover/admin-mobile-scroll-qa/`.

**Important test limitation:** This is a CSS/layout harness using the actual styles and representative long content. It is not a live authenticated React session, and it does not prove physical Android touch gestures, screen-reader behaviour or real specialist API pages. The existing route/permission source-contract tests passed, but authenticated E2E against a staging API remains outstanding.

## Build and environment blockers

- Project requires Node `>=22.22.2`; this environment provides Node `22.16.0`.
- `node_modules` is absent.
- `npm ci` cannot reach `registry.npmjs.org` in this environment (`EAI_AGAIN`).
- Global `tsc --noEmit` was attempted but cannot resolve React, React Router, Lucide, Vitest and other project dependencies/types. No reliable full typecheck result can be claimed.
- Vitest and production Vite build could not run without dependencies.

## Modified files

1. `src/components/admin/AdminLayout.tsx`
2. `src/components/admin/AdminSidebar.tsx`
3. `src/styles/kayad-admin-shell.css`
4. `src/features/admin-command-centre.css`
5. `scripts/validate-admin-mobile-shell-scroll.mjs` (new)
6. `scripts/validate-admin-route-convergence.mjs`
7. `package.json`
8. `docs/handover/admin-mobile-scroll-qa/` (browser fixture measurements and screenshots)
9. `docs/handover/KAYAD_ADMIN_MOBILE_NAVIGATION_IMPROVEMENT_20261109.md` (this report)

## Release recommendation

The focused source changes and CSS/layout matrix are complete. Keep this as a development candidate until Node `22.22.2+` is available and dependencies can be installed. Then run:
1. Full TypeScript/lint.
2. Vitest suite.
3. Vite production build.
4. Authenticated mobile and desktop browser journeys for `/admin`, `/admin/reports`, `/admin/inspector-applications`, `/admin/staff`, `/admin/settings` and other long specialist pages.
5. Physical Android Chrome touch-scroll, keyboard focus, screen-reader and viewport-resize checks.

No deployment, commit or push was performed.
