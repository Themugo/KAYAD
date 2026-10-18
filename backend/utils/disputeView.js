// backend/utils/disputeView.js
// ─────────────────────────────────────────────────────────────────────────
// Stage 4 (S4-F-02, 2026-10-18) — read model of a dispute for the PARTIES.
//
// controllers/disputeController.js returned the raw `escrows` row
// (select('*') / .select().single() / RPC result) to the buyer and the seller on
// GET /disputes/my, GET /disputes/:id, POST /disputes and POST /disputes/:id/appeal.
// That row carries staff-only data:
//   - disputeInternalNotes  (notes default to isPrivate=true);
//   - disputeMediation.mediatorNotes / mediatorId / satisfaction flags;
//   - disputeResolution.decidedBy and platformFee (buyers must not see the
//     platform commission - utils/escrowViewModel.js shows it to seller/staff only);
//   - commission / sellerAmount and payment provider references.
// utils/escrowViewModel.js already projects the escrow API for parties; the
// dispute API had been missed. This module reuses that projection and adds only
// the dispute facts a party is entitled to. Staff keep the full row.
// ─────────────────────────────────────────────────────────────────────────
import { projectEscrowForViewer, viewerRoleFor } from "./escrowViewModel.js";

const pickDefined = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));

export function projectDisputeForParty(escrow, user) {
  const e = escrow?.toObject ? escrow.toObject() : escrow;
  if (!e) return e;
  const viewerRole = viewerRoleFor(e, user); // "buyer" | "seller" | "staff" | null
  const out = projectEscrowForViewer(e, user);
  out.disputeCategory = e.disputeCategory ?? null;

  const med = e.disputeMediation;
  out.disputeMediation = med ? pickDefined(med, ["scheduledAt", "startedAt", "completedAt", "outcome"]) : null;

  const res = e.disputeResolution;
  if (res) {
    const keys = ["decision", "reason", "decidedAt", "implemented", "implementedAt", "buyerAmount"];
    if (viewerRole === "seller") keys.push("sellerAmount", "platformFee");
    out.disputeResolution = pickDefined(res, keys);
  } else {
    out.disputeResolution = null;
  }

  // Only notes explicitly marked not-private are shared, and without the staff member's id.
  out.disputeNotes = (Array.isArray(e.disputeInternalNotes) ? e.disputeInternalNotes : [])
    .filter((n) => n && n.isPrivate === false)
    .map((n) => ({ id: n.id ?? null, note: n.note ?? "", createdAt: n.createdAt ?? null }));

  const appeal = e.disputeAppeal;
  out.disputeAppeal = appeal ? pickDefined(appeal, ["reason", "additionalDetails", "submittedAt", "status"]) : null;
  return out;
}

/** Staff keep the full operational row; everyone else gets the party projection. */
export function projectDispute(escrow, user, isStaff) {
  return isStaff ? escrow : projectDisputeForParty(escrow, user);
}

export default projectDispute;
