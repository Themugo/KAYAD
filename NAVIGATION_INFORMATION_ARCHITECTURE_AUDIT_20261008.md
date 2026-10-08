# NAVIGATION INFORMATION ARCHITECTURE AUDIT — 2026-10-08

Every nav item was traced to the surface it opens and judged on: purpose,
visibility, dropdown justified?, belongs here?, duplicates?

## Before this stage

Desktop: flat links — Marketplace, Auction, Pre-Purchase Inspection,
Escrow, Payment History (signed-in), Support. A code comment records that
earlier dropdowns were removed on direction. Utilities: message icon,
saved icon (signed-in), Sell Vehicle, Sign In / Sign Up or account menu.
Mobile: bottom dock (Home, Search, Auction, Inspection, Menu) + drawer with a
flat 6-tile grid (Marketplace, Auction, Inspection, Escrow, Financing,
Support & Disputes).

Problems: nav scrolled horizontally (`overflow-x-auto`, which would also
clip any dropdown); "Payment History" is an account utility sitting in
primary navigation; Financing reachable only from the drawer/footer;
Auction and Escrow sub-destinations (tabs that already exist) not
discoverable; icon buttons had `title` but no accessible names; no
`aria-current`, no `aria-expanded`, no Escape handling; the drawer was a
`role="dialog"` with no focus management.

## Destination review

| Item | Destination (`activeNav`) | Visibility | Dropdown? | Reason |
|---|---|---|---|---|
| Marketplace | `marketplace` (parent link) | public | **Yes** | Three existing destinations: Browse vehicles (`marketplace`), Saved vehicles (`saved`, signed-in), Vehicle financing (`financing`). Financing was previously drawer/footer-only. |
| Auction | `discovery` (parent link) | public | **Yes** | AuctionsView already has four tabs (Live now / Starting soon / Completed / Saved for you). Deep-linkable through the existing `auctionTab` URL param. Not a second auction surface and not the live room. |
| Pre-Purchase Inspection | `inspections` (parent link) | public | **Yes** | Two real pages: Request an inspection (`inspections`) and Find an inspection provider (`inspection-marketplace`). |
| Escrow | `escrow` (parent link) | public | **Yes** | EscrowView has existing tabs: Transaction Journey, Protected Deals (signed-in), How Escrow Starts; selected through the existing `initialTab` prop. |
| Support | `support` | public | **No** | One page; its sections are in-page, not addressable destinations. A dropdown would be invented structure. |
| Payment History | `payments` | signed-in | Moved | Account utility, not a primary destination. Now in the account menu (and still in the mobile "Your KAYAD" block). |
| Messages | `chat` | protected | utility | Kept as utility icon (existing "message/support utility"); drawer keeps Messages for signed-in users. |
| Saved vehicles | `saved` | signed-in | utility + Marketplace menu | Existing icon retained; also listed under Marketplace. Intentional shortcut, not a new destination. |
| Sell Vehicle | `seller-platform` | public CTA | n/a | Unchanged; visually the only filled CTA. |
| Sign In / Sign Up | `/login` | guests | n/a | Unchanged route and wording. |
| Dealers | `dealers` | public | **Not exposed** | Page receives `dealers={[]}`; linking it would send customers to an empty page. Reported, not hidden or "fixed". |
| KAYAD Live, My Garage, Dashboards | account menu | signed-in | n/a | Unchanged, already in the account menu. |

## Duplicates by design

The parent label link is a shortcut to the section's first destination
(Marketplace→Browse, Inspection→Request, Escrow→Journey, Auction→the
Auction page). The first child therefore repeats the parent target but
adds the one-line description. No two *different* labels open the same
surface.

## Boundaries (Homepage / Marketplace / Auction / Live room)

- **Home** is the Marketplace surface in this architecture (`home` →
  `marketplace` alias; the Home tab in the mobile dock goes there). No
  separate Home page exists, so none was invented; the brand mark and the
  dock's Home both resolve to it.
- **Marketplace** = vehicle discovery. **Auction** = auction discovery
  (the page redesigned in Stage 14). The Auction menu never opens the
  live bidding room and adds no bidding surface; participation stays on
  the existing vehicle/auction flow.

## Dead/legacy navigation code left untouched

`components/layout/Header.tsx`, `layout/MobileBottomNav.tsx`,
`AppLayout.tsx`, `pages/AuctionDiscoveryNetwork.tsx`, `src/components/home/*`.
None is reachable from `App.tsx`; removal needs a separate, proven-dead
sweep. `MobileCarCard.jsx` (removed in Stage 11) was not resurrected.
