# Executive summary — Super Admin Console finalisation (2026-11-24)

Local disposable stack only. Not production-ready. Nothing committed, pushed, migrated or deployed by Claude in this phase.

## Preserved (Existing and confirmed correct)
Navy/teal showroom hero, Quick Actions in the hero, compact header, continuous collapsible sidebar, mobile drawer, 34 sidebar links with no duplicates. Personal accounts stay free and approval-free; dealer onboarding keeps verification; dealer listings are not KAYARD-reviewed; financial, escrow, payout and ledger logic untouched; no new roles, permissions, fees or approval gates.

## What this phase added
1. **Role-matrix permission test** (journey 29, 114 checks): 10 sensitive read endpoints × anonymous, personal, legacy seller, dealer owner, dealer staff, admin, Super Admin, moderator, hr, marketing, technical_support. Every result matches the server guard. Security-log (VIEW_LOGS) and CMS (staff-only) corrections confirmed; automation any-staff access confirmed as intentional.
2. **UI access mirror corrected** (UI only, no server change): the sidebar and route guard no longer offer a moderator Moderation, Feedback, Broadcast, Dealer Verifications or Support Tickets, all of which the server refuses.
3. **Migration rehearsal**: all three release migrations applied in order on a pre-state database and re-applied (no-ops); RLS proven with a real row; a defence-in-depth `revoke` was added for the three new tables. Production runbook written.
4. **Schema decision matrix** for all 13 gaps, route and feature **ownership matrix**, and a defects-and-corrections register (D1–D12).

## Routes and workflows
- 53/53 routes open for Super Admin at 1440px and 390px; 212 sweep rows with 0 crashes, page errors, error boundaries or overflow.
- 16 of 53 routes have their workflow verified by a journey or test; the rest are PARTIAL, NOT PROVISIONED (8 studios/suspicious bids) or NOT VERIFIED.
- Verified workflows: personal account block/restore, support ticket lifecycle, moderation (hide/restore), reports, feedback, announcement drafts, market data, NTSA queue, role/permission matrix, dashboard counts vs database.
- NOT verified: escrow/transaction actions, auction and inspection admin actions, panic/recovery (not executed), broadcast delivery, settings save/reload per category, hosted behaviour, live e-mail.

## Tests
tsc clean; Vitest 2004 passed / 1 skipped (231 files); Jest 4345 passed / 21 skipped (265 suites + 1 skipped); build ok; DB journeys 38/38; browser 56/56 at 7 widths; sweep 212 rows clean. Details, flakes and environment limits: `TEST-RESULTS.md`.

## Open
Hosted migrations (separate approval), commit of this phase's local changes, hosted verification, owner decisions on the 8 unprovisioned features and the moderator route guard. See `UNRESOLVED-ISSUES-AND-RELEASE-GATES.md`.
