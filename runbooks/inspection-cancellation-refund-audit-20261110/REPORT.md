# KAYAD Inspection Cancellation & Refund Audit

**Audit date:** 2026-11-10  
**Source archive:** `KAYAD-DEALER-WORKSPACE-FULL-UPDATED-1110(1).zip`  
**Scope:** Customer cancellation, inspection payment callback, refund processing, workers/queues, and existing automated coverage.

## Executive conclusion

The supplied source did not contain an inspection refund worker, an inspection refund payment-provider callback, or an inspection refund queue consumer. The M-Pesa callback handles successful inspection *payments* by calling `kayad_process_inspection_payment_atomic`; no corresponding inspection refund callback path was found. The generic notification/email/SMS/fraud/image/SEO workers do not process inspection refunds.

The original customer cancellation service calculated a policy percentage and returned a refund amount but did not create a refund request, call the refund service, or contact a payment provider. It could also cancel a booking whose payment had already settled. The original admin refund service called a database RPC that created ledger entries and marked `inspection_refunds.status='completed'`, but did not execute or verify an external payment-provider refund. This could misrepresent ledger accounting as a completed cash refund.

The source changes in this archive therefore fail closed:

1. Customer self-service cancellation is restricted to bookings whose `payment_status` is exactly `pending`.
2. Cancellation uses a conditional database update matching the booking ID, `payment_status='pending'`, and a non-terminal booking status. If a payment wins the race first, cancellation returns HTTP 409 without writing status history.
3. An unpaid cancellation returns a zero refund amount and an explicit `not_applicable_unpaid_booking` status; it no longer calculates or implies a refund.
4. The admin inspection refund service now returns HTTP 501 and does not call the old ledger-only RPC until an actual provider refund integration, verified provider result, and idempotent confirmation flow exist.
5. A new source migration adds a terminal-status guard to `kayad_process_inspection_payment_atomic`, so a delayed payment callback cannot settle a booking already marked `cancelled`, `closed`, or `no_show`.

**This is a safety correction, not a completed automated refund implementation.** Paid inspection cancellation/refund remains a Finance/Support-reviewed process outside the current automated product path until a payment-provider refund API/callback and an auditable approval/reconciliation workflow are implemented.

## Source trace and evidence

### Customer cancellation

- Route: `backend/inspection/routes/inspectionRoutes.js` — `POST /bookings/:bookingId/cancel`, authenticated.
- Controller: `backend/inspection/controllers/providerController.js` — passes the authenticated `req.user.id` to the service.
- Service: `backend/inspection/services/bookingService.js` — originally checked customer ownership and terminal booking states, calculated a 100/50/0% refund amount, then updated the booking and history. It did not call `settlementService.processRefund`.
- UI: `src/features/InspectionsView/BookingActions.tsx` — cancellation dialog explicitly describes an unpaid booking; the listing's `canPay` condition is based on `paymentStatus === 'pending'`.

### Payment callback

- `backend/services/paymentCallback.service.js` contains an inspection payment branch. It calls `kayad_process_inspection_payment_atomic` after processing the M-Pesa receipt and updates the payment record to success.
- No inspection refund callback or provider refund receipt handler was found in this callback service.
- The production function definition supplied during the audit locks the booking and validates duplicate payment references/provider eligibility, but does not reject cancelled/closed/no-show bookings. The new source migration adds this missing guard.

### Workers and queues

- Reviewed `backend/workers/`, `backend/queues/`, `backend/infrastructure/queues/`, and refund/cancellation references across backend source.
- No inspection refund worker, queue producer/consumer, scheduled retry, or provider refund reconciliation consumer was found.
- Other generic refund references relate to purchase/escrow/auction/wallet workflows and are not evidence of inspection refund processing.

### Existing tests before this change

- `src/__tests__/features/inspections/BookingActions.test.tsx` tested a generic cancellation success/error UI path; it did not assert paid-booking rejection or refund execution.
- `e2e/inspection-journey/inspection_journey.js` exercised cancellation only for an unpaid booking and mocked the cancel endpoint response.
- No backend inspection cancellation/refund service test or inspection refund provider callback/worker test was found.

## Changes made in this archive

| File | Change |
|---|---|
| `backend/inspection/services/bookingService.js` | Reject non-pending payment states; conditionally update only pending/non-terminal bookings; return no refund for unpaid cancellation. |
| `backend/inspection/services/settlementService.js` | Fail closed with HTTP 501 rather than marking an unverified external refund completed through a ledger-only RPC. |
| `backend/inspection/routes/inspectionRoutes.js` | Clarify route's fail-closed state in source comment. |
| `backend/inspection/README.md` | Document that admin refund endpoint is disabled until provider confirmation is integrated. |
| `supabase/migrations/20261110130000_inspection_payment_reject_cancelled_bookings.sql` | Add booking terminal-state guard to inspection payment RPC. Source only; not applied to any database. |
| `backend/tests/inspection/bookingCancellationRefundSafety.test.js` | Add tests for unpaid cancellation, paid/unknown payment-state rejection, ownership, and conditional-update race failure. |
| `backend/tests/inspection/inspectionRefundProviderBoundary.test.js` | Assert refund operation fails closed and does not call the ledger-only RPC. |
| `backend/tests/inspection/paymentCancellationGuardMigration.test.js` | Assert migration includes row lock, terminal-state guard before ledger posting, and service-role grant. |

## Validation performed

- `node --check` passed for modified backend service files, route file, and newly added test files.
- Source search confirmed no inspection refund worker/queue/callback implementation in the supplied archive.
- ZIP contents were extracted and inspected; original project root folder is retained in the output archive.
- Jest/Vitest execution was **not performed** because the supplied archive did not contain root or backend `node_modules`. No dependency install was performed.
- No production SQL, migration, database permissions, or data were changed.
- No Git commit, push, or deployment was performed.

## Remaining work before production certification

1. Implement a real inspection payment-provider refund integration, including the provider's request/response/callback contract and verified external refund reference.
2. Add a persisted refund request lifecycle with stable idempotency key, separate approval/execution/confirmation states, unique constraints, retry-safe callbacks, and reconciliation.
3. Ensure customer cancellation of a paid booking opens a reviewable request rather than cancelling or promising a refund.
4. Inspect the live definition of `kayad_admin_resolve_inspection_dispute_atomic` and reconcile it with source; the supplied source archive does not contain its creation migration.
5. Reconcile the production migration ledger before applying the new payment cancellation guard migration. The migration is not authorized or applied by this audit.
6. Execute the new backend tests and full project test/build suites in a correctly provisioned Node >=22.22.2 environment, then perform staging M-Pesa UAT with provider-confirmed refunds.

## Safety boundary

The archive is a source-code deliverable only. Do not apply its migration to KAYAD EA production until the remote-only migration investigation, schema compatibility review, backup/restore plan, and explicit production authorization are complete.
