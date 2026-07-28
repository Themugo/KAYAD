// backend/services/cardPaymentService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Card payment service (backup payment gateway)
// Provides card payment processing as backup to M-Pesa
// ─────────────────────────────────────────────────────────────

import axios from "axios";
import Payment from "../models/Payment.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 💳 CARD PAYMENT CONFIGURATION
// =============================

const CARD_CONFIG = {
  enabled: process.env.CARD_PAYMENT_ENABLED === "true",
  provider: process.env.CARD_PAYMENT_PROVIDER || "stripe", // stripe, flutterwave, paystack
  apiKey: process.env.CARD_PAYMENT_API_KEY,
  secretKey: process.env.CARD_PAYMENT_SECRET_KEY,
  webhookSecret: process.env.CARD_PAYMENT_WEBHOOK_SECRET,
  currency: process.env.CARD_PAYMENT_CURRENCY || "KES",
};

// =============================
// 📤 INITIATE CARD PAYMENT
// =============================

export const initiateCardPayment = async ({ userId, amount, carId, type, cardDetails }) => {
  try {
    if (!CARD_CONFIG.enabled) {
      throw new Error("Card payment not enabled");
    }

    if (!CARD_CONFIG.apiKey) {
      throw new Error("Card payment API key not configured");
    }

    // Generate unique payment reference
    const paymentRef = `CARD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let paymentIntent;

    switch (CARD_CONFIG.provider) {
      case "stripe":
        paymentIntent = await initiateStripePayment({ amount, cardDetails, paymentRef });
        break;
      case "flutterwave":
        paymentIntent = await initiateFlutterwavePayment({ amount, cardDetails, paymentRef });
        break;
      case "paystack":
        paymentIntent = await initiatePaystackPayment({ amount, cardDetails, paymentRef });
        break;
      default:
        throw new Error(`Unsupported payment provider: ${CARD_CONFIG.provider}`);
    }

    // Create payment record
    const payment = await Payment.create({
      user: userId,
      car: carId,
      type,
      amount,
      gateway: "card",
      gatewayProvider: CARD_CONFIG.provider,
      checkoutRequestId: paymentRef,
      status: "pending",
      metadata: {
        paymentIntentId: paymentIntent.id,
        cardLast4: cardDetails.cardNumber.slice(-4),
      },
    });

    logInfo("Card payment initiated", { paymentId: payment._id, paymentRef, amount });

    return {
      success: true,
      payment,
      paymentIntent,
      paymentRef,
      clientSecret: paymentIntent.clientSecret,
    };
  } catch (err) {
    logError("Card payment initiation failed", err);
    throw err;
  }
};

// =============================
// 💳 STRIPE PAYMENT
// =============================

const initiateStripePayment = async ({ amount, cardDetails, paymentRef }) => {
  try {
    const stripe = await import("stripe");
    const stripeClient = stripe.default(CARD_CONFIG.secretKey);

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: CARD_CONFIG.currency.toLowerCase(),
      metadata: {
        paymentRef,
        integration: "kayad",
      },
      description: "KAYAD Car Purchase",
    });

    return paymentIntent;
  } catch (err) {
    logError("Stripe payment failed", err);
    throw err;
  }
};

// =============================
// 🌊 FLUTTERWAVE PAYMENT
// =============================

const initiateFlutterwavePayment = async ({ amount, cardDetails, paymentRef }) => {
  try {
    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: paymentRef,
        amount,
        currency: CARD_CONFIG.currency,
        payment_options: "card",
        customer: {
          email: cardDetails.email,
          phone: cardDetails.phone,
          name: cardDetails.name,
        },
        card: {
          card_number: cardDetails.cardNumber,
          cvv: cardDetails.cvv,
          expiry_month: cardDetails.expiryMonth,
          expiry_year: cardDetails.expiryYear,
        },
        customizations: {
          title: "KAYAD Car Purchase",
          description: "Payment for vehicle purchase",
          logo: "https://www.kayad.space/logo.png",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${CARD_CONFIG.secretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    return {
      id: response.data.data.id,
      clientSecret: response.data.data.flw_ref,
      status: response.data.data.status,
    };
  } catch (err) {
    logError("Flutterwave payment failed", err);
    throw err;
  }
};

// =============================
// 🏗️ PAYSTACK PAYMENT
// =============================

const initiatePaystackPayment = async ({ amount, cardDetails, paymentRef }) => {
  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        reference: paymentRef,
        amount: Math.round(amount * 100), // Convert to kobo
        email: cardDetails.email,
        currency: CARD_CONFIG.currency,
        card: {
          number: cardDetails.cardNumber,
          cvv: cardDetails.cvv,
          expiry_month: cardDetails.expiryMonth,
          expiry_year: cardDetails.expiryYear,
        },
        metadata: {
          custom_fields: [
            {
              display_name: "Payment Ref",
              variable_name: "payment_ref",
              value: paymentRef,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${CARD_CONFIG.secretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    return {
      id: response.data.data.reference,
      clientSecret: response.data.data.access_code,
      status: response.data.data.status,
    };
  } catch (err) {
    logError("Paystack payment failed", err);
    throw err;
  }
};

// =============================
// 📥 VERIFY CARD PAYMENT
// =============================

export const verifyCardPayment = async (paymentRef) => {
  try {
    const payment = await Payment.findOne({ checkoutRequestId: paymentRef });

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status === "success") {
      return { success: true, payment };
    }

    let verificationResult;

    switch (CARD_CONFIG.provider) {
      case "stripe":
        verificationResult = await verifyStripePayment(payment.metadata.paymentIntentId);
        break;
      case "flutterwave":
        verificationResult = await verifyFlutterwavePayment(paymentRef);
        break;
      case "paystack":
        verificationResult = await verifyPaystackPayment(paymentRef);
        break;
      default:
        throw new Error(`Unsupported payment provider: ${CARD_CONFIG.provider}`);
    }

    // Update payment status
    if (verificationResult.success) {
      payment.status = "success";
      payment.transactionId = verificationResult.transactionId;
      payment.completedAt = new Date();
      await payment.save();

      logInfo("Card payment verified successfully", { paymentId: payment._id, paymentRef });
    } else {
      payment.status = "failed";
      payment.failureReason = verificationResult.reason;
      await payment.save();

      logWarn("Card payment verification failed", {
        paymentId: payment._id,
        paymentRef,
        reason: verificationResult.reason,
      });
    }

    return {
      success: verificationResult.success,
      payment,
      verificationResult,
    };
  } catch (err) {
    logError("Card payment verification failed", err);
    throw err;
  }
};

// =============================
// ✅ VERIFY STRIPE PAYMENT
// =============================

const verifyStripePayment = async (paymentIntentId) => {
  try {
    const stripe = await import("stripe");
    const stripeClient = stripe.default(CARD_CONFIG.secretKey);

    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

    return {
      success: paymentIntent.status === "succeeded",
      transactionId: paymentIntent.id,
      reason: paymentIntent.status,
    };
  } catch (err) {
    logError("Stripe payment verification failed", err);
    return { success: false, reason: err.message };
  }
};

// =============================
// ✅ VERIFY FLUTTERWAVE PAYMENT
// =============================

const verifyFlutterwavePayment = async (paymentRef) => {
  try {
    const response = await axios.get(`https://api.flutterwave.com/v3/transactions/${paymentRef}/verify`, {
      headers: {
        Authorization: `Bearer ${CARD_CONFIG.secretKey}`,
      },
    });

    const transaction = response.data.data;

    return {
      success: transaction.status === "successful",
      transactionId: transaction.id,
      reason: transaction.status,
    };
  } catch (err) {
    logError("Flutterwave payment verification failed", err);
    return { success: false, reason: err.message };
  }
};

// =============================
// ✅ VERIFY PAYSTACK PAYMENT
// =============================

const verifyPaystackPayment = async (paymentRef) => {
  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${paymentRef}`, {
      headers: {
        Authorization: `Bearer ${CARD_CONFIG.secretKey}`,
      },
    });

    const transaction = response.data.data;

    return {
      success: transaction.status === "success",
      transactionId: transaction.reference,
      reason: transaction.status,
    };
  } catch (err) {
    logError("Paystack payment verification failed", err);
    return { success: false, reason: err.message };
  }
};

// =============================
// 📊 GET CARD PAYMENT STATUS
// =============================

export const getCardPaymentStatus = () => {
  return {
    enabled: CARD_CONFIG.enabled,
    provider: CARD_CONFIG.provider,
    currency: CARD_CONFIG.currency,
    configured: !!CARD_CONFIG.apiKey && !!CARD_CONFIG.secretKey,
  };
};

export default {
  initiateCardPayment,
  verifyCardPayment,
  getCardPaymentStatus,
};
