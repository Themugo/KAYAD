// backend/utils/carModerationGuard.js
//
// STAGE 7 ADMIN/OPERATIONS PRIVILEGE-BOUNDARY FIX.
//
// POST /api/admin/cars/:id/moderate (backend/routes/adminRoutes.js) decides
// a *pending listing* (new submission or re-submission) -- it is not meant
// to mutate the status of a car that already has a completed, financially-
// settled sale. The handler had no precondition at all: any admin/superadmin
// (or any staff role with MANAGE_CARS permission, per adminRoutes.js's own
// path-pattern permission layer) could call approve on a car whose status
// was already 'sold' (set by marketplaceFulfilment.service.js's escrow-
// release path -- sold:true, status:'sold', isPaid:true,
// paymentStatus:'paid') and silently flip it back to 'available',
// re-listing a completed sale in the public marketplace while the
// payment/escrow/ownership records still show it as sold. This is exactly
// the "sold vehicles cannot casually be returned to purchasable state"
// invariant Stage 7 is required to verify.
//
// A legitimate dispute/refund/re-listing decision on a sold car belongs to
// the escrow/refund/ownership workflows already certified in Stage 6, not
// to listing moderation -- so this is a reject, not a redesign, and it is
// factored out here (rather than left inline in the ~2,200-line route file)
// so the precondition itself can be unit-tested without mocking that file's
// full 30+-module import surface.

/**
 * Returns a plain, truthy reason string if `car` is no longer eligible for
 * listing moderation (approve/reject), or `null` if moderation may proceed.
 */
export function moderationBlockedReason(car) {
  if (!car) return null;
  if (car.status === "sold" || car.sold === true) {
    return "This vehicle has already been sold; listing moderation no longer applies. Use the escrow/refund workflow to unwind a completed sale.";
  }
  return null;
}

export default moderationBlockedReason;
