// KAYAD AUCTION 360 — Stage 9: Escrow Capability Administration
//
// Single canonical authority for "is escrow allowed for this seller /
// this vehicle / this transaction right now". Consumed identically by:
//   - the public marketplace/auction-detail ESCROW badge
//     (carController.js::getCar, auctionController.js::getAuction), and
//   - the real purchase-time escrow-creation decision
//     (paymentController.js).
// This is deliberate: the master prompt's hard requirement is that the
// badge and the purchase decision must never disagree. Both call
// `computeEffectiveEscrowEnabled()` below with the same three inputs.
//
// It replaces:
//   - carController.js's role-hardcode
//       (`if (isDealer) escrowEnabled = false; if (isSeller) = true;`)
//   - the dead-write-path `users.escrow_approved` / `users.escrow_forced`
//     read in paymentController.js (those two columns are left in the
//     schema, unused, per Stage 9's "do not create duplicate authority
//     paths" instruction — removing columns something may defensively
//     read is a separate, riskier change out of this stage's scope).
//
// It does NOT build: a second escrow engine, a second admin dashboard, a
// second audit-log system (reuses utils/securityLogger.js::logActionFromReq,
// the same function already used by escrowController.js/carController.js),
// or live banking (escrow_accounts / platform_config.escrow_rules are
// untouched, pre-existing, real).

import { findById, update, updateMany } from "../db/index.js";
import { getEscrowRules } from "./escrowConfiguration.service.js";
import { logActionFromReq } from "../utils/securityLogger.js";

export const ESCROW_CAPABILITY_STATUSES = Object.freeze(["none", "granted", "suspended", "revoked"]);

// Only these two roles have ever been able to carry vehicle escrow
// eligibility (see Stage 8's audit: "Vehicle escrow is a private-seller
// custody product only"). A capability grant to any other role is
// meaningless and is rejected rather than silently accepted.
const CAPABILITY_ELIGIBLE_ROLES = Object.freeze(["individual_seller", "dealer"]);

/**
 * Reads the seller's current escrow capability status directly from the
 * database (never from req.user — middleware/auth.js's protect() does not
 * select this field onto req.user, and even if it did, a capability
 * revocation must take effect on the very next request, not at next login).
 */
export async function getSellerEscrowCapabilityStatus(sellerId) {
  if (!sellerId) return "none";
  const seller = await findById("users", sellerId, "role,escrowCapabilityStatus");
  if (!seller) return "none";
  return seller.escrowCapabilityStatus || "none";
}

/**
 * The single authoritative boolean. All three inputs are required so that
 * a caller cannot "forget" the platform kill-switch or the seller-level
 * authority and accidentally derive a weaker (wrong-direction) decision.
 *
 * Explicit rule (master prompt 9C): a revoked/suspended seller-level
 * capability always wins over a stale, more-permissive vehicle-level flag
 * — callers must pass the FRESH sellerCapabilityStatus, not a cached one.
 */
export function computeEffectiveEscrowEnabled({ platformEscrowEnabled, sellerCapabilityStatus, carEscrowEnabled }) {
  return Boolean(platformEscrowEnabled) && Boolean(carEscrowEnabled) && sellerCapabilityStatus === "granted";
}

/**
 * Convenience wrapper for the two single-vehicle read paths
 * (carController.js::getCar, auctionController.js::getAuction) that must
 * show the live, re-checked badge value rather than trusting the stored
 * `cars.escrow_enabled` column, which is only guaranteed in sync
 * immediately after a revoke (see setSellerEscrowCapability's cascade)
 * and at each create/update of that specific car.
 */
export async function getEffectiveEscrowForCar({ carEscrowEnabled, sellerId }) {
  const [rules, sellerCapabilityStatus] = await Promise.all([
    getEscrowRules(),
    getSellerEscrowCapabilityStatus(sellerId),
  ]);
  return computeEffectiveEscrowEnabled({
    platformEscrowEnabled: rules.enabled,
    sellerCapabilityStatus,
    carEscrowEnabled,
  });
}

/**
 * Called from carController.js's createCar/updateCar in place of the old
 * role-hardcode. Returns the boolean that `cars.escrow_enabled` should be
 * set to for a car being created/edited by this seller right now.
 *
 * This does NOT also re-check the platform `escrow_rules.enabled` switch —
 * that's intentional: `cars.escrow_enabled` records the vehicle's own
 * eligibility independent of the platform being temporarily paused, so
 * flipping `escrow_rules.enabled` off and back on does not require
 * re-touching every car row. The platform switch is re-applied at read
 * time by computeEffectiveEscrowEnabled()/getEffectiveEscrowForCar().
 */
export async function getEscrowEnabledForNewOrEditedCar(sellerId, sellerRole) {
  if (!CAPABILITY_ELIGIBLE_ROLES.includes(sellerRole)) return false;
  const status = await getSellerEscrowCapabilityStatus(sellerId);
  return status === "granted";
}

/**
 * Admin grant/revoke/suspend/restore — all four operations are the same
 * underlying write (set escrow_capability_status to the requested value),
 * which is deliberately the smallest correct design: a "suspend" and a
 * "revoke" differ only in the admin's stated intent/reason, not in their
 * effect, and "restore" is simply granting again from a suspended state.
 *
 * @param {object} params
 * @param {string} params.targetUserId - the seller being granted/revoked.
 * @param {string} params.status - one of ESCROW_CAPABILITY_STATUSES.
 * @param {string} [params.reason] - optional admin-supplied reason.
 * @param {object} params.adminUser - req.user of the authenticated admin.
 * @param {object} params.req - the original request (for logActionFromReq).
 */
export async function setSellerEscrowCapability({ targetUserId, status, reason, adminUser, req }) {
  if (!ESCROW_CAPABILITY_STATUSES.includes(status)) {
    const err = new Error(`Invalid escrow capability status: ${status}`);
    err.statusCode = 400;
    throw err;
  }

  if (!adminUser || !adminUser.id) {
    const err = new Error("Authenticated admin identity is required");
    err.statusCode = 401;
    throw err;
  }

  // The client must not be able to simply submit a status and thereby
  // grant itself escrow capability, nor can an admin modify their own
  // capability through this endpoint (an admin account is not a seller
  // account in this platform's role model, but this check is kept as an
  // explicit, independent guard rather than relying solely on the
  // role-eligibility check below).
  if (String(targetUserId) === String(adminUser.id)) {
    const err = new Error("An admin cannot grant or modify their own escrow capability");
    err.statusCode = 403;
    throw err;
  }

  const target = await findById("users", targetUserId, "id,role,escrowCapabilityStatus");
  if (!target) {
    const err = new Error("Target seller not found");
    err.statusCode = 404;
    throw err;
  }

  if (!CAPABILITY_ELIGIBLE_ROLES.includes(target.role)) {
    const err = new Error(`Escrow capability only applies to individual sellers and dealers, not role "${target.role}"`);
    err.statusCode = 400;
    throw err;
  }

  const previousStatus = target.escrowCapabilityStatus || "none";

  // Idempotent: re-applying the same status still succeeds and still
  // writes a fresh escrow_capability_updated_at/reason + audit entry
  // (useful for "renew the reason"), but performs no redundant car
  // cascade when nothing actually changed.
  const updated = await update("users", targetUserId, {
    escrowCapabilityStatus: status,
    escrowCapabilityGrantedBy: adminUser.id,
    escrowCapabilityUpdatedAt: new Date().toISOString(),
    escrowCapabilityReason: reason || null,
  });

  // Explicit rule (master prompt 9C): a weaker child-level (vehicle) flag
  // must never be left overriding an explicitly revoked/suspended parent
  // (seller) capability. Cascading `cars.escrow_enabled = false` for every
  // one of this seller's vehicles the instant they are suspended/revoked
  // guarantees the stored per-vehicle flag never lies, without any
  // per-request recomputation cost for the marketplace list view.
  //
  // The inverse (granting) is deliberately NOT cascaded onto existing
  // vehicles: a seller's already-listed vehicles keep whatever escrow
  // terms they were created/last edited under, and only newly
  // created/edited vehicles pick up the new "granted" eligibility. This
  // avoids silently changing the terms of an existing, possibly
  // already-mid-sale listing underneath a buyer.
  if (previousStatus !== status && (status === "suspended" || status === "revoked")) {
    await updateMany("cars", { dealer: targetUserId }, { escrowEnabled: false });
  }

  await logActionFromReq(req, "escrow_capability_changed", {
    target: targetUserId,
    targetModel: "User",
    details: {
      previousStatus,
      newStatus: status,
      reason: reason || null,
      actorId: adminUser.id,
      cascadedVehicleRevocation: previousStatus !== status && (status === "suspended" || status === "revoked"),
    },
  });

  return {
    userId: targetUserId,
    previousStatus,
    status,
    updatedAt: updated.escrowCapabilityUpdatedAt,
    grantedBy: adminUser.id,
    reason: reason || null,
  };
}
