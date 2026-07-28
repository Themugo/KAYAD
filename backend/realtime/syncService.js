// realtime/syncService.js

import mongoose from "mongoose";
import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import Escrow from "../models/Escrow.js";
import Payment from "../models/Payment.js";

// =============================
// 🔁 SYNC AUCTION RESULT (ATOMIC)
// =============================
export const syncAuctionResult = async ({ roomId, winner }) => {
  if (!winner) {
    console.warn("⚠️ No winner to sync");
    return;
  }

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const { userId, bid } = winner;

    const car = await Car.findById(roomId).session(session);

    if (!car) {
      throw new Error("Car not found");
    }

    if (car.sold) {
      console.warn("Car already sold, skipping sync");
      if (session) {
        try {
          await session.abortTransaction();
        } catch {
          /* already aborted */
        }
        try {
          session.endSession();
        } catch {
          /* already ended */
        }
      }
      return;
    }

    // =============================
    // 🏆 FIND WINNING BID (SAFE)
    // =============================
    const winningBid = await Bid.findOne({
      carId: roomId,
      user: userId,
      amount: bid,
      status: "paid",
    }).session(session);

    if (!winningBid) {
      throw new Error("Winning bid not found or not paid");
    }

    // =============================
    // 🏁 UPDATE CAR
    // =============================
    car.sold = true;
    car.status = "sold";
    car.currentBid = bid;
    car.auctionStatus = "ended";
    car.allowBid = false;
    car.winner = {
      user: userId,
      amount: bid,
    };

    await car.save({ session });

    // =============================
    // 🥇 MARK WINNER (CLEAN)
    // =============================
    await Bid.updateMany({ carId: roomId }, { isWinningBid: false }, { session });

    winningBid.isWinningBid = true;
    await winningBid.save({ session });

    // =============================
    // 💳 CREATE PAYMENT (IF MISSING)
    // =============================
    let payment = await Payment.findOne({
      referenceId: winningBid._id,
      referenceModel: "Bid",
      type: "auction_win",
    }).session(session);

    if (!payment) {
      payment = await Payment.create(
        [
          {
            user: userId,
            referenceId: winningBid._id,
            referenceModel: "Bid",
            type: "auction_win",
            amount: bid,
            phone: winningBid.phone,
            status: "pending",
          },
        ],
        { session },
      );

      payment = payment[0];
    }

    // =============================
    // 🏦 CREATE ESCROW
    // =============================
    const escrow = await Escrow.create(
      [
        {
          car: roomId,
          buyer: userId,
          seller: car.dealer,
          amount: bid,
          sellerAmount: bid, // will adjust on release
          payment: payment._id,
          status: "pending",
        },
      ],
      { session },
    );

    // link escrow to payment
    payment.escrow = escrow[0]._id;
    await payment.save({ session });

    // =============================
    // ✅ COMMIT
    // =============================
    await session.commitTransaction();
    session.endSession();

    console.log("✅ Auction synced → Car, Bid, Payment, Escrow");

    return {
      success: true,
      carId: roomId,
      winner: userId,
      amount: bid,
    };
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch {
        /* already aborted */
      }
      try {
        session.endSession();
      } catch {
        /* already ended */
      }
    }

    console.error("SYNC ERROR:", err.message);

    return {
      success: false,
      message: err.message,
    };
  }
};
