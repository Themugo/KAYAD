// backend/services/paymentService.js — FIXED: emits socket events on confirmation
import Payment         from "../models/Payment.js";
import MpesaTransaction from "../models/MpesaTransaction.js";
import { stkPush }     from "./mpesaService.js";

const formatPhone = (phone) => {
  if (!phone) return null;
  phone = phone.toString().trim();
  if (phone.startsWith("0"))    return "254" + phone.slice(1);
  if (phone.startsWith("+254")) return phone.slice(1);
  if (phone.startsWith("254"))  return phone;
  return null;
};

// ── INITIATE ─────────────────────────────────────────────────
export const initiatePayment = async ({ userId, carId, type, amount, phone, metadata = {} }) => {
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) throw new Error("Invalid Safaricom number");

  // Prevent duplicate pending payments for same car
  const existing = await Payment.findOne({
    user: userId, car: carId,
    status: { $in: ["pending", "initiated"] },
    type,
  });
  if (existing) {
    return { success: false, message: "Payment already in progress", payment: existing };
  }

  let checkoutID = "MOCK_" + Date.now();
  let mode = "mock";

  try {
    const stkRes = await stkPush(formattedPhone, amount);
    if (stkRes?.CheckoutRequestID) {
      checkoutID = stkRes.CheckoutRequestID;
      mode = "mpesa";
    }
  } catch (err) {
    console.warn("⚠️ STK Push failed → mock mode:", err.message);
  }

  const payment = await Payment.create({
    user: userId, car: carId, type, amount,
    phone: formattedPhone,
    status: mode === "mpesa" ? "pending" : "initiated",
    checkoutRequestID: checkoutID,   // consistent casing
    checkoutRequestId: checkoutID,   // legacy compat
    mode,
    ...metadata,
  });

  await MpesaTransaction.create({
    checkoutRequestID: checkoutID,
    phone: formattedPhone, amount,
    status: payment.status, carId,
  }).catch(() => {});

  return {
    success: true, mode, checkoutID,
    checkoutRequestID: checkoutID,
    payment,
    message: mode === "mpesa" ? "STK push sent — check your phone" : "Mock payment initiated",
  };
};

// ── CONFIRM (fires socket events) ─────────────────────────────
export const confirmPayment = async ({ checkoutRequestID, receipt, amount }) => {
  const payment = await Payment.findOne({
    $or: [{ checkoutRequestID }, { checkoutRequestId: checkoutRequestID }],
  });

  if (!payment) throw new Error("Payment record not found");
  if (payment.status === "success") return payment; // idempotent

  if (Number(amount) !== Number(payment.amount)) {
    throw new Error(`Amount mismatch: expected ${payment.amount}, got ${amount}`);
  }

  payment.status            = "success";
  payment.mpesaReceiptNumber = receipt;
  payment.mpesaReceipt      = receipt;
  payment.paidAt            = new Date();
  await payment.save();

  await MpesaTransaction.findOneAndUpdate(
    { $or: [{ checkoutRequestID }, { checkoutRequestId: checkoutRequestID }] },
    { status: "success", mpesaReceipt: receipt }
  ).catch(() => {});

  // ── PDF RECEIPT (fire-and-forget) ─────────────────────────
  try {
    const { generateReceipt } = await import("./pdfService.js");
    const pdfBuffer = await generateReceipt({
      title: payment.type === "escrow" ? "Escrow Payment Confirmed" : "Payment Confirmed",
      buyerName: payment.user?.toString() || "—",
      amount: payment.amount,
      transactionId: receipt || payment._id.toString(),
      carDetails: payment.car?.toString() || "—",
      date: new Date(),
    });
    // Could store to file/cloud in future
  } catch (_) { /* PDF generation non-critical */ }

  // If escrow payment, mark escrow as held
  if (payment.type === "escrow") {
    const Escrow = (await import("../models/Escrow.js")).default;
    const escrow = await Escrow.findOne({ payment: payment._id });
    if (escrow && escrow.status === "pending") {
      await escrow.markFunded();
    }
  }

  // ── EMIT: user gets real-time confirmation ──────────────────
  const io = global.io;
  if (io) {
    const payload = { checkoutID: checkoutRequestID, receipt, paymentId: payment._id };

    // Notify the payer's personal room
    io.to(`user_${payment.user}`).emit("paymentSuccess", payload);

    // Also notify the auction room (carId) so all watchers see confirmed bid
    if (payment.car) {
      io.to(String(payment.car)).emit("paymentSuccess", payload);
    }
  }

  return payment;
};

// ── FAIL ──────────────────────────────────────────────────────
export const failPayment = async (checkoutRequestID, resultDesc = "") => {
  const payment = await Payment.findOne({
    $or: [{ checkoutRequestID }, { checkoutRequestId: checkoutRequestID }],
  });

  if (!payment || payment.status === "success") return;

  payment.status    = "failed";
  payment.resultDesc = resultDesc;
  await payment.save();

  await MpesaTransaction.findOneAndUpdate(
    { $or: [{ checkoutRequestID }, { checkoutRequestId: checkoutRequestID }] },
    { status: "failed" }
  ).catch(() => {});

  // ── EMIT failure ────────────────────────────────────────────
  const io = global.io;
  if (io) {
    const payload = { checkoutID: checkoutRequestID, reason: resultDesc };
    io.to(`user_${payment.user}`).emit("paymentFailed", payload);
    if (payment.car) io.to(String(payment.car)).emit("paymentFailed", payload);
  }
};
