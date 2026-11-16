# KAYAD Admin & Dealer Page-Journey Navigation Audit

**Date:** 14 November 2026  
**Baseline:** `KAYAD-PAGE-JOURNEY-NAVIGATION-2026-11-14.zip`  
**Scope:** All standalone admin route pages, standalone dealer route pages, shared page-journey controls, and history behaviour contracts.  
**Safety:** No route paths, role definitions, permission grants, backend APIs, database records, migrations, payment operations, deployments, commits or pushes were changed.

## Findings and repairs

1. **Standalone admin pages did not inherit the shared navigation strip.** The public/AppInner shell renders `PageJourneyNavigation`, but standalone `/admin/*` routes return through `AdminRouteSurface` before reaching that shell. The canonical `AdminLayout` now mounts the shared page-journey navigation above all specialist page content. This covers all **52 registered standalone admin routes**, including `/admin` and `/admin/dashboard` command-centre entry points.
2. **Standalone dealer routes did not inherit the shared navigation strip.** Five direct dealer route branches (`/dealer/setup`, `/dealer/onboarding`, `/dealer/auction-setup`, `/dealer/auction-operations`, and `/dealer/auction-operations/:caseId`) now use a common `DealerJourneySurface` wrapper. The main dealer dashboard remains covered by the existing AppInner navigation.
3. **Direct-entry Previous action had a public-home fallback even inside private workspaces.** The shared component now accepts a fallback destination. Admin uses `/admin`; standalone dealer pages use `/?nav=dealer-dashboard`; public surfaces retain `/`.
4. **Forward-history branch handling.** The shared control uses React Router's navigation type and history index. A new PUSH/REPLACE resets the furthest known forward index, preventing a stale Next control after the user goes Back and then opens a different page. POP navigation preserves the known forward range.
5. **Recent page tabs across standalone shell remounts.** Recent tabs are held in module-level in-memory state so they survive switching between standalone dealer route shells without writing private route labels to browser storage. Tabs remain horizontally scrollable on narrow screens and expose a labelled tablist.

## Page coverage

| Surface | Coverage | Navigation placement | Direct-entry fallback |
|---|---:|---|---|
| Admin command centre and specialist routes | 52 registered routes | Canonical `AdminLayout` | `/admin` |
| Standalone dealer routes | 5 route branches | `DealerJourneySurface` | `/?nav=dealer-dashboard` |
| Dealer dashboard in AppInner | Existing shared shell | AppInner main content | `/` in shared navigation (dealer dashboard navigation remains in existing shell) |

## Source-level validation

Passed:
- `validate:admin-dealer-page-journey-navigation` — confirms all 52 admin route registrations inherit the canonical shell, all 5 standalone dealer route branches are wrapped, direct-entry fallbacks are role-appropriate, history controls and branch reset are present, and mobile tabs scroll horizontally.
- `validate:admin-route-convergence` — 14/14.
- `validate:admin-navigation-page-coverage` — 34/34 destinations.
- `validate:navigation-convergence` — 43/43.

## Verification limits

This pass establishes source-level route coverage and navigation contracts. A full Vite production build, TypeScript project check, React component test run, and real browser Back/Forward interaction pass at mobile and desktop breakpoints were not executed because project dependencies are not installed in this environment. These remain release gates; the source validators are not substitutes for browser runtime testing.

No database, payment, refund, production, or deployment operation was performed.
