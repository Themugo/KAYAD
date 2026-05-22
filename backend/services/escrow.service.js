import mongoose from "mongoose";
import Escrow from "../models/Escrow.js";
import { disburseB2C } from "./mpesaB2C.service.js";
import User from "../models/User.js";

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
    const { commission, sellerAmount } =
      calculateCommission(data.amount);

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
      { session }
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
export const releaseEscrow = async (
  escrowId,
  { idempotencyKey }
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId).session(
      session
    );

    if (!escrow) throw new Error("Escrow not found");

    if (escrow.status !== "held") {
      throw new Error("Escrow already processed");
    }

    // 🛡 Idempotency check
    if (
      escrow.lastActionKey &&
      escrow.lastActionKey === idempotencyKey
    ) {
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

    // 🔥 Trigger actual B2C payout to seller
    try {
      const seller = await User.findById(escrow.seller).session(session);
      if (seller?.phone) {
        const payout = await disburseB2C({
          phone: seller.phone,
          amount: escrow.sellerAmount,
          escrowId: escrow._id.toString(),
          sellerName: seller.name || "Seller",
        });

        escrow.history.push({
          action: `B2C_PAYOUT_${payout.mock ? "MOCK" : "INITIATED"}`,
          at: new Date(),
          notes: payout.mock
            ? `Mock: KES ${escrow.sellerAmount.toLocaleString()} to ${seller.phone}`
            : `B2C: ${payout.conversationID} — KES ${escrow.sellerAmount.toLocaleString()}`,
        });

        await escrow.save({ session });

        console.log(
          `💸 B2C payout ${payout.mock ? "simulated" : "initiated"}: KES ${escrow.sellerAmount.toLocaleString()} to ${seller.phone} (${payout.conversationID})`
        );
      } else {
        console.warn(`⚠️ Seller ${escrow.seller} has no phone — B2C payout skipped`);
        escrow.history.push({
          action: "B2C_SKIPPED_NO_PHONE",
          at: new Date(),
          notes: "Seller has no phone number registered",
        });
        await escrow.save({ session });
      }
    } catch (payoutErr) {
      console.error(`❌ B2C payout failed for escrow ${escrowId}:`, payoutErr.message);
      escrow.history.push({
        action: "B2C_FAILED",
        at: new Date(),
        notes: `Payout failed: ${payoutErr.message}`,
      });
      await escrow.save({ session });
      // Don't throw — escrow is still released, payout can be retried manually
    }

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
export const refundEscrow = async (
  escrowId,
  { idempotencyKey }
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId).session(
      session
    );

    if (!escrow) throw new Error("Escrow not found");

    if (escrow.status !== "held") {
      throw new Error("Cannot refund processed escrow");
    }

    if (
      escrow.lastActionKey &&
      escrow.lastActionKey === idempotencyKey
    ) {
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
    console.log(
      `↩️ Refunding buyer ${escrow.buyer} KES ${escrow.amount}`
    );

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