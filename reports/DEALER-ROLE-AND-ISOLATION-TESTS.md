# Dealer Command Centre — Role and Isolation Tests (rev 2)

Evidence: disposable local stack only (Postgres `kayad_ci`, PostgREST, local API). Production NOT TESTED.

## Role matrix (API, journey 18, real invite/accept; role matrix unchanged)
`GET /api/dealer-platform/command-centre`

| Role | HTTP | Sections | Financial data |
|---|---|---|---|
| Owner | 200 | all | full |
| Manager | 200 | listings, leads, financial, auctions | released revenue only |
| Sales agent | 200 | listings, leads, auctions | none |
| Lot agent | 200 | listings, auctions | none |
| Finance officer | 200 | financial | released revenue only |
| Viewer (no permissions) | 403 | none | none |
| Custom role | 200 | per permission keys (+team with canManageTeam) | only with canViewEarnings |
| Removed / suspended member | 403 immediately | none | none |
| Anonymous | 401 | | |
| Non-member | 403 | | |

Members never receive escrow, payout, refund, fee, settlement or bank data; owner-only `/api/dealer/*` still returns 403 to members.

## Added in phase 2 (journey 18, 69/69)
* Own-activity feed contains only the authenticated member's events (manager: 3; owner and lot agent excluded).
* Ambiguous dual membership fails closed (403): identity never comes from the request.
* Suspended membership 403; session logout replay 401; revoke-all sessions 401.
* Spoofed `?dealerId`, header and body ids ignored for owner and members; dealership identity always from server-side membership, re-read every request.
* Cross-dealer: dealership B sees only B, empty dealership C sees zeros; member of A cannot read B.
* Financial access: members get 403 on owner financial endpoints; command-centre payload for members has no financial keys beyond released revenue (finance/manager).
* Read-only: row counts of touched tables unchanged after calls.
Journeys 16 (isolation/sessions, 31/31) and 17 (invitations, 39/39) pass.

## Real UI (browser harness 196/196)
Roles checked: manager, lot agent, finance officer, custom team lead, viewer, removed sales agent. Per role: tabs shown, tiles present/absent, no financial wording, UI equals API, axe clean on the team overview, Enter on an attention item opens the right tab, labelled tablist, 320/390/1280 layouts, loading and error states, owner route not shown to members. Owner: 7 widths, UI = API, axe, keyboard, touch targets, empty/error/loading.

## Not tested
Concurrent membership changes during a request; hosted/production sessions; real devices. Custom roles beyond the one fixture are covered by the permission-key rule, not exhaustively.
