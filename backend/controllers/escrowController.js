import mongoose from "mongoose";
import Escrow from "../models/Escrow.js";
import Car from "../models/Car.js";
import Payment from "../models/Payment.js";
import { sendSMS } from "../utils/sms.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { getIO } from "../utils/io.js";
import { isValidId } from "../utils/validateId.js";

// =============================
// 📄 GET ALL ESCROWS (ADMIN)
// =============================
export const getAllEscrows = async (req, res) => {
  try {
    const escrows = await Escrow.find().sort({ createdAt: -1 }).populate("car buyer seller payment").lean();

    res.json({
      success: true,
      escrows,
    });
  } catch (err) {
    console.error("❌ GET ESCROWS ERROR:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

// =============================
// 📄 GET USER ESCROWS (SECURE)
// =============================
export const getUserEscrows = async (req, res) => {
  try {
    const userId = req.user.id;

    const escrows = await Escrow.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("car buyer seller payment")
      .lean();

    res.json({
      success: true,
      escrows,
    });
  } catch (err) {
    console.error("❌ USER ESCROW ERROR:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

// =============================
// 🔍 GET SINGLE ESCROW (SECURE)
// =============================
export const getEscrowById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid escrow ID" });
    const escrow = await Escrow.findById(req.params.id).populate("car buyer seller payment");

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: "Escrow not found",
      });
    }

    // 🔒 ACCESS CONTROL
    const userId = req.user.id;
    if (escrow.buyer.toString() !== userId && escrow.seller.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.json({
      success: true,
      escrow,
    });
  } catch (err) {
    console.error("❌ GET ESCROW ERROR:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

// =============================
// ✅ CONFIRM DELIVERY (BUYER)
// =============================
export const confirmDelivery = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid escrow ID" });
    const escrow = await Escrow.findById(req.params.id);
    if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });

    if (escrow.buyer.toString() !== req.user.id && !["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Only the buyer can confirm delivery" });
    }

    if (escrow.status !== "held") {
      return res.status(400).json({ success: false, message: "Escrow is not in active state" });
    }

    await escrow.confirmDelivery(req.user.id, req);

    // Notify seller
    try {
      const UserModel = (await import("../models/User.js")).default;
      const seller = await UserModel.findById(escrow.seller).select("phone notifications");
      if (seller?.phone && seller?.notifications?.sms !== false) {
        sendSMS(
          seller.phone,
          `Buyer confirmed delivery for escrow KES ${Number(escrow.amount).toLocaleString("en-KE")}. Release pending admin approval. Kayad.`,
        ).catch((e) => console.warn("⚠️ SMS send failed:", e.message));
      }
    } catch (_) {}

    logActionFromReq(req, "escrow.delivery_confirmed", {
      target: escrow._id,
      targetModel: "Escrow",
      resourceId: req.params.id,
      details: { carId: escrow.car, amount: escrow.amount },
      severity: "info",
    });

    res.json({ success: true, message: "Delivery confirmed", escrow });
  } catch (err) {
    console.error("❌ CONFIRM DELIVERY ERROR:", err);
    res.status(500).json({ success: false, message: err.message || "Confirmation failed" });
  }
};

// =============================
// 📋 REQUEST ESCROW RELEASE (BUYER)
// =============================
export const requestRelease = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id).populate("car", "title");
    if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });

    if (escrow.buyer.toString() !== req.user.id && !["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (escrow.status !== "held") {
      return res.status(400).json({ success: false, message: "Escrow not active" });
    }

    escrow.history.push({ action: `Buyer requested release` });
    await escrow.save();

    // Notify admin via socket
    if (getIO()) {
      getIO().emit("adminAlert", {
        type: "escrow_release_requested",
        message: `Buyer requested release of escrow KES ${Number(escrow.amount).toLocaleString("en-KE")} for ${escrow.car?.title || "vehicle"}`,
        escrowId: escrow._id,
        severity: "info",
      });
    }

    res.json({ success: true, message: "Release request submitted. An admin will process it shortly." });
  } catch (err) {
    console.error("❌ REQUEST RELEASE ERROR:", err);
    res.status(500).json({ success: false, message: "Request failed" });
  }
};

// ── EMAIL NOTIFICATIONS ON ESCROW EVENTS ─────────────────────
export const notifyEscrowReleased = async (escrow) => {
  try {
    const { sendEscrowReleasedEmail } = await import("../services/email.service.js");
    const EscrowModel = (await import("../models/Escrow.js")).default;
    const UserModel = (await import("../models/User.js")).default;
    const populated = await EscrowModel.findById(escrow._id || escrow)
      .populate("seller", "email name")
      .populate("car", "title");
    if (populated?.seller?.email) {
      await sendEscrowReleasedEmail(populated.seller, populated, populated.car);
    }
    // 📱 SMS to seller
    if (populated?.seller?._id) {
      const seller = await UserModel.findById(populated.seller._id).select("phone notifications");
      if (seller?.phone && seller?.notifications?.sms !== false) {
        sendSMS(
          seller.phone,
          `Escrow released — KES ${Number(populated.amount).toLocaleString("en-KE")} for ${populated.car?.title || "vehicle"} has been sent to your account. Kayad.`,
        ).catch((e) => console.warn("⚠️ SMS send failed:", e.message));
      }
    }
    // 📱 SMS to buyer (if phone known)
    if (populated?.buyer) {
      const buyer = await UserModel.findById(populated.buyer).select("phone notifications");
      if (buyer?.phone && buyer?.notifications?.sms !== false) {
        sendSMS(
          buyer.phone,
          `Escrow released — KES ${Number(populated.amount).toLocaleString("en-KE")} for ${populated.car?.title || "vehicle"} has been paid to the seller. Kayad.`,
        ).catch((e) => console.warn("⚠️ SMS send failed:", e.message));
      }
    }
    getIO()?.to(`user_${populated?.seller?._id}`).emit("escrowReleased", {
      escrowId: populated?._id,
      amount: populated?.amount,
    });
    getIO()?.to(`user_${populated?.buyer}`).emit("escrowReleased", {
      escrowId: populated?._id,
      amount: populated?.amount,
    });
  } catch (e) {
    console.error("notifyEscrowReleased error:", e.message);
  }
};

// Hook: call after escrow.status = 'refunded' + save
export const notifyEscrowRefunded = async (escrow) => {
  try {
    const { sendEscrowRefundedEmail } = await import("../services/email.service.js");
    const EscrowModel = (await import("../models/Escrow.js")).default;
    const UserModel = (await import("../models/User.js")).default;
    const populated = await EscrowModel.findById(escrow._id || escrow)
      .populate("buyer", "email name")
      .populate("car", "title");
    if (populated?.buyer?.email) {
      await sendEscrowRefundedEmail(populated.buyer, populated, populated.car);
    }
    // 📱 SMS to buyer
    if (populated?.buyer?._id) {
      const buyer = await UserModel.findById(populated.buyer._id).select("phone notifications");
      if (buyer?.phone && buyer?.notifications?.sms !== false) {
        sendSMS(
          buyer.phone,
          `Escrow refunded — KES ${Number(populated.amount).toLocaleString("en-KE")} for ${populated.car?.title || "vehicle"} has been returned to your M-Pesa. Kayad.`,
        ).catch((e) => console.warn("⚠️ SMS send failed:", e.message));
      }
    }
    getIO()?.to(`user_${populated?.buyer?._id}`).emit("escrowRefunded", {
      escrowId: populated?._id,
      amount: populated?.amount,
    });
  } catch (e) {
    console.error("notifyEscrowRefunded error:", e.message);
  }
};

// =============================
// 💰 RELEASE ESCROW (ADMIN 🔥)
// =============================
export const releaseEscrow = async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid escrow ID" });
    const escrow = await Escrow.findById(req.params.id).populate("car seller payment").session(session);

    if (!escrow) {
      throw new Error("Escrow not found");
    }

    if (escrow.status !== "held") {
      throw new Error("Escrow already processed");
    }

    // 🛡 Require buyer delivery confirmation or auto-release eligibility
    if (!escrow.deliveryConfirmed && (!escrow.autoReleaseEligibleAt || escrow.autoReleaseEligibleAt > new Date())) {
      throw new Error("Buyer has not confirmed delivery. Wait for buyer confirmation or auto-release window.");
    }

    // =============================
    // 💸 CALCULATE PLATFORM CUT
    // =============================
    const commissionRate = 0.05;
    const commission = escrow.amount * commissionRate;
    const sellerAmount = escrow.amount - commission;

    escrow.commission = commission;
    escrow.sellerAmount = sellerAmount;
    escrow.status = "released";
    escrow.releasedAt = new Date();

    await escrow.save({ session });

    // =============================
    // 🏁 MARK CAR SOLD
    // =============================
    const car = await Car.findById(escrow.car).session(session);

    if (car) {
      car.sold = true;
      car.status = "sold";
      car.isPaid = true;
      await car.save({ session });
    }

    // =============================
    // 💳 UPDATE PAYMENT
    // =============================
    if (escrow.payment) {
      const payment = await Payment.findById(escrow.payment).session(session);

      if (payment) {
        payment.status = "released";
        payment.platformFee = commission;
        payment.dealerAmount = sellerAmount;
        await payment.save({ session });
      }
    }

    await session.commitTransaction();

    // =============================
    // 🔥 REALTIME UPDATE
    // =============================
    if (getIO()) {
      getIO().to(escrow.car.toString()).emit("escrowReleased", {
        escrowId: escrow._id,
        sellerAmount,
        commission,
      });
    }

    // 📧 Email notification (fire-and-forget)
    notifyEscrowReleased(escrow._id).catch((e) => console.warn("⚠️ Escrow released email failed:", e.message));

    // =============================
    // 🔥 FUTURE PAYOUT (MPESA B2C)
    // =============================
    console.log("💸 Pay seller:", sellerAmount);

    logActionFromReq(req, "escrow.released", {
      target: escrow._id,
      targetModel: "Escrow",
      resourceId: req.params.id,
      details: { carId: escrow.car?._id, sellerAmount, commission },
      severity: "info",
    });

    res.json({
      success: true,
      message: "Escrow released",
      data: { sellerAmount, commission },
    });
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
    console.error("RELEASE ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Release failed",
    });
  }
};

// =============================
// 🔁 REFUND ESCROW (ADMIN 🔥)
// =============================
export const refundEscrow = async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    const escrow = await Escrow.findById(req.params.id).populate("payment car").session(session);

    if (!escrow) {
      throw new Error("Escrow not found");
    }

    if (escrow.status !== "held") {
      throw new Error("Cannot refund processed escrow");
    }

    const { reason } = req.body;
    if (!reason || reason.length < 10) {
      throw new Error("A detailed refund reason (min 10 chars) is required");
    }

    escrow.refundBuyer(req.user.id, reason, req);

    await escrow.save({ session });

    // =============================
    // 🔄 UPDATE PAYMENT
    // =============================
    if (escrow.payment) {
      const payment = await Payment.findById(escrow.payment).session(session);

      if (payment) {
        payment.status = "refunded";
        await payment.save({ session });
      }
    }

    // =============================
    // 🔥 RESET CAR
    // =============================
    const car = await Car.findById(escrow.car).session(session);

    if (car) {
      car.sold = false;
      car.isPaid = false;
      await car.save({ session });
    }

    await session.commitTransaction();

    // =============================
    // 🔥 REALTIME UPDATE
    // =============================
    if (getIO()) {
      getIO().to(escrow.car.toString()).emit("escrowRefunded", {
        escrowId: escrow._id,
        amount: escrow.amount,
      });
    }

    // 📧 Email notification (fire-and-forget)
    notifyEscrowRefunded(escrow._id).catch((e) => console.warn("⚠️ Escrow refunded email failed:", e.message));

    logActionFromReq(req, "escrow.refunded", {
      target: escrow._id,
      targetModel: "Escrow",
      resourceId: req.params.id,
      details: { carId: escrow.car, amount: escrow.amount },
      severity: "warning",
    });

    res.json({
      success: true,
      message: "Escrow refunded",
    });
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
    console.error("REFUND ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Refund failed",
    });
  }
};
