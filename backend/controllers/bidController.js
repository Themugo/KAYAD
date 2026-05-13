import mongoose from "mongoose";
import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import Escrow from "../models/Escrow.js";
import { initiatePayment } from "../services/paymentService.js";

// =============================
// 🧠 AUTO-BIDDING ENGINE (PRO)
// =============================
const runAutoBidding = async (carId) => {
  const autoBidders = await Bid.find({
    carId,
    status: "paid",
    maxBid: { $gt: 0 },
  }).sort({ maxBid: -1 });

  if (autoBidders.length < 2) return;

  let highest = autoBidders[0];
  let second = autoBidders[1];

  const increment = 1000;

  let nextAmount = Math.min(
    highest.maxBid,
    second.maxBid + increment
  );

  if (nextAmount <= second.maxBid) return;

  const existing = await Bid.findOne({
    carId,
    user: highest.user,
    amount: nextAmount,
    isAuto: true,
  });

  if (existing) return;

  const autoBid = await Bid.create({
    carId,
    user: highest.user,
    amount: nextAmount,
    maxBid: highest.maxBid,
    isAuto: true,
    bidderTag: "AutoBid",
    phone: highest.phone || "N/A",
    status: "paid",
  });

  const car = await Car.findById(carId);
  if (!car) return;

  car.currentBid = nextAmount;
  car.highestBidder = highest.user;
  await car.save();

  if (global.io) {
    global.io.to(`car_${carId}`).emit("auctionUpdate", {
      carId,
      currentBid: nextAmount,
    });
  }
};

// =============================
// 📜 GET AUCTION BIDS
// =============================
export const getAuctionBids = async (req, res) => {
  try {
    const { id: carId } = req.params;

    const bids = await Bid.find({
      carId,
      status: "paid",
    })
      .sort({ amount: -1 })
      .limit(50);

    res.json({
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
    res.status(500).json({ success: false, message: "Failed to fetch bids" });
  }
};

// =============================
// 💰 PLACE BID (AUTO-BID READY)
// =============================
export const placeBid = async (req, res) => {
  try {
    const { id: carId } = req.params;
    const { amount, phone, maxBid } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bid amount",
      });
    }

    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    if (car.user.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot bid on your own car",
      });
    }

    // =============================
    // 🔐 WALLET-LOCK: Bids > KES 5M require KES 50K pre-authorized escrow
    // =============================
    if (amount > 5000000) {
      const escrowDeposit = await Escrow.findOne({
        buyer: userId,
        amount: { $gte: 50000 },
        status: "held",
      });
      if (!escrowDeposit) {
        return res.status(403).json({
          success: false,
          message: "Bids over KES 5,000,000 require a KES 50,000 pre-authorized deposit held in escrow. Please deposit via your profile.",
          code: "WALLET_LOCK_REQUIRED",
          minDeposit: 50000,
        });
      }
    }

    if (car.auctionStatus !== "live") {
      return res.status(400).json({
        success: false,
        message: "Auction not live",
      });
    }

    const highest = await Bid.getHighestBid(carId);
    const currentBid = highest?.amount || car.currentBid || car.price;

    if (amount <= currentBid) {
      return res.status(400).json({
        success: false,
        message: `Bid must be higher than ${currentBid}`,
      });
    }

    // =============================
    // 💳 INITIATE PAYMENT
    // =============================
    const payment = await initiatePayment({
      userId,
      carId,
      type: "bid",
      amount: 1,
      phone,
      metadata: { bidAmount: amount },
    });

    // =============================
    // 🧾 CREATE BID
    // =============================
    const bid = await Bid.create({
      carId,
      user: userId,
      amount,
      maxBid: maxBid || null,
      phone,
      bidderTag: `Bidder-${Math.floor(1000 + Math.random() * 9000)}`,
      status: payment.mode === "mpesa" ? "pending" : "paid",
      checkoutRequestID: payment.checkoutID,
    });

    // =============================
    // ⚡ MOCK MODE
    // =============================
    if (payment.mode === "mock") {
      car.currentBid = amount;
      car.highestBidder = userId;
      car.bidsCount = (car.bidsCount || 0) + 1;

      await car.save();

      // 🔥 RUN AUTO-BID AFTER MANUAL BID
      await runAutoBidding(carId);

      if (global.io) {
        global.io.to(`car_${carId}`).emit("auctionUpdate", {
          carId,
          currentBid: car.currentBid,
        });
      }
    }

    res.json({
      success: true,
      message:
        payment.mode === "mpesa"
          ? "STK push sent"
          : "Bid placed",
      checkoutRequestID: payment.checkoutID,
      bid,
    });

  } catch (err) {
    console.error("❌ PLACE BID ERROR:", err);
    res.status(500).json({ success: false, message: "Bid failed" });
  }
};

// =============================
// 📲 MPESA CALLBACK
// =============================
export const confirmBidPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const callback =
      req.body?.Body?.stkCallback || req.body?.stkCallback;

    if (!callback) throw new Error("Invalid callback");

    const checkoutRequestID = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;

    const metadata = callback.CallbackMetadata?.Item || [];

    const receipt = metadata.find(
      (i) => i.Name === "MpesaReceiptNumber"
    )?.Value;

    if (resultCode !== 0) {
      await Bid.updateOne(
        { checkoutRequestID },
        { status: "failed" }
      );

      await session.commitTransaction();
      return res.json({ success: false, message: "Payment failed" });
    }

    const bid = await Bid.findOne({ checkoutRequestID }).session(session);
    if (!bid) throw new Error("Bid not found");

    if (bid.status === "paid") {
      await session.commitTransaction();
      return res.json({ success: true });
    }

    await bid.markAsPaid(receipt);

    const car = await Car.findById(bid.carId).session(session);

    if (car) {
      car.currentBid = bid.amount;
      car.highestBidder = bid.user;
      car.bidsCount = (car.bidsCount || 0) + 1;
      await car.save();
    }

    await session.commitTransaction();

    // 🔥 AUTO-BID AFTER PAYMENT
    await runAutoBidding(bid.carId);

    if (global.io) {
      global.io.to(`car_${bid.carId}`).emit("auctionUpdate", {
        carId: bid.carId.toString(),
        currentBid: bid.amount,
      });
    }

    res.json({ success: true });

  } catch (err) {
    await session.abortTransaction();
    console.error("❌ CALLBACK ERROR:", err);
    res.status(500).json({ success: false });

  } finally {
    session.endSession();
  }
};

// =============================
// 🏁 END AUCTION
// =============================
export const endAuction = async (req, res) => {
  try {
    const { id: carId } = req.params;

    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false });
    }

    const highestBid = await Bid.getHighestBid(carId);

    if (!highestBid) {
      car.auctionStatus = "ended";
      await car.save();
      return res.json({ success: true });
    }

    car.sold = true;
    car.auctionStatus = "ended";
    car.paymentStatus = "pending"; // 🔥 important

    car.winner = {
      user: highestBid.user?._id || highestBid.user,
      amount: highestBid.amount,
    };

    await car.save();
    await Bid.markWinner(highestBid._id);

    if (global.io) {
      global.io.to(`car_${carId}`).emit("auctionEnded", {
        carId,
        winner: car.winner,
      });
    }

    res.json({
      success: true,
      winner: car.winner,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};