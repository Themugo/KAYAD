import { findById } from "../db/index.js";
import { getAuctionOutcome } from "./auctionSettlement.service.js";
import { evaluatePrivateSellerAuctionEligibility } from "./privateSellerAuctionEligibility.service.js";

const fail = (status, message) => Object.assign(new Error(message), { status });

/**
 * Winner-only "what happens next". Once the winner's payment is confirmed, a DEALER's contact is released so the buyer and dealer
 * arrange collection and paperwork directly. Private sellers' contact details are never released (KAYAD coordinates), which keeps
 * scammers from moving private sellers' buyers off-platform.
 */
export async function getWinnerHandover({ auctionId, userId }) {
  const outcome = await getAuctionOutcome(auctionId);
  if (!outcome || outcome.status === "no_sale" || !outcome.winnerUserId) throw fail(404, "No winning outcome for this auction");
  if (String(outcome.winnerUserId) !== String(userId)) throw fail(403, "Only the auction winner can view this");

  const paid = outcome.paymentStatus === "paid" || ["payment_received", "completed"].includes(outcome.status);
  const collected = outcome.collectionStatus === "collected" || outcome.status === "completed";
  const done = outcome.transferStatus === "completed" || outcome.status === "completed";
  const steps = [
    { key: "won", label: "You won", state: "done" },
    { key: "pay", label: "Pay the balance", state: paid ? "done" : "current", amount: Number(outcome.paymentDueAmount ?? 0), dueAt: outcome.paymentDueAt || null },
    { key: "collect", label: "Arrange collection", state: collected ? "done" : paid ? "current" : "pending" },
    { key: "transfer", label: "Ownership transfer", state: done ? "done" : collected ? "current" : "pending" },
  ];

  let contact = null;
  let coordinatedByKayad = false;
  if (paid && !done) {
    let privateSeller = true;
    try { privateSeller = (await evaluatePrivateSellerAuctionEligibility(auctionId)).scope !== "not_private_seller"; } catch { privateSeller = true; }
    if (privateSeller) coordinatedByKayad = true;
    else {
      const seller = await findById("users", outcome.organizerId);
      if (seller?.phone) contact = { name: seller.name || "Seller", phone: seller.phone };
    }
  }
  return { status: outcome.status, settlementMode: outcome.settlementMode || "direct", steps, contact, coordinatedByKayad };
}
