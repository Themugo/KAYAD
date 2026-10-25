# KAYAD Super Admin — Responsive and Accessibility Report

Chromium via Playwright, labelled fixtures (not production), final build of 2026-10-25, 49 routes × 12 scenario/viewport sets = 588 captures.

## Responsive
| Viewport | Role | Result |
|---|---|---|
| 1920×1080, 1440×900, 1280×800 | desktop | no page-level horizontal overflow on any route; sidebar persistent |
| 768×1024 | tablet | no page overflow; studio sub-navigation stacks above content below 900 px |
| 390×844, 360×740 | phone | no page overflow; navigation is an off-canvas drawer; dense tables scroll **inside** keyboard-focusable regions; 3–6-column stat grids collapse to 3 then 2 columns; fixed two-column forms become one column |

`hOverflowPage` is false on all 588 captures. A few inner elements report scroll overflow by design (data tables inside scroll regions). Four Governance phone captures overflowed by 3 px before the final CSS pass and no longer do.

## Accessibility (automated and scripted — not a conformance claim)
| Check | Result |
|---|---|
| axe-core, tags wcag2a, wcag2aa, wcag21a, wcag21aa | **0 violations** on 98 runs (49 routes × 1440, 390) after SA-052 |
| Controls without an accessible name | 0 on all 588 captures (icon-only buttons, select fields, checkboxes, table scroll regions labelled) |
| Visible keyboard focus | 98/98 runs; focus-visible rules cover buttons, links, inputs, selects, textareas and `[tabindex]` |
| Mobile navigation by keyboard | open → focus inside → Escape closes → focus returns (49/49 at 390 px) |
| Closed drawer reachable by Tab | none (SA-053) |
| Landmarks | one `main` (nested `<main>` removed from 16 studio pages), labelled breadcrumb `nav` |
| Contrast tokens | muted content `#586579` on light canvas; white on `#176B87`/`#0A3340`; warning/danger tokens darkened (`#b91c1c` etc.). The harness's own low-contrast heuristic still flags gradient-backed text (hero identity mark, two dark gradient headings); axe, which resolves the real backgrounds, reports none, so those are treated as heuristic false positives. |
| Truthful status | no green/"operational" claim without data; unavailable values use a neutral "Unavailable" with screen-reader text |

## Not tested
Screen readers (NVDA, JAWS, VoiceOver, TalkBack), Firefox/Safari, physical devices, high-contrast/forced-colours mode, zoom to 400 %, voice control. Automated tools find only part of the real accessibility issues.
