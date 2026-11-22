# 06 - Dark mode

**Status: NOT IMPLEMENTED (deliberate, with evidence). OWNER DECISION REQUIRED for scope and for the dark logo.**

The brief asks for a coherent theme with no hard-coded colour breaking it. Re-measured on 0400502 + this phase's changes:

| Measure | Value |
|---|---|
| Hard-coded hex colour literals in `.tsx`/`.jsx` | 11,237 in 347 files |
| of which in admin pages/components | 76 files |
| CSS rules for `.dark` or `[data-theme="dark"]` | 0 |
| Mounted theme provider in `main.tsx` / `App.tsx` | none (`ThemeContext`, `ThemeToggle`, `DarkModeToggle`, `ThemeSettings` exist, unused) |

Setting `class="dark"` today changes nothing (verified last phase: identical light UI on home, personal, dealer, admin). Adding token overrides plus a toggle now would produce a **half-dark** interface (dark shell, light cards/tables/forms/charts with inline hex), which is the exact failure the brief forbids, and it would reach the approved homepage. A partial dark theme was therefore not shipped.

## What is ready
- Token values and measured contrast ratios: `BRAND-ADMIN-CONSOLIDATION-20261122/14-DARK-MODE-ASSESSMENT-AND-PROPOSAL.md` (page `#071E27`, surface `#0D2D38`, ink `#E6F2F0` 14.97:1, focus ring `#2DD4BF`, etc.).
- `ThemeContext` already persists the choice (server preference API) and follows the system setting.
- Dark logo asset (`kayard-ke-logo-dark.png`): derived, **not approved**; light logo remains everywhere.

## Staged plan (each stage independently shippable and testable)
1. Owner decides scope: admin only / all workspaces / including the homepage; approves token values and the dark logo.
2. Replace literal hex by existing `--kayad-*` tokens in shared primitives (buttons, inputs, cards, badges, dialogs, tables, chart palette) - mechanical, tested with the existing component suites.
3. Admin workspace first (76 files), mount the provider in the admin shell only, add one toggle, `system` default.
4. Screenshot every admin route in light and dark at 360/768/1440, run axe contrast on each, add a unit test that fails if a new literal hex appears in a themed file.
5. Dealer and personal workspaces, then (only with approval) public pages.

Tests required before claiming support: initial load, switch, route change, refresh, modals, forms, tables, charts, mobile nav, persistence. None executed: NOT TESTED because nothing is implemented.
