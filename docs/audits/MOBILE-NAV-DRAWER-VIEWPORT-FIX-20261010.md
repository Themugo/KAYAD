# KAYAD Mobile Navigation Drawer Viewport Fix — 2026-10-10

## Scope
Fix only the mobile navigation drawer shown in the user-provided phone screenshot. Preserve navigation destinations, canonical `navConfig`, auth visibility rules, backend APIs, existing page content, hero visuals, and Messages/authentication behavior.

## Finding
The drawer's inner surface used `max-height: calc(100svh - 78px)` while its scroll region relied on flex growth. With no definite parent height, the scroll region could remain content-sized; the menu ended above the bottom of the phone viewport and exposed the page behind it. The drawer was also anchored using `absolute top-full`, making viewport fit depend on header/containing-block layout.

## Change
- Measure the sticky header's bottom edge and position the single existing drawer as a fixed viewport layer directly below it.
- Recalculate its top offset on resize and orientation changes.
- Give the drawer surface a definite `height: 100%` within the available area and the content region `min-height: 0; flex: 1; overflow-y: auto` so long navigation lists scroll inside the menu.
- Preserve safe-area bottom padding, backdrop, body scroll lock, Escape/focus handling, existing auth guard, and existing navigation configuration.
- No backend, database, API, hero, vehicle data, or authentication changes in this sweep.

## Validation
- `node scripts/validate-mobile-menu-viewport.mjs` — PASS (8/8 source-contract checks).
- `node scripts/validate-navigation-convergence.mjs` — PASS (43/43).
- `node scripts/validate-chat-notification-routing.mjs` — PASS.
- `node scripts/validate-chat-surface-convergence.mjs` — PASS.
- Full TypeScript/build/browser-device validation was not run in this environment; test on a real phone at 320–430px widths before deployment.
