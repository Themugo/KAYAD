import Payment from "../models/Payment.js";
import MpesaTransaction from "../models/MpesaTransaction.js";
import { stkPush } from "./mpesaService.js";
import { createEscrow } from "./escrow.service.js";

// =============================
// 📞 FORMAT PHONE
// =============================
const formatPhone = (phone) => {
  if (!phone) return null;

  phone = phone.toString().trim();

  if (phone.startsWith("0")) return "254" + phone.slice(1);
  if (phone.startsWith("+254")) return phone.slice(1);
  if (phone.startsWith("254")) return phone;

  return null;
};

// =============================
// 💰 INITIATE PAYMENT (SAFE)
// =============================
export const initiatePayment = async ({
  userId,
  carId,
  type,
  amount,
  phone,
  metadata = {},
}) => {
  try {
    const formattedPhone = formatPhone(phone);
    if (!formattedPhone) throw new Error("Invalid phone");

    // 🛡 Prevent duplicate pending payments
    const existing = await Payment.findOne({
      user: userId,
      car: carId,
      status: { $in: ["pending", "initiated"] },
    });

    if (existing) {
      return {
        success: false,
        message: "Payment already in progress",
        payment: existing,
      };
    }

    // =============================
    // 📲 STK PUSH
    // =============================
    let stkRes;
    let mode = "mock";

    try {
      stkRes = await stkPush(formattedPhone, amount);
      mode = stkRes?.CheckoutRequestID ? "mpesa" : "mock";
    } catch (err) {
      console.warn("⚠️ MPESA FAILED:", err.message);
    }

    const checkoutID =
      stkRes?.CheckoutRequestID || "mock_" + Date.now();

    // =============================
    // 💾 SAVE PAYMENT
    // =============================
    const payment = await Payment.create({
      user: userId,
      car: carId,
      type,
      amount,
      phone: formattedPhone,
      status: mode === "mpesa" ? "pending" : "success",
      checkoutRequestId: checkoutID,
      mode,
      ...metadata,
    });

    // =============================
    // 💾 MPESA TX
    // =============================
    await MpesaTransaction.create({
      checkoutRequestID: checkoutID,
      phone: formattedPhone,
      amount,
      status: payment.status,
      carId,
    });

    return {
      success: true,
      mode,
      checkoutID,
      payment,
    };
  } catch (err) {
    console.error("❌ INIT ERROR:", err);
    throw err;
  }
};

// =============================
// ✅ CONFIRM (CALLBACK ONLY)
// =============================
export const confirmPayment = async ({
  checkoutRequestID,
  receipt,
}) => {
  try {
    const payment = await Payment.findOne({
      checkoutRequestId: checkoutRequestID,
    });

    if (!payment) throw new Error("Payment not found");

    // 🛡 Idempotency
    if (payment.status === "success") return payment;

    payment.status = "success";
    payment.mpesaReceipt = receipt;
    payment.paidAt = new Date();

    await payment.save();

    await MpesaTransaction.findOneAndUpdate(
      { checkoutRequestID },
      {
        status: "success",
        mpesaReceipt: receipt,
      }
    );

    // 🔥 CREATE ESCROW
    await createEscrow({
      car: payment.car,
      buyer: payment.user,
      amount: payment.amount,
      paymentId: payment._id,
    });

    return payment;
  } catch (err) {
    console.error("❌ CONFIRM ERROR:", err);
    throw err;
  }
};

// =============================
// ❌ FAIL PAYMENT
// =============================
export const failPayment = async (checkoutRequestID) => {
  try {
    const payment = await Payment.findOne({
      checkoutRequestId: checkoutRequestID,
    });

    if (!payment) return;

    if (payment.status === "success") return;

    payment.status = "failed";
    await payment.save();

    await MpesaTransaction.findOneAndUpdate(
      { checkoutRequestID },
      { status: "failed" }
    );

    return true;
  } catch (err) {
    console.error("❌ FAIL ERROR:", err);
    throw err;
  }
};