# PREMIUM AUCTION DESIGN AUDIT — 2026-10-08

## The problem (from the supplied screenshot)

The prior Auction page opened with a large, generic marketing hero —
oversized headline/copy occupying most of the above-the-fold viewport —
while the real auction inventory (then showing 0/0/0/0) was pushed into
small, visually disconnected stat tiles beneath it. The page read as a
marketing banner with auction data as an afterthought, not an auction
destination. It also did not visually distinguish "discovering what's
being auctioned" from "participating in a live room" — both were implied
by the same flat layout.

## Design decisions made, and why

**1. The hero became a market header, not a marketing statement.**
The headline is no longer static copy — it is now generated from real
`live`/`scheduled` counts (`marketHeadline`), so it can never say something
the backend doesn't support. Its type size was deliberately restrained
(`clamp(1.5rem, 2.6vw, 2.1rem)` vs. the old `clamp(2.3rem, 5vw, 4.8rem)`),
so the inventory below reads as the dominant content. The tab segments and
search bar were fused directly into this header (previously separate,
disconnected blocks), so the "what's happening" headline and "go find it"
controls share one visual unit.

**2. A spotlight makes the single most urgent real auction the visual
anchor**, rather than leaving every auction equally weighted in a flat
grid. It is selected purely by sorting on the real `endTime` field for the
soonest-closing live auction — never hand-picked, never a different
dataset from the grid. This directly answers "what vehicles are being
auctioned and what opportunities exist" by foregrounding the one with the
least time to act, and gives the vehicle and its auction context (current
bid, time left, bid count) genuinely equal visual weight in a 2-column
card, which was the explicit instruction: vehicle stays visually
important, but the auction is now the context around it, not a caption
beneath it.

**3. Truthful, differentiated empty/loading/error states.** Previously one
generic message covered every empty case. Each tab now gets copy that
reflects its actual real-data condition (e.g., live-with-scheduled-pending
vs. genuinely nothing anywhere), still styled as an intentional part of the
page rather than a "broken" fallback — satisfying the requirement that a
legitimate zero-auction state must look premium and deliberate, never
fabricated.

**4. Auction Discovery vs. Live Auction Participation stays unambiguous.**
The page never renders live bidding UI itself; every path into a specific
auction (spotlight CTA, grid card) opens the vehicle via the existing
`openAuction()` navigation into the real detail/live-room flow — no second
room, no duplicated real-time state.

**5. Canonical lifecycle only.** `isLive = auction.status === 'active'`
(server-derived) was kept completely unchanged — the redesign changed
layout and information hierarchy, never how LIVE/SCHEDULED/ENDED is
determined. The LIVE badge now uses the semantic `variant="live"` Badge
token (was `"accent"`) for a clearer, less ambiguous meaning without
inventing a new state.

**6. Trust signals left untouched.** Only the already-authoritative
"Verified organizer" signal is shown; no new badge (Inspected, Clean
Title, Escrow Protected, etc.) was added, per the truth map's finding that
no other candidate signal is reliably authoritative.

## What communicates automotive / premium / trust / auction / motion /
value / confidence / clarity

- **Automotive/premium**: deep teal gradient header with a soft radial
  highlight (distinct from the flat white/gray of a generic dashboard),
  large vehicle imagery in both the spotlight and grid cards, a serif/
  display headline font consistent with the rest of the product's brand
  system.
- **Trust**: the retained "Verified listings" / "Published settlement
  rules" pills and the per-auction verified-organizer badge, all traced to
  real backend authority (see truth map) — nothing decorative.
- **Auction-first**: the spotlight and segment counts make auction state
  (live/scheduled/ended/saved) the first thing read, not a vehicle catalog
  with auction status as a footnote.
- **Motion**: a restrained pulse on the live indicator dot and a subtle
  image-scale/lift on card hover — both now explicitly disabled under
  `prefers-reduced-motion: reduce` (a gap found and fixed during this
  stage's accessibility pass, see the execution report) — motion never
  carries information on its own; every state it accompanies is also
  conveyed in text/color.
- **Value/confidence/clarity**: the 3-stat row (current bid / time left /
  bids placed) on both the spotlight and every grid card gives a fast,
  consistent read of real market activity at a glance, in the same
  position every time.

## What was deliberately NOT done

- The hero was not simply deleted or shrunk-and-left-in-place; it was
  rebuilt as a functional, data-bearing header, per the master prompt's
  instruction to decide its fate from product evidence rather than
  reflexively removing it.
- No second "featured auctions" carousel or marketing rail was added —
  the spotlight uses the same real dataset as the grid, just reordered and
  given one promoted slot, to avoid any duplicate-data-source risk.
- Marketplace and Homepage were not touched (see the boundary document) —
  this stage's full creative freedom was exercised only within the
  Auction page's own layout, as scoped.
