import { findById, findOne } from "../db/index.js";

// Shared fail-closed evaluator for proposal-backed private-seller auctions.
export async function evaluatePrivateSellerAuctionEligibility(carOrId) {
  const car = typeof carOrId === "object" && carOrId ? carOrId : await findById("cars", carOrId);
  if (!car) return { eligible: false, code: "VEHICLE_NOT_FOUND", blockers: ["Vehicle not found"] };
  const proposal = await findOne("private_seller_auction_proposals", { car_id: car.id });
  // Compatibility boundary only: canonical private-seller classification still needs integration.
  if (!proposal) return { eligible: true, scope: "not_private_seller_proposal", blockers: [] };
  const blockers = [];
  if (proposal.proposal_status !== "approved") blockers.push("Admin approval is not current");
  if (proposal.verification_status !== "passed") blockers.push("Vehicle verification has not passed");
  if (proposal.custody_status !== "in_custody") blockers.push("Vehicle is not recorded in approved physical custody");
  if (!proposal.inspection_payment_confirmed_at) blockers.push("Seller inspection/custody payment is not confirmed");
  if (!proposal.inspection_report_id || !proposal.inspection_passed_at) blockers.push("Passed inspection evidence is missing");
  if (!proposal.assigned_provider_id) blockers.push("Approved custody provider is not assigned");
  if (proposal.approved_proposal_version !== proposal.proposal_version) blockers.push("Approval does not match current proposal version");
  if (proposal.approved_evidence_version !== proposal.evidence_version) blockers.push("Approval does not match current evidence version");
  if (proposal.appeal_status === "submitted" || proposal.appeal_status === "under_review") blockers.push("Verification appeal is unresolved");
  if (proposal.custody_status === "incident_hold" || proposal.custody_status === "released") blockers.push("Vehicle custody is on hold or has ended");
  if (proposal.assigned_provider_id) {
    const cap = await findOne("vehicle_custody_capabilities", { provider_id: proposal.assigned_provider_id, capability_status: "active" });
    if (!cap || !["garage", "dealer"].includes(cap.provider_kind)) blockers.push("Assigned partner lacks active approved custody capability");
    if (cap?.insurance_expires_at && new Date(cap.insurance_expires_at).getTime() <= Date.now()) blockers.push("Custody partner authorization has expired");
  }
  return { eligible: blockers.length === 0, scope: "private_seller_proposal", proposalId: proposal.id, proposalVersion: proposal.proposal_version, evidenceVersion: proposal.evidence_version, blockers, code: blockers.length ? "PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE" : "ELIGIBLE" };
}
export async function assertPrivateSellerAuctionEligible(car) {
  const result = await evaluatePrivateSellerAuctionEligibility(car);
  if (!result.eligible) { const error = new Error("Private-seller auction is blocked until payment, verification, custody and approval requirements are satisfied"); error.status = 409; error.code = result.code; error.details = result; throw error; }
  return result;
}
