# Responsive and accessibility audit (DA-06) — dealer workspace

Method: real Chromium (Playwright) against the dealer workspace served by Vite and the backend on the disposable database; script `evidence/dealer-responsive-after.cjs`, raw data `evidence/dealer-responsive-after.json`, screenshots `screenshots/after/` (overview, inventory, banking at every viewport, plus the open drawer on every viewport below 1024). Before images: `screenshots/before/` and the earlier audit pack (`DEALER-ACCOUNT-20261121/screenshots/responsive/`).

## Result (final run)
| Viewport | Surface | Sidebar box (y) | Sign out | Horizontal overflow |
|---|---|---|---|---|
| 1920×1080 | desktop sidebar | 110–1080 | bottom 1064 ≤ 1080 — in view | none |
| 1440×900 | desktop sidebar | 110–900 | 884 ≤ 900 — in view | none |
| 1280×800 | desktop sidebar | 110–800 | 784 ≤ 800 — in view | none |
| 1024×768 | desktop sidebar | 110–768 | 752 ≤ 768 — in view | none |
| 768×1024, 430×932, 390×844, 375×812, 360×800 | drawer | – | Sign out in viewport; focus moves inside on open; Escape closes; focus returns to the menu button | none |

Before (earlier audit): at 1440×900 the sidebar ended at y=1010 (110 px below the fold, Sign out unreachable without scrolling the page) and the 390-px drawer showed no item after "Operations".

## What changed
* Sidebar height = viewport minus the measured offset of the workspace (layout observer, scroll / resize, and a 400 ms check because the site header can mount late); written as a CSS variable.
* The Account status card is collapsed by default (still one tap away); only the menu list scrolls, the footer with Sign out is fixed.
* Drawer: focus into the drawer, Tab / Shift+Tab trap, Escape, focus back to the trigger, body scroll lock (pre-existing), labelled landmark.
* Touch targets: Sign out and the Account status summary are ≥ 38–44 px high; menu button 44 px.

## Honest limits
* The first and second implementations of the height fix were measured and **failed** at some viewports (the offset was read once, before the header mounted); the final measurement above is the third and is the one that passes. The cause is documented in the code comment.
* At 1024×768 the nav list shows fewer items before scrolling (the remaining items are reachable by scrolling that one list).
* Keyboard operation was verified for the drawer (open, trap, Escape, focus return). A full tab-order and screen-reader pass of every dealer section was not performed (NOT TESTED). Dark mode and the dark logo were not captured (NOT TESTED). Only overview, inventory and banking were captured at all nine viewports.
