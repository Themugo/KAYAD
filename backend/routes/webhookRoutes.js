import express from "express";
import crypto from "crypto";
import Car from "../models/Car.js";
import User from "../models/User.js";
import { logInfo, logError } from "../utils/logger.js";
import { getSupabase } from "../utils/supabase.js";
import { create, findOne, update } from "../db/index.js";

const router = express.Router();

export const buildInventoryDedupeKey = (dealerId, payload) =>
  crypto.createHash("sha256")
    .update(JSON.stringify({ dealerId: String(dealerId), payload: payload ?? {} }))
    .digest("hex");

const claimReplayLock = async (dedupeKey) => {
  const sb = getSupabase();
  const holder = `inventory-webhook:${crypto.randomUUID()}`;
  const { data, error } = await sb.rpc("kayad_try_acquire_lock", {
    p_resource_id: `webhook:${dedupeKey}`,
    p_holder: holder,
    p_ttl_seconds: 120,
  });
  if (error) throw error;
  return { acquired: data === true, holder, resourceId: `webhook:${dedupeKey}` };
};

const releaseReplayLock = async ({ holder, resourceId }) => {
  if (!holder || !resourceId) return;
  const sb = getSupabase();
  await sb.rpc("kayad_release_lock", { p_resource_id: resourceId, p_holder: holder });
};

export const recordInventoryWebhookReceipt = async (dealerId, payload) => {
  const dedupeKey = buildInventoryDedupeKey(dealerId, payload);
  const existing = await findOne("webhook_events", { dedupeKey });
  if (existing?.processed) return { dedupeKey, duplicate: true, event: existing };
  if (existing) return { dedupeKey, duplicate: false, retry: true, event: existing };
  try {
    const event = await create("webhook_events", {
      eventSource: "inventory_api",
      dedupeKey,
      rawPayload: payload,
      processed: false,
    });
    return { dedupeKey, duplicate: false, retry: false, event };
  } catch (err) {
    if (err?.code === "23505") {
      const raceWinner = await findOne("webhook_events", { dedupeKey });
      if (raceWinner?.processed) return { dedupeKey, duplicate: true, event: raceWinner };
      return { dedupeKey, duplicate: false, retry: true, event: raceWinner };
    }
    throw err;
  }
};

const markInventoryWebhook = async (eventId, error = null) => {
  if (!eventId) return;
  await update("webhook_events", eventId, {
    processed: !error,
    processingError: error ? String(error) : null,
    processedAt: error ? null : new Date().toISOString(),
  });
};

// Only these fields may be set via the inventory webhook. Previously the
// entire item was spread into Car.create/$set, allowing a dealer (or a
// leaked API key) to set privileged fields like featured, status,
// auctionStatus, escrowEnabled, or price locks.
const ALLOWED_FIELDS = [
  "title", "make", "model", "year", "price", "mileage", "fuelType",
  "transmission", "bodyType", "color", "engineSize", "description",
  "location", "images", "features", "condition", "doors", "seats",
  "drivetrain", "vin", "registrationNumber",
];

// Exported for unit testing (see tests/security/).
export const pickAllowed = (item) => {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (item[key] !== undefined) out[key] = item[key];
  }
  return out;
};

// Constant-time API key comparison to avoid timing-based key discovery.
export const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

router.post("/inventory", async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];
    const { listings } = req.body;
    if (!apiKey || !Array.isArray(listings)) {
      return res.status(400).json({ success: false, message: "x-api-key header and listings array required" });
    }
    if (listings.length > 500) {
      return res.status(400).json({ success: false, message: "Maximum 500 listings per request" });
    }

    const dealer = await User.findOne({ apiKey }).select("_id role apiKey");
    if (!dealer || dealer.role !== "dealer" || !safeEqual(dealer.apiKey, apiKey)) {
      return res.status(401).json({ success: false, message: "Invalid API key" });
    }

    const dedupePayload = { listings };
    const dedupeKey = buildInventoryDedupeKey(dealer._id, dedupePayload);
    const lock = await claimReplayLock(dedupeKey);
    if (!lock.acquired) {
      return res.status(409).json({ success: false, message: "Webhook is already being processed; retry safely" });
    }

    let receipt = null;
    try {
      receipt = await recordInventoryWebhookReceipt(dealer._id, dedupePayload);
      if (receipt.duplicate) {
        return res.json({ success: true, duplicate: true, results: { created: 0, updated: 0, skipped: listings.length, errors: [] } });
      }

      const results = { created: 0, updated: 0, skipped: 0, errors: [] };
      for (const item of listings) {
      try {
        if (!item || typeof item !== "object" || !item.title || !item.price) {
          results.skipped++;
          continue;
        }
        const safeItem = pickAllowed(item);
        const existing = item.vin
          ? await Car.findOne({ vin: item.vin, dealer: dealer._id })
          : null;
        if (existing) {
          await Car.findByIdAndUpdate(existing._id, { $set: { ...safeItem, dealer: dealer._id } });
          results.updated++;
        } else {
          await Car.create({ ...safeItem, dealer: dealer._id });
          results.created++;
        }
      } catch (err) {
        results.errors.push({ item: item?.title || "unknown", error: err.message });
        results.skipped++;
      }
      }

      await markInventoryWebhook(receipt?.event?.id, null);
      logInfo("Webhook inventory sync", { dealerId: dealer._id, results });
      return res.json({ success: true, results });
    } catch (err) {
      await markInventoryWebhook(receipt?.event?.id, err?.message || err);
      throw err;
    } finally {
      await releaseReplayLock(lock);
    }
  } catch (err) {
    logError("Webhook error", err);
    res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
});

export default router;
