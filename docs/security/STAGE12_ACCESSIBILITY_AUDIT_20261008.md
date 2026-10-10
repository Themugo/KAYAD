# KAYAD AUCTION 360 — STAGE 12 — ACCESSIBILITY SEMANTICS AUDIT
**Date:** 2026-10-08
**Scope:** frontend only. Zero backend files touched this stage (proven in `STAGE12_EXECUTION_REPORT_20261008.md`, Phase L).
**Foundation:** `KAYAD-AUCTION-STAGE-11-FINAL-UX-HARDENING-20261008.zip`, SHA-256 `b00b6cf217ed0da839fb8da7058600194afc5015a49861293b417b77567b08de` — FROZEN, no redesign, no architecture change.

## 1. Carried-forward gaps (from Stage 11)

Per `STAGE11_RESPONSIVE_ACCESSIBILITY_MATRIX_20261008.md` and `STAGE11_EXECUTION_REPORT_20261008.md`, four concrete gaps were named and left open for Stage 12:

1. No `aria-live` region on bid-result or live countdown/price updates.
2. `AuctionBidConfirmation` overlay lacks explicit dialog semantics/focus trap.
3. `VehicleDetailPage.tsx` heading-hierarchy skip (h1→h3/h4).
4. Pagination icon-button touch-target *size* (naming had been fixed in Stage 10/11, hit-area size had not).

All four are addressed below. No undocumented Stage 11 finding was inferred or retroactively expanded — only what those two documents named.

## 2. Phase B — aria-live audit and fixes

**Audit method:** traced every bid/auction-lifecycle state transition a screen-reader user would need to know about, and classified each as (a) a one-time meaningful transition deserving a live region, or (b) a per-tick/continuous update that would create announcement noise if wrapped in one.

| Location | Transition | Classification | Result |
|---|---|---|---|
| `VehicleDetailPage.tsx` — bid success message | Bid placed, backend confirms | One-time, non-urgent | `role="status" aria-live="polite"` added |
| `VehicleDetailPage.tsx` — bid error message | Bid placed, backend rejects | One-time, user must act | `role="alert" aria-live="assertive"` added |
| `CountdownDisplay.tsx` — "Auction Ended" | Countdown reaches zero | One-time | `role="status" aria-live="polite"` added, on the `expired` branch only |
| `CountdownDisplay.tsx` — ticking digits | Every second | Continuous/noisy | **Deliberately NOT wrapped** — would announce every second |
| `AuctionWowExperience.tsx` — `AuctionWinningCelebration` | Auction won | One-time | `role="status" aria-live="polite"` added |
| `AuctionLivePage.jsx` — ended-for-non-winner panel | Auction ended, user did not win | One-time | `role="status" aria-live="polite"` added, symmetric with the winning panel |
| `AuctionLivePage.jsx` — existing toast system | Various | Already correct | **PASS, not a gap** — toasts already use `role="alert"` |

**Decorative elements** inside newly-live-region-wrapped panels (glow divs, trophy/icon divs) were marked `aria-hidden="true"` so the live region announces only the meaningful text, not icon noise.

**Verdict: PASS.** All 4 named gaps closed. No indiscriminate announcements introduced (explicitly verified: ticking countdown digits remain outside any live region — confirmed via `AuctionLiveRegions.test.jsx`, which asserts the ticking state does NOT expose `role="status"`).

## 3. Phase C — bid confirmation dialog semantics

**TRACE before FIX:** the named gap said `AuctionBidConfirmation` "lacks explicit dialog semantics/focus trap." Before applying that literally, the actual component behavior was inspected: `AuctionBidConfirmation` auto-dismisses via an internal `setTimeout` with no confirm/cancel decision for the user to make — it is a transient status panel, not a decision-blocking dialog.

Applying `role="dialog"` + `aria-modal="true"` + a focus trap to a panel that vanishes on its own timer would have been an accessibility **anti-pattern**: it would trap keyboard focus on a panel the user never asked to open and cannot dismiss by decision, for however long the timeout runs. The correct fix is a live-region status announcement, matching the Phase B treatment of other one-time auction-state transitions.

**Fix applied:** `role="status" aria-live="polite" aria-atomic="true"` on `AuctionBidConfirmation`'s container; `aria-hidden="true"` on its decorative icon. No dialog role, no focus trap, no focus-steal (an initial attempt to call `.focus()` on a target element was self-caught during development and removed — live regions must not steal focus).

**The real dialog-semantics gap** was found elsewhere, via the same TRACE discipline: `MobileFilterDrawer` already had `role="dialog"`/`aria-modal="true"` and an Escape handler (correct ARIA, Stage 10/11 work), but had **no actual focus management** — opening it never moved focus into the panel, Tab could escape the panel into the page behind the overlay, and closing it never restored focus to whatever opened it. This is the genuine instance of the named gap's intent (dialog semantics being incomplete), applied to the component that actually needed it.

**Fix applied to `MobileFilterDrawer.jsx`:** three refs (`panelRef`, `closeButtonRef`, `previouslyFocusedRef`) backing a combined keydown handler that:
- saves `document.activeElement` on open and restores it on close,
- moves focus to the close button on open (`setTimeout(..., 0)` to wait for render),
- computes focusable descendants of the panel (filtered by `!el.hidden`, not `offsetParent !== null` — see Known Limitations below) and wraps Tab/Shift+Tab at the panel's boundary,
- still closes on Escape (unchanged behavior, now folded into the same handler).

**Incidental discovery:** while writing the first real test that actually rendered `MobileFilterDrawer`, a pre-existing `ReferenceError: CONDITION is not defined` crash was found (a typo — `CONDITIONS`, the real declared constant, was referenced as `CONDITION` in one `.map()` call). This bug predates Stage 12 and is unrelated to its named scope, but made the component non-functional in any real render; fixed as a one-line correction with no behavior change beyond removing the crash.

**Verdict: PASS**, with the gap correctly re-targeted via TRACE rather than applied literally to the wrong component.

## 4. Phase D — heading hierarchy and landmark audit

**Audit method:** grepped every heading tag across `VehicleDetailPage.tsx` (the component Stage 11 named) plus a scan of the other named surfaces (homepage, marketplace, auction detail/live room, payment state) for skips, and checked for a skip-to-content landmark.

**Legitimate pattern, not a bug:** `VehicleDetailPage.tsx` has two `<h1>` elements — a desktop hero title and a mobile hero title — toggled via Tailwind `hidden`/`lg:hidden` so only one is ever visually present. This is a responsive-variant pattern, not a duplicate-heading defect, and was left untouched.

**Genuine skip fixed:** the page went h1 → h4 directly for several card-section titles, with an inconsistent h3-before-h4 ordering elsewhere. Fixed via tag-only promotions (no className/text changes, so zero visual regression):
- "Vehicle photos unavailable" / title-placeholder captions: h4 → h2
- "Technical Specifications": h3 → h2
- "150-Point Ghost Check Certification": h3 → h2
- "Buyer Protection & Trust Guarantees": h3 → h2
- "Request On-Demand Physical Inspection": h3 → h2
- Seller name card title: h4 → h2
- "Seller Description" / "Installed Features & Options" (nested under Technical Specifications): h4 → h3, so they correctly sit one level under their new h2 parent

**Confirmed final outline (grep-verified):** `h1 → h2 (siblings) → h3 (correctly nested)`, with one remaining out-of-scope orphan: an `h3` inside the fullscreen image lightbox modal (~line 1196), which has no heading above it in that modal's own DOM subtree at all. This modal has a bigger, separate gap — no dialog role/semantics whatsoever — documented here as a carry-forward, not silently fixed as a heading-level tweak that would misrepresent the modal as otherwise accessible.

**Skip-link gap found and fixed:** `SkipLink.tsx` existed, fully built, but was never rendered anywhere in the actual customer-facing route tree. A separate, also-unused `CustomerLayout.tsx` had its own inline skip link, but that layout itself is dead code, never imported by any route. Fixed by wiring the real, already-built `SkipLink` into `App.tsx`'s actual render tree (before `<Navbar />`), targeting a new `id="main-content"` + `tabIndex={-1}` on the existing `<main>` element.

**Verdict: PASS.** No heading-level skip remains on the audited surfaces; skip-to-content is now live on every route through `App.tsx`. Regression test added (`VehicleDetailPage.bidPath.test.tsx`: "has no heading-level skip between the page h1 and its first subsection heading") and explicitly revert/restore cycled (see `STAGE12_EXECUTION_REPORT_20261008.md`, Phase N).

## 5. Phase E — pagination and touch targets

**Gap:** Stage 10/11 had fixed pagination button *naming* (accessible names via `aria-label`) but not *hit-area size* — the prev/next icon buttons rendered at `32×32px` (Tailwind `p-2` on an icon with no explicit min-size), under the 44×44px minimum touch-target guideline.

**Fix:** `VehicleMarketplace.tsx` pagination buttons' className changed from `"p-2 border border-slate-200 rounded-lg disabled:opacity-40"` to `"min-h-11 min-w-11 flex items-center justify-center border border-slate-200 rounded-lg disabled:opacity-40"` (container gap also widened `gap-2` → `gap-3` to keep adjacent targets from crowding). `min-h-11`/`min-w-11` = 2.75rem = 44px at the default root font size.

**Verified, not assumed:** real Playwright `boundingBox()` measurement (not jsdom, which cannot compute real layout) confirmed the rendered size is exactly `{width: 44, height: 44}` both before packaging and again during the Phase N revert/restore cycle, where reverting the class change was shown to genuinely regress the measured size to `32×32px`. Full detail in `STAGE12_BROWSER_DEVICE_CERTIFICATION_20261008.md`.

**Verdict: PASS**, real-browser-verified.

## 6. Known limitations / honest caveats

- The browser-runtime measurements in this document and in `STAGE12_BROWSER_DEVICE_CERTIFICATION_20261008.md` were taken against a throwaway Vite+Playwright test harness (`__stage12_harness*`, deleted before this stage's zip was packaged) that mounts the real, unmodified production components with only their two context-hook dependencies (`useMarketplace`, `useAuth`) swapped for fixture stubs mirroring the existing checked-in Vitest mocks for the same components. This is not mock inventory shipped into the product — it never ships — but a Storybook-equivalent used only to exercise real layout/focus/keyboard/motion-query behavior jsdom cannot measure.
- That harness's own minimal Tailwind content-scan (scoped to the harness's own small root folder) does not compile every utility class used only in the aliased real `src/` tree it imports. This is a limitation of the harness's own throwaway CSS build, not of the real project's production build, which was independently confirmed clean via the real `npm run build` (Stage 10/11, and re-confirmed this stage in `STAGE12_EXECUTION_REPORT_20261008.md` Phase M).
- The fullscreen image lightbox's missing dialog semantics (Section 4, final paragraph) is documented as a known carry-forward, not fixed this stage — fixing it would mean adding net-new dialog semantics to a surface not named in this stage's scope, and the master prompt's explicit-scope discipline takes priority over opportunistic scope creep.

## 7. Static accessibility re-check summary

| Area | Status |
|---|---|
| aria-live regions (bid success/fail, countdown expiry, win/lose) | PASS |
| Bid confirmation panel semantics | PASS |
| Filter drawer dialog focus management | PASS |
| Heading hierarchy (`VehicleDetailPage` and named surfaces) | PASS |
| Skip-to-content landmark | PASS |
| Pagination touch targets | PASS (real-browser verified) |
| Lightbox modal dialog semantics | GAP (carry-forward, out of this stage's named scope) |
