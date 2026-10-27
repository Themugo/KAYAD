# 09 Accessibility and responsive (Order 7)
- 48 dashboard views (overview, inventory, leads, pipeline, team, settings and the error/empty states) at 1280, 768 and 390px: no overflow, no crash, axe reports no violations, keyboard focus outline solid 3px, confirm dialogs receive focus. Same as the 14.6 baseline; the 14.6 improvements are retained.
- Dashboard completeness already present: verification card (e.g. "Pending KAYAD review"), real counts only, 403 and error states with retry, team 403 state. No fabricated metrics.
- Sold listings show an explanatory note instead of a Remove control.
- Calendar: only the admin CMS publishing calendar exists. A dealer/business calendar is a product requirement and is out of scope; nothing was invented.
- Screenshots: evidence/phase14-7-20261026/screenshots (54). Before images are the 14.6 set in the foundation package. Registration/onboarding pages are covered by component tests; they need a live API for browser screenshots.
