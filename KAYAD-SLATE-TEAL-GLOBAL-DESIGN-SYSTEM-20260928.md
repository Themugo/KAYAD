# KAYAD Slate Teal — Global Design System

## Purpose
This package applies the KAYAD Slate Teal visual language as a shared design-system migration rather than a page-by-page recoloring exercise.

## Brand contract
- Deep: `#0A3340`
- Dark: `#12576D`
- Primary: `#176B87`
- Accent: `#13B8A6`
- Muted: `#5AAFA4`
- Soft: `#DDF4F0`
- Surface: `#F6FAF9`
- Border: `#D7E7E4`

## Scope
The migration covers shared brand tokens and the existing product surfaces that consume them, including:
- Global navigation and mobile navigation
- Marketplace and vehicle inventory
- Vehicle detail and gallery surfaces
- Auction surfaces
- Pre-Purchase Inspection surfaces
- Escrow surfaces
- Support surfaces
- Sell Vehicle surfaces
- Sign-in/authentication surfaces
- Dealer, dashboard and admin presentation layers
- Shared buttons, cards, inputs, tabs, tables, drawers, modals and badges
- Shared theme/provider defaults

## Integrity rules
1. Existing routes, data contracts, permissions, state flows and business logic are preserved.
2. Semantic status colors such as success, warning, danger and informational states remain distinct from brand colors.
3. Existing compatibility token names such as `navy`, `gold` and `cream` remain available where application code depends on them, but resolve to the Slate Teal palette.
4. Hero/inventory functionality remains intact, including dynamic vehicle content and existing responsive inventory controls.
5. Tests and test fixtures are not modified as part of the design migration.
