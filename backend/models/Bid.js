import { createModel } from "./_base.js";

const Bid = createModel("Bid");

// Same situation as models/RefreshToken.js and the DealerVerification
// fix earlier this session: controllers/bidController.js (the real,
// live bidding flow - already fixed for a race condition earlier this
// session) and smsBiddingController.js/auctionAdminRoutes.js/
// bidRoutes.js call 3 static methods that don't exist anywhere in this
// codebase, not even in the generic factory. Confirmed directly via
// grep before implementing. Unlike some earlier gaps left flagged
// rather than implemented (leadService.js's updateLeadStage), these
// have clear, standard, unambiguous semantics evidenced directly by
// their call sites, so implemented rather than just flagged.

// Returns the single highest bid for a car, or null if there are none.
// bidController.js calls this to determine the current leading bid
// both when validating a new bid and when closing an auction.
Bid.getHighestBid = async (carId) => {
  const results = await Bid.find({ carId }).sort({ amount: -1 }).limit(1);
  return results[0] || null;
};

// Marks a specific bid as the auction's winner. Scoped narrowly to
// exactly what's evidenced at the 3 real call sites (all just mark one
// bid won) - not extended to also mark every other bid on the same car
// as "lost", since nothing in the actual code does that and inventing
// it would be exactly the kind of unevidenced business-logic guess
// this session has otherwise avoided.
Bid.markWinner = async (bidId) => {
  return Bid.findByIdAndUpdate(bidId, { status: "won" });
};

// Mongoose-style updateOne(filter, update) - bidController.js's one
// call site (marking a bid "failed" by its M-Pesa checkoutRequestID)
// passes plain fields, not $set, matching findOneAndUpdate's existing
// support for both styles - a direct pass-through.
Bid.updateOne = async (filter, update) => {
  return Bid.findOneAndUpdate(filter, update);
};

export default Bid;
