# KAYAD AUCTION 360 — STAGE 12 — CUSTOMER AUCTION RUNTIME JOURNEY
**Date:** 2026-10-08
**Journey under audit:** MARKETPLACE → DETAIL → AUCTION → BID → CONFIRMATION → LIVE → COUNTDOWN → WIN/LOSE → PAYMENT → ESCROW → INSPECTION → FULFILMENT

This document states plainly, stage by stage, what was **actually demonstrated in a real browser**, what was **demonstrated only in jsdom/Vitest** (still real test coverage, but not real-browser-verified), and what is **genuinely ENVIRONMENT-BLOCKED**. No stage is upgraded past what was actually executed.

## 1. Real-browser-verified stages

| Stage | What was demonstrated | Evidence |
|---|---|---|
| DETAIL | `VehicleDetailPage` renders correctly at all 6 tested widths, no overflow; bid form keyboard-reachable; bid success/error live-region announcements present in the real DOM | `STAGE12_BROWSER_DEVICE_CERTIFICATION_20261008.md` §3, §5 |
| BID | Filling the bid amount input and tabbing reaches the real submit button with no trap | `STAGE12_BROWSER_DEVICE_CERTIFICATION_20261008.md` §5 |
| CONFIRMATION | `AuctionBidConfirmation` renders as a `role="status"` live-region panel (not a dialog), no overflow at any tested width | `STAGE12_BROWSER_DEVICE_CERTIFICATION_20261008.md` §3 |
| COUNTDOWN | `CountdownDisplay` renders correctly in both live-ticking and expired states, no overflow; expired state announces via `role="status"`, ticking state deliberately does not | `STAGE12_BROWSER_DEVICE_CERTIFICATION_20261008.md` §3; `STAGE12_ACCESSIBILITY_AUDIT_20261008.md` §2 |
| WIN / LOSE | `AuctionWinningCelebration` (win) and the ended-for-non-winner panel (lose) both render correctly, no overflow, both announce via `role="status"` | `STAGE12_BROWSER_DEVICE_CERTIFICATION_20261008.md` §3; `STAGE12_ACCESSIBILITY_AUDIT_20261008.md` §2 |

## 2. Demonstrated via Vitest/jsdom only (real test coverage, NOT real-browser-verified this stage)

| Stage | What was demonstrated | Why not real-browser this stage |
|---|---|---|
| MARKETPLACE | Full inventory grid rendering, filtering, pagination logic, saved-vehicle toggling — covered by the existing `VehicleMarketplace.test.tsx` suite (357 passing tests overall, including pagination-specific assertions) | Mounting the full `VehicleMarketplace` grid in the real-browser harness would have required additional fixture dependencies (full inventory list shape, saved-vehicle state, admin hero config) beyond what the harness built out in the time available for this stage. The harness did independently verify the pagination button's real pixel touch-target size (§4 of the certification doc) by rendering that one fragment with real, verbatim-copied classNames — that specific check IS real-browser-verified; the surrounding grid is not |
| LIVE AUCTION ROOM | `AuctionLivePage`'s full lifecycle (winning celebration panel, ended-for-non-winner panel, toast system) — covered by jsdom-based component tests | The full `AuctionLivePage` mount has socket/live-update dependencies beyond the harness's two stubbed contexts; not attempted via real browser this stage. The two panels it renders (`AuctionWinningCelebration`, ended-for-non-winner) WERE independently real-browser-verified in isolation (§1 above) — the full page shell around them was not |

This is stated explicitly rather than implied: **the harness did not mount the full MARKETPLACE grid or the full LIVE AUCTION ROOM page**, so no claim of full-page real-browser certification is made for either. What was mounted and verified in isolation (the pagination fragment, the win/lose panels, the countdown, the bid confirmation panel, the detail page) is real-browser-verified; the surrounding page shells are jsdom-verified only.

## 3. Genuinely ENVIRONMENT-BLOCKED (no live backend available)

| Stage | Status | Reason |
|---|---|---|
| PAYMENT | ENVIRONMENT-BLOCKED | No M-Pesa sandbox/production credentials in this sandbox; no real payment initiation/callback round-trip was attempted or claimed |
| ESCROW | ENVIRONMENT-BLOCKED | No live Supabase credentials; no real escrow state transition against a live database was attempted or claimed |
| INSPECTION | ENVIRONMENT-BLOCKED | Same — no live backend reachable |
| FULFILMENT | ENVIRONMENT-BLOCKED | Same — no live backend reachable |

Consistent with every prior stage (Stage 9/10 confirmed the identical blocker). No financial completion, escrow transition, or fulfilment state is claimed as demonstrated from frontend navigation alone — per the master prompt's explicit instruction, frontend routing through a payment/escrow screen is never presented as proof that the underlying backend operation occurred.

## 4. Architecture-integrity note (relevant to this journey)

Walking this journey confirmed — consistent with Phase L in `STAGE12_EXECUTION_REPORT_20261008.md` — that no second bid/auction/payment/escrow authority was introduced anywhere along it. Every real-browser-mounted component (`VehicleDetailPage`, `MobileFilterDrawer`, `AuctionBidConfirmation`, `AuctionWinningCelebration`, `CountdownDisplay`) is the single, real, unmodified production component already wired to the one canonical backend-authoritative `placeBid()`/escrow flow from prior stages; the harness only swapped the two context hooks for fixtures, never the components' own logic or the services they call.

## 5. Summary

| Segment | Verdict |
|---|---|
| DETAIL → BID → CONFIRMATION → COUNTDOWN → WIN/LOSE | Real-browser-verified (layout, keyboard, live-region, reduced-motion) |
| MARKETPLACE (full grid) | jsdom-verified only; pagination fragment real-browser-verified in isolation |
| LIVE AUCTION ROOM (full page) | jsdom-verified only; win/lose panels real-browser-verified in isolation |
| PAYMENT / ESCROW / INSPECTION / FULFILMENT | ENVIRONMENT-BLOCKED (no live backend) |
