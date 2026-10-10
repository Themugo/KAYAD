# KAYAD Responsive Marketplace Controls Fix — 2026-09-26

## Scope
Responsive hardening only for the marketplace inventory header and controls. No business logic, API contract, filtering semantics, inventory data, or admin behavior was changed.

## Corrected controls
- Marketplace inventory header now stacks cleanly on narrow screens.
- Show 12 / 24 / 48 becomes a full-width usable control row on mobile and returns to compact inline layout at `sm`.
- Sort select becomes full-width on narrow screens and keeps its native value visible without horizontal overflow.
- 3× / 4× / 5× grid controls become an equal-width responsive control row on narrow screens and compact buttons on wider screens.
- Grid/List controls become full-width on narrow screens with equal-width buttons.
- Existing 3/4/5 state binding is unchanged.
- Existing container-query inventory grid behavior is unchanged.
- Inventory grid is explicitly `min-width: 0` and `width: 100%` to prevent flex/grid overflow.

## Regression protection
The existing 3/4/5, sidebar, toolbar, admin persistence, and escrow tests remain the authority. The duplicate `sidebarHeading` declaration introduced during the previous test alignment is removed.
