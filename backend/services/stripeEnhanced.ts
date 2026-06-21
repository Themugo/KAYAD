// services/stripeEnhanced.ts - Enhanced Stripe Integration for Visa/Mastercard
// Multi-currency support and enhanced payment methods

import Stripe from "stripe";
import { Payment, User } from "../db/index.js";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// ── Supported Currencies ───────────────────────────────────────────────────────────
const SUPPORTED_CURRENCIES = [
  "usd", "eur", "gbp", "cad", "aud", "jpy", "cny", "inr", "brl", "mxn",
  "zar", "kes", "ngn", "ghs", "ugx", "tzs", "rwf", "xaf", "xof",
];

// ── Card Type Detection ───────────────────────────────────────────────────────────
function getCardType(paymentMethod: Stripe.PaymentMethod): string {
  const card = paymentMethod.card;
  if (!card) return "unknown";

  const brand = card.brand;
  if (brand === "visa") return "visa";
  if (brand === "mastercard") return "mastercard";
  if (brand === "amex") return "amex";
  if (brand === "discover") return "discover";

  return brand.toLowerCase();
}

// ── Create Payment Intent with Multi-Currency ─────────────────────────────────────
export async function createEnhancedPaymentIntent(data: Record<string, unknown>) {
  const userId = data.userId as string;
  const amount = data.amount as number;
  const currency = data.currency as string;
  const description = data.description as string | undefined;
  const paymentMethodTypes = data.paymentMethodTypes as string[] | undefined;
  const metadata = data.metadata as Record<string, string> | undefined;

  if (!stripe) throw new Error("Stripe not configured");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Validate currency
  if (!SUPPORTED_CURRENCIES.includes(currency.toLowerCase())) {
    throw new Error(`Currency ${currency} not supported`);
  }

  // Default to card payment methods (Visa, Mastercard)
  const methods = paymentMethodTypes || ["card"];

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe uses cents
    currency: currency.toLowerCase(),
    description: description || "SIMTrace payment",
    payment_method_types: methods,
    metadata: {
      userId,
      ...metadata,
    },
    // Enable future payments
    setup_future_usage: "off_session",
  });

  // Save payment record
  const payment = await Payment.create({
    user: userId,
    reference: paymentIntent.id,
    amount,
    currency,
    description,
    status: "pending",
    paymentMethod: "stripe",
    metadata,
  });

  return {
    paymentId: payment._id,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount,
    currency,
  };
}

// ── Create Payment Method (Save Card) ─────────────────────────────────────────────
export async function createPaymentMethod(data: Record<string, unknown>) {
  const userId = data.userId as string;
  const paymentMethodId = data.paymentMethodId as string;
  const cardholderName = data.cardholderName as string | undefined;

  if (!stripe) throw new Error("Stripe not configured");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Attach payment method to customer
  let customerId = (user as { stripeCustomerId?: string }).stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: cardholderName || user.name,
      metadata: { userId: user._id.toString() },
    });

    customerId = customer.id;
    (user as unknown as { stripeCustomerId: string }).stripeCustomerId = customerId;
    await user.save();
  }

  const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  // Detect card type
  const cardType = getCardType(paymentMethod);

  return {
    paymentMethodId: paymentMethod.id,
    cardType,
    last4: paymentMethod.card?.last4,
    brand: paymentMethod.card?.brand,
    expMonth: paymentMethod.card?.exp_month,
    expYear: paymentMethod.card?.exp_year,
  };
}

// ── Get Saved Payment Methods ─────────────────────────────────────────────────────
export async function getSavedPaymentMethods(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (!(user as { stripeCustomerId?: string }).stripeCustomerId) {
    return [];
  }

  const paymentMethods = await stripe!.paymentMethods.list({
    customer: (user as unknown as { stripeCustomerId: string }).stripeCustomerId,
    type: "card",
  });

  return paymentMethods.data.map((pm: Stripe.PaymentMethod) => {
    const card = pm.card;
    return {
      id: pm.id,
      cardType: getCardType(pm),
      last4: card?.last4,
      brand: card?.brand,
      expMonth: card?.exp_month,
      expYear: card?.exp_year,
      isDefault: (pm.metadata as Record<string, string>)?.default === "true",
    };
  });
}

// ── Delete Payment Method ─────────────────────────────────────────────────────────
export async function deletePaymentMethod(_userId: string, paymentMethodId: string) {
  if (!stripe) throw new Error("Stripe not configured");

  await stripe.paymentMethods.detach(paymentMethodId);
  return { deleted: true, paymentMethodId };
}

// ── Set Default Payment Method ─────────────────────────────────────────────────────
export async function setDefaultPaymentMethod(_userId: string, paymentMethodId: string) {
  if (!stripe) throw new Error("Stripe not configured");

  const user = await User.findById(_userId);
  if (!user) throw new Error("User not found");

  if (!(user as { stripeCustomerId?: string }).stripeCustomerId) throw new Error("No Stripe customer found");

  // Update payment method metadata
  await stripe.paymentMethods.update(paymentMethodId, {
    metadata: { default: "true" },
  });

  // Update customer default payment method
  await stripe.customers.update((user as unknown as { stripeCustomerId: string }).stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  return { success: true, paymentMethodId };
}

// ── Charge Saved Payment Method ───────────────────────────────────────────────────
export async function chargeSavedPaymentMethod(data: Record<string, unknown>) {
  const userId = data.userId as string;
  const paymentMethodId = data.paymentMethodId as string;
  const amount = data.amount as number;
  const currency = data.currency as string;
  const description = data.description as string | undefined;
  const metadata = data.metadata as Record<string, string> | undefined;

  if (!stripe) throw new Error("Stripe not configured");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (!(user as { stripeCustomerId?: string }).stripeCustomerId) throw new Error("No Stripe customer found");

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),
    customer: (user as unknown as { stripeCustomerId: string }).stripeCustomerId,
    payment_method: paymentMethodId,
    description: description || "SIMTrace payment",
    confirm: true,
    off_session: true,
    metadata: {
      userId,
      ...metadata,
    },
  });

  // Save payment record
  const payment = await Payment.create({
    user: userId,
    reference: paymentIntent.id,
    amount,
    currency,
    description,
    status: paymentIntent.status === "succeeded" ? "completed" : "pending",
    paymentMethod: "stripe",
    metadata,
  });

  return payment;
}

// ── Process Refund ───────────────────────────────────────────────────────────────
export async function processRefund(paymentId: string, reason?: string) {
  if (!stripe) throw new Error("Stripe not configured");

  const payment = await Payment.findOne({ reference: paymentId });
  if (!payment) throw new Error("Payment not found");

  if (payment.status !== "completed") {
    throw new Error("Only completed payments can be refunded");
  }

  const refund = await stripe!.refunds.create({
    payment_intent: paymentId,
    reason: (reason || "requested_by_customer") as 'duplicate' | 'fraudulent' | 'requested_by_customer',
  });

  payment.status = "refunded";
  (payment as unknown as { refundId: string; refundedAt: Date }).refundId = refund.id;
  (payment as unknown as { refundId: string; refundedAt: Date }).refundedAt = new Date();
  await payment.save();

  return payment;
}

// ── Currency Conversion ───────────────────────────────────────────────────────────
export async function getExchangeRate(fromCurrency: string, toCurrency: string) {
  if (fromCurrency.toLowerCase() === toCurrency.toLowerCase()) {
    return { rate: 1, from: fromCurrency, to: toCurrency };
  }

  // In production, use a real currency API
  // For now, return approximate rates
  const rates: Record<string, Record<string, number>> = {
    usd: { eur: 0.92, gbp: 0.79, kes: 130, ngn: 1550, zar: 18.5 },
    eur: { usd: 1.09, gbp: 0.86, kes: 141, ngn: 1685, zar: 20.1 },
    gbp: { usd: 1.27, eur: 1.16, kes: 164, ngn: 1960, zar: 23.4 },
    kes: { usd: 0.0077, eur: 0.0071, gbp: 0.0061, ngn: 11.9, zar: 0.14 },
    ngn: { usd: 0.00065, eur: 0.00059, gbp: 0.00051, kes: 0.084, zar: 0.012 },
    zar: { usd: 0.054, eur: 0.050, gbp: 0.043, kes: 7.0, ngn: 83.8 },
  };

  const rate = rates[fromCurrency.toLowerCase()]?.[toCurrency.toLowerCase()];
  if (!rate) throw new Error("Exchange rate not available");

  return { rate, from: fromCurrency, to: toCurrency };
}

// ── Get Supported Currencies ─────────────────────────────────────────────────────
export function getSupportedCurrencies(): string[] {
  return SUPPORTED_CURRENCIES;
}

// ── Card Type Statistics ───────────────────────────────────────────────────────────
export async function getCardTypeStatistics() {
  const payments = await Payment.find({
    paymentMethod: "stripe",
    status: "completed",
  });

  const cardTypes = { visa: 0, mastercard: 0, amex: 0, discover: 0, other: 0 };
  let totalAmount = 0;

  for (const payment of payments) {
    const cardType = (payment as { metadata?: { cardType?: string } }).metadata?.cardType || "other";
    if (cardTypes[cardType as keyof typeof cardTypes] !== undefined) {
      cardTypes[cardType as keyof typeof cardTypes]++;
    } else {
      cardTypes.other++;
    }
    totalAmount += (payment as { amount?: number }).amount || 0;
  }

  return {
    totalPayments: payments.length,
    totalAmount,
    cardTypes,
    visaPercentage: payments.length > 0 ? ((cardTypes.visa / payments.length) * 100).toFixed(2) : 0,
    mastercardPercentage: payments.length > 0 ? ((cardTypes.mastercard / payments.length) * 100).toFixed(2) : 0,
  };
}
