import mongoose from "mongoose";
import Escrow from "../models/Escrow.js";

// =============================
// 🧮 COMMISSION CALCULATOR
// =============================
const calculateCommission = (amount) => {
  const rate = 0.05;
  const commission = Math.round(amount * rate);
  return {
    commission,
    sellerAmount: amount - commission,
  };
};

// =============================
// 🏦 CREATE ESCROW (SAFE)
// =============================
export const createEscrow = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { commission, sellerAmount } = calculateCommission(data.amount);

    const escrow = await Escrow.create(
      [
        {
          ...data,
          commission,
          sellerAmount,
          status: "held",
          history: [
            {
              action: "CREATED",
              at: new Date(),
            },
          ],
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return escrow[0];
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("❌ ESCROW CREATE ERROR:", err);
    throw err;
  }
};

// =============================
// 💸 RELEASE ESCROW (SAFE)
// =============================
export const releaseEscrow = async (escrowId, { idempotencyKey }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId).session(session);

    if (!escrow) throw new Error("Escrow not found");

    if (escrow.status !== "held") {
      throw new Error("Escrow already processed");
    }

    // 🛡 Idempotency check
    if (escrow.lastActionKey && escrow.lastActionKey === idempotencyKey) {
      return escrow;
    }

    escrow.status = "released";
    escrow.releasedAt = new Date();
    escrow.lastActionKey = idempotencyKey;

    escrow.history.push({
      action: "RELEASED",
      at: new Date(),
    });

    await escrow.save({ session });

    // 🔥 Trigger payout (MPESA B2C later)
    console.log(`💸 Paying seller ${escrow.seller} KES ${escrow.sellerAmount}`);

    await session.commitTransaction();
    session.endSession();

    return escrow;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("❌ ESCROW RELEASE ERROR:", err);
    throw err;
  }
};

// =============================
// 🔄 REFUND ESCROW (SAFE)
// =============================
export const refundEscrow = async (escrowId, { idempotencyKey }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId).session(session);

    if (!escrow) throw new Error("Escrow not found");

    if (escrow.status !== "held") {
      throw new Error("Cannot refund processed escrow");
    }

    if (escrow.lastActionKey && escrow.lastActionKey === idempotencyKey) {
      return escrow;
    }

    escrow.status = "refunded";
    escrow.lastActionKey = idempotencyKey;

    escrow.history.push({
      action: "REFUNDED",
      at: new Date(),
    });

    await escrow.save({ session });

    // 🔥 Trigger refund (MPESA reversal later)
    console.log(`↩️ Refunding buyer ${escrow.buyer} KES ${escrow.amount}`);

    await session.commitTransaction();
    session.endSession();

    return escrow;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("❌ ESCROW REFUND ERROR:", err);
    throw err;
  }
};
