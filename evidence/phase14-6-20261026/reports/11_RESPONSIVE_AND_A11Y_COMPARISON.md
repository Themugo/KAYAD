# 11 Responsive and accessibility comparison
Widths: 1280, 768, 390. Before = 14.5 source (screenshots-before-145-source/, 17 views, no axe data captured in that run beyond the 14.5 report). After = 14.6 (screenshots/, 48 views plus photo and removal states).
| Measure | 14.5 | 14.6 |
|---|---|---|
| Horizontal overflow | 0 px | 0 px (a photo grid overflow found and fixed during 14.6) |
| axe serious/critical | 0 on the data shown in 14.5 | 0 across 48 views, after fixing a real color-contrast failure (leads stage badge 4.36:1) that the richer 14.6 mock data exposed |
| Focus visibility | existing | Tab reaches a control with a 3px outline; new buttons carry focus-visible outlines |
| Destructive actions | team removal confirmed | plus photo and listing removal: confirmation group/alertdialog, pending state, failure text, retry |
| Pipeline at 390 | cramped uppercase label with count | heading plus count badge, readable at 390 |
Limits: automated axe covers a subset of WCAG; no screen-reader or manual keyboard-trap audit was done.
