// backend/controllers/auctionController.js

import mongoose from "mongoose";
import Car from "../models/Car.js";
import Bid from "../models/Bid.js";

// =============================
// 📜 GET AUCTION BIDS (LIVE)
// =============================
export const getAuctionBids = async (req, res) => {
  try {
    const { carId } = req.params;

    const bids = await Bid.find({
      carId,
      status: "paid",
    })
      .sort({ amount: -1 })
      .limit(50);

    return res.json({
      success: true,
      bids: bids.map((b, i) => ({
        rank: i + 1,
        amount: b.amount,
        bidderTag: b.bidderTag,
        time: b.createdAt,
      })),
    });

  } catch (err) {
    console.error("❌ GET BIDS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bids",
    });
  }
};

// =============================
// 💰 PLACE BID (SAFE + CONSISTENT)
// =============================
export const placeBid = async (req, res) => {
  try {
    const { carId } = req.params;
    const { amount, phone } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bid amount",
      });
    }

    const car = await Car.findById(carId);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    if (car.auctionStatus !== "live" || !car.allowBid) {
      return res.status(400).json({
        success: false,
        message: "Auction not active",
      });
    }

    // 🚫 prevent owner bidding
    if (car.user?.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot bid on your own car",
      });
    }

    // =============================
    // 🔍 CURRENT HIGHEST BID
    // =============================
    let highest;
    try {
      highest = await Bid.getHighestBid(carId);
    } catch {
      highest = null;
    }

    const currentBid =
      highest?.amount || car.currentBid || car.price;

    if (amount <= currentBid) {
      return res.status(400).json({
        success: false,
        message: `Bid must be higher than ${currentBid}`,
      });
    }

    // =============================
    // 🧾 CREATE BID (PENDING FIRST)
    // =============================
    const bid = await Bid.create({
      carId,
      user: userId,
      amount,
      phone,
      status: "pending",
    });

    // 🔥 PAYMENT HOOK (plug MPESA here later)
    // For now simulate success:
    await bid.markAsPaid("MOCK-" + Date.now());

    // =============================
    // 🚗 UPDATE CAR
    // =============================
    car.currentBid = amount;
    car.highestBidder = userId;
    car.bidsCount = (car.bidsCount || 0) + 1;

    await car.save();

    // =============================
    // 🔥 SOCKET UPDATE (ROOM BASED)
    // =============================
    if (global.io) {
      global.io.to(carId).emit("auctionUpdate", {
        carId,
        currentBid: amount,
      });
    }

    return res.json({
      success: true,
      message: "Bid placed successfully",
      bid,
    });

  } catch (err) {
    console.error("❌ PLACE BID ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Bid failed",
    });
  }
};

// =============================
// 📲 CONFIRM PAYMENT (MPESA READY)
// =============================
export const confirmBidPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { checkoutRequestID, mpesaReceipt } = req.body;

    const bid = await Bid.findOne({ checkoutRequestID }).session(session);

    if (!bid) {
      throw new Error("Bid not found");
    }

    if (bid.status === "paid") {
      await session.commitTransaction();
      return res.json({
        success: true,
        message: "Already processed",
      });
    }

    // ✅ mark paid
    await bid.markAsPaid(mpesaReceipt);

    const car = await Car.findById(bid.carId).session(session);

    if (car) {
      car.currentBid = bid.amount;
      car.highestBidder = bid.user;
      car.bidsCount = (car.bidsCount || 0) + 1;

      await car.save();
    }

    await session.commitTransaction();

    // 🔥 SOCKET UPDATE
    if (global.io) {
      global.io.to(bid.carId.toString()).emit("auctionUpdate", {
        carId: bid.carId.toString(),
        currentBid: bid.amount,
      });
    }

    res.json({
      success: true,
      message: "Payment confirmed",
    });

  } catch (err) {
    await session.abortTransaction();

    console.error("❌ PAYMENT CONFIRM ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Confirmation failed",
    });

  } finally {
    session.endSession();
  }
};

// =============================
// 🏁 END AUCTION (FINAL FLOW 🔥)
// =============================
export const endAuction = async (req, res) => {
  try {
    const { carId } = req.params;

    const car = await Car.findById(carId);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    if (car.auctionStatus === "ended") {
      return res.json({
        success: true,
        message: "Already ended",
      });
    }

    const highestBid = await Bid.getHighestBid(carId);

    if (!highestBid) {
      car.auctionStatus = "ended";
      await car.save();

      return res.json({
        success: true,
        message: "No bids placed",
      });
    }

    // 🏆 SET WINNER
    car.sold = true;
    car.auctionStatus = "ended";
    car.winner = {
      user: highestBid.user?._id || highestBid.user,
      amount: highestBid.amount,
    };

    await car.save();

    await Bid.markWinner(highestBid._id);

    // =============================
    // 🔥 REALTIME EVENT
    // =============================
    if (global.io) {
      global.io.to(carId).emit("auctionEnded", {
        carId,
        winner: car.winner,
      });
    }

    // =============================
    // 💰 NEXT STEP (IMPORTANT)
    // =============================
    // 👉 frontend should redirect winner to payment page

    return res.json({
      success: true,
      message: "Auction ended",
      winner: car.winner,
    });

  } catch (err) {
    console.error("❌ END AUCTION ERROR:", err);

    res.status(500).json({
      success: false,
      message: "End failed",
    });
  }
};