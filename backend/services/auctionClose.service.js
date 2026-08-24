// Canonical auction close — the single code path that ends an auction.
// Used by the auto-close sweep (utils/auctionTimer.js), the admin
// endpoint (controllers/bidController.js endAuction), and dealer/admin
// control routes. Winner determination, loser handling, audit trail,
// and realtime notification live here and nowhere else.

import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import { emitAuctionEnd, emitListingUpdate } from "../socket/socket.js";
import { logAuctionEnded } from "./auditService.js";
import { logInfo, logError } from "../utils/logger.js";

const SYSTEM_ACTOR = { id: null, role: "system", name: "auction-engine", email: null };

export const closeAuction = async (carId, { req = null, actor = null, reason = "auto_close" } = {}) => {
  // Atomic live → ended transition: whichever caller lands this first is
  // the only closer. Concurrent/duplicate close attempts get
  // alreadyClosed and must not re-run winner determination.
  const car = await Car.findOneAndUpdate(
    { _id: carId, auctionStatus: "live" },
    { auctionStatus: "ended", allowBid: false },
    { new: true },
  );

  if (!car) {
    return { success: false, alreadyClosed: true };
  }

  try {
    // Server-authoritative winner: highest payment-confirmed bid.
    const topBid = await Bid.getHighestBid(carId);

    let winner = null;
    if (topBid) {
      const winnerBidId = topBid.id || topBid._id;
      await Bid.markWinner(winnerBidId);
      await Bid.markLosers(carId, winnerBidId);

      winner = {
        user: topBid.user,
        amount: topBid.amount,
        bidderTag: topBid.bidderTag,
      };

      await Car.findByIdAndUpdate(carId, {
        currentBid: topBid.amount,
        highestBidder: topBid.user,
        winner,
        sold: true,
        status: "sold",
      });
    }

    logInfo("Auction closed", {
      carId,
      reason,
      winner: winner?.user || null,
      finalBid: winner?.amount ?? car.currentBid ?? 0,
    });

    // Audit trail — never throws (auditService swallows and logs errors).
    await logAuctionEnded(
      {
        id: carId,
        auctionId: carId,
        car,
        status: "live",
        currentBid: car.currentBid,
      },
      topBid,
      actor || SYSTEM_ACTOR,
      req,
    );

    emitAuctionEnd(String(carId), {
      carId: String(carId),
      winner,
      highestBid: winner?.amount ?? car.currentBid ?? 0,
      reason,
    });
    emitListingUpdate(String(carId), {
      auctionStatus: "ended",
      sold: Boolean(topBid),
      currentBid: winner?.amount ?? car.currentBid ?? 0,
    });

    return {
      success: true,
      winner,
      finalBid: winner?.amount ?? car.currentBid ?? 0,
      totalBids: car.bidsCount || 0,
    };
  } catch (err) {
    logError("CLOSE AUCTION ERROR", err, { carId, reason });
    return { success: false, message: "Failed to close auction" };
  }
};
