# KAYAD AUCTION 360 — Stage 10: Marketplace Visual Hierarchy Audit
**Date:** 2026-10-08

## Surfaces inspected

1. The main paginated inventory grid card (`src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`, the `data-testid="inventory-grid"` `<article className="kayad-vehicle-card">` block) — this is the actual card customers scroll through on the marketplace; it is a **separate, hand-rolled card**, not the Stage 8 `VehicleCard.tsx` component (that component is used only for the smaller "Featured vehicles" strip above the grid, and by the gallery/dashboard/dealer-profile pages — see "Card inventory" below).
2. `src/components/VehicleCard.tsx` (Stage 8's canonical badge-overlay component).
3. `src/components/detail/VehicleDetailPage.tsx` (vehicle detail / central trust surface).
4. `src/components/auction/AuctionWowExperience.tsx` + `src/pages/AuctionLivePage.jsx` (live auction room).
5. `src/features/PaymentHistoryView.tsx` (payment journey).
6. Mobile/responsive architecture, `prefers-reduced-motion` usage, typography/design-token sources, and icon usage, sitewide.

## Card inventory (a real finding in itself)

There are **three separate "VehicleCard" components** in this codebase:
`src/components/VehicleCard.tsx` (Stage 8's canonical card, used by
`VehicleMarketplace.tsx`'s "Featured vehicles" strip, `DealerProfileModal.tsx`,
and tested in `VehicleCard.test.tsx`), `src/components/gallery/VehicleCard.tsx`
(used by `GalleryPage.tsx`, `FeaturedVehicles.tsx`, `DashboardPage.tsx`,
`DealerProfilePage.tsx`), and `src/components/VehicleCard/VehicleCard.jsx`
(used only by the deprecated `src/components/mobile/MobileCarCard.jsx`, which
is itself unused — see "Orphaned component" below). **None of these three is
what renders the main paginated inventory grid** — that grid has its own,
fourth, inline card markup directly inside `VehicleMarketplace.tsx`. This is
not new to Stage 10 (it predates this stage), but it is the direct cause of
the real defect below: the Stage 8 lifecycle-aware badge fix was applied to
`VehicleCard.tsx`, which is not the component customers see on the actual
inventory grid they browse page after page.

## Real defects found and fixed (3)

**1. The main inventory-grid card had its own, third, independent badge
calculation — a single mutually-exclusive "ribbon" — that reintroduced
exactly the Stage 8 lifecycle/capability confusion defect Stage 8 fixed
elsewhere.** The ribbon was:
```js
const ribbon = v.inspectionPassed
  ? { label: 'Report Available', cls: 'bg-emerald-600' }
  : v.isAuction
  ? { label: '🔴 Live Auction', cls: 'bg-[#12576D]' }
  : v.badge ? { label: `★ ${v.badge}`, cls: 'bg-[#0A3340]' } : null;
```
Two defects in this one block:
- It keyed the auction label off `v.isAuction` (the capability flag), not
  `v.auctionLifecycle` — so a scheduled (draft) or already-ended auction on
  the actual marketplace grid rendered "🔴 Live Auction," violating Stage
  10D's explicit requirement ("a scheduled auction must never visually look
  live... an ended auction must never look bid-ready") — the exact defect
  Stage 8 fixed in `VehicleCard.tsx`, but this separate card was never
  touched.
- It was mutually exclusive — only one of inspection/auction/starred-badge
  could show at once, with **no ESCROW signal at all** — violating Stage
  10B's "preserve the Stage 8/9 authoritative badges... AUCTION, ESCROW,
  INSPECTION" and "do not duplicate badge calculations."
The same `v.isAuction`-not-`v.auctionLifecycle` defect was also present in
the "Current bid" bottom banner on this card, and in three further
eyebrow/narration labels (the main grid card's category label, and both
homepage hero-slide eyebrow labels / `heroVehicleNarration()`).

**Fixed**: replaced the single ribbon with the identical three-signal model
`VehicleCard.tsx` already uses — `auctionLifecycle === 'live'/'draft'/'ended'`,
`isEscrowApplicable(v)` (the same canonical helper, imported — not
reimplemented), and `inspectionPassed` — each independently rendered, so all
three can show in combination. The "Current bid" banner and all four
auction-label/eyebrow sites were changed to the same lifecycle-aware
condition. No new badge-calculation logic was invented; every site now
calls the same canonical fields and the same `isEscrowApplicable()` function
already in use elsewhere.

**2. `VehicleDetailPage.tsx`'s "Clean Title" badge was an unconditional,
fabricated trust claim** — rendered with a `ShieldCheck` "verified" icon for
every vehicle regardless of any real field (confirmed: no
`titleStatus`/`cleanTitle` field exists anywhere in the `Vehicle` type, the
mapper, or the backend). This was flagged but left unfixed in Stage 8/9's
carry-forward notes; Stage 10M explicitly requires either making its source
authoritative or ceasing to present it as a verified signal. No backend
title-verification workflow exists to make it authoritative without
inventing new business logic (out of scope), so **the fabricated badge was
removed outright**.

**3. `VehicleDetailPage.tsx`'s "Duty Paid" chip was also unconditional**, but
unlike "Clean Title," a real, already-existing, authoritative backend field
does exist for it: `cars.duty_status`, written only by the NTSA verification
workflow (`AdminNtsaQueue.jsx`) to the literal value `'duty_paid'` once
actually confirmed — already selected into the public `GET /cars` projection
(`carController.js:238`) but never threaded through the frontend type/mapper.
**Fixed by wiring the real field through** (`BackendCar.dutyStatus`,
`Vehicle.dutyPaid`, `mapBackendCarToVehicle`) and gating the chip on
`vehicle.dutyPaid`, rather than removing the signal — the authoritative
source already existed, it just wasn't connected (the same class of fix as
Stage 8's `escrow_enabled` wiring).

## Visual-hierarchy findings (reviewed, not code defects — no fix required/made)

- **Three parallel design-token systems coexist** (confirmed by source
  read): `tailwind.config.js`'s `brand`/`charcoal` palette and
  Playfair/Inter font pairing; `src/index.css`'s separate `--color-navy-*`
  CSS variables and a third Plus-Jakarta/Outfit font pairing; and literal
  hardcoded hex values (`#176B87`, `#0A3340`, `#13B8A6`) used directly
  throughout `VehicleDetailPage.tsx` and `VehicleMarketplace.tsx`'s inline
  grid card, which happen to approximate but not exactly match either
  token system. This is a real inconsistency (Stage 10Q: "reuse existing
  typography tokens... do not introduce a second design system"), but
  unifying three pre-existing, already-shipped systems into one canonical
  set is a larger, cross-cutting refactor whose blast radius (every
  component using any of the three) is disproportionate to a single visual-
  convergence pass without a dedicated design-token migration stage of its
  own. Recorded as a carry-forward item, not fixed this stage.
- **Icon-to-concept mapping is inconsistent**: "live" is represented once as
  a `Gavel` icon (VehicleDetailPage), once as a plain-text chip with no icon
  (`AuctionWowExperience`'s gallery chip), and once as a raw `🔴` emoji
  (`VehicleCard.jsx`, and — before this stage's fix — the main grid card).
  "Inspected/verified" uses `Wrench`, `CheckCircle2`, `ShieldCheck`, and
  `CircleCheck` across different components for the same concept. Escrow
  (`Lock`) and location (`MapPin`) are, by contrast, already consistent.
  Fixed where directly touched this stage (the main grid card's new badges
  now use `Gavel`/`Lock`/`ShieldCheck` consistently with `VehicleCard.tsx`);
  not mass-replaced sitewide, which would touch dozens of unrelated files
  for a cosmetic-only change with no functional defect behind it.
- **`prefers-reduced-motion` is handled in 9 CSS blocks and via 1 exported
  hook (`useMediaQuery.ts::usePrefersReducedMotion`), but 4 separate
  components re-implement the same `matchMedia` check inline instead of
  reusing that hook**, and the richest motion (the live auction room's
  framer-motion transitions, `VehicleDetailPage.tsx`'s image-zoom
  transforms) is not gated by it at all. Per Stage 10O, the requirement is
  that auction state/countdown/realtime/bid-confirmation remain *functional*
  under reduced motion, not purely decorative — and none of these are
  animation-dependent for their actual state (countdown text, bid button
  state, and socket-driven bid updates all render via plain DOM text/attribute
  changes, not CSS/JS animation gating their content) — so reduced-motion
  compliance for *functionality* holds today; what's inconsistent is the
  *motion-reduction itself* on purely decorative transitions. Recorded as a
  carry-forward consistency item, not a functional defect.
- **Orphaned component**: `src/components/mobile/MobileCarCard.jsx` is
  marked deprecated in its own file header and is not imported by
  `VehicleMarketplace.tsx`'s actual mobile rendering path — the responsive
  behavior instead comes from CSS container queries on the same grid markup
  (`src/index.css`'s `.kayad-inventory-grid` `@container` rules), which
  already collapses to a single column below 520px. Not removed this stage
  (deleting a file is a separate decision from a visual-convergence pass,
  and it is dead/inert, not harmful) — flagged as a carry-forward cleanup
  item.
- **The vehicle-detail bid form (`VehicleDetailPage.tsx::handlePlaceBid`)
  has no loading/disabled/duplicate-click-prevention state**, unlike the
  live auction room's bid form (`AuctionLivePage.jsx`), which has a correct
  `placing` state gating the submit button. This is a real UX gap per
  Stage 10G's explicit requirements ("loading state… disabled state…
  duplicate-click prevention"), but it is also a second, parallel
  bid-submission code path entirely (calling `MarketplaceContext`'s
  `placeBid`, not `services/bidApi.ts`) distinct from the live-room form —
  closing the gap safely requires understanding whether this second path is
  still a live, intended entry point to bidding or should be retired in
  favor of routing every bid through the live auction room's already-correct
  form. That is a product/architecture question beyond "add a loading spinner"
  and risks the "do not duplicate business logic" boundary if answered
  wrong; recorded as a carry-forward item for a dedicated look rather than a
  speculative fix this stage.

## Badge hierarchy — compactness check (Step 10B)

All 7 real combinations (AUCTION / ESCROW / INSPECTION / AUCTION+ESCROW /
AUCTION+INSPECTION / ESCROW+INSPECTION / AUCTION+ESCROW+INSPECTION) remain
representable with at most 3 small pill badges per card on both
`VehicleCard.tsx` (Stage 8, unchanged) and the now-fixed main inventory-grid
card — same visual budget, same compact top-overlay placement, same
icon+label pattern. No badge collisions introduced; the main grid card's
badge row uses `flex flex-wrap gap-1 max-w-[78%]`, matching the same
78%-width cap `VehicleCard.tsx`'s overlay already used.

## Vehicle-as-hero check (Step 10A)

Reviewed both cards and the detail page: badge overlays remain small pill
chips at a fixed corner position (`top-2`/`top-4 left`), never larger than a
few percent of the image area; price/CTA sit below the image, not overlaid
on it, on both cards; the detail page's badge overlay is similarly
corner-anchored and unchanged in size by this stage's edits (one badge
removed, one badge's condition added — no new visual element introduced).
No vehicle image was found overlaid with a badge, button, or price block
large enough to compete with the vehicle itself.
