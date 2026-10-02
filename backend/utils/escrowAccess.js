// backend/utils/escrowAccess.js
// ─────────────────────────────────────────────────────────────
// Single place that decides "who is a party to this escrow" and
// "which staff may view any escrow".
//
// Why this exists: Escrow.populate("buyer seller") (models/_base.js)
// replaces the FK with a plain row object, so `String(escrow.buyer)`
// yields "[object Object]" and a legitimate party was rejected.
// Unpopulated records hold a bare id. Both shapes must resolve to
// the same comparable string.
// ─────────────────────────────────────────────────────────────

import { PERM, WEBHOIST, hasPermission, userHasPermission } from "../config/roles.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Normalize an id or a populated record to a lowercase UUID string, or null.
 * KAYAD identities are Postgres UUIDs (see utils/validateId.js), so anything
 * that is not a UUID after unwrapping is treated as unusable and fails closed.
 * Objects are only unwrapped through their `id` / `_id` fields; their
 * toString() is never trusted.
 */
export function toIdString(ref) {
  let value = ref;
  for (let depth = 0; depth < 2 && value !== null && typeof value === "object"; depth += 1) {
    value = value.id ?? value._id ?? null;
  }
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  return UUID_RE.test(s) ? s : null;
}

/** True only when both ids resolve and match. Fails closed. */
export function sameId(a, b) {
  const x = toIdString(a);
  const y = toIdString(b);
  return x !== null && y !== null && x === y;
}

export const isEscrowBuyer = (escrow, userId) => sameId(escrow?.buyer ?? escrow?.buyer_id ?? escrow?.buyerId, userId);
export const isEscrowSeller = (escrow, userId) => sameId(escrow?.seller ?? escrow?.seller_id ?? escrow?.sellerId, userId);
export const isEscrowParty = (escrow, userId) => isEscrowBuyer(escrow, userId) || isEscrowSeller(escrow, userId);

/**
 * Staff who may view any escrow. Derived from the canonical role contract
 * (config/roles.js): anyone holding MANAGE_ESCROW (escrow_officer, admin,
 * superadmin) or the webhoist owner. `moderator` is kept explicitly because
 * the existing endpoints already admitted it (dispute handling).
 */
export function canViewAnyEscrow(user) {
  if (!user) return false;
  if (user.effectiveRole === WEBHOIST) return true;
  return userHasPermission(user, PERM.VIEW_ESCROW) || userHasPermission(user, PERM.MANAGE_ESCROW) || user.role === "moderator";
}

// Roles that may drive money-moving escrow actions (release, refund, close)
// and act on behalf of a party (confirm vehicle / delivery). This mirrors the
// role lists inside the database function kayad_transition_escrow_atomic and
// services/escrowStateMachine.js. The database trusts the p_role string the
// application passes, so this check is the real gate: it must be applied
// before a handler hands "admin" to the service layer.
// escrow_officer is deliberately excluded: the database does not accept it
// for these transitions. Add it in all three places together or not at all.
export const ESCROW_ADMIN_ROLES = Object.freeze(["admin", "superadmin"]);

export function canActAsEscrowAdmin(user) {
  if (!user) return false;
  if (user.effectiveRole === WEBHOIST) return true;
  return ESCROW_ADMIN_ROLES.includes(user.role);
}

/** Route middleware: replaces adminOnly (any staff role) on money-moving routes. */
export function escrowAdminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!canActAsEscrowAdmin(req.user)) {
    return res.status(403).json({ success: false, message: "Escrow administrator access only" });
  }
  return next();
}

export function requireEscrowPermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (userHasPermission(req.user, permission) || userHasPermission(req.user, PERM.MANAGE_ESCROW)) return next();
    return res.status(403).json({ success: false, message: "Insufficient escrow permission" });
  };
}

export const escrowViewOnly = requireEscrowPermission(PERM.VIEW_ESCROW);
export const escrowOperateOnly = requireEscrowPermission(PERM.OPERATE_ESCROW);
export const escrowReleaseOnly = requireEscrowPermission(PERM.APPROVE_ESCROW_RELEASE);
export const escrowRefundOnly = requireEscrowPermission(PERM.APPROVE_ESCROW_REFUND);
export const escrowSettlementOnly = requireEscrowPermission(PERM.SETTLE_ESCROW_PAYOUT);
export const escrowReconcileOnly = requireEscrowPermission(PERM.RECONCILE_ESCROW);
export const escrowConfigureOnly = requireEscrowPermission(PERM.CONFIGURE_ESCROW);

export const canViewEscrow = (escrow, user) => !!user && (isEscrowParty(escrow, user.id) || canViewAnyEscrow(user));
