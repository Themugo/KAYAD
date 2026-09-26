# KAYAD Inventory Full-Width + Filter Sidebar Fix

Date: 2026-09-26

## Observed UI regressions
- The desktop inventory filter sidebar was collapsed by default, so the left filter panel disappeared.
- The marketplace page was still rendered inside the global `max-w-7xl` application shell, leaving large side margins on wide screens.
- The loading skeleton grid was hard-coded to three columns and therefore did not match the configured five-column inventory presentation.

## Consolidated corrections
1. Marketplace and Saved Vehicles routes now use a full-width application shell; other application modules retain the existing constrained workspace.
2. Inventory presentation defaults to a visible desktop filter sidebar while retaining the existing visitor toggle to collapse it.
3. Existing persisted inventory configurations continue to be respected: an explicitly saved `showSidebar: false` remains collapsed.
4. Inventory loading skeletons now receive the active 3/4/5-column setting and use matching responsive breakpoints.
5. Existing vehicle data, filtering logic, pagination, sorting, ads, auctions, escrow behavior, admin controls, and APIs were not changed.

## Validation
- TypeScript transpile/syntax checks passed for all changed TS/TSX files in the working environment.
- Full npm certification must still be run on the authoritative Windows Node `22.22.2` environment before committing, using the project's existing certification command.
