# KAYAD AUCTION 360 — Stage 10: Premium Auction UX Audit
**Date:** 2026-10-08
**Scope:** Steps 10A–10V of the Stage 10 master prompt. This document is the
narrative audit; `MARKETPLACE_VISUAL_HIERARCHY_AUDIT_20261008.md` is its
companion deep-dive on card/badge architecture (Steps 10A–10C in detail) and
is referenced rather than repeated below where the two overlap.

**Scope rule observed throughout:** every finding below was checked against
the canonical Stage 1–9 backend architecture before any fix was made. Nothing
in this document changes `escrow_capability_status`, `computeEffectiveEscrowEnabled()`,
auction lifecycle computation, payment authority, or any financial value —
all fixes are presentation-layer only, reading fields the backend already
authoritatively provides.

## 10A — Vehicle as the visual hero
Reviewed the main grid card, the Stage 8 `VehicleCard.tsx`, and
`VehicleDetailPage.tsx`. In all three, the vehicle photo is the dominant
element; badges are small corner-anchored pills (never more than a few
percent of the image area); price and CTA sit in a text block below the
image, never overlaid on it. No change needed; see the compactness and
hero checks in the companion visual-hierarchy audit for the specific
measurements checked.

## 10B — Trust badge preservation and compactness
The three authoritative badges (AUCTION / ESCROW / INSPECTION) must keep
being computed from `auctionLifecycle`, `isEscrowApplicable()`, and
`inspectionPassed` — and now are, on every surface, including the main grid
card that had drifted (see Real Defects below and the companion audit).
Confirmed all 7 real combinations still render in ≤3 compact pills with no
layout collision.

## 10C — Marketplace card experience prioritization
Confirmed the information order on both cards is: vehicle photo → title/
spec line → trust badges → price → CTA. No reordering was needed; the only
correction required was making the badge *content* lifecycle-correct (10D),
not the card's layout.

## 10D — Auction discovery: lifecycle vs. capability
**This was the primary functional defect this stage.** The main inventory
grid (the actual page customers scroll through) computed its auction label
from `v.isAuction` — a capability flag meaning "this listing is eligible to
run an auction" — rather than `v.auctionLifecycle` — the field that actually
says whether an auction is scheduled, live, or ended. The practical effect:
a **scheduled (draft) auction showed "🔴 Live Auction"**, and an **ended
auction still showed "🔴 Live Auction"** and still showed a "Current bid"
banner, on the real marketplace grid — directly violating this step's
explicit requirement ("a scheduled auction must never visually look live...
an ended auction must never look bid-ready... a sold vehicle must not
appear purchasable"). This is exactly the defect Stage 8 believed it had
fixed, but Stage 8's fix landed on `VehicleCard.tsx`, a component not used
by the main grid (see "Card inventory" in the companion audit). Fixed by
switching every affected call site to `auctionLifecycle`-based conditions
(`showLiveAuction`/`showUpcomingAuction`/`showEndedAuction`), reusing the
same field the backend already computes — no new lifecycle logic was
invented on the frontend.

Rejected and sold listings were separately verified: `VehicleMarketplace.tsx`
already excludes rejected/sold inventory from the fetched/rendered list
server-side (confirmed via the existing `getActiveAuctionsRejectedExclusion`
backend test and the `GET /cars` filtering), so no client-side "looks
purchasable" state was possible for those; this step's risk was specific to
the live/draft/ended distinction within already-visible auction listings.

## 10E — Auction detail experience
`VehicleDetailPage.tsx` and the auction-specific detail surfaces read
`auctionLifecycle`, current bid, and escrow/inspection state from the same
backend-provided fields as the grid; after the 10D fix, these are now
mutually consistent with the grid card (a vehicle can no longer appear
"live" on the grid and "ended" on its own detail page, or vice versa).

## 10F — Live auction room
`AuctionWowExperience.tsx` / `AuctionLivePage.jsx` already source lifecycle,
bid, and outcome state from the backend (`fetchAuctionOutcome`, socket
events) rather than computing it locally. No defect found; left unchanged
per the "do not reopen completed stages" rule — this surface was part of
Stage 8's prior hardening and was not touched again here beyond the shared
badge-icon consistency noted in 10R.

## 10G — Bid interaction
Confirmed `AuctionLivePage.jsx::handlePlaceBid` has a correct `placing`
loading state, a disabled-while-pending submit button, and duplicate-click
prevention, with toast messages that preserve the specific backend error
text rather than a generic failure message. **A real gap was found and
documented (not fixed)**: `VehicleDetailPage.tsx::handlePlaceBid` is a
second, parallel bid-submission path (via `MarketplaceContext`, not
`services/bidApi.ts`) with no loading/disabled/duplicate-click-prevention
state at all. This was not fixed this stage because closing it safely
requires first answering a product question this stage is not scoped to
decide: whether this second path is still an intended bidding entry point
or should be retired in favor of routing all bids through the live-room's
already-correct form. Fixing only the symptom (adding a spinner) without
that answer risks papering over, or accidentally re-legitimizing, a
duplicate bid-submission code path — recorded as a carry-forward item in
both audit documents.

## 10H — Countdown
Countdown displays are presentation-only text derived from a target
timestamp; bid eligibility is enforced server-side (confirmed: the bid
submit handlers do not gate on local countdown state, they submit and
display whatever the backend returns, including a rejection if the auction
has actually ended server-side by the time the request lands). No change
needed.

## 10I — Winning moment
`AuctionLivePage.jsx::handleWinnerSettlement` reads `outcome.winning_amount`
and `outcome.escrow_id` directly from `fetchAuctionOutcome(id)` — a
server-computed result — rather than computing a winner or amount from
client-side bid history. No change needed.

## 10J — Payment experience
Confirmed no frontend-computed authoritative amount or winner anywhere in
the payment flow: `initiateAuctionWinnerPayment(id, phone)` takes no amount
parameter (the backend determines the amount), and
`PaymentHistoryView.tsx` renders amounts/status directly from backend
`BackendPayment` objects with no client-side arithmetic. No change needed.

## 10K — Optional escrow experience
`isEscrowApplicable()` (the same Stage 8/9 canonical helper) is now called
consistently everywhere a card shows an escrow badge, including the
previously-inconsistent main grid card. The badge communicates escrow
*applicability*, not that funds are currently held — confirmed no copy
anywhere claims money is already in escrow merely because the badge is
present; the badge label is "Escrow" (availability), and actual
held/released state lives only in the payment/escrow detail views that
read real escrow records. No change needed beyond the 10D-driven badge
wiring already covered above.

## 10L — Inspection experience
Confirmed Ghost Check (the pre-purchase inspection marketplace feature) and
the general "Inspection Marketplace" surfaces remain visually and
structurally distinct — different routes, different components, different
badge ("Inspected" vs. a separate CTA to request/browse inspection
services) — not merged. No change needed.

## 10M — Vehicle detail: trust badges
Two real defects found and fixed, detailed fully in the companion audit:
- **"Clean Title" badge removed** — it was unconditional and backed by no
  field anywhere in the type, mapper, or backend; no authoritative source
  exists to make it truthful without inventing new verification
  architecture, so per this step's explicit instruction it was removed
  rather than left presented as a verified signal.
- **"Duty Paid" chip gated on a real field** — `cars.duty_status`, written
  only by the existing NTSA admin verification workflow, was already
  selected by the backend but never wired to the frontend; it is now wired
  through (`BackendCar.dutyStatus` → `Vehicle.dutyPaid`) and the chip only
  renders when that field is actually `'duty_paid'`.

## 10N — Mobile experience
Confirmed the responsive behavior for the main inventory grid comes from
CSS container queries (`src/index.css`, `.kayad-inventory-grid`,
`@container kayad-inventory-results`) collapsing to a single column below
520px and stepping up to 2/3/4/5 columns at wider container widths — not a
dedicated mobile-carousel component. This architecture was preserved
exactly; no second mobile marketplace was created. The only pre-existing
mobile-specific card component, `src/components/mobile/MobileCarCard.jsx`,
is already orphaned/deprecated and was not touched (see companion audit).
Breakpoints 320/360/375/390/412/430 all fall below the 520px first
container-query step, so all narrow phone widths get the same single-
column layout; this was not re-tested pixel-by-pixel on a device grid this
stage (no visual regression was introduced — the only markup change at
narrow widths was the badge row's `flex-wrap`, which degrades gracefully to
a second line rather than overflowing).

## 10O — Reduced motion
Functional state (countdown text, bid button enabled/disabled, socket-
driven bid updates) does not depend on animation anywhere checked — it
renders via plain DOM text/attribute updates. Decorative motion is gated by
`prefers-reduced-motion` in 9 CSS blocks and one shared hook
(`usePrefersReducedMotion`), but 4 components re-implement the matchMedia
check inline instead of reusing the hook, and the richest motion (live-room
framer-motion transitions, detail-page image-zoom) is not gated by
reduced-motion at all. Functional compliance holds; motion-reduction
*consistency* does not — recorded as a carry-forward item (see companion
audit for the full list of affected components).

## 10P — Responsive desktop
The container-query column stepping (2/3/4/5 columns up to 1120px+)
already covers desktop widths without a separate desktop-only code path.
No change needed.

## 10Q — Typography
Confirmed three parallel, unreconciled token systems exist (Tailwind
config's `brand`/`charcoal` + Playfair/Inter; `index.css`'s `--color-navy-*`
+ Plus-Jakarta/Outfit; hardcoded hex literals in two components). This
stage's own edits introduced **no new tokens or fonts** — the new badge
pills reuse the exact same color classes already present in `VehicleCard.tsx`
for the same badge types. Reconciling the three pre-existing systems into
one is recorded as a carry-forward item; it is a larger, cross-cutting
migration disproportionate to a visual-convergence pass.

## 10R — Iconography
Confirmed inconsistency pre-existed (live: `Gavel`/plain text/`🔴` emoji
across different components; inspected: `Wrench`/`CheckCircle2`/`ShieldCheck`/
`CircleCheck`). Escrow (`Lock`) and location (`MapPin`) were already
consistent. Where this stage directly touched a surface (the main grid
card), the new badges adopt the same icon set `VehicleCard.tsx` already
uses (`Gavel`, `Lock`, `ShieldCheck`), removing one of the `🔴`-emoji
instances. No new icon library was introduced. Full sitewide icon
unification is a carry-forward item, not attempted this stage (it would
touch many unrelated files for a cosmetic-only change).

## 10S — Accessibility
No dedicated axe/screen-reader pass was run this stage (environment has no
browser-automation target configured for this task); reviewed statically:
the new badge pills carry visible text labels (not icon-only), matching the
existing pattern on `VehicleCard.tsx`, so no new icon-only/unlabeled
interactive element was introduced. No pre-existing accessibility defect
was in scope of the files touched this stage.

## 10T — Error experience
Confirmed the established pattern — `extractError()` prioritizing
`err?.response?.data?.message` before any generic fallback — is used
consistently at the call sites reviewed (`AuctionLivePage.jsx` and others),
so specific backend error messages ("Bid too low," "Auction has ended,"
etc.) reach the user rather than being replaced by a generic "Something
went wrong." No change needed; no site was found this stage that discarded
a specific backend message in favor of a generic one.

## 10U — Performance
No new network calls, re-render loops, or heavy computation were
introduced: the 10D fix replaces one ternary expression with a few boolean
consts computed from fields already present on the same object, and adds a
few conditionally-rendered `<span>` elements reusing existing CSS classes.
No images, fonts, or scripts were added.

## 10V — API/backend protection
Confirmed no financial value, winner determination, or escrow eligibility
is computed client-side anywhere touched this stage: `isEscrowApplicable()`
reads a backend-provided boolean, `auctionLifecycle` is backend-computed,
`dutyPaid` is a direct backend field comparison. No new client-side
authority was introduced; the `duty_status` wiring is read-only display of
an existing admin-only-writable field, not a new write path.

## Summary
Of 22 steps reviewed (10A–10V), 3 produced real, fixed defects (10D's
lifecycle/capability confusion across 5 call sites, 10M's two trust-badge
fixes), 5 produced documented carry-forward items with no code change
(10N's device-grid re-test, 10O's motion-hook consistency, 10Q's token
unification, 10R's sitewide icon unification, 10G's second bid-path loading
state), and the remainder confirmed existing behavior already meets the
step's requirement with no change needed.
