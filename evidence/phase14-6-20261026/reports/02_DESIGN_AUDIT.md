# 02 Design audit (canonical entry: src/pages/dealer/dashboard/DealerDashboard.tsx)
Before screenshots: evidence/phase14-6-20261026/screenshots-before-145-source/ (captured from the pristine 14.5 source, 17 views). After: screenshots/ (48 views plus flow states, 3 widths).
Applied in place on the real dashboard (no parallel dashboard, no design-concept numbers/names copied):
| Area | Finding in 14.5 | Change |
|---|---|---|
| Pipeline | Stage label and count joined as small uppercase text "NEW (3)"; 10px action text; leads in test_drive / escrow_started / lost not visible anywhere on this screen | Heading plus separate count badge (accessible name "N leads"), 12px+ action with named control, note stating how many leads are in other stages and that they are in the Leads table |
| Leads table | Raw stage names such as test_drive; fallback stage badge contrast 4.36:1 (axe serious) | Underscores humanised; badge text colour darkened to 4.5:1+ (also the Customers status badge using the same pair) |
| Overview | Unavailable shown as a bare dash | Dash exposed as "Unavailable" to assistive tech; zero still renders as 0 (test added) |
| Inventory | Small thumbnail, status raw text, no timestamp, Edit only | Larger thumbnail, humanised status, "Updated <date>" only when the record carries one, Remove action with confirmation, wrapped layout at 390px |
| Listing form | Photos: "not available in this form yet" | Photo management (see report 09) |
| Settings | Required/read-only distinction implicit | One line stating required fields and that verification is read-only |
| Team | Already has accessible destructive confirmation (14.5) | Unchanged; re-verified in browser |
Not changed: no metrics, staff, calendar or permissions were invented.
