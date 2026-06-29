import crypto from "node:crypto";
import Car from "../models/Car.js";
import EscrowVault from "../models/EscrowVault.js";
import { sendOTP, verifyOTP } from "../services/otpService.js";
import { sendNotification } from "../services/notification.service.js";
import { emitListingUpdate } from "../socket/socket.js";
import { logSecurityAction, logActionFromReq } from "../utils/securityLogger.js";

const addHistory = (vault, action, userId) => {
  vault.history.push({ action, at: new Date(), by: userId });
};

// =============================
// 🔐 INIT VAULT AFTER AUCTION WIN
// =============================
export const initEscrowVault = async (req, res) => {
  try {
    const { id: carId } = req.params;
    const userId = req.user.id;

    const car = await Car.findById(carId);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    if (!car.winner || car.winner.user?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Only the winning bidder can initiate escrow" });
    }

    const existing = await EscrowVault.findOne({ car: carId, status: { $nin: ["released", "refunded"] } });
    if (existing) {
      return res.json({ success: true, vault: existing });
    }

    const ref = `KYD-${carId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    if (!process.env.ESCROW_ACCOUNT_NUMBER) {
      console.error("ESCROW_ACCOUNT_NUMBER not set — escrow vault cannot be created");
      return res.status(500).json({ success: false, message: "Escrow not configured. Contact support." });
    }
    const vault = await EscrowVault.create({
      car: carId,
      buyer: userId,
      seller: car.dealer,
      amount: car.winner.amount,
      bankTransferRef: ref,
      platformAccountName: process.env.ESCROW_PLATFORM_NAME || "KAYAD Escrow Services Ltd",
      platformAccountNumber: process.env.ESCROW_ACCOUNT_NUMBER,
      platformBankName: process.env.ESCROW_BANK_NAME || "Equity Bank Kenya",
      history: [{ action: "Escrow vault initialized", at: new Date(), by: userId }],
    });

    // Notify seller
    await sendNotification({
      userId: car.dealer,
      title: "🚗 Escrow Vault Created",
      message: `The winning bidder has initiated a bank transfer escrow for ${car.title || "your car"} (KES ${Number(vault.amount).toLocaleString("en-KE")}). Awaiting funds confirmation.`,
      type: "escrow",
    });

    res.json({ success: true, vault });
  } catch (err) {
    console.error("❌ INIT VAULT ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to initiate escrow" });
  }
};

// =============================
// 📡 WEBHOOK: BANK CONFIRMS FUNDS
// =============================
export const webhookFundsReceived = async (req, res) => {
  try {
    const { id } = req.params;
    const { bankRef, amount } = req.body;

    // ── Atomic claim: only one webhook can fund a vault ──────
    const vault = await EscrowVault.findOneAndUpdate(
      { _id: id, status: "awaiting_payment" },
      { $set: { status: "escrow_locked", fundedAt: new Date() } },
      { new: true },
    ).populate("car seller buyer");

    if (!vault) {
      const existing = await EscrowVault.findById(id).populate("car seller buyer");
      if (existing && existing.status !== "awaiting_payment") {
        return res.json({ success: true, message: "Already funded" });
      }
      return res.status(404).json({ success: false, message: "Vault not found" });
    }

    addHistory(vault, "Funds confirmed in escrow vault", vault.buyer);
    await vault.save();

    logSecurityAction({
      action: "escrow_vault.funded",
      target: vault._id,
      targetModel: "EscrowVault",
      resourceId: id,
      details: { carId: vault.car?._id, amount: vault.amount, bankRef },
      severity: "info",
    });

    // Update car status
    const car = vault.car;
    if (car) {
      car.status = "pending";
      await car.save();
      emitListingUpdate(car._id.toString(), { status: "pending", escrowStatus: "escrow_locked" });
    }

    // Notify seller — cash secured, release car for inspection
    await sendNotification({
      userId: vault.seller._id,
      title: "💰 Funds Secured in Escrow Vault",
      message: `KES ${Number(vault.amount).toLocaleString("en-KE")} is secured in the KAYAD escrow vault for ${car?.title || "your listing"}. You can now safely release the vehicle for physical inspection and NTSA TIMS verification.`,
      type: "escrow",
      phone: vault.seller.phone,
    });

    // Notify buyer
    await sendNotification({
      userId: vault.buyer._id,
      title: "✅ Escrow Locked — Inspection Ready",
      message: `Your payment of KES ${Number(vault.amount).toLocaleString("en-KE")} has been confirmed in the escrow vault. Schedule your physical inspection now.`,
      type: "escrow",
      phone: vault.buyer.phone,
    });

    vault.sellerNotifiedAt = new Date();
    vault.buyerNotifiedAt = new Date();
    await vault.save();

    res.json({ success: true, vault });
  } catch (err) {
    console.error("❌ WEBHOOK FUNDS ERROR:", err);
    res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};

// =============================
// 👤 ADMIN: MANUALLY CONFIRM FUNDS
// =============================
export const adminConfirmFunding = async (req, res) => {
  try {
    const { id } = req.params;
    const vault = await EscrowVault.findById(id).populate("car seller buyer");
    if (!vault) return res.status(404).json({ success: false, message: "Vault not found" });

    vault.status = "escrow_locked";
    vault.fundedAt = new Date();
    addHistory(vault, "Funding confirmed by admin", req.user.id);
    await vault.save();

    const car = vault.car;
    if (car) {
      car.status = "pending";
      await car.save();
      emitListingUpdate(car._id.toString(), { status: "pending", escrowStatus: "escrow_locked" });
    }

    await sendNotification({
      userId: vault.seller._id,
      title: "💰 Funds Secured in Escrow Vault",
      message: `KES ${Number(vault.amount).toLocaleString("en-KE")} confirmed in escrow for ${car?.title || "your listing"}. Vehicle can now be released for inspection.`,
      type: "escrow",
    });

    res.json({ success: true, vault });
  } catch (err) {
    console.error("❌ ADMIN CONFIRM FUNDS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to confirm funding" });
  }
};

// =============================
// ✅ MARK INSPECTION COMPLETE
// =============================
export const markInspectionComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const vault = await EscrowVault.findById(id).populate("car seller buyer");
    if (!vault) return res.status(404).json({ success: false, message: "Vault not found" });

    if (vault.buyer._id.toString() !== userId && vault.seller._id.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (vault.status !== "escrow_locked" && vault.status !== "inspection_pending") {
      return res
        .status(400)
        .json({ success: false, message: `Cannot mark inspection — current status: ${vault.status}` });
    }

    vault.status = "inspection_complete";
    vault.inspectionCompletedAt = new Date();
    addHistory(vault, "Inspection & NTSA verification completed", userId);
    await vault.save();

    res.json({ success: true, vault });
  } catch (err) {
    console.error("❌ INSPECTION COMPLETE ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to mark inspection complete" });
  }
};

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const generateOtp = () => Math.floor(1000 + Math.random() * 9000);

// =============================
// 📲 REQUEST RELEASE OTP
// =============================
export const requestReleaseOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const vault = await EscrowVault.findById(id).populate("buyer");
    if (!vault) return res.status(404).json({ success: false, message: "Vault not found" });

    if (vault.buyer._id.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Only the buyer can request release OTP" });
    }

    if (vault.status !== "inspection_complete") {
      return res
        .status(400)
        .json({ success: false, message: "Inspection must be completed before requesting release OTP" });
    }

    if (vault.otpAttempts >= 5) {
      return res.status(429).json({ success: false, message: "Too many OTP attempts. Contact support." });
    }

    if (vault.lastOtpSentAt && Date.now() - new Date(vault.lastOtpSentAt).getTime() < 60000) {
      return res.status(429).json({ success: false, message: "Please wait 60 seconds before requesting a new OTP" });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiry = new Date(Date.now() + 600000);

    vault.releaseOtp = otpHash;
    vault.otpExpiry = otpExpiry;
    vault.lastOtpSentAt = new Date();
    vault.status = "otp_sent";
    addHistory(vault, "Release OTP sent to buyer", userId);
    await vault.save();

    const phone = vault.buyer.phone;
    if (phone) {
      console.log(`[OTP] To ${phone}: Your KAYAD release code is: ${otp}`);
    }

    res.json({ success: true, message: "OTP sent to your registered phone" });
  } catch (err) {
    console.error("❌ REQUEST OTP ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// =============================
// 🔓 RELEASE FUNDS VIA OTP
// =============================
export const releaseWithOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    const userId = req.user.id;

    if (!otp) return res.status(400).json({ success: false, message: "OTP is required" });

    const vault = await EscrowVault.findById(id).populate("buyer seller car");
    if (!vault) return res.status(404).json({ success: false, message: "Vault not found" });

    const idempotencyKey = req.idempotencyKey;
    if (idempotencyKey && vault.lastActionKey === idempotencyKey) {
      return res.json({ success: true, message: "Already released", vault });
    }

    if (vault.buyer._id.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Only the buyer can release funds" });
    }

    if (vault.status !== "otp_sent") {
      return res.status(400).json({ success: false, message: `Cannot release — current status: ${vault.status}` });
    }

    if (vault.otpAttempts >= 5) {
      return res.status(429).json({ success: false, message: "Too many invalid attempts. Contact support." });
    }

    if (Date.now() > new Date(vault.otpExpiry).getTime()) {
      vault.otpAttempts += 1;
      vault.status = "inspection_complete";
      await vault.save();
      return res.status(400).json({ success: false, message: "OTP expired. Request a new one." });
    }

    const otpHash = hashOtp(otp);
    const storedHash = vault.releaseOtp || "";
    if (storedHash.length !== otpHash.length || !crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(otpHash))) {
      vault.otpAttempts += 1;
      await vault.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    vault.status = "released";
    vault.releasedAt = new Date();
    vault.releaseOtp = undefined;
    vault.otpExpiry = undefined;
    if (idempotencyKey) vault.lastActionKey = idempotencyKey;
    addHistory(vault, "Funds released to seller by buyer OTP confirmation", userId);
    await vault.save();

    logSecurityAction({
      action: "escrow_vault.released",
      target: vault._id,
      targetModel: "EscrowVault",
      resourceId: id,
      details: { carId: vault.car?._id, amount: vault.amount },
      severity: "info",
    });

    const car = vault.car;
    if (car) {
      car.sold = true;
      car.status = "sold";
      car.paymentStatus = "released";
      car.isPaid = true;
      await car.save();
      emitListingUpdate(car._id.toString(), { status: "sold", sold: true, paymentStatus: "released" });
    }

    // Notify seller
    await sendNotification({
      userId: vault.seller._id,
      title: "💰 Funds Released!",
      message: `KES ${Number(vault.amount).toLocaleString("en-KE")} has been released to your account for ${car?.title || "your vehicle"}. Check your bank.`,
      type: "escrow",
      phone: vault.seller.phone,
    });

    // Notify buyer
    await sendNotification({
      userId: vault.buyer._id,
      title: "✅ Transaction Complete",
      message: `Funds released for ${car?.title || "your purchase"}. The seller will be notified. Enjoy your vehicle!`,
      type: "escrow",
      phone: vault.buyer.phone,
    });

    res.json({ success: true, vault });
  } catch (err) {
    console.error("❌ RELEASE OTP ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to release funds" });
  }
};

// =============================
// 📋 ADMIN: REFUND BUYER
// =============================
export const adminRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const vault = await EscrowVault.findById(id).populate("buyer seller car");
    if (!vault) return res.status(404).json({ success: false, message: "Vault not found" });

    if (vault.status === "released") {
      return res.status(400).json({ success: false, message: "Already released" });
    }

    vault.status = "refunded";
    addHistory(vault, "Funds refunded to buyer by admin", req.user.id);
    await vault.save();

    logActionFromReq(req, "escrow_vault.refunded", {
      target: vault._id,
      targetModel: "EscrowVault",
      resourceId: id,
      details: { carId: vault.car?._id, amount: vault.amount },
      severity: "warning",
    });

    const car = vault.car;
    if (car) {
      car.status = "active";
      car.winner = undefined;
      car.paymentStatus = "refunded";
      car.isPaid = false;
      car.currentBid = 0;
      car.highestBidder = undefined;
      await car.save();
      emitListingUpdate(car._id.toString(), { status: "active", paymentStatus: "refunded" });
    }

    await sendNotification({
      userId: vault.buyer._id,
      title: "💰 Escrow Refunded",
      message: `KES ${Number(vault.amount).toLocaleString("en-KE")} has been refunded to your bank account for ${car?.title || "your purchase"}.`,
      type: "escrow",
      phone: vault.buyer.phone,
    });

    res.json({ success: true, vault });
  } catch (err) {
    console.error("❌ REFUND ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to refund" });
  }
};

// =============================
// 📖 GET USER VAULTS
// =============================
export const getUserVaults = async (req, res) => {
  try {
    const userId = req.user.id;
    const vaults = await EscrowVault.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .populate("car", "title brand model year images coverImage")
      .populate("buyer", "name phone")
      .populate("seller", "name phone")
      .sort({ createdAt: -1 });
    res.json({ success: true, vaults });
  } catch (err) {
    console.error("❌ GET VAULTS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch vaults" });
  }
};

// =============================
// 🔍 GET SINGLE VAULT
// =============================
export const getVaultById = async (req, res) => {
  try {
    const { id } = req.params;
    const vault = await EscrowVault.findById(id)
      .populate("car", "title brand model year images coverImage")
      .populate("buyer", "name phone")
      .populate("seller", "name phone");
    if (!vault) return res.status(404).json({ success: false, message: "Vault not found" });
    const userId = req.user.id;
    if (vault.buyer._id.toString() !== userId && vault.seller._id.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    res.json({ success: true, vault });
  } catch (err) {
    console.error("❌ GET VAULT ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch vault" });
  }
};

// =============================
// 📋 ADMIN: ALL VAULTS
// =============================
export const getAllVaults = async (req, res) => {
  try {
    const vaults = await EscrowVault.find({})
      .populate("car", "title brand model")
      .populate("buyer", "name email")
      .populate("seller", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, vaults });
  } catch (err) {
    console.error("❌ ALL VAULTS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch vaults" });
  }
};

// =============================
// 📊 CHECK VAULT STATUS FOR A CAR
// =============================
export const getVaultForCar = async (req, res) => {
  try {
    const { id: carId } = req.params;
    const vault = await EscrowVault.findOne({
      car: carId,
      status: { $nin: ["released", "refunded"] },
    })
      .populate("buyer", "name")
      .populate("seller", "name");
    if (!vault) return res.json({ success: true, vault: null });
    const userId = req.user.id;
    if (vault.buyer._id.toString() !== userId && vault.seller._id.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    res.json({ success: true, vault });
  } catch (err) {
    console.error("❌ CAR VAULT ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to check vault" });
  }
};
