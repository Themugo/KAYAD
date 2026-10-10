# AUCTION / HOMEPAGE / MARKETPLACE BOUNDARY — 2026-10-08

## Finding: there is no separate Homepage component

Inspection of the app confirmed `src/components/home/*` (14 section
components) has **zero imports anywhere** — dead code. `VehicleMarketplace`
is the de facto landing surface the app actually renders. There is no real
React Router `<Routes>` tree either — only a `<BrowserRouter>` wrapper, with
navigation driven by manual `if (path === ...)` chains and an `activeNav`
query-param state in `App.tsx`.

This means the "Homepage vs Marketplace" boundary question collapses, in
this codebase's current reality, into: **does `VehicleMarketplace` already
answer "what is KAYAD / what can I do here" well enough, and does the
Auction page avoid re-answering that same question** — rather than a
boundary between two separate live components.

## Boundary by customer intent (the standard this stage applied)

| Surface | Customer question |
|---|---|
| Homepage/Marketplace (`VehicleMarketplace`) | "What is KAYAD and what can I do here? What vehicles are available?" |
| Auction (`AuctionsView.tsx`) | "What vehicles are being auctioned, and what opportunities exist right now?" |
| Vehicle Detail | "Should I buy this?" |
| Live Auction | "How do I participate right now?" |
| Payment | "How do I complete the transaction?" |

## Decision made this stage

1. **`VehicleMarketplace` was not modified.** It already has its own,
   appropriately scoped, non-duplicative auction-related UI (surfacing that
   some listings are auction-capable within a catalogue-wide context). That
   is correctly its job — general discovery, not auction depth.
2. **The redesigned Auction page does not try to become a second homepage.**
   Its new market header is explicitly auction-scoped: a data-led headline
   driven only by real `live`/`scheduled` counts from the auction-filtered
   endpoint, never general marketing copy about the platform as a whole.
3. **The redesigned Auction page does not become a duplicate auction
   dashboard either** — it stays a discovery-and-direction surface (segment
   tabs, search, a time-urgent spotlight, a card grid), and routes into the
   existing `AuctionLivePage` for actual participation rather than
   reimplementing any live-room functionality.
4. Per the master prompt's default of **zero backend changes** and the
   explicit instruction not to let the homepage become a duplicate auction
   dashboard, no homepage/marketplace file was touched this stage. The
   boundary identified above is documentation of an already-correct
   separation, not a redesign of a second surface.

## Why no changes were needed here

The research in `AUCTION_SURFACE_RESPONSIBILITY_MAP_20261008.md` found that
`VehicleMarketplace`, `AuctionsView.tsx`, `AuctionLivePage`, and the
Vehicle Detail modal already each answer a distinct customer question with
no meaningful overlap. The "problem" shown in the supplied screenshot was
internal to the Auction page's own layout (an oversized marketing hero
burying real auction data) — not a cross-surface boundary violation. Fixing
it required only `AuctionsView.tsx` + its stylesheet, confirmed by this
analysis before any code was touched.
