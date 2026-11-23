# Dealer Team Workspace — Permission-Aware Overview

Status: **information model documented BEFORE implementation** (this section is final); implementation and test results are appended below under "Implementation".

## Principle
Team members are personal accounts working inside the existing lightweight team workspace (`?nav=dealership-workspace`: Inventory, Leads, Customers). The owner's command centre is **not** exposed to them. A member sees an **Overview** tab that renders only what the server already returns to them from `GET /api/dealer-platform/command-centre`, which is scoped by the existing permission keys. The overview adds **no new read or write permission**, **no new navigation destination** and **no new table**. Dealership identity is derived server-side from the authenticated membership (re-read on every request); no client-supplied dealership id is accepted.

## What exists and what does not
| Requested item | Supported by current data? | Decision |
|---|---|---|
| Listings requiring their action | Yes (cars: draft, pending approval, hidden) | Shown to roles with listing permissions; links to the Inventory tab |
| Enquiries / unanswered leads / offers awaiting decision | Yes (leads, marketplace_offers) | Shown to roles with `canChatBuyers`; links to the Leads tab |
| Relevant auction activity | Yes (cars, paid bids) | Shown to roles with listing permissions as **information only** (the team workspace has no auctions tab, so no link is invented) |
| Their own recent activity | Partly: `dealer_listing_lifecycle_events` records the acting user for publish, hide, mark-sold | Shown as "Your recent activity", own rows only. Lead stage changes record no actor, so they cannot be attributed |
| **Assigned** enquiries / tasks / outstanding assigned work | **No.** `leads` has no assignee column and there is no task table | **Not supported.** Not faked. Needs a product decision and a migration (proposal below) |
| Banking, payouts, escrow, fees, refunds, settlement | Owner only | Never returned to members and never rendered |
| Team roster / invitations | `canManageTeam` | Not shown in the team workspace (the owner manages team in the owner workspace) |

## Role information model (existing roles, unchanged permissions)
| Role (existing permissions) | Overview tiles | Needs attention (items) | Auction info | Released revenue | Own activity | Workspace tabs today |
|---|---|---|---|---|---|---|
| Manager (list, edit, delete, view earnings, approve deals, chat, settings) | listings, enquiries | new enquiries, unanswered, offers awaiting, listings needing action | yes | **yes** (`canViewEarnings`, revenue figure only) | yes | Inventory, Leads, Customers |
| Sales agent (list, edit, chat) | listings, enquiries | new enquiries, unanswered, offers awaiting, listings needing action | yes | no | yes | Inventory, Leads, Customers |
| Lot agent (list, edit) | listings | listings needing action | yes | no | yes | Inventory |
| Finance officer (view earnings, approve deals) | none | none | no | **yes** (revenue figure only) | no | none today; the overview would be their only tab |
| Viewer (no permissions) | none | none | no | no | no | none; API returns 403 and the existing "no permissions" message stays |
| Custom roles | exactly the sections their permission keys unlock | same rule | same rule | only with `canViewEarnings` | only with listing permissions | derived from keys |

Rules enforced server-side (already in `resolveAccess`): inventory section needs a listing permission; leads/offers need `canChatBuyers`; revenue needs `canViewEarnings`; gross, fees, escrow, payouts, refunds and settlement need the owner; team needs `canManageTeam`.

## Not built (needs approval)
Assignment of enquiries or tasks to members. Proposal (not implemented, no migration written): `leads.assigned_to uuid references users(id)` with an update path restricted to `canChatBuyers` members or the owner, and an RLS-free server-side filter "my assigned" in the existing leads endpoint. This changes data and permissions semantics, so it is a decision for the owner.

## Implementation (phase 2) — status: COMPLETE locally, production NOT TESTED
* `src/features/DealershipWorkspace/TeamOverview.tsx` (new) renders **only** what `GET /api/dealer-platform/command-centre` returns for the caller. The server decides sections from the member's permission keys; the client adds no authority.
* `DealershipWorkspace.tsx`: an **Overview tab inside the existing workspace tablist** (first tab) when the response has content. No new navigation entry, route or permission. While loading and no tab exists, a "Loading your overview…" status is shown; "no permissions" appears only after loading finishes.
* Attention items link to Inventory or Leads only; other items are information only (no dead links for sections a member cannot open).
* "Your recent activity" lists only listing events whose `actor_user_id` equals the authenticated member (server-supplied `actingMember.id`, never a request value). If `dealer_listing_lifecycle_events` is absent (hosted schema lag) the response says `unavailable: [team_activity]` and the UI shows a partial-data note.
* Finance officer: the Overview is their only tab and shows released revenue only (no escrow, payout, refund, fee, bank data).
* Not built: assignment of enquiries/tasks (see above).

Evidence: component tests (12 workspace, 6 new overview), journey 18 (69/69: own-activity-only, ambiguous dual membership fails closed with 403, suspended 403, logout replay 401, revoke-all 401, spoofed `?dealerId` ignored), browser harness (manager, lot agent, finance officer, custom team lead, viewer, removed sales agent: tabs, tiles, no financial wording, UI = API, axe, keyboard, 320/390/1280).
