# KAYAD Homepage / Inventory Wholesale Alignment — 2026-09-26

## Scope
Presentation and interaction hardening only. No vehicle data model, filtering rules, payment, escrow, auction, API, or business-rule changes.

## Corrections
- Restored the desktop **Refine inventory** filter panel as a required homepage marketplace surface.
- Normalized old saved homepage configuration so the desktop filter panel is visible after this update.
- Kept the existing mobile filter drawer for small screens.
- Removed the desktop hide/show control so the required filter panel cannot silently disappear again.
- Preserved admin control over the existing inventory presentation modes, desktop column count, and card density.
- Made the visitor 3× / 4× / 5× controls drive explicit responsive grid classes at the `lg` breakpoint so each selection changes the rendered grid immediately.
- Added regression coverage for all three live column selections.
- Increased vehicle-card typography and spacing for compact, standard, and comfortable densities.
- Added a homepage typography system using the existing Plus Jakarta Sans body font and Outfit display font, with stronger hierarchy and readability across headings, inputs, selects, buttons, and cards.
- No new homepage features were introduced.

## Validation performed in this working copy
- Node syntax checks passed for modified backend JavaScript.
- TypeScript transpile/syntax checks passed for modified homepage, admin panel, configuration hook, and regression test files using TypeScript 5.8.3.
- Full dependency-backed Windows certification remains the authoritative final gate because this container runs Node 22.16.0 while the repository requires Node 22.22.2.
