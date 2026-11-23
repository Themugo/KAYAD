# Dealer command centre — audit of the existing implementation
2026-11-22 · base: `origin/main` bfe3735 · worktree `/home/claude/p9`, branch `work/dealer-command-centre` (the release-consistency work lives separately in `/home/claude/p8`, uncommitted; v2/v3 packages untouched). Read-only audit; nothing committed, pushed, merged or deployed.

## 1. What exists (verified by reading code and the disposable database schema)
| Area | Frontend | API | Records | State |
|---|---|---|---|---|
| Overview | `DealerDashboard.tsx` overview: banner, 4 stat cards, lead pipeline, inventory performance, recent lead activity, quick actions | `GET /api/dealer-platform/dashboard` (`getDealerDashboard`, needs `canViewEarnings`) | cars, leads, escrows | Real data. **Revenue = escrows with status `released` only (`sellerAmount`).** No offers, auctions, payouts, attention queue or team activity. |
| Sidebar / navigation | `DEALER_NAV_GROUPS` (Overview · Operations · Business management); Team and Banking each appear **once** (Business management) and Settings says so | URL `?nav=dealer-dashboard&section=` | — | Polished; keep as is. |
| Listings | Inventory section, listing form, photos, pause/sold | `/inventory`, `/cars` | `cars` (`status` available/pending/reserved/hidden/draft/sold, `approved`, `sold`, `deleted_at`) | Works. |
| Leads | Leads + Pipeline + Customers | `/leads`, `/pipeline`, `/customers` | `leads` (stage new…lost, `archived`, `first_response_time`) | Works. |
| Offers | negotiation inside leads (`marketplace_offers`, `marketplace_offer_settlements`) | lead offer routes | `marketplace_offers` (`pending/accepted/rejected/withdrawn/countered/expired`), settlements (`awaiting_payment/paid/cancelled/lapsed`) | Works per lead; **no dealer-wide count of offers awaiting a decision.** |
| Auctions | Auctions section; Auction operations/case pages | `/dealer-platform/auctions` (cars), `/api/auctions/operations` (organizer cases) | `cars.auction_status/current_bid/bids_count`, `bids`, `auction_setups`, `auction_outcomes` | Works. The API stat `totalRevenue` = Σ `currentBid` of ended auctions — a bid is not revenue (the UI does not display it; see §3). |
| Team | `DealerTeamPanel`, invite page | `/team*` (`canManageTeam`) | `dealer_teams` (`invited/active/suspended/removed`), `dealer_team_roles` | Works; audit events `dealer_team_*` exist. |
| Banking/payouts | `DealerBankingPanel`, collection account | `/api/dealer/settlement`, `/payouts/:escrowId/initiate` | `dealer_payouts` (`pending/processing/paid/failed/cancelled`) | Works; **no payout totals shown anywhere.** |
| Escrow/settlement | Escrow section | `/api/dealer/escrows` (owner only) | `escrows`, `payments`, `refunds` | Works; no totals. |
| Financial reporting | Analytics section | `/api/dealer/earnings`, `/summary`, `/analytics` | payments | **`/earnings` and `/summary.totalRevenue` add up `payments.dealer_amount` for every successful payment — including money still held in escrow.** Conflicts with the overview's revenue figure. |
| Role permissions | — | `dealerWorkspaceAccess` (delegation, re-reads membership every request), `dealerOrgAccess`, `dealerBusinessOnly` | `DEALER_TEAM_PERMISSIONS` (8 keys) | Built-in roles: manager, sales_agent, lot_agent, finance_officer, viewer, plus custom roles. |

## 2. Role matrix as implemented (must not widen)
| Role | Permissions |
|---|---|
| Owner (`dealer`) | all; passes every guard |
| manager | listCars, editCars, deleteCars, viewEarnings, approveDeals, chatBuyers, editSettings |
| sales_agent | listCars, editCars, chatBuyers |
| lot_agent | listCars, editCars |
| finance_officer | viewEarnings, approveDeals |
| viewer | none ("Read-only; no actions" but no read permission either) |
| custom roles | any subset of the 8 keys |
Existing route guards worth noting: `/dashboard`, `/analytics` → `canViewEarnings`; `/inventory`, `/auctions`, `/inspections` → `canListCars` or `canEditCars`; `/leads`, `/pipeline`, `/customers` → `canChatBuyers`; `/team*` → `canManageTeam`; **`/api/dealer/*` (escrows, payouts, earnings, bids, settlement) are owner-only** (`dealerOnly`).

## 3. Gaps and defects found
1. **Role gap (functional):** the overview depends on `/dashboard`, which needs `canViewEarnings`. A sales agent, lot agent or any custom role without earnings sees an error banner on their landing page instead of the data they are allowed to see. Viewer has no access at all (existing behaviour; not changed).
2. **Revenue definitions conflict:** overview and Analytics count `released` escrows only (miss `closed`, which only follows `released`; Analytics also falls back to the gross `amount` when `sellerAmount` is empty); `/earnings` and `/summary` count payments incl. held escrow; the auctions API stat counts winning-bid values (not displayed). No document defined any of these.
3. **Missing:** offers awaiting decision, open/ended auction performance beyond a flat list, pending escrow / pending / completed payout totals, refunds, platform fees, attention queue, team activity feed.
4. Duplicate-navigation risk: Team and Banking already own sidebar entries; the command centre must link to them, not add destinations.
5. Overview quick actions repeat the banner buttons (candidate to consolidate; not deleted without dependency analysis).

## 4. Decisions
- **One new read-only endpoint** `GET /api/dealer-platform/command-centre` (no new tables, no migrations, no change to escrow/ledger/payment/payout logic). Sections are included only when the caller holds a permission that **already** gives access to the same data through an existing route (see implementation report). Owner-only data (escrow, payouts, refunds, fees, bids, outcomes) stays owner-only.
- The dealership id always comes from the authenticated membership (`req.dealerId`), never from the request.
- The overview moves to this endpoint; old endpoints stay for compatibility.
- The legacy revenue-like figures are **not altered** (they feed other screens); each is classified in `DEALER-FINANCIAL-DEFINITIONS.md` and the new overview uses only the authoritative definitions.
- Stop condition check: nothing required changing escrow, ledger, payment or payout logic.

---
## Addendum — hardening phase (what the extra audit found)
Evidence is from executed flows (`ci/db-journeys/19_dealer_ledger_reconciliation.mjs`) and read-only checks of the hosted database. Full detail: `DEALER-LEDGER-RECONCILIATION.md`.

| Area | Works | Missing / wrong |
|---|---|---|
| Dealer dashboard (owner) | Command centre figures equal escrow, payout, refund and ledger records for every flow exercised | Direct-mode sales are not represented (D4) |
| Team workspace (members) | Inventory/Leads/Customers tabs follow permissions | There was no overview; now a permission-aware **Overview** tab (see `DEALER-TEAM-WORKSPACE-OVERVIEW.md`). Assigned enquiries and tasks are not supported by the data model |
| Banking and payouts | Settlement details, payout state machine, ledger posting on payout | **`kayad_prepare_dealer_payout_atomic` fails for every call (D1), on the hosted database too**: no payout can be created |
| Escrow release | Ledger posting is atomic with the state change | Release API answers 400 after committing (D3); commission is recomputed at release (D2) |
| Legacy `/earnings`, `/summary` | Isolated per dealership | Total is 0 for released sales; the list shows unreleased payments (see `LEGACY-EARNINGS-ENDPOINT-AUDIT.md`). No mounted screen consumes them |
| Hosted schema | Core financial tables and all columns the endpoint reads exist | Six tables used by repository code are absent (D6); the endpoint now hides figures from missing optional sources |
| Revision-1 claim corrected | | Revision 1 said legacy figures "include escrow-held money"; evidence shows the amount is 0, not inflated |
