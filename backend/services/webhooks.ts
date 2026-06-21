// services/webhooks.ts - Webhook System for Real-time Notifications
// Developer ecosystem for third-party integrations

import { WebhookSubscription, WebhookDeliveryLog, User } from "../db/index.js";
import crypto from "crypto";
import { assertSafeWebhookUrl } from "../security/ssrf-guard.js";

// ── Webhook Subscription Management ───────────────────────────────────────────────
export async function createWebhookSubscription(data: { userId: string; url: string; events: string[]; secret?: string }) {
  const {
    userId,
    url,
    events,
    secret,
  } = data;

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  await assertSafeWebhookUrl(url);

  // Generate secret if not provided
  const webhookSecret = secret || crypto.randomBytes(32).toString("hex");

  const subscription = await WebhookSubscription.create({
    user: userId,
    url,
    secret: webhookSecret,
    events,
    active: true,
  });

  return subscription;
}

export async function getWebhookSubscription(subscriptionId: string) {
  const subscription = await WebhookSubscription.findById(subscriptionId)
    .populate("user", "name email");

  return subscription;
}

export async function getWebhookSubscriptionsByUser(userId: string) {
  const subscriptions = await WebhookSubscription.find({ user: userId })
    .sort({ createdAt: -1 });

  return subscriptions;
}

export async function updateWebhookSubscription(subscriptionId: string, updates: Record<string, unknown>) {
  const subscription = await WebhookSubscription.findById(subscriptionId);
  if (!subscription) throw new Error("Webhook subscription not found");

  if (typeof updates.url === "string") {
    await assertSafeWebhookUrl(updates.url);
  }

  const allowedUpdates = ["url", "events", "active"];
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      (subscription as any)[key] = updates[key];
    }
  }

  subscription.updatedAt = new Date();
  await subscription.save();

  return subscription;
}

export async function deleteWebhookSubscription(subscriptionId: string) {
  const subscription = await WebhookSubscription.findByIdAndDelete(subscriptionId);
  if (!subscription) throw new Error("Webhook subscription not found");

  return subscription;
}

export async function regenerateWebhookSecret(subscriptionId: string) {
  const subscription = await WebhookSubscription.findById(subscriptionId);
  if (!subscription) throw new Error("Webhook subscription not found");

  subscription.secret = crypto.randomBytes(32).toString("hex");
  subscription.updatedAt = new Date();
  await subscription.save();

  return subscription;
}

// ── Webhook Delivery ─────────────────────────────────────────────────────────────
export async function triggerWebhook(event: string, payload: Record<string, unknown>) {
  const subscriptions = await WebhookSubscription.find({
    active: true,
    events: event,
  });

  const deliveries: unknown[] = [];

  for (const subscription of subscriptions) {
    try {
      const delivery = await deliverWebhook(subscription, event, payload);
      deliveries.push(delivery);
    } catch (err) {
      console.error(`Webhook delivery failed for ${subscription._id}:`, err);
    }
  }

  return deliveries;
}

type SubscriptionDoc = {
  _id: string;
  url: string;
  secret: string;
  totalDelivered: number;
  lastDeliveredAt?: Date;
  totalFailed: number;
  lastFailedAt?: Date;
  save(): Promise<unknown>;
};

async function deliverWebhook(subscription: SubscriptionDoc, event: string, payload: Record<string, unknown>) {
  await assertSafeWebhookUrl(subscription.url);

  const signature = generateSignature(payload, subscription.secret);

  const response = await fetch(subscription.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SimTrace-Signature": signature,
      "X-SimTrace-Event": event,
      "X-SimTrace-Timestamp": Date.now().toString(),
    },
    body: JSON.stringify(payload),
  });

  const statusCode = response.status;
  const responseText = await response.text();

  const log = await WebhookDeliveryLog.create({
    webhook: subscription._id,
    event,
    payload,
    status: statusCode >= 200 && statusCode < 300 ? "success" : "failed",
    statusCode,
    response: responseText.substring(0, 1000),
    timestamp: new Date(),
  });

  // Update subscription stats
  if (log.status === "success") {
    subscription.totalDelivered += 1;
    subscription.lastDeliveredAt = new Date();
  } else {
    subscription.totalFailed += 1;
    subscription.lastFailedAt = new Date();
  }
  await subscription.save();

  return log;
}

function generateSignature(payload: Record<string, unknown>, secret: string): string {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payloadString);
  return `sha256=${hmac.digest("hex")}`;
}

// ── Webhook Delivery Logs ───────────────────────────────────────────────────────
export async function getWebhookDeliveryLogs(subscriptionId: string, limit = 50) {
  const logs = await WebhookDeliveryLog.find({ webhook: subscriptionId })
    .sort({ timestamp: -1 })
    .limit(limit);

  return logs;
}

export async function retryFailedWebhook(deliveryId: string) {
  const delivery = await WebhookDeliveryLog.findById(deliveryId)
    .populate("webhook");

  if (!delivery) throw new Error("Delivery log not found");
  if (delivery.status === "success") throw new Error("Delivery already successful");

  const newDelivery = await deliverWebhook(
    (delivery as any).webhook,
    delivery.event,
    delivery.payload
  );

  return newDelivery;
}

// ── Webhook Statistics ─────────────────────────────────────────────────────────
export async function getWebhookStatistics() {
  const [
    totalSubscriptions,
    activeSubscriptions,
    totalDeliveries,
    successfulDeliveries,
    failedDeliveries,
    retryingDeliveries,
  ] = await Promise.all([
    WebhookSubscription.countDocuments(),
    WebhookSubscription.countDocuments({ active: true }),
    WebhookDeliveryLog.countDocuments(),
    WebhookDeliveryLog.countDocuments({ status: "success" }),
    WebhookDeliveryLog.countDocuments({ status: "failed" }),
    WebhookDeliveryLog.countDocuments({ status: "retrying" }),
  ]);

  const successRate = totalDeliveries > 0 
    ? ((successfulDeliveries / totalDeliveries) * 100).toFixed(2) 
    : 0;

  return {
    totalSubscriptions,
    activeSubscriptions,
    totalDeliveries,
    successfulDeliveries,
    failedDeliveries,
    retryingDeliveries,
    successRate,
  };
}

// ── Event Types ─────────────────────────────────────────────────────────────────
export const WEBHOOK_EVENTS = [
  "device.location",
  "device.alert",
  "device.status_change",
  "theft.reported",
  "theft.recovered",
  "claim.submitted",
  "claim.approved",
  "claim.paid",
  "payment.received",
  "subscription.created",
  "subscription.cancelled",
  "recovery.case.created",
  "recovery.case.updated",
  "regulatory.block.created",
  "regulatory.block.lifted",
];

// ── Webhook Testing ─────────────────────────────────────────────────────────────
export async function testWebhook(subscriptionId: string) {
  const subscription = await WebhookSubscription.findById(subscriptionId);
  if (!subscription) throw new Error("Webhook subscription not found");

  const testPayload = {
    event: "test",
    timestamp: new Date().toISOString(),
    data: {
      message: "This is a test webhook from SIMTrace",
    },
  };

  const delivery = await deliverWebhook(subscription, "test", testPayload);

  return delivery;
}
