import express from "express";
import Car from "../models/Car.js";
import User from "../models/User.js";
import { logInfo, logError } from "../utils/logger.js";
import crypto from "crypto";
import { findOne, create, update } from "../db/index.js";
import { withLock } from "../middleware/distributedLock.js";

const router = express.Router();

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

    // Inventory providers do not reliably send a standard idempotency header.
    // Prefer their event/request identity, otherwise hash the canonical
    // payload so a byte-identical replay cannot mutate inventory twice.
    const suppliedKey = req.get("x-idempotency-key") || req.body?.eventId || req.body?.requestId;
    const dedupeKey = suppliedKey
      ? String(suppliedKey)
      : crypto.createHash("sha256").update(JSON.stringify({ dealerId: String(dealer._id), listings })).digest("hex");
    const resource = `webhook:inventory:${dealer._id}:${dedupeKey}`;

    const response = await withLock(resource, async () => {
      const existingEvent = await findOne("webhook_events", {
        eventSource: "inventory",
        dedupeKey,
      });
      if (existingEvent?.processed) {
        return { success: true, idempotent: true, results: existingEvent.rawPayload?.results || { created: 0, updated: 0, skipped: 0, errors: [] } };
      }

      let event;
      try {
        event = existingEvent || await create("webhook_events", {
          eventSource: "inventory",
          dedupeKey,
          rawPayload: { dealerId: String(dealer._id), listings },
          processed: false,
        });
      } catch (error) {
        if (error?.code === "23505") {
          event = await findOne("webhook_events", { eventSource: "inventory", dedupeKey });
          if (event?.processed) {
            return { success: true, idempotent: true, results: event.rawPayload?.results || { created: 0, updated: 0, skipped: 0, errors: [] } };
          }
        } else {
          throw error;
        }
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

      await update("webhook_events", event.id, {
        processed: results.errors.length === 0,
        processingError: results.errors.length ? JSON.stringify(results.errors).slice(0, 4000) : null,
        processedAt: results.errors.length ? null : new Date().toISOString(),
        rawPayload: { dealerId: String(dealer._id), listings, results },
      });
      return { success: true, idempotent: false, results };
    }, 300000);

    logInfo("Webhook inventory sync", { dealerId: dealer._id, dedupeKey, results: response.results });
    res.json(response);
  } catch (err) {
    logError("Webhook error", err);
    res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
});

export default router;
