import { findById } from "../db/index.js";
import { getAuctionOutcome } from "./auctionSettlement.service.js";
import { bidderNumber } from "../utils/bidderIdentity.js";

/** Winner certificate data. Only the winner may receive it; it carries the anonymous bidder ID, never other bidders' details. */
export async function buildWinnerCertificate({ auctionId, userId }) {
  const outcome = await getAuctionOutcome(auctionId);
  if (!outcome || outcome.status === "no_sale" || !outcome.winnerUserId) throw Object.assign(new Error("No winning outcome for this auction"), { status: 404 });
  if (String(outcome.winnerUserId) !== String(userId)) throw Object.assign(new Error("Only the auction winner can view this certificate"), { status: 403 });
  const car = await findById("cars", auctionId);
  const issued = new Date(outcome.createdAt || Date.now());
  const winningBid = Number(outcome.winningAmount || 0);
  const credited = Number(outcome.commitmentAppliedAmount || 0);
  return {
    certificateNumber: `KAY-AUC-${issued.getUTCFullYear()}-${String(outcome.id).replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    issuedAt: issued.toISOString(),
    bidderId: bidderNumber(userId, auctionId),
    vehicle: { title: car?.title || "Vehicle", year: car?.year || null, brand: car?.brand || null, model: car?.model || null },
    financials: { winningBid, commitmentCredited: credited, balanceDue: Number(outcome.paymentDueAmount ?? Math.max(0, winningBid - credited)), paymentDueAt: outcome.paymentDueAt || null },
    settlementMode: outcome.settlementMode || "direct",
    status: outcome.status,
  };
}
