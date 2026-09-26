# KAYAD Inventory UI Alignment — 2026-09-26

## Purpose

This correction pass addresses the first end-to-end certification failure introduced by the Inventory Premium Refinement. It aligns the implementation, its admin presentation controls, and its regression tests without adding product features or changing vehicle business logic.

## Findings

The production TypeScript check and Vite build passed, and the local runtime/architecture gates had not yet been reached because the Vitest suite stopped on seven `VehicleMarketplace` regressions.

The failures were presentation-contract mismatches:

1. The redesigned inventory replaced the established `Vehicle Inventory` heading with `Browse N vehicles`, while existing regression coverage still relies on the canonical inventory heading.
2. The default full-width inventory now intentionally uses the five-column admin presentation, so the old `xl:grid-cols-3` assertion no longer described the actual default.
3. The active page-size control correctly changed to the hero-aligned navy token `#0B1D3A`, while the regression assertion still expected the retired `#1E3063` token.
4. The toolbar lacked an explicit `Show` label, reducing discoverability and breaking the established toolbar contract.
5. The admin panel contains two legitimate `OFF` states (inventory sidebar and escrow mode), so an unscoped `getByText('OFF')` test became ambiguous.

## Corrections

- Restored the clear `Vehicle Inventory` heading while retaining the live vehicle count as a compact status badge.
- Added an explicit `Show` label to the existing page-size control.
- Added stable `data-testid`, `data-view-mode`, and `data-columns` attributes to the existing inventory grid for deterministic regression coverage without depending on responsive CSS class implementation details.
- Updated the regression contract to validate the intended five-column full-width default.
- Updated the page-size color assertion to the canonical navy hero token.
- Updated the escrow regression to target the actual Escrow Live Mode button by role/name rather than a globally ambiguous `OFF` text node.
- Added an explicit accessible name to the existing escrow toggle.

## Scope

Presentation, accessibility, and regression alignment only. No vehicle data model, filtering rules, API contracts, payment/escrow business rules, auction behavior, or new product feature was introduced.
