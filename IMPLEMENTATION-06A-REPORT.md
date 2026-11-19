# KAYARD KE — Implementation 06A Report
## Inventory layout audit and 4-column selector correction

**Baseline:** `KAYARD-KE-MASTER-IMPLEMENTATION-05B-FILTER-PANEL-POLISH-20261119.zip`  
**Scope:** Public homepage inventory workspace, grid/list presentation, responsive column selector and inventory query-state regression.  
**Date:** 19 November 2026

## 1. Audit findings

The inventory already used one canonical server-backed query and one live inventory renderer. The 3/4/5 selector updated `gridColumns`, and the grid exposed the selected value through `data-columns`. The issue was in the responsive presentation contract rather than a separate API or data path.

Findings:

1. The inventory grid used container-query rules. Three columns activated at a 680px result-container width, while four columns had no matching rule until 860px. Between 680px and 859px, selecting four fell through to the default two-column layout. The UI state changed, but the visible layout did not honour it.
2. The 3/4/5 control used `md:flex`, so it appeared at tablet widths from 768px. The tablet stylesheet independently enforced a two-column grid from 640px through 1023px. This exposed desktop-only choices on a surface that intentionally uses a fixed responsive two-column layout.
3. The 4-column regression test asserted React state/DOM attributes and the inline custom property, but did not assert the CSS container-query rule that determines the visible number of columns. It therefore passed while the actual layout could still fall back to two columns.
4. The pagination-reset effect omitted `selectedColor`, even though colour is part of the server query. Changing colour from a later results page could leave the shopper on an inappropriate page number.
5. The `selectedColor` dependency appeared twice in the server-query memo dependency list. It was harmless but redundant.
6. Grid-column and pagination buttons did not explicitly declare `type="button"`. They were not currently inside a form, but explicit button types avoid accidental submit behaviour if the layout is later wrapped by a form.

## 2. Implemented corrections

### 3/4/5 desktop grid behaviour
- Added an explicit four-column container-query rule from 680px of actual inventory result width.
- At that width, selecting four now produces four equal, shrink-safe columns using `minmax(0, 1fr)`.
- The five-column preference continues to use four columns until the result container reaches 1120px, where the existing five-column rule activates. This remains an adaptive maximum-density setting.
- The three-column preference continues to activate from 680px.
- The column selector is now desktop-only (`lg:flex`) so it no longer appears on tablet widths where the layout deliberately remains two columns.
- The selector is also hidden by a container query when the actual result column is narrower than 680px, preventing a visible control from promising a layout the available space cannot honour.

### Inventory query and navigation integrity
- Added `selectedColor` to the pagination-reset effect dependencies so every server-query filter change returns to page one.
- Removed the duplicate `selectedColor` dependency from the server-query memo.
- Added explicit `type="button"` to grid-column and previous/next pagination controls.
- Added a regression test that selects four columns, switches to list, returns to grid, and changes sorting while confirming the four-column selection remains active.
- Strengthened the existing 3/4/5 test to assert the active `aria-pressed` state as well as the React grid attributes.

## 3. Inventory workflow audit

The following existing contracts were inspected and preserved:

- Search keyword is sent as `keyword` in the canonical `getCars` query.
- Make/model use canonical facet matches where available and partial-match query fields otherwise.
- Colour, price, year, body style, fuel, transmission, condition, mileage, seller type, live-auction and dealer scope remain mapped to their existing query fields.
- Sort choices map to the existing server sort contract.
- Page size remains 12, 24 or 48; changing it resets pagination to page one.
- Pagination uses server-reported page totals and does not slice the server-paginated response a second time.
- Grid/list selection remains local presentation state; the selected column preference is retained when switching to list and back to grid.
- Admin-configured default view and column settings continue to seed and update the visitor presentation state through the existing effect.
- Mobile remains a single-column card layout; tablet remains a two-column layout; desktop uses the selected responsive 3/4/5 layout.
- Vehicle counts remain sourced from `serverTotal`, not the number of rendered tiles. Sponsored cards and the live-auction promotional tile do not inflate the vehicle count.
- Existing vehicle card actions, saved/compare interactions, detail navigation, seller contact and featured-vehicle feeds were not changed.

## 4. Files changed

1. `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`
2. `src/index.css`
3. `src/__tests__/components/VehicleMarketplace.test.tsx`
4. `scripts/validate-inventory-layout-06a.mjs`
5. `IMPLEMENTATION-06A-REPORT.md` (this report)

No backend API, database, listing lifecycle, permissions, dealer workflow, dashboard, hero or navigation code was changed.

## 5. Checks actually executed

Passed:
- `scripts/validate-stage5-desktop-marketplace.mjs`: 14/14.
- `scripts/validate-homepage-compact-layout.mjs`: 10/10.
- `scripts/validate-homepage-responsive-polish-20261114.mjs`: 9/9.
- `scripts/validate-marketplace-convergence.mjs`: 17/17.
- `scripts/validate-inventory-layout-06a.mjs`: 9/9.
- TypeScript/JSX syntax transpilation for the modified marketplace component: 0 syntax diagnostics.
- TypeScript/JSX syntax transpilation for the modified marketplace test: 0 syntax diagnostics.
- CSS brace-balance check: pass.

Not executed / not certified:
- Focused Vitest run: unavailable (`vitest: not found`; dependencies are not installed in this extracted environment).
- Full project typecheck: attempted but cannot be certified because project dependencies and type packages are absent (including React, React Router and Vitest). The resulting missing-module diagnostics cascade across the project.
- Production build: unavailable (`vite: not found`).
- Browser-based computed-style and screenshot verification at 1440, 1280, 1024, 768, 390 and 360px: not available without the project dependencies/browser runtime.

The extracted runtime is Node v22.16.0; the project `.node-version` specifies v22.22.2. Install dependencies using the project's specified Node version before final runtime certification.

## 6. Required final runtime verification

After installing dependencies on Node v22.22.2:

1. Run `npm test -- --run src/__tests__/components/VehicleMarketplace.test.tsx`.
2. Run `npm run typecheck`.
3. Run `npm run build`.
4. Use a real browser to inspect 1440, 1280, 1024, 768, 390 and 360px.
5. Confirm 3, 4 and 5 columns visually at widths where the result container can honour each count; confirm the 4-column choice does not fall back to two columns.
6. Confirm the desktop selector is absent on tablet/mobile, tablet remains two columns, and phone remains one column.
7. Confirm switching list/grid, sorting, changing page size, filtering by colour and pagination preserve the expected state and server query behaviour.

## 7. Scope completion

The source correction and static regression checks are complete. Full Vitest, typecheck, production build and browser certification remain pending because the required dependencies/runtime are unavailable in this environment. No unrelated homepage or application workflow was started.
