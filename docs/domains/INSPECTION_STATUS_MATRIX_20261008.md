# KAYAD AUCTION 360 — Stage 5: Inspection Status Matrix
**Date:** 2026-10-08

Two independent status machines exist (per
`INSPECTION_ARCHITECTURE_CONVERGENCE_20261008.md`, these are two distinct
products, not one machine split in two). Each is tabled separately below in
the required `| Current | Action | Next | Actor | Authorization | Idempotent | Evidence |` format.

## A. "Ghost Check" pre-purchase inspection (`vehicle_inspections` table)

| Current | Action | Next | Actor | Authorization | Idempotent | Evidence |
|---|---|---|---|---|---|---|
| (none) | `createOrder` | `requested` | Buyer | `requireAuth`; duplicate-active-inspection check (`activeStatuses` = requested/assigned/in_progress) | No — a tight concurrent double-submit race exists (read-then-insert, no unique constraint observed on `(car_id, requester_id)` with an open status); not fixed this stage, see §3 below, carried forward | `legacyCompatibilityController.js::createOrder` |
| `requested` | `assign` | `assigned` | Admin/superadmin | `requireRole(['admin','superadmin'])` + precondition `status==='requested'` | Yes — re-assigning an already-`assigned`/`in_progress`/`completed` inspection is rejected (400) | `assign()`, regression-tested since Stage 2 (`legacyInspectionAssign.test.js`) |
| `assigned` | `start` | `in_progress` | Assigned inspector or admin | ownership check (`inspector_id === req.user.id`) or admin | **Fixed this stage** — previously had no status precondition at all, permitting a backward transition from `completed` back to `in_progress`; now requires `status==='assigned'` | `start()`, new regression test `legacyInspectionStartConfirmPayment.test.js` |
| `in_progress` | `submit` | `completed` | Assigned inspector or admin | ownership check + precondition `status==='in_progress'` | Yes — re-submitting a `completed` inspection is rejected (400) | `submit()`, unchanged this stage, re-verified |
| `completed` | (terminal) | — | — | — | — | — |
| any | `confirmPayment` (reads, does not transition status) | unchanged | Buyer (own orders) or admin (any order) | **Fixed this stage** — previously had no ownership scoping at all (any authenticated user, wildcard-exploitable via `.like()`); now scoped to `requester_id = req.user.id` for non-admins | N/A (read-only) | `confirmPayment()`, new regression test |

## B. Inspection Marketplace / Provider Operations (`inspection_bookings` table)

| Current | Action | Next | Actor | Authorization | Idempotent | Evidence |
|---|---|---|---|---|---|---|
| (none) | `createBooking` | `booked` | Customer | `requireAuth`; package/provider must be active+verified; mobile/workshop capability enforced server-side | Partial — slot-collision check exists (`slotFilters` excludes `cancelled`/`no_show`); not re-derived this stage, pre-existing | `bookingService.createBooking` |
| `booked`/`confirmed` | `assignInspector` | `inspector_assigned` | Provider (own provider only) | `requireProviderOwnership` + precondition `['booked','confirmed'].includes(status)` | Yes — precondition rejects a second assignment once already `inspector_assigned` | `bookingService.assignInspector`, pre-existing |
| any non-terminal | `updateBookingStatus` | per `validTransitions[current]` allow-list | Provider (own) / staff | `requireProviderOwnership`; explicit `validTransitions` map rejects any status not in the allow-list for the current status | Yes — illegal transitions throw 400 by construction | `bookingService.updateBookingStatus`, pre-existing |
| `booked`/`confirmed`/etc (non-terminal) | `cancelBooking` | `cancelled` | Customer (own booking only) | ownership check (`booking.customer_id === userId`); precondition excludes `closed`/`cancelled`/`no_show` | Yes — cancelling an already-terminal booking is rejected (400) | `bookingService.cancelBooking`, pre-existing, re-verified this stage |
| `report_generated`/`customer_reviewed`/`closed` | `createReport` | (report created, booking status advanced by `reportService`) | Provider/staff (own booking) | `reportService.createReport` checks booking-status gate directly (re-verified: line ~202 of `bookingService.js` checks `report_generated`/`customer_reviewed`/`closed` before certain paths) | Not re-derived this stage | `reportService.createReport`, pre-existing |
| terminal statuses: `closed`, `cancelled`, `no_show` | — | (none — all three are dead ends by the `validTransitions` map and the explicit terminal-status checks in `cancelBooking`) | — | — | Yes by construction | `bookingService.js` `validTransitions` |

## Summary

- 2 of the Ghost Check machine's 9 table rows reflect this stage's fixes
  (`start`'s missing precondition; `confirmPayment`'s missing ownership
  scope). Both regression-tested via the established revert → confirm-fail →
  restore → confirm-pass discipline.
- The Marketplace machine's transitions were re-verified against its own
  `validTransitions` allow-list and ownership middleware but required no
  fixes this stage — its status-machine discipline (an explicit allow-list
  object, not scattered `if` precondition checks) is a stronger pattern than
  the Ghost Check machine's per-function precondition checks, and is noted
  as a design pattern worth carrying forward if the Ghost Check machine is
  ever revisited, but no such revisit is in Stage 5's scope.
- One genuine create-time race (`createOrder`'s read-then-insert
  duplicate-active-inspection check) is carried forward, not fixed — see
  `INSPECTION_PROVIDER_OPERATIONS_AUDIT_20261008.md` §3 for severity
  reasoning on why this did not meet this stage's fix bar.
