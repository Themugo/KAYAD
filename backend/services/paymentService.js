// backend/services/paymentService.js — FIXED: emits socket events on confirmation
import Payment         from "../models/Payment.js";
import MpesaTransaction from "../models/MpesaTransaction.js";
import { stkPush }     from "./mpesaService.js";
import { getIO } from "../utils/io.js";

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
    status: "pending",
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
    if (process.env.NODE_ENV === "production") {
      throw err;
    }
    console.warn("STK Push failed, using mock mode:", err.message);
  }

  const payment = await Payment.create({
    user: userId, car: carId, type, amount,
    referenceId: carId,
    referenceModel: "Car",
    phone: formattedPhone,
    status: "pending",
    checkoutRequestId: checkoutID,
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
    message: mode === "mpesa" ? "STK push sent, check your phone" : "Mock payment initiated",
  };
};

// ── CONFIRM (fires socket events) ─────────────────────────────
export const confirmPayment = async ({ checkoutRequestID, receipt, amount }) => {
  const payment = await Payment.findOne({ checkoutRequestId: checkoutRequestID });

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
    { checkoutRequestID },
    { status: "success", mpesaReceipt: receipt }
  ).catch(() => {});

  // 📧 Payment confirmed email (fire-and-forget)
  try {
    const { sendPaymentConfirmedEmail } = await import("./email.service.js");
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(payment.user).select("email name");
    if (user?.email && typeof sendPaymentConfirmedEmail === "function") {
      let carTitle = null;
      if (payment.car) {
        const Car = (await import("../models/Car.js")).default;
        const carDoc = await Car.findById(payment.car).select("title");
        carTitle = carDoc?.title || null;
      }
      sendPaymentConfirmedEmail(user, payment, { title: carTitle }).catch(e =>
        console.warn("⚠️ Payment confirmed email failed:", e.message)
      );
    }
  } catch (_) {}

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

  // If no escrow record exists (escrow disabled on car), mark car sold directly
  if (payment.car) {
    const Car = (await import("../models/Car.js")).default;
    const car = await Car.findById(payment.car);
    if (car && !car.escrowEnabled) {
      car.sold = true;
      car.status = "sold";
      car.isPaid = true;
      car.paymentStatus = "paid";
      await car.save();
    }
  }

  // ── EMIT: user gets real-time confirmation ──────────────────
  const io = getIO();
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
  const payment = await Payment.findOne({ checkoutRequestId: checkoutRequestID });

  if (!payment || payment.status === "success") return;

  payment.status    = "failed";
  payment.resultDesc = resultDesc;
  await payment.save();

  await MpesaTransaction.findOneAndUpdate(
    { checkoutRequestID },
    { status: "failed" }
  ).catch(() => {});

  // ── EMIT failure ────────────────────────────────────────────
  const io = getIO();
  if (io) {
    const payload = { checkoutID: checkoutRequestID, reason: resultDesc };
    io.to(`user_${payment.user}`).emit("paymentFailed", payload);
    if (payment.car) io.to(String(payment.car)).emit("paymentFailed", payload);
  }
};
