# KAYAD Homepage / Inventory Wholesale Fix — 2026-09-26

Foundation: `KAYAD-HOMEPAGE-INVENTORY-WHOLESALE-ALIGNMENT-20260926.zip`

## Scope

This pass addresses the complete interaction surface identified after the previous UI alignment work. It is intentionally a consolidated correction rather than a sequence of isolated test patches.

### Corrected

- 3/4/5 inventory column selection now uses a dedicated responsive CSS contract with a runtime CSS variable, eliminating reliance on dynamically assembled utility classes.
- Mobile/tablet/desktop grid fallbacks are explicit and deterministic.
- Filter option lists are sourced from the union of the initial inventory snapshot and the latest paginated server result, preventing filter options from disappearing merely because the current server page changed.
- Corrected the Body Style option memo dependency so it tracks the actual option source.
- Added stable accessible labels to hero, desktop sidebar and mobile filter selectors.
- Added browser-level Playwright coverage for the actual rendered grid, sidebar dropdowns, sorting, page size, grid/list switching and mobile filters.
- Existing business/backend contracts are unchanged.

## Explicitly preserved

- Required desktop filter sidebar.
- Existing 3/4/5 visitor controls.
- Existing grid/list modes.
- Existing page-size controls.
- Existing server-authoritative vehicle queries.
- Existing admin presentation controls.
- Existing mobile filter drawer.
- No new marketplace business features.

## Responsive contract

The 3/4/5 selector is now available anywhere the inventory toolbar is usable. The inventory grid uses:

- under 640px: 1 column
- 640px–767px: 2 columns
- 768px and above: the selected 3/4/5 columns

This prevents a visible control from silently having no effect at tablet widths.
