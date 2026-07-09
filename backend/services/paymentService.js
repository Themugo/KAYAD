// backend/services/paymentService.js — FIXED: emits socket events on confirmation
import { stkPush } from "./mpesaService.js";
import { sendDigitalReceipt } from "./receiptService.js";
import { getIO } from "../utils/io.js";
import { findById, findOne, create, update } from "../db/index.js";

const formatPhone = (phone) => {
  if (!phone) return null;
  phone = phone.toString().trim();
  if (phone.startsWith("0")) return "254" + phone.slice(1);
  if (phone.startsWith("+254")) return phone.slice(1);
  if (phone.startsWith("254")) return phone;
  return null;
};

// ── INITIATE ─────────────────────────────────────────────────
export const initiatePayment = async ({ userId, carId, type, amount, phone, metadata = {} }) => {
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) return { success: false, message: "Invalid Safaricom number" };

  const existing = await findOne("payments", {
    user: userId, car: carId, status: "pending", type,
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
      mode = String(checkoutID).toLowerCase().startsWith("mock_") ? "mock" : "mpesa";
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "development") throw err;
    console.warn("STK Push failed, using mock mode:", err.message);
  }

  const payment = await create("payments", {
    user: userId,
    car: carId,
    type,
    amount,
    referenceId: carId,
    referenceModel: "Car",
    phone: formattedPhone,
    status: "pending",
    checkoutRequestId: checkoutID,
    mode,
    ...metadata,
  });

  await create("mpesa_transactions", {
    checkoutRequestID: checkoutID,
    phone: formattedPhone,
    amount,
    status: payment.status,
    carId,
  }).catch((e) => console.warn("⚠️ Payment notification failed:", e.message));

  return {
    success: true,
    mode,
    checkoutID,
    checkoutRequestID: checkoutID,
    payment,
    message: mode === "mpesa" ? "STK push sent, check your phone" : "Mock payment initiated",
  };
};

// ── CONFIRM (fires socket events) ─────────────────────────────
export const confirmPayment = async ({ checkoutRequestID, receipt, amount }) => {
  const payment = await findOne("payments", { checkoutRequestId: checkoutRequestID });

  if (!payment) throw new Error("Payment record not found");
  if (payment.status === "success") return payment;

  if (Number(amount) !== Number(payment.amount)) {
    throw new Error(`Amount mismatch: expected ${payment.amount}, got ${amount}`);
  }

  const updatedPayment = await update("payments", payment.id, {
    status: "success",
    mpesaReceiptNumber: receipt,
    mpesaReceipt: receipt,
    paidAt: new Date().toISOString(),
  });

  await update("mpesa_transactions", payment.id, { status: "success", mpesaReceipt: receipt }).catch(
    (e) => console.warn("⚠️ Payment service notification failed:", e.message),
  );

  // 📧 Payment confirmed email (fire-and-forget)
  try {
    const { sendPaymentConfirmedEmail } = await import("./email.service.js");
    const user = await findById("users", payment.user, "email,name");
    if (user?.email && typeof sendPaymentConfirmedEmail === "function") {
      let carTitle = null;
      if (payment.car) {
        const carDoc = await findById("cars", payment.car, "title");
        carTitle = carDoc?.title || null;
      }
      sendPaymentConfirmedEmail(user, updatedPayment, { title: carTitle }).catch((e) =>
        console.warn("⚠️ Payment confirmed email failed:", e.message),
      );
    }
  } catch (_) {}

  // ── DIGITAL RECEIPT (email + SMS + WhatsApp) ──────────────
  try {
    const userDoc = await findById("users", payment.user, "email,name,phone");
    if (userDoc) {
      sendDigitalReceipt({
        amount: payment.amount,
        carTitle: payment.car?.toString() || "Vehicle",
        mpesaReceipt: receipt || String(payment.id).slice(-8),
        user: { email: userDoc.email, phone: userDoc.phone, id: userDoc.id },
      }).catch((e) => console.warn("⚠️ Digital receipt failed:", e.message));
    }
  } catch (_) {}

  // If escrow payment, mark escrow as held
  if (payment.type === "escrow") {
    const escrow = await findOne("escrows", { payment: payment.id });
    if (escrow && escrow.status === "pending") {
      await update("escrows", escrow.id, { status: "funded", fundedAt: new Date().toISOString() });
    }
  }

  // If no escrow record exists (escrow disabled on car), mark car sold directly
  if (payment.car) {
    const car = await findById("cars", payment.car);
    if (car && !car.escrowEnabled) {
      await update("cars", car.id, { sold: true, status: "sold", isPaid: true, paymentStatus: "paid" });
    }
  }

  // ── EMIT: user gets real-time confirmation ──────────────────
  const io = getIO();
  if (io) {
    const payload = { checkoutID: checkoutRequestID, receipt, paymentId: payment.id };
    io.to(`user_${payment.user}`).emit("paymentSuccess", payload);
    if (payment.car) io.to(String(payment.car)).emit("paymentSuccess", payload);
  }

  return updatedPayment;
};

// ── FAIL ──────────────────────────────────────────────────────
export const failPayment = async (checkoutRequestID, resultDesc = "") => {
  const payment = await findOne("payments", { checkoutRequestId: checkoutRequestID });

  if (!payment || payment.status === "success") return;

  const updated = await update("payments", payment.id, { status: "failed", resultDesc });

  const mpesaTxn = await findOne("mpesa_transactions", { checkoutRequestID: checkoutRequestID });
  if (mpesaTxn) {
    await update("mpesa_transactions", mpesaTxn.id, { status: "failed" }).catch((e) =>
      console.warn("⚠️ Payment service notification failed:", e.message),
    );
  }

  const io = getIO();
  if (io) {
    const payload = { checkoutID: checkoutRequestID, reason: resultDesc };
    io.to(`user_${payment.user}`).emit("paymentFailed", payload);
    if (payment.car) io.to(String(payment.car)).emit("paymentFailed", payload);
  }
};
