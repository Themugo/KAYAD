# Responsive and accessibility audit (dealer workspace)

**This is a measured audit of specific properties in a real browser. It is not an accessibility certification.** A full WCAG audit (screen-reader testing, contrast measurement, reduced-motion review) was not performed.

Method: Playwright (Chromium) against the running app and a disposable backend, signed in as a seeded dealer with active, paused, draft and sold listings, a lead and a pending team invite. Script: `evidence/dealer-completion-responsive.cjs`; raw data: `evidence/dealer-completion-responsive.json`; screenshots: `screenshots/` (68 images).

Viewports: 1920×1080, 1440×900, 1280×800, 1024×768, 768×1024, 430×932, 390×844, 375×812, 360×800.
Sections captured at each: Overview, Inventory, Leads, Customers, Team, Banking, Settings (63 page captures) plus the open drawer at the five widths below 1024.

## Results (final run, after the last code change)
| Check | Result |
|---|---|
| Sign out inside the viewport (desktop widths, 28 captures) | **all 28 pass** |
| Mobile / tablet drawer (768, 430, 390, 375, 360): opens, focus moves inside, Escape closes, focus returns to the menu button, Sign out reachable, body scroll locked | **pass at all 5 widths** |
| Horizontal page overflow | **none** in 63 captures |
| Interactive controls without an accessible name | **0** |
| Visible form fields without a label | **0** |
| Duplicate element ids | **0** |
| Images without `alt` | **0** |
| One `<h1>` per page; `lang="en"` | yes |
| Targets smaller than 24×24 px (WCAG 2.2 minimum) | **0** after fixes (see below) |
| Browser console errors during the run | **none** |

## Defects found and fixed in this phase
1. **Sign out below the fold on some loads** (regression of the earlier sidebar fix): the height measurement captured the root element once, but that element can be replaced after the loading state, so it measured a detached node. It now reads the current root each time.
2. Two controls under 24 px: the "Sold vehicles" disclosure (20 px) and the header Back / Forward buttons (23 px when the header was squeezed).
3. Status words were inconsistent ("Published / Pending review" on tiles and the filter vs "Active / Under review" on rows). One vocabulary now, plus a Paused tile and filter.

## Known gaps (not claimed)
* Sign out is 38 px tall: above the 24 px minimum but under the 44 px comfort target used elsewhere in the app.
* Dark mode and the dark logo variant were **not captured** (NOT TESTED).
* Colour-contrast ratios were not measured; status is shown with text and a dot, never colour alone (visual review only).
* Screen-reader behaviour (announcements of pause / publish notices) was not tested with a screen reader; the notices use live regions / `role="alert"` for errors.
* Reduced-motion behaviour was not tested.
* Staff workspace (`DealershipWorkspace`) was not re-captured.
