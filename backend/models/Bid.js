import { createModel } from "./_base.js";

const Bid = createModel("Bid");

// ── Canonical auction queries ────────────────────────────────────
// Only payment-confirmed ("paid") bids count toward market state.
// "pending" bids await M-Pesa confirmation and must never decide a
// current price or a winner.

Bid.getHighestBid = async (carId) => {
  const bids = await Bid.find({ carId, status: "paid" }).lean();
  if (!bids.length) return null;
  return bids.sort((a, b) => Number(b.amount) - Number(a.amount))[0];
};

Bid.markWinner = async (bidId) => {
  return Bid.findByIdAndUpdate(bidId, { status: "won" });
};

// Loser handling: every other confirmed bid on the car is marked "lost"
// exactly once, at close time, by the canonical close path.
Bid.markLosers = async (carId, winnerBidId) => {
  const losers = await Bid.find({ carId, status: "paid" });
  const ids = losers.map((b) => b.id).filter((id) => id && id !== winnerBidId);
  let modified = 0;
  for (const id of ids) {
    const updated = await Bid.findByIdAndUpdate(id, { status: "lost" });
    if (updated) modified += 1;
  }
  return { modifiedCount: modified };
};

export default Bid;
