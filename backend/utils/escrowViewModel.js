// Escrow read model for the people who are parties to a deal.
//
// Why this exists (see ESCROW_PRODUCT_DISCOVERY.md §9): GET /api/escrow/my and
// GET /api/escrow/:id used to return `.populate("car buyer seller payment")`
// with no field list, i.e. the other party's full user row (e-mail, phone,
// credits, commission balance, referral earnings…) and the full payment row
// (phone, M-Pesa receipt, checkout id). This module is the one place that
// decides what a party may see and which actions the backend will accept for
// them right now. The action list is derived from the state machine that the
// action endpoints themselves use, so the UI cannot offer a button the
// backend would reject.

import { STATES, validateTransition } from "../services/escrowStateMachine.js";
import { isEscrowBuyer, isEscrowSeller, canViewAnyEscrow, toIdString } from "./escrowAccess.js";

// A buyer may ask staff to release once they have accepted the vehicle.
export const REQUEST_RELEASE_STATES = Object.freeze([STATES.VEHICLE_CONFIRMED, STATES.DELIVERED]);
export const HELD_STATES = Object.freeze([STATES.FUNDED, STATES.VEHICLE_CONFIRMED, STATES.DELIVERED, STATES.DISPUTED]);
export const SETTLED_STATES = Object.freeze([STATES.RELEASED, STATES.REFUNDED, STATES.CLOSED]);

export function viewerRoleFor(escrow, user) {
  if (!user) return null;
  if (isEscrowBuyer(escrow, user.id)) return "buyer";
  if (isEscrowSeller(escrow, user.id)) return "seller";
  if (canViewAnyEscrow(user)) return "staff";
  return null;
}

export function canRequestRelease(escrow) {
  return REQUEST_RELEASE_STATES.includes(escrow?.status);
}

/** Actions the backend will accept from this viewer for this escrow right now. */
export function availableActionsFor(escrow, viewerRole) {
  const actions = [];
  const status = escrow?.status;
  if (viewerRole === "buyer") {
    if (status === STATES.PENDING) actions.push("view_funding_instructions");
    if (validateTransition(status, STATES.VEHICLE_CONFIRMED, "buyer", escrow).allowed) actions.push("confirm_vehicle");
    if (canRequestRelease(escrow)) actions.push("request_release");
  }
  if (viewerRole === "seller" && validateTransition(status, STATES.DELIVERED, "seller", escrow).allowed) actions.push("confirm_delivery");
  if ((viewerRole === "buyer" || viewerRole === "seller") && validateTransition(status, STATES.DISPUTED, viewerRole, escrow).allowed) actions.push("open_dispute");
  return actions;
}

const iso = (v) => (v ? new Date(v).toISOString?.() ?? v : null);
const party = (p) => ({ id: toIdString(p), name: (p && typeof p === "object" && (p.name || null)) || null });

function safeCar(car) {
  if (!car || typeof car !== "object") return car ? { id: toIdString(car), title: null } : null;
  const images = Array.isArray(car.images) ? car.images.slice(0, 1).map((i) => ({ url: i?.url ?? (typeof i === "string" ? i : null) })) : [];
  return { id: toIdString(car), title: car.title ?? null, images, price: car.price ?? null, vin: car.vin ?? null, registrationNumber: car.registrationNumber ?? null };
}

const evidenceItem = (e) => ({ type: e?.type ?? null, fileName: e?.fileName ?? null, mimeType: e?.mimeType ?? null, size: e?.size ?? null, createdAt: e?.createdAt ?? null, verified: Boolean(e?.verified) });
const timelineItem = (t) => ({ action: t?.action ?? null, at: t?.at ?? null, note: t?.note ?? null, fromStatus: t?.fromStatus ?? null, toStatus: t?.toStatus ?? null });

/**
 * Projection for a party (or staff reading through the party endpoint).
 * Counterparty is reduced to { id, name }. Fee split only for seller / staff.
 */
export function projectEscrowForViewer(escrow, user) {
  const viewerRole = viewerRoleFor(escrow, user);
  const e = escrow?.toObject ? escrow.toObject() : escrow;
  const out = {
    id: toIdString(e.id ?? e._id),
    status: e.status,
    amount: Number(e.amount || 0),
    currency: "KES",
    car: safeCar(e.car),
    buyer: party(e.buyer),
    seller: { ...party(e.seller), businessName: (e.seller && typeof e.seller === "object" && e.seller.businessName) || null },
    createdAt: iso(e.createdAt),
    updatedAt: iso(e.updatedAt),
    fundedAt: iso(e.fundedAt),
    fundingVerifiedAt: iso(e.fundingVerifiedAt),
    vehicleConfirmedAt: iso(e.vehicleConfirmedAt),
    deliveredAt: iso(e.deliveredAt),
    autoReleaseEligibleAt: iso(e.autoReleaseEligibleAt),
    releasedAt: iso(e.releasedAt),
    refundedAt: iso(e.refundedAt),
    closedAt: iso(e.closedAt),
    disputedAt: iso(e.disputedAt),
    disputedBy: toIdString(e.disputedBy),
    disputeReason: e.disputeReason ?? null,
    disputeTitle: e.disputeTitle ?? null,
    disputeDescription: e.disputeDescription ?? null,
    disputeWorkflowStatus: e.disputeWorkflowStatus ?? null,
    disputeEvidence: Array.isArray(e.disputeEvidence) ? e.disputeEvidence.map(evidenceItem) : [],
    disputeTimeline: Array.isArray(e.disputeTimeline) ? e.disputeTimeline.map(timelineItem) : [],
    viewerRole,
    availableActions: availableActionsFor(e, viewerRole),
  };
  if (viewerRole === "seller" || viewerRole === "staff") {
    out.commission = Number(e.commission || 0);
    out.sellerAmount = Number(e.sellerAmount || 0);
  }
  return out;
}

/** Scope-labelled totals over the viewer's OWN deals — never platform totals. */
export function summarizeForViewer(projected) {
  const rows = Array.isArray(projected) ? projected : [];
  const held = rows.filter((r) => HELD_STATES.includes(r.status));
  return {
    scope: "participant",
    currency: "KES",
    totalDeals: rows.length,
    heldAmount: held.reduce((s, r) => s + Number(r.amount || 0), 0),
    heldCount: held.length,
    pendingFundingCount: rows.filter((r) => r.status === STATES.PENDING).length,
    activeCount: rows.filter((r) => !SETTLED_STATES.includes(r.status)).length,
    settledCount: rows.filter((r) => SETTLED_STATES.includes(r.status)).length,
    needsActionCount: rows.filter((r) => r.availableActions.some((a) => a !== "open_dispute" && a !== "view_funding_instructions")).length,
  };
}

/**
 * Operator actions that are both permitted for this operator AND valid for the
 * escrow's current state/related records. Derived from the state machine (for
 * the transitions) and escrowStaffCapabilities (for the permission) so the
 * operations screen can only offer what its routes will accept.
 */
export function staffActionsFor(escrow, caps, { refund = null, payout = null } = {}) {
  const status = escrow?.status;
  const actions = [];
  if (!caps) return actions;
  if (status === STATES.PENDING && caps.reconcile) actions.push("verify_funding");
  if (caps.release && validateTransition(status, STATES.RELEASED, "admin", { ...escrow, deliveryConfirmed: true }).allowed) actions.push("release");
  if (caps.refund && validateTransition(status, STATES.REFUNDED, "admin", escrow).allowed) actions.push("refund");
  if (status === STATES.REFUNDED && caps.completeRefund && refund && ["pending", "processing"].includes(refund.status)) actions.push("complete_refund");
  if (status === STATES.RELEASED && caps.settle && !(payout && ["processing", "paid"].includes(payout.status))) actions.push("payout");
  if (caps.close && validateTransition(status, STATES.CLOSED, "admin", escrow).allowed) actions.push("close");
  return actions;
}
