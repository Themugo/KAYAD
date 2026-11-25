# 06 — Addendum: inventory gaps and full team/permission control (2026-11-25)

## Inventory (Edit vehicle)
| Gap found | Fix |
|---|---|
| "Add photos" looked inactive: the Upload button stayed greyed until a file was chosen, behind a plain browser file input | One always-enabled **Add photos** button (disabled only at the 20-photo limit, with the reason shown); photos upload as soon as they are chosen, with progress, error and retry |
| Edit form could not change body type or features although the server accepts them | Added **Body type** and **Features** (one per line) to create and edit; create now sends features as a real list |
| Controlled `<select>` edits could be lost (value read after React restored it) and an early edit could be overwritten by the mount re-sync | Value read at event time; mount re-sync skipped |
Not added on purpose: VIN, chassis, registration (the server does not allow editing them) and buy/bid/escrow switches (money-adjacent).

## Team and permissions
- **Every role except Basic Staff Access is now editable by the dealership owner**, including Manager, Sales agent, Lot agent, Finance officer and Viewer (name, description, permissions). The change is stored per dealership as an override in `dealer_team_roles` keyed by the built-in key (no migration, no platform default changed). **Reset to default** removes it.
- Saving a role updates everyone in it, **except people whose access the owner adjusted individually**, who keep their own permissions (reported in the confirmation).
- **Per-person control:** staff details now has *Adjust this person's access* (all 8 permissions) and a "Custom access" note when it differs from the role. Uses the existing member endpoint.
- **Basic Staff Access stays fixed** (no permissions) as the safe starting level for every invitation; extra access is given per person or by role. Changing that is an owner decision, not made here.
- Unchanged: only the owner can edit roles; nobody changes their own access; non-owners cannot grant what they do not hold; every change is audited and recorded in employment history.

## Evidence
Typecheck PASS; lint 0 errors; build PASS; backend dealer Jest 25 suites / 402 tests PASS (route-policy test updated 22→23 routes, new built-in role test); full Vitest run after these changes: 2090 passed, 1 failed (stale generated dark-theme file, regenerated, 2/2 pass) — the full suite was not re-run once more afterwards. Real browser (disposable stack) `ci/browser/dealer-inventory-team.mjs`: 10/10 PASS, including a real photo upload, body type/features save, built-in role edit + reset, and the per-person editor. Screen-reader testing NOT VERIFIED.
